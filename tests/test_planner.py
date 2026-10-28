from copy import deepcopy
from datetime import timedelta
from itertools import product
import random
from services.api.domain import seed, now
from services.api.planner import solve, verify, cost, blockers


def test_seed_has_checked_plans():
    s = seed()
    r = solve(s)
    assert len(r["plans"]) == 3
    assert r["plans"][0]["served"] >= 10
    for p in r["plans"]:
        assert verify(s, p["assignments"]) == []
        assert cost(s, p["assignments"]) == p["cost_minor"]


def test_exhaustive_oracle():
    for n in range(8):
        s = seed()
        s["participants"] = s["participants"][:4]
        s["offers"] = s["offers"][:2]
        s["window"]["budget_minor"] = random.Random(n).randint(8000, 25000)
        valid = []
        for choices in product([None, "o1", "o2"], repeat=4):
            a = {p["id"]: o for p, o in zip(s["participants"], choices) if o}
            if a and not verify(s, a):
                valid.append((-len(a), cost(s, a), tuple(sorted(a.items()))))
        actual = solve(s, timeout=10)
        assert actual["solver_status"] == "exhaustive search complete"
        if not valid:
            assert not actual["plans"]
        else:
            p = actual["plans"][0]
            assert (
                -p["served"],
                p["cost_minor"],
                tuple(sorted(p["assignments"].items())),
            ) == min(valid)


def test_companion_and_shared_inventory():
    s = seed()
    s["offers"][0]["seats"] = 20
    s["events"][0]["tickets"] = 2
    other = deepcopy(s["offers"][0])
    other.update(id="o5", vehicle="other")
    s["offers"].append(other)
    assert "Shared event inventory exceeded" in verify(s, {"p1": "o1", "p2": "o5"})
    s["events"][0]["tickets"] = 20
    s["offers"][0]["seats"] = 2
    assert "Vehicle seat capacity exceeded" in verify(s, {"p1": "o1", "p2": "o1"})


def test_unknown_access_rejection_expiry_and_conflict():
    s = seed()
    p = s["participants"][1]
    o = s["offers"][0]
    s["events"][0]["step_free"] = None
    assert any("unknown" in b for b in blockers(s, p, o))
    s["events"][0]["step_free"] = True
    p["interests"]["e1"]["response"] = "maybe"
    assert "Explicit interest required" in blockers(s, p, o)
    o["expires_at"] = (now() - timedelta(seconds=1)).isoformat()
    assert "Transport offer expired" in blockers(s, p, o)
    s = seed()
    assert "Vehicle double booked" in verify(
        s, {"p1": "o1", "p2": "o1", "p3": "o3", "p4": "o3"}
    )


def test_budget_boundary_and_mandatory():
    s = seed()
    a = {"p1": "o1", "p2": "o1"}
    s["window"]["budget_minor"] = cost(s, a)
    assert verify(s, a) == []
    s["window"]["budget_minor"] -= 1
    assert "Organizer budget exceeded" in verify(s, a)
    s["window"]["budget_minor"] = 0
    s["participants"][0]["requirements"]["mandatory"] = True
    assert solve(s)["plans"] == []


def test_timeout_never_claims_optimality():
    result = solve(seed(), timeout=0)
    assert result["solver_status"] == "feasible; optimality not established"
    assert result["plans"] == []
