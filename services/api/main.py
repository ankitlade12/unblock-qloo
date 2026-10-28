import hashlib
import json
import os
from copy import deepcopy
from contextlib import closing
from datetime import datetime
from pathlib import Path
from typing import Any, Literal
from uuid import uuid4
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import Field, ValidationError
from .domain import Strict, Event, Offer, Requirements, stamp, now
from . import store, qloo, agent, comparison
from .planner import solve, verify, date

app = FastAPI(title="UNBLOCK", version="1.0.0")


@app.middleware("http")
async def safety(request: Request, call_next):
    request_id = str(uuid4())
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        if request.headers.get("x-unblock-request") != "1":
            return Response("Missing request protection header", 403)
        origin = request.headers.get("origin")
        allowed = {
            str(request.base_url).rstrip("/"),
            os.getenv("APP_ORIGIN", "http://127.0.0.1:5173"),
            "http://localhost:5173",
        }
        if origin and origin not in allowed:
            return Response("Origin not allowed", 403)
        try:
            if int(request.headers.get("content-length", "0")) > 150000:
                return Response("Request too large", 413)
        except ValueError:
            return Response("Invalid length", 400)
    response = await call_next(request)
    response.headers.update(
        {
            "X-Request-ID": request_id,
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "same-origin",
            "Content-Security-Policy": "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
            "Cache-Control": "no-store",
        }
    )
    return response


def throttle(request, bucket, maximum):
    # Creation cannot trust a caller-supplied session cookie. Other routes call
    # this only after workspace authentication; quotas also persist in SQLite.
    identity = (
        (request.client.host if request.client else "unknown")
        if bucket == "create"
        else request.cookies.get("unblock", "unknown")
    )
    store.rate_limit(identity, bucket, maximum)


def ws(req):
    return store.workspace(req.cookies.get("unblock"), readonly=req.method == "GET")


def find(s, collection, id):
    result = next((x for x in s.get(collection, []) if x["id"] == id), None)
    if result is None:
        raise HTTPException(404, "Record not found in this workspace")
    return result


def audit(s, action, detail=""):
    s["audit"].append({"at": stamp(), "action": action, "detail": detail})
    s["audit"] = s["audit"][-300:]


def invalidate(s, reason):
    for p in s["proposals"]:
        p["stale"] = True
        p["stale_reason"] = reason
    audit(s, "Inputs changed; prior proposals require review", reason)


def snapshot(s):
    return deepcopy(
        {k: s[k] for k in ["revision", "window", "events", "offers", "participants"]}
    )


def fingerprint(s):
    return hashlib.sha256(json.dumps(snapshot(s), sort_keys=True).encode()).hexdigest()


def status(s, p):
    if p["stale"] or p["input_hash"] != fingerprint(s) or verify(s, p["assignments"]):
        return "Needs review after a change"
    if not p["approval"]:
        return "Awaiting organizer approval"
    if any(p["commitments"].get(pid) != "accepted" for pid in p["assignments"]):
        return "Awaiting participant commitment"
    for oid in set(p["assignments"].values()):
        confirmation = p["confirmations"].get(oid)
        if not confirmation or date(confirmation["expires_at"]) <= now():
            return "Resource confirmation pending"
    return "Confirmed"


def public(s):
    copy = deepcopy(s)
    for p in copy["proposals"]:
        p["status"] = status(s, p)
        p["can_record_outcomes"] = (
            bool(p.get("confirmed_record")) or p["status"] == "Confirmed"
        )
        # Synthetic snapshots allow faithful review after catalogue replacement.
    copy["evidence"] = [
        {k: v for k, v in e.items() if k not in ("response", "params")}
        for e in s["evidence"]
    ]
    copy.pop("idempotency")
    copy.pop("entity_candidates")
    copy["qloo_available"] = bool(os.getenv("QLOO_API_KEY"))
    copy["model_available"] = bool(
        os.getenv("MODEL_API_KEY") and os.getenv("MODEL_NAME")
    )
    copy["comparisons"] = [comparison.public(s, c) for c in s.get("comparisons", [])]
    copy["operational_mode"] = "synthetic"
    return copy


class Command(Strict):
    revision: int
    action: str = Field(max_length=40)
    target: str = Field(default="", max_length=64)
    data: dict[str, Any] = Field(default_factory=dict)
    idempotency_key: str = Field(min_length=8, max_length=100)


@app.get("/api/health")
def health():
    try:
        with closing(store.connect()) as db:
            db.execute("SELECT 1 FROM workspaces LIMIT 1")
    except Exception:
        raise HTTPException(503, "Workspace storage is unavailable")
    return {
        "status": "ok",
        "qloo_configured": bool(os.getenv("QLOO_API_KEY")),
        "workspace_mode": "synthetic-only",
        "storage": "sqlite",
    }


@app.post("/api/demo")
def demo(request: Request, response: Response):
    throttle(request, "create", 6)
    token = store.create()
    response.set_cookie(
        "unblock",
        token,
        httponly=True,
        samesite="lax",
        secure=os.getenv("COOKIE_SECURE", "false") == "true",
        max_age=86400,
    )
    with store.workspace(token) as s:
        return public(s)


@app.get("/api/state")
def state(request: Request):
    with ws(request) as s:
        return public(s)


@app.delete("/api/workspace")
def delete(request: Request, response: Response):
    with ws(request):
        pass
    with closing(store.connect()) as db, db:
        db.execute(
            "DELETE FROM workspaces WHERE token=?",
            (store.key(request.cookies["unblock"]),),
        )
    response.delete_cookie("unblock")
    return {"deleted": True}


def generate(s, task):
    if len(s["proposals"]) >= 30:
        raise HTTPException(422, "Demo proposal limit reached; start a new workspace")
    baseline = next(
        (p for p in reversed(s["proposals"]) if p["approval"]),
        s["proposals"][-1] if s["proposals"] else None,
    )
    previous = baseline["assignments"] if baseline else {}
    traces = [
        {
            "tool": "get_planning_context",
            "result": f"Loaded revision {s['revision']}: {len(s['participants'])} participants, {len(s['events'])} events.",
        },
        {
            "tool": "find_missing_requirements",
            "result": f"{sum(e['step_free'] is None or e['hearing_loop'] is None for e in s['events'])} events have unknown access facts; affected assignments are blocked.",
        },
        {
            "tool": "build_resource_packages",
            "result": f"Checked {len(s['offers'])} explicit event / transport packages.",
        },
    ]
    result = solve(s, previous=previous)
    traces.append(
        {
            "tool": "solve_outings",
            "result": f"{len(result['plans'])} candidate plans. {result['solver_status']}.",
        }
    )
    for plan in result["plans"]:
        errors = verify(s, plan["assignments"])
        if errors:
            raise HTTPException(500, "Independent check rejected solver output")
        plan.update(
            {
                "id": str(uuid4()),
                "version": len(s["proposals"]) + 1,
                "input_revision": s["revision"],
                "input_hash": fingerprint(s),
                "snapshot": snapshot(s),
                "created_at": stamp(),
                "stale": False,
                "approval": None,
                "commitments": {},
                "confirmations": {},
                "solver_status": result["solver_status"],
                "diff_summary": {
                    "previous_version": baseline["version"] if baseline else None,
                    "previous_cost_minor": baseline["cost_minor"] if baseline else None,
                    "cost_change_minor": plan["cost_minor"] - baseline["cost_minor"]
                    if baseline
                    else None,
                },
                "diff": [
                    {
                        "participant_id": pid,
                        "before": previous.get(pid),
                        "after": plan["assignments"].get(pid),
                    }
                    for pid in sorted(set(previous) | set(plan["assignments"]))
                    if previous.get(pid) != plan["assignments"].get(pid)
                ],
            }
        )
        s["proposals"].append(plan)
    traces.append(
        {
            "tool": "verify_feasibility",
            "result": "Independent capacity, timing, access, interest, and budget checks passed."
            if result["plans"]
            else "No actionable plan. " + "; ".join(result["blockers"][:6]),
        }
    )
    s["traces"] = [
        {
            "at": stamp(),
            "task": task,
            "mode": "deterministic workflow agent",
            "steps": traces,
            "blockers": result["blockers"],
        }
    ] + s["traces"][:19]
    audit(
        s,
        "Planning workflow completed",
        f"{len(result['plans'])} alternatives; {result['solver_status']}",
    )
    return result


@app.post("/api/command")
def command(cmd: Command, request: Request):
    result = None
    with ws(request) as s:
        throttle(request, "mutate", 80)
        signature = hashlib.sha256(
            cmd.model_dump_json(exclude={"idempotency_key"}).encode()
        ).hexdigest()
        prior = s["idempotency"].get(cmd.idempotency_key)
        if prior:
            if prior["signature"] != signature:
                raise HTTPException(
                    409, "Idempotency key reused with a different command"
                )
            return {"state": public(s), "result": prior["result"]}
        if s["revision"] != cmd.revision:
            raise HTTPException(409, "Workspace changed. Refresh before saving.")
        d = cmd.data
        action = cmd.action
        material = False
        try:
            if action == "comparison_start":
                result = {"id": comparison.start(s)}
            elif action in ("comparison_response", "comparison_evaluate"):
                c = find(s, "comparisons", cmd.target)
                if action == "comparison_response":
                    comparison.record(s, c, d)
                    material = True
                else:
                    throttle(request, "compare", 4)
                    result = comparison.evaluate(s, c)
            elif action == "interest":
                p = find(s, "participants", cmd.target)
                e = find(s, "events", d["event_id"])
                if d["response"] not in (
                    "interested",
                    "maybe",
                    "not interested",
                    "unseen",
                ):
                    raise ValueError("Invalid response")
                p["interests"][e["id"]] = {
                    "response": d["response"],
                    "event_version": e["version"],
                    "recorded_at": stamp(),
                }
                p["version"] += 1
                material = True
            elif action == "requirements":
                p = find(s, "participants", cmd.target)
                p["requirements"] = Requirements(**d).model_dump(mode="json")
                p["version"] += 1
                material = True
            elif action == "window":
                if (
                    set(d) != {"budget_minor", "name"}
                    or not isinstance(d["budget_minor"], int)
                    or isinstance(d["budget_minor"], bool)
                    or not 0 <= d["budget_minor"] <= 1000000
                    or not isinstance(d["name"], str)
                    or not 1 <= len(d["name"]) <= 100
                ):
                    raise ValueError("Invalid window settings")
                s["window"].update(d)
                material = True
            elif action in ("event", "offer"):
                collection = "events" if action == "event" else "offers"
                record = find(s, collection, cmd.target)
                cls = Event if action == "event" else Offer
                if any(k in d for k in ("id", "version", "mode", "entity_id")):
                    raise ValueError("Immutable fields cannot be edited")
                updated = cls(
                    **{**record, **d, "version": record["version"] + 1}
                ).model_dump(mode="json")
                if action == "offer":
                    find(s, "events", updated["event_id"])
                if action == "event":
                    if updated["title"] != record["title"]:
                        updated["entity_id"] = None
                    for person in s["participants"]:
                        person.pop("discovery", None)
                        person["suggestions"] = [
                            r
                            for r in person["suggestions"]
                            if r["event_id"] != record["id"]
                        ]
                record.update(updated)
                material = True
            elif action == "import":
                # Demo imports remain synthetic; no real participant data is accepted.
                events = [
                    Event(**e).model_dump(mode="json") for e in d.get("events", [])
                ]
                offers = [
                    Offer(**o).model_dump(mode="json") for o in d.get("offers", [])
                ]
                if not events or len(events) > 12 or len(offers) > 8:
                    raise ValueError("Import needs 1–12 events and up to 8 offers")
                if len({e["id"] for e in events}) != len(events) or len(
                    {o["id"] for o in offers}
                ) != len(offers):
                    raise ValueError("Duplicate IDs")
                if any(o["event_id"] not in {e["id"] for e in events} for o in offers):
                    raise ValueError("Offer references unknown event")
                if any(
                    e["mode"] != "synthetic" or e["entity_id"] for e in events
                ) or any(o["mode"] != "synthetic" for o in offers):
                    raise ValueError(
                        "This public demo accepts synthetic operational data only; map entities through reviewed search"
                    )
                for e in events:
                    e["version"] = (
                        max(
                            [
                                old["version"]
                                for old in s["events"]
                                if old["id"] == e["id"]
                            ]
                            + [0]
                        )
                        + 1
                    )
                s["events"] = events
                s["offers"] = offers
                for p in s["participants"]:
                    p["interests"] = {}
                    p["suggestions"] = []
                    p.pop("discovery", None)
                material = True
            elif action == "resolve":
                throttle(request, "provider", 8)
                query = d.get("query", "")
                if not isinstance(query, str) or not 1 <= len(query) <= 120:
                    raise ValueError("Search needs 1–120 characters")
                result = qloo.resolve(s, query)
            elif action == "favorite":
                p = find(s, "participants", cmd.target)
                if d.get("remove"):
                    p["favorites"] = [
                        f for f in p["favorites"] if f["entity_id"] != d["entity_id"]
                    ]
                else:
                    candidate = next(
                        (
                            x
                            for x in s["entity_candidates"]
                            if x["entity_id"] == d["entity_id"]
                        ),
                        None,
                    )
                    if not candidate:
                        raise ValueError("Select a returned search result")
                    if len(p["favorites"]) >= 5:
                        raise ValueError("Maximum five favorites")
                    if not any(
                        f["entity_id"] == candidate["entity_id"] for f in p["favorites"]
                    ):
                        p["favorites"].append(candidate)
                p["suggestions"] = []
                p.pop("discovery", None)
                material = True
            elif action == "consent":
                p = find(s, "participants", cmd.target)
                if type(d.get("consent")) is not bool:
                    raise ValueError("Consent must be true or false")
                p["consent"] = d["consent"]
                if not p["consent"]:
                    p["favorites"] = []
                    p["suggestions"] = []
                p.pop("discovery", None)
                material = True
            elif action == "map":
                e = find(s, "events", cmd.target)
                candidate = next(
                    (
                        x
                        for x in s["entity_candidates"]
                        if x["entity_id"] == d["entity_id"]
                    ),
                    None,
                )
                if not candidate:
                    raise ValueError("Select a reviewed search result")
                e["entity_id"] = candidate["entity_id"]
                e["version"] += 1
                for p in s["participants"]:
                    p["suggestions"] = []
                    p.pop("discovery", None)
                material = True
            elif action == "discover":
                throttle(request, "provider", 8)
                result = qloo.discover(s, find(s, "participants", cmd.target))
                material = True
            elif action == "agent":
                throttle(request, "agent", 3)
                task = d.get("task")
                if not isinstance(task, str) or not 1 <= len(task) <= 1000:
                    raise ValueError("Task must be 1–1000 characters")
                result = agent.run(s, task, generate)
            elif action in ("plan", "replan"):
                throttle(request, "plan", 6)
                result = generate(s, action)
            elif action == "approve":
                p = find(s, "proposals", cmd.target)
                if status(s, p) != "Awaiting organizer approval":
                    raise HTTPException(
                        409, "Only a current, checked draft can be approved"
                    )
                for other in s["proposals"]:
                    if other["id"] != p["id"] and other["approval"]:
                        other["stale"] = True
                        other["stale_reason"] = (
                            "Superseded by another approved proposal"
                        )
                p["approval"] = {
                    "at": stamp(),
                    "version": p["version"],
                    "input_hash": p["input_hash"],
                    "actor": "demo organizer",
                }
                audit(s, "Organizer approved exact proposal", f"Version {p['version']}")
            elif action == "commit":
                p = find(s, "proposals", cmd.target)
                pid = d["participant_id"]
                find(s, "participants", pid)
                if pid not in p["assignments"]:
                    raise ValueError("Participant is not assigned")
                if not p["approval"] or status(s, p) == "Needs review after a change":
                    raise HTTPException(
                        409, "Approve a current proposal before commitments"
                    )
                if d["decision"] not in ("accepted", "declined", "withdrawn"):
                    raise ValueError("Invalid commitment")
                p["commitments"][pid] = d["decision"]
                if d["decision"] != "accepted":
                    person = find(s, "participants", pid)
                    if d["decision"] == "withdrawn":
                        person["requirements"]["withdrawn"] = True
                    person["version"] += 1
                    o = find(s, "offers", p["assignments"][pid])
                    person["interests"][o["event_id"]] = {
                        "response": "not interested",
                        "event_version": find(s, "events", o["event_id"])["version"],
                        "recorded_at": stamp(),
                    }
                    material = True
                audit(
                    s,
                    "Participant commitment recorded",
                    f"{pid}: {d['decision']} to proposal v{p['version']}",
                )
            elif action == "confirm":
                p = find(s, "proposals", cmd.target)
                o = find(s, "offers", d["offer_id"])
                if (
                    not p["approval"]
                    or status(s, p) == "Needs review after a change"
                    or o["id"] not in p["assignments"].values()
                ):
                    raise HTTPException(
                        409, "Current approved proposal and matching offer required"
                    )
                expires = date(d["expires_at"])
                if expires.tzinfo is None or expires <= now():
                    raise ValueError("Confirmation expiry must be in the future")
                if not isinstance(d["source"], str) or not 5 <= len(d["source"]) <= 500:
                    raise ValueError("Confirmation source is required")
                quantity = sum(
                    1 + find(s, "participants", pid)["requirements"]["companion"]
                    for pid, oid in p["assignments"].items()
                    if oid == o["id"]
                )
                if d.get("quantity") != quantity:
                    raise ValueError(
                        f"Confirmation must cover {quantity} seats AND tickets"
                    )
                p["confirmations"][o["id"]] = {
                    "offer_version": o["version"],
                    "quantity": quantity,
                    "source": d["source"],
                    "expires_at": expires.isoformat(),
                    "at": stamp(),
                    "mode": "synthetic",
                }
                audit(
                    s,
                    "Synthetic provider confirmation recorded",
                    f"{o['id']}: {quantity} seats and tickets",
                )
            elif action == "outcome":
                p = find(s, "proposals", cmd.target)
                pid = d["participant_id"]
                if pid not in p["assignments"] or not (
                    p.get("confirmed_record") or status(s, p) == "Confirmed"
                ):
                    raise HTTPException(
                        409, "A historically confirmed assignment is required"
                    )
                offer = find(p["snapshot"], "offers", p["assignments"][pid])
                event = find(p["snapshot"], "events", offer["event_id"])
                if d["attendance"] in ("attended", "did not attend") and now() < date(
                    event["end"]
                ):
                    raise HTTPException(
                        409,
                        "Record attendance after the event ends; use unknown or cancelled before then",
                    )
                if d["attendance"] not in (
                    "attended",
                    "did not attend",
                    "cancelled",
                    "unknown",
                ):
                    raise ValueError("Invalid attendance")
                if (
                    not isinstance(d.get("source"), str)
                    or not 3 <= len(d["source"]) <= 300
                ):
                    raise ValueError("Outcome source required")
                s["outcomes"] = [
                    x
                    for x in s["outcomes"]
                    if not (x["proposal_id"] == p["id"] and x["participant_id"] == pid)
                ] + [
                    {
                        "proposal_id": p["id"],
                        "participant_id": pid,
                        "attendance": d["attendance"],
                        "source": d["source"],
                        "mode": "synthetic",
                        "at": stamp(),
                    }
                ]
            else:
                raise ValueError("Unknown action")
        except (KeyError, ValueError, ValidationError) as exc:
            raise HTTPException(422, str(exc)[:500])
        if material:
            s["revision"] += 1
            invalidate(s, f"{action}: {cmd.target or 'workspace'}")
        if action in ("commit", "confirm", "outcome"):
            proposal = find(s, "proposals", cmd.target)
            if (
                not proposal.get("confirmed_record")
                and status(s, proposal) == "Confirmed"
            ):
                proposal["confirmed_record"] = deepcopy(
                    {
                        k: proposal[k]
                        for k in ("approval", "commitments", "confirmations")
                    }
                )
                proposal["confirmed_record"]["at"] = stamp()
        audit(s, action, cmd.target)
        s["idempotency"][cmd.idempotency_key] = {
            "signature": signature,
            "result": result,
        }
        if len(s["idempotency"]) > 300:
            del s["idempotency"][next(iter(s["idempotency"]))]
        return {"state": public(s), "result": result}


def ics_escape(value):
    return (
        str(value)
        .replace("\\", "\\\\")
        .replace("\n", "\\n")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\r", "")
    )


@app.get("/api/comparisons/{cid}/export")
def comparison_export(cid: str, request: Request):
    with ws(request) as s:
        c = find(s, "comparisons", cid)
        out = comparison.public(s, c)
        out["frozen_inputs"] = {
            k: v for k, v in c["snapshot"].items() if k != "participants"
        }
        out["frozen_inputs"]["participants"] = [
            {
                "id": p["id"],
                "requirements": p["requirements"],
                "interests": p["interests"],
            }
            for p in c["snapshot"]["participants"]
        ]
        out["notice"] = (
            "Synthetic historical comparison. No raw Qloo responses, booking, causal uplift, or attendance claim."
        )
        return Response(
            json.dumps(out, indent=2),
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="unblock-comparison-{cid}.json"'
            },
        )


@app.get("/api/proposals/{pid}/export")
def export(
    pid: str,
    request: Request,
    format: Literal["json", "ics", "provider"] = "json",
    final: bool = False,
):
    with ws(request) as s:
        p = find(s, "proposals", pid)
        current = status(s, p)
        if final and current != "Confirmed":
            raise HTTPException(
                409,
                "Final itinerary needs current approval, commitments, and unexpired confirmations",
            )
        snap = p["snapshot"]
        offers = {o["id"]: o for o in snap["offers"]}
        events = {e["id"]: e for e in snap["events"]}
        common = {
            "proposal_id": p["id"],
            "version": p["version"],
            "status": current,
            "operational_mode": "synthetic",
            "input_hash": p["input_hash"],
            "cost_minor": p["cost_minor"],
            "currency": "USD",
            "assignments": p["assignments"],
            "approval": p["approval"],
            "commitments": p["commitments"],
            "confirmations": p["confirmations"],
            "confirmed_record": p.get("confirmed_record"),
            "unserved": p["unserved"],
            "events": list(events.values()),
            "offers": list(offers.values()),
            "unresolved": [] if current == "Confirmed" else [current],
            "notice": "Synthetic demonstration. No booking or external request has been made.",
        }
        filename = f"unblock-v{p['version']}"
        if format == "json":
            return Response(
                json.dumps(common, indent=2),
                media_type="application/json",
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}.json"'
                },
            )
        if format == "provider":
            lines = [
                f"DRAFT ONLY — synthetic scenario — proposal v{p['version']}",
                f"Status: {current}",
                "Please verify availability, access arrangements, full price, seats AND tickets for:",
            ]
            for oid in sorted(set(p["assignments"].values())):
                o = offers[oid]
                e = events[o["event_id"]]
                people = [
                    x
                    for x in snap["participants"]
                    if p["assignments"].get(x["id"]) == oid
                ]
                quantity = sum(1 + x["requirements"]["companion"] for x in people)
                lines.append(
                    f"{e['title']} at {e['venue']}; depart {o['departure']}; return {o['returns']}. {quantity} seats and tickets, {sum(x['requirements']['wheelchair'] for x in people)} wheelchair positions. Step-free required: {any(x['requirements']['step_free'] or x['requirements']['wheelchair'] for x in people)}; hearing loop required: {any(x['requirements']['hearing_loop'] for x in people)}. Offer {oid} v{o['version']}. Quote expiry {o['expires_at']}. Confirm before quote expiry. No reservation authorized."
                )
            return Response(
                "\n\n".join(lines),
                media_type="text/plain",
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}-provider-draft.txt"'
                },
            )
        from datetime import timezone

        def dt(v):
            return date(v).astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

        lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//UNBLOCK//EN",
            "CALSCALE:GREGORIAN",
        ]
        for oid in sorted(set(p["assignments"].values())):
            o = offers[oid]
            e = events[o["event_id"]]
            lines += [
                "BEGIN:VEVENT",
                f"UID:{p['id']}-{oid}@unblock",
                f"DTSTAMP:{now().strftime('%Y%m%dT%H%M%SZ')}",
                f"DTSTART:{dt(o['departure'])}",
                f"DTEND:{dt(o['returns'])}",
                "SUMMARY:" + ics_escape("[SYNTHETIC] " + e["title"]),
                "LOCATION:" + ics_escape(e["venue"]),
                "STATUS:" + ("CONFIRMED" if current == "Confirmed" else "TENTATIVE"),
                "DESCRIPTION:"
                + ics_escape(
                    f"Proposal v{p['version']}. {current}. Synthetic scenario; no real booking."
                ),
                "END:VEVENT",
            ]
        lines += ["END:VCALENDAR"]
        return Response(
            "\r\n".join(lines) + "\r\n",
            media_type="text/calendar",
            headers={"Content-Disposition": f'attachment; filename="{filename}.ics"'},
        )


DIST = Path(__file__).resolve().parents[2] / "apps/web/dist"
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/")
    def index():
        return FileResponse(DIST / "index.html")
