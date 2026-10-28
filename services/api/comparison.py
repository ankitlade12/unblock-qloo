"""Historical, matched-input comparisons. Never infer causal uplift from a demo."""

from copy import deepcopy
from uuid import uuid4
import hashlib
import json
from fastapi import HTTPException
from .domain import stamp
from .planner import solve, verify, date, blockers
from .qloo import entities


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


def constraints(s):
    return {
        "window": s["window"],
        "events": s["events"],
        "offers": s["offers"],
        "people": [
            {"id": p["id"], "requirements": p["requirements"]}
            for p in s["participants"]
        ],
    }


def choices(s):
    return {
        p["id"]: {
            eid: {k: v.get(k) for k in ("response", "event_version")}
            for eid, v in p["interests"].items()
        }
        for p in s["participants"]
    }


def expected(c):
    out = deepcopy(c["snapshot"])
    people = {p["id"]: p for p in out["participants"]}
    for r in c["decisions"]:
        people[r["participant_id"]]["interests"][r["event_id"]] = {
            "response": r["response"],
            "event_version": r["event_version"],
        }
    return out


def validity(s, c):
    if digest(constraints(s)) != c["constraints_hash"]:
        return "Budget, catalogue, resources, or participant requirements changed. Start a new comparison."
    if choices(s) != choices(expected(c)):
        return "Interests changed outside this comparison. Start a new comparison to preserve a matched baseline."
    return None


def start(s):
    if len(s.get("comparisons", [])) >= 8:
        raise HTTPException(
            422, "Eight comparison snapshots per demo; start a new workspace for more"
        )
    snapshot = deepcopy(
        {k: s[k] for k in ("window", "events", "offers", "participants")}
    )
    c = {
        "id": str(uuid4()),
        "created_at": stamp(),
        "snapshot": snapshot,
        "constraints_hash": digest(constraints(s)),
        "decisions": [],
        "result": None,
        "operational_mode": "synthetic",
        "policy": "coverage, cost, stable tie-break; same frozen evaluation time",
    }
    s.setdefault("comparisons", []).append(c)
    return c["id"]


def record(s, c, d):
    reason = validity(s, c)
    if reason:
        raise HTTPException(409, reason)
    if len(c["decisions"]) >= 80:
        raise HTTPException(422, "Comparison decision limit reached")
    pid, eid, response, source = (
        d.get(k) for k in ("participant_id", "event_id", "response", "source")
    )
    p = next((p for p in s["participants"] if p["id"] == pid), None)
    e = next((e for e in s["events"] if e["id"] == eid), None)
    if p is None or e is None:
        raise HTTPException(404, "Participant or event not in this workspace")
    if response not in ("interested", "maybe", "not interested") or source not in (
        "catalogue",
        "qloo",
    ):
        raise HTTPException(422, "Invalid comparison response or discovery source")
    evidence = None
    if source == "qloo":
        suggestion = next(
            (
                r
                for r in p["suggestions"]
                if r["event_id"] == eid and r.get("event_version") == e["version"]
            ),
            None,
        )
        if not p["consent"] or not suggestion:
            raise HTTPException(
                422, "Current consented Qloo suggestion required; run discovery first"
            )
        ev = next(
            (
                v
                for v in s["evidence"]
                if v["id"] == suggestion["evidence_id"] and v["path"] == "/v2/insights"
            ),
            None,
        )
        seeds = ",".join(f["entity_id"] for f in p["favorites"])
        if (
            not ev
            or ev["params"].get("signal.interests.entities") != seeds
            or not any(
                x["entity_id"] == e["entity_id"] for x in entities(ev["response"])
            )
        ):
            raise HTTPException(
                422,
                "Suggestion does not match the current approved favorites and event identity",
            )
        evidence = {
            "id": ev["id"],
            "fingerprint": ev["fingerprint"],
            "retrieved_at": ev["retrieved_at"],
            "mode": suggestion["mode"],
            "event_entity_id": e["entity_id"],
            "approved_favorites": deepcopy(p["favorites"]),
            "rank": suggestion["rank"],
        }
    before = p["interests"].get(eid, {}).get("response", "unseen")
    c["decisions"].append(
        {
            "participant_id": pid,
            "event_id": eid,
            "event_version": e["version"],
            "before": before,
            "response": response,
            "source": source,
            "evidence": evidence,
            "at": stamp(),
            "actor_mode": "synthetic demo participant",
        }
    )
    p["interests"][eid] = {
        "response": response,
        "event_version": e["version"],
        "recorded_at": stamp(),
    }
    p["version"] += 1
    c["result"] = None


def evaluate(s, c):
    reason = validity(s, c)
    if reason:
        raise HTTPException(409, reason)
    at = date(c["created_at"])
    summaries = []
    for snap in (c["snapshot"], expected(c)):
        result = solve(snap, at=at)
        best = result["plans"][0] if result["plans"] else None
        if best and verify(snap, best["assignments"], at):
            raise HTTPException(500, "Independent comparison check failed")
        summaries.append(
            {
                "served": best["served"] if best else None,
                "cost_minor": best["cost_minor"] if best else None,
                "assignments": best["assignments"] if best else {},
                "unserved": best["unserved"] if best else [],
                "blockers": result["blockers"],
                "solver_status": result["solver_status"],
                "found_plan": best is not None,
            }
        )
    before, after = summaries
    complete = all(
        x["solver_status"] == "exhaustive search complete" for x in summaries
    )
    # No-plan and timeout results remain unknown; never convert them into zero-cost wins.
    comparable = all(x["found_plan"] for x in summaries)
    delta = after["served"] - before["served"] if comparable else None
    cost_delta = after["cost_minor"] - before["cost_minor"] if comparable else None
    sources = sorted(set(r["source"] for r in c["decisions"]))
    verdict = (
        "No new decisions recorded."
        if not c["decisions"]
        else "No improvement in feasible coverage or organizer cost."
        if comparable and delta == 0 and cost_delta == 0
        else "The checked plans differ. Inspect coverage, cost, and changed assignments."
        if comparable
        else "A checked plan was not found for one or both inputs. No numeric uplift is claimed."
    )
    if not complete:
        verdict = "Search did not finish exhaustively. Results are checked candidates, not established optima."
    latest = {(r["participant_id"], r["event_id"]): r for r in c["decisions"]}
    baseline_people = {p["id"]: p for p in c["snapshot"]["participants"]}
    qloo_choices = [r for r in latest.values() if r["source"] == "qloo"]
    new_qloo_choices = [
        r
        for r in qloo_choices
        if r["response"] == "interested"
        and baseline_people[r["participant_id"]]["interests"]
        .get(r["event_id"], {})
        .get("response")
        != "interested"
    ]
    # Trace each latest decision through the same frozen inputs used by the solver.
    evaluated = expected(c)
    evaluated_people = {p["id"]: p for p in evaluated["participants"]}
    offer_events = {o["id"]: o["event_id"] for o in evaluated["offers"]}
    decision_paths = []
    for r in latest.values():
        pid, eid = r["participant_id"], r["event_id"]
        checks = [
            {
                "offer_id": o["id"],
                "blockers": blockers(evaluated, evaluated_people[pid], o, at),
            }
            for o in evaluated["offers"]
            if o["event_id"] == eid
        ]
        eligible = [x["offer_id"] for x in checks if not x["blockers"]]
        assigned = after["assignments"].get(pid)
        selected = bool(assigned and offer_events.get(assigned) == eid)
        outcome = (
            "not_accepted"
            if r["response"] != "interested"
            else "blocked"
            if not eligible
            else "no_checked_plan"
            if not after["found_plan"]
            else "selected"
            if selected
            else "available_not_selected"
        )
        decision_paths.append(
            {
                "participant_id": pid,
                "event_id": eid,
                "source": r["source"],
                "baseline_response": baseline_people[pid]["interests"]
                .get(eid, {})
                .get("response", "unseen"),
                "response": r["response"],
                "evidence": deepcopy(r["evidence"]),
                "individual_offer_checks": checks,
                "eligible_offer_ids": eligible,
                "assigned_offer_id": assigned,
                "selected": selected,
                "outcome": outcome,
            }
        )
    c["result"] = {
        "decision_paths": decision_paths,
        "discovery_contribution": {
            "qloo_choices_reviewed": len(qloo_choices),
            "newly_accepted_qloo_choices": len(new_qloo_choices),
            "newly_accepted_event_ids": sorted(
                {r["event_id"] for r in new_qloo_choices}
            ),
            "limitation": "Explicit synthetic decisions, not observed human acceptance or causal uplift; repeated decisions count once using the latest response.",
        },
        "before": before,
        "after": after,
        "coverage_delta": delta,
        "cost_delta_minor": cost_delta,
        "complete": complete,
        "sources": sources,
        "evaluated_at": stamp(),
        "evaluation_clock": c["created_at"],
        "participants": len(c["snapshot"]["participants"]),
        "verdict": verdict,
        "changed_assignments": [
            {
                "participant_id": pid,
                "before": before["assignments"].get(pid),
                "after": after["assignments"].get(pid),
            }
            for pid in sorted(set(before["assignments"]) | set(after["assignments"]))
            if before["assignments"].get(pid) != after["assignments"].get(pid)
        ],
        "limitation": "Historical synthetic comparison, not an actionable proposal or causal experiment. Equal inputs and evaluation time; only recorded interest responses differ. Human acceptance and real-world impact remain unmeasured.",
    }
    return c["result"]


def public(s, c):
    out = deepcopy(c)
    out.pop("snapshot")
    out["invalid_reason"] = validity(s, c)
    out["baseline_choices"] = choices(c["snapshot"])
    out["baseline_summary"] = {
        "budget_minor": c["snapshot"]["window"]["budget_minor"],
        "people": {p["id"]: p["name"] for p in c["snapshot"]["participants"]},
        "events": {e["id"]: e["title"] for e in c["snapshot"]["events"]},
        "offer_events": {o["id"]: o["event_id"] for o in c["snapshot"]["offers"]},
    }
    return out
