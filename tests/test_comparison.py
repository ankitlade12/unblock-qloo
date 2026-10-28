from copy import deepcopy
import pytest
from fastapi import HTTPException
from services.api import comparison
from services.api.domain import seed, now
from test_api import client, cmd


def new():
    s = seed()
    comparison.start(s)
    return s, s["comparisons"][-1]


def test_baseline_is_immutable_and_no_change_is_honest():
    s, c = new()
    original = deepcopy(c["snapshot"])
    comparison.record(
        s,
        c,
        {
            "participant_id": "p1",
            "event_id": "e1",
            "response": "interested",
            "source": "catalogue",
        },
    )
    r = comparison.evaluate(s, c)
    assert c["snapshot"] == original
    assert r["coverage_delta"] == 0 and r["cost_delta_minor"] == 0
    assert r["sources"] == ["catalogue"] and "No improvement" in r["verdict"]
    assert not s["proposals"]


def test_resources_or_out_of_band_interests_invalidate():
    s, c = new()
    s["window"]["budget_minor"] += 100
    with pytest.raises(HTTPException) as e:
        comparison.evaluate(s, c)
    assert e.value.status_code == 409
    s, c = new()
    s["participants"][0]["interests"]["e1"]["response"] = "maybe"
    assert "outside" in comparison.validity(s, c)


def test_rejection_never_assigns_rejected_choice():
    s, c = new()
    comparison.record(
        s,
        c,
        {
            "participant_id": "p1",
            "event_id": "e3",
            "response": "not interested",
            "source": "catalogue",
        },
    )
    result = comparison.evaluate(s, c)
    assigned = result["after"]["assignments"].get("p1")
    assert assigned != "o3"
    assert c["decisions"][0]["before"] == "interested"


def test_missing_qloo_evidence_cannot_be_labeled_qloo():
    s, c = new()
    with pytest.raises(HTTPException) as exc:
        comparison.record(
            s,
            c,
            {
                "participant_id": "p1",
                "event_id": "e1",
                "response": "interested",
                "source": "qloo",
            },
        )
    assert exc.value.status_code == 422 and c["decisions"] == []


def test_qloo_chain_links_returned_entity_and_current_favorites():
    s = seed()
    p = s["participants"][0]
    p["consent"] = True
    p["favorites"] = [{"entity_id": "favorite-id", "name": "Favorite"}]
    s["events"][0]["entity_id"] = "movie-id"
    s["evidence"] = [
        {
            "id": "proof",
            "fingerprint": "fingerprint",
            "retrieved_at": now().isoformat(),
            "path": "/v2/insights",
            "params": {"signal.interests.entities": "favorite-id"},
            "response": {
                "results": {"entities": [{"entity_id": "movie-id", "name": "Soul"}]}
            },
        }
    ]
    p["suggestions"] = [
        {
            "event_id": "e1",
            "event_version": 1,
            "evidence_id": "proof",
            "rank": 1,
            "mode": "recorded",
        }
    ]
    comparison.start(s)
    c = s["comparisons"][-1]
    comparison.record(
        s,
        c,
        {
            "participant_id": "p1",
            "event_id": "e1",
            "response": "interested",
            "source": "qloo",
        },
    )
    assert (
        c["decisions"][0]["evidence"]["approved_favorites"][0]["entity_id"]
        == "favorite-id"
    )
    p["favorites"] = [{"entity_id": "changed", "name": "New favorite"}]
    with pytest.raises(HTTPException):
        comparison.record(
            s,
            c,
            {
                "participant_id": "p1",
                "event_id": "e1",
                "response": "interested",
                "source": "qloo",
            },
        )


def test_comparison_is_historical_same_clock_and_missing_plan_is_not_zero():
    s, c = new()
    s["window"]["budget_minor"] = 0
    comparison.start(s)
    c = s["comparisons"][-1]
    result = comparison.evaluate(s, c)
    assert result["before"]["served"] is None and result["coverage_delta"] is None
    assert result["evaluation_clock"] == c["created_at"]


def test_comparison_api_and_export_isolated(client):
    c = client
    r = cmd(c, "comparison_start")
    assert r.status_code == 200
    cid = r.json()["result"]["id"]
    assert (
        cmd(
            c,
            "comparison_response",
            cid,
            {
                "participant_id": "p1",
                "event_id": "e1",
                "response": "maybe",
                "source": "catalogue",
            },
        ).status_code
        == 200
    )
    assert cmd(c, "comparison_evaluate", cid).status_code == 200
    exported = c.get(f"/api/comparisons/{cid}/export")
    assert exported.status_code == 200
    body = exported.json()
    assert body["decisions"][0]["evidence"] is None
    assert set(body["frozen_inputs"]["participants"][0]) == {
        "id",
        "requirements",
        "interests",
    }
    assert body["baseline_summary"]["events"]["e1"] == "Soul"
    from fastapi.testclient import TestClient
    from services.api.main import app

    with TestClient(app, headers={"X-Unblock-Request": "1"}) as other:
        other.post("/api/demo", json={})
        assert other.get(f"/api/comparisons/{cid}/export").status_code == 404
        assert cmd(other, "comparison_evaluate", cid).status_code == 404
