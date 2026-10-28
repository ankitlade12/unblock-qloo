"""Bounded exhaustive search. Provider facts and human interest alone govern eligibility."""

from collections import Counter
from datetime import datetime
from time import monotonic
from .domain import now


def date(value):
    return datetime.fromisoformat(value)


def blockers(s, p, o, at=None):
    at = at or now()
    e = next((e for e in s["events"] if e["id"] == o["event_id"]), None)
    r = p["requirements"]
    reasons = []
    if not e:
        return ["Unknown event"]
    interest = p["interests"].get(e["id"], {})
    if r["withdrawn"]:
        reasons.append("Participant withdrew")
    if interest.get("response") != "interested":
        reasons.append("Explicit interest required")
    if interest.get("event_version") != e["version"]:
        reasons.append("Interest must be renewed for this event version")
    if e["cancelled"]:
        reasons.append("Event cancelled")
    if not o["active"]:
        reasons.append("Transport offer unavailable")
    if date(o["expires_at"]) <= at:
        reasons.append("Transport offer expired")
    if date(e["valid_until"]) <= at:
        reasons.append("Event evidence expired")
    if date(o["departure"]) <= at:
        reasons.append("Transport already departed")
    if date(e["start"]) <= at:
        reasons.append("Event already started")
    if not o["source"] or not e["source"]:
        reasons.append("Operational evidence missing")
    if date(o["departure"]) > date(e["start"]) or date(o["returns"]) < date(e["end"]):
        reasons.append("Transport does not cover event schedule")
    if date(o["departure"]) < date(r["available_from"]) or date(o["returns"]) > date(
        r["available_until"]
    ):
        reasons.append("Outside participant availability / return deadline")
    if date(o["departure"]) < date(s["window"]["start"]) or date(o["returns"]) > date(
        s["window"]["end"]
    ):
        reasons.append("Outside planning window")
    if r["step_free"] or r["wheelchair"]:
        if e["step_free"] is not True:
            reasons.append("Venue step-free access unknown or unavailable")
        if o["step_free"] is not True:
            reasons.append("Transport step-free access unknown or unavailable")
    if r["hearing_loop"] and e["hearing_loop"] is not True:
        reasons.append("Hearing loop unknown or unavailable")
    if o["contribution_minor"] > r["contribution_minor"]:
        reasons.append("Participant contribution exceeds limit")
    if r["wheelchair"] and not o["wheelchair"]:
        reasons.append("No wheelchair position")
    return reasons


def cost(s, assignments):
    offers = {o["id"]: o for o in s["offers"]}
    events = {e["id"]: e for e in s["events"]}
    people = {p["id"]: p for p in s["participants"]}
    return sum(offers[oid]["fixed_minor"] for oid in set(assignments.values())) + sum(
        max(
            0,
            events[offers[oid]["event_id"]]["ticket_minor"]
            * (1 + people[pid]["requirements"]["companion"])
            - offers[oid]["contribution_minor"],
        )
        for pid, oid in assignments.items()
    )


def verify(s, assignments, at=None):
    """Independent aggregate check; never trusts the search's running totals."""
    errors = []
    people = {p["id"]: p for p in s["participants"]}
    offers = {o["id"]: o for o in s["offers"]}
    events = {e["id"]: e for e in s["events"]}
    seats = Counter()
    wheel = Counter()
    tickets = Counter()
    groups = Counter()
    for pid, oid in assignments.items():
        if pid not in people or oid not in offers:
            errors.append("Unknown participant or offer")
            continue
        p = people[pid]
        o = offers[oid]
        errors.extend(f"{pid}: {x}" for x in blockers(s, p, o, at))
        seats[oid] += 1 + int(p["requirements"]["companion"])
        wheel[oid] += int(p["requirements"]["wheelchair"])
        tickets[o["event_id"]] += 1 + int(p["requirements"]["companion"])
        groups[oid] += 1
    for oid in groups:
        if seats[oid] > offers[oid]["seats"]:
            errors.append("Vehicle seat capacity exceeded")
        if wheel[oid] > offers[oid]["wheelchair"]:
            errors.append("Wheelchair capacity exceeded")
        if groups[oid] < offers[oid]["minimum"]:
            errors.append("Minimum group size not met")
    for eid, total in tickets.items():
        if total > events[eid]["tickets"]:
            errors.append("Shared event inventory exceeded")
    used = [offers[oid] for oid in groups]
    for i, o in enumerate(used):
        for other in used[i + 1 :]:
            if (
                o["vehicle"] == other["vehicle"]
                and date(o["departure"]) < date(other["returns"])
                and date(other["departure"]) < date(o["returns"])
            ):
                errors.append("Vehicle double booked")
    if (
        not any("Unknown" in e for e in errors)
        and cost(s, assignments) > s["window"]["budget_minor"]
    ):
        errors.append("Organizer budget exceeded")
    for p in people.values():
        if (
            p["requirements"]["mandatory"]
            and not p["requirements"]["withdrawn"]
            and p["id"] not in assignments
        ):
            errors.append(f"Mandatory service commitment: {p['name']}")
    return list(dict.fromkeys(errors))


def solve(s, timeout=3, previous=None, at=None):
    at = at or now()
    start = monotonic()
    timed_out = False
    nodes = 0
    people = sorted(
        s["participants"], key=lambda p: (not p["requirements"]["mandatory"], p["id"])
    )
    offers = {o["id"]: o for o in s["offers"]}
    events = {e["id"]: e for e in s["events"]}
    options = {
        p["id"]: [o["id"] for o in s["offers"] if not blockers(s, p, o, at)]
        for p in people
    }
    top = []
    a = {}
    seats = Counter()
    wheel = Counter()
    tickets = Counter()
    counts = Counter()

    def visit(i, total):
        nonlocal nodes, timed_out
        nodes += 1
        if monotonic() - start > timeout:
            timed_out = True
            return
        if top and len(top) >= 3 and len(a) + len(people) - i < top[-1][1]["served"]:
            return
        if i == len(people):
            if not a or verify(s, a, at):
                return
            disruption = (
                sum(previous.get(pid) != oid for pid, oid in a.items())
                + len(set(previous) - set(a))
                if previous
                else 0
            )
            key = (-len(a), total, disruption, tuple(sorted(a.items())))
            if any(x[0] == key for x in top):
                return
            result = {
                "assignments": dict(a),
                "cost_minor": total,
                "served": len(a),
                "unserved": [],
            }
            for p in people:
                if p["id"] not in a:
                    reasons = (
                        sorted(
                            set(
                                reason
                                for o in s["offers"]
                                for reason in blockers(s, p, o, at)
                            )
                        )
                        if not options[p["id"]]
                        else [
                            "Budget, shared capacity, or vehicle conflict prevents inclusion in this plan"
                        ]
                    )
                    result["unserved"].append(
                        {
                            "participant_id": p["id"],
                            "reasons": reasons or ["No resource offers"],
                        }
                    )
            top.append((key, result))
            top.sort(key=lambda x: x[0])
            del top[3:]
            return
        p = people[i]
        pid = p["id"]
        r = p["requirements"]
        demand = 1 + int(r["companion"])
        for oid in options[pid]:
            o = offers[oid]
            e = events[o["event_id"]]
            new = counts[oid] == 0
            added = (o["fixed_minor"] if new else 0) + max(
                0, e["ticket_minor"] * demand - o["contribution_minor"]
            )
            if (
                total + added > s["window"]["budget_minor"]
                or seats[oid] + demand > o["seats"]
                or wheel[oid] + int(r["wheelchair"]) > o["wheelchair"]
                or tickets[e["id"]] + demand > e["tickets"]
            ):
                continue
            if new and any(
                offers[k]["vehicle"] == o["vehicle"]
                and date(o["departure"]) < date(offers[k]["returns"])
                and date(offers[k]["departure"]) < date(o["returns"])
                for k in counts
                if counts[k]
            ):
                continue
            a[pid] = oid
            counts[oid] += 1
            seats[oid] += demand
            wheel[oid] += int(r["wheelchair"])
            tickets[e["id"]] += demand
            visit(i + 1, total + added)
            del a[pid]
            counts[oid] -= 1
            seats[oid] -= demand
            wheel[oid] -= int(r["wheelchair"])
            tickets[e["id"]] -= demand
        if not r["mandatory"] or r["withdrawn"]:
            visit(i + 1, total)

    visit(0, 0)
    return {
        "plans": [x[1] for x in top],
        "solver_status": "feasible; optimality not established"
        if timed_out
        else "exhaustive search complete",
        "nodes": nodes,
        "duration_ms": round((monotonic() - start) * 1000),
        "blockers": []
        if top
        else sorted(
            set(
                reason
                for p in people
                for o in s["offers"]
                for reason in blockers(s, p, o, at)
            )
        )
        or [
            "No assignment satisfies budget, capacities, minimum group size, and service commitments"
        ],
    }
