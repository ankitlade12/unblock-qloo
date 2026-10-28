"""A recommendation, an individual option, and a group assignment are distinct."""

from copy import deepcopy
import pytest
from services.api import comparison
from services.api.domain import seed


@pytest.mark.parametrize(
    "scenario,expected",
    [
        ("selected", "selected"),
        ("new_option", "available_not_selected"),
        ("declined", "not_accepted"),
        ("no_transport", "blocked"),
        ("access", "blocked"),
        ("zero_budget", "no_checked_plan"),
    ],
)
def test_decision_outcomes_use_frozen_operational_inputs(scenario, expected):
    s = seed()
    eid = {"new_option": "e7", "selected": "e3"}.get(scenario, "e1")
    if scenario == "no_transport":
        s["offers"] = [o for o in s["offers"] if o["event_id"] != eid]
    if scenario == "access":
        s["participants"][0]["requirements"]["step_free"] = True
        next(e for e in s["events"] if e["id"] == eid)["step_free"] = None
    if scenario == "zero_budget":
        s["window"]["budget_minor"] = 0
    comparison.start(s)
    c = s["comparisons"][-1]
    baseline = deepcopy(c["snapshot"])
    comparison.record(
        s,
        c,
        {
            "participant_id": "p1",
            "event_id": eid,
            "response": "not interested" if scenario == "declined" else "interested",
            "source": "catalogue",
        },
    )
    r = comparison.evaluate(s, c)
    path = r["decision_paths"][0]
    assert path["outcome"] == expected
    assert path["selected"] == (expected == "selected")
    assert path["evidence"] is None and path["source"] == "catalogue"
    assert c["snapshot"] == baseline
    if scenario == "zero_budget":
        assert path["eligible_offer_ids"] and r["coverage_delta"] is None
    if scenario == "access":
        assert (
            "Venue step-free access unknown or unavailable"
            in path["individual_offer_checks"][0]["blockers"]
        )
