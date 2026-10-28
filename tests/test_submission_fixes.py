# ruff: noqa: F811
import json
from datetime import timedelta
from uuid import uuid4
import pytest
from services.api import qloo, store
from services.api.domain import now
from test_api import client, cmd  # noqa: F401 — shared pytest fixture


def provider_result(s, path, params):
    events = [s["events"][0], s["events"][6]]
    evidence = {
        "id": str(uuid4()),
        "fingerprint": "test-proof",
        "path": path,
        "params": params,
        "retrieved_at": now().isoformat(),
        "response": {
            "results": [
                {"entity_id": e["entity_id"], "name": e["title"]} for e in events
            ]
        },
    }
    s["evidence"].append(evidence)
    return evidence, "live"


def load_profile(c):
    r = cmd(c, "demo_profile", "p1", {"favorite": "Inside Out", "consent": True})
    assert r.status_code == 200, r.text
    return r.json()["state"]


def test_taste_metadata_preserves_approval_and_legacy_hash(client, monkeypatch):
    load_profile(client)
    p = cmd(client, "plan").json()["state"]["proposals"][0]
    cmd(client, "approve", p["id"])
    with store.workspace(client.cookies["unblock"]) as s:
        s["proposals"][0]["input_hash"] = "legacy-fingerprint"
    before = client.get("/api/state").json()
    monkeypatch.setattr(qloo, "request", provider_result)
    result = cmd(client, "discover", "p1").json()["state"]
    assert result["revision"] == before["revision"]
    assert result["proposals"][0]["status"] == "Awaiting participant commitment"
    assert result["proposals"][0]["approval"] == before["proposals"][0]["approval"]
    result = cmd(client, "consent", "p1", {"consent": False}).json()["state"]
    assert result["proposals"][0]["status"] == "Awaiting participant commitment"
    result = cmd(
        client, "interest", "p1", {"event_id": "e1", "response": "not interested"}
    ).json()["state"]
    assert result["proposals"][0]["status"] == "Needs review after a change"


@pytest.mark.parametrize(
    "data",
    [
        {"events": [None]},
        {"events": "wrong"},
        {"events": [], "offers": []},
        {"events": [{}], "offers": None},
    ],
)
def test_import_invalid_structure_is_422_without_mutation(client, data):
    before = client.get("/api/state").json()
    assert cmd(client, "import", data=data).status_code == 422
    after = client.get("/api/state").json()
    assert (
        before["revision"] == after["revision"] and before["events"] == after["events"]
    )


def test_chunked_body_limit_and_bounded_replay(client):
    raw = json.dumps(
        {
            "revision": 1,
            "action": "window",
            "data": {"padding": "x" * 150000},
            "idempotency_key": str(uuid4()),
        }
    ).encode()
    r = client.post(
        "/api/command",
        content=iter([raw[:1000], raw[1000:]]),
        headers={"Content-Type": "application/json"},
    )
    assert r.status_code == 413
    raw = json.dumps(
        {
            "revision": 1,
            "action": "window",
            "data": {"budget_minor": 30000, "name": "Bounded request"},
            "idempotency_key": str(uuid4()),
        }
    ).encode()
    r = client.post(
        "/api/command",
        content=iter([raw[:10], raw[10:]]),
        headers={"Content-Type": "application/json"},
    )
    assert (
        r.status_code == 200
        and r.json()["state"]["window"]["name"] == "Bounded request"
    )


def test_reviewed_profile_requires_consent_and_preserves_baseline(client, monkeypatch):
    before = client.get("/api/state").json()
    monkeypatch.setattr(
        qloo.httpx,
        "get",
        lambda *a, **k: pytest.fail("Profile loading must not call Qloo"),
    )
    assert (
        cmd(client, "demo_profile", "p1", {"favorite": "Inside Out"}).status_code == 422
    )
    after = load_profile(client)
    assert all(e["entity_id"] for e in after["events"])
    assert [p["interests"] for p in before["participants"]] == [
        p["interests"] for p in after["participants"]
    ]
    assert after["provider_calls"] == 0
    plan = cmd(client, "plan").json()["result"]["plans"][0]
    assert plan["served"] == 12 and plan["cost_minor"] == 22400
    assert (
        cmd(
            client,
            "demo_profile",
            "p1",
            {"favorite": "Moonrise Kingdom", "consent": True},
        ).status_code
        == 409
    )


def test_discovery_contribution_counts_latest_choices_and_exports_evidence(
    client, monkeypatch
):
    load_profile(client)
    monkeypatch.setattr(qloo, "request", provider_result)
    result = cmd(client, "discover", "p1").json()["result"]
    assert result["already_interested"] == 1
    assert result["new_options"] == [
        {
            "event_id": "e7",
            "title": "Coco",
            "previous_response": "unseen",
            "individually_compatible": True,
        }
    ]
    assert (
        client.get("/api/state").json()["participants"][0]["interests"]["e7"][
            "response"
        ]
        == "unseen"
    )
    cid = cmd(client, "comparison_start").json()["result"]["id"]
    for _ in range(2):
        assert (
            cmd(
                client,
                "comparison_response",
                cid,
                {
                    "participant_id": "p1",
                    "event_id": "e7",
                    "response": "interested",
                    "source": "qloo",
                },
            ).status_code
            == 200
        )
    result = cmd(client, "comparison_evaluate", cid).json()["result"]
    assert result["discovery_contribution"]["newly_accepted_qloo_choices"] == 1
    assert result["discovery_contribution"]["qloo_choices_reviewed"] == 1
    export = client.get(f"/api/comparisons/{cid}/export").json()
    assert export["decisions"][0]["evidence"]["id"]
    cmd(
        client,
        "comparison_response",
        cid,
        {
            "participant_id": "p1",
            "event_id": "e7",
            "response": "not interested",
            "source": "qloo",
        },
    )
    result = cmd(client, "comparison_evaluate", cid).json()["result"]
    assert result["discovery_contribution"]["newly_accepted_qloo_choices"] == 0


def test_simulated_outcomes_require_confirmation_and_remain_labeled(client):
    p = cmd(client, "plan").json()["state"]["proposals"][0]
    assert (
        cmd(client, "simulate_outcomes", p["id"], {"acknowledge": True}).status_code
        == 409
    )
    cmd(client, "approve", p["id"])
    for pid in p["assignments"]:
        cmd(client, "commit", p["id"], {"participant_id": pid, "decision": "accepted"})
    for oid in set(p["assignments"].values()):
        qty = sum(
            1
            + next(x for x in p["snapshot"]["participants"] if x["id"] == pid)[
                "requirements"
            ]["companion"]
            for pid, o in p["assignments"].items()
            if o == oid
        )
        cmd(
            client,
            "confirm",
            p["id"],
            {
                "offer_id": oid,
                "quantity": qty,
                "source": "Synthetic test confirmation",
                "expires_at": (now() + timedelta(hours=6)).isoformat(),
            },
        )
    body = {
        "participant_id": "p1",
        "attendance": "attended",
        "source": "Explicit fictional observation",
    }
    assert cmd(client, "outcome", p["id"], body).status_code == 409
    assert cmd(client, "simulate_outcomes", p["id"]).status_code == 422
    before = client.get("/api/state").json()
    r = cmd(client, "simulate_outcomes", p["id"], {"acknowledge": True})
    assert r.status_code == 200
    after = r.json()["state"]
    assert (
        after["events"] == before["events"] and after["revision"] == before["revision"]
    )
    assert after["proposals"][0]["status"] == "Confirmed"
    assert cmd(client, "outcome", p["id"], body).status_code == 200
    exported = client.get(f"/api/proposals/{p['id']}/export").json()
    assert exported["outcome_simulation_at"] == exported["outcomes"][0]["simulated_at"]
    assert exported["outcomes"][0]["mode"] == "synthetic"


def test_remaining_budget_is_shared_and_failed_attempts_count(client, monkeypatch):
    monkeypatch.setenv("QLOO_DAILY_CALL_BUDGET", "2")
    with pytest.raises(RuntimeError):
        with store.workspace(client.cookies["unblock"]) as s:
            store.consume(s, "provider_calls", 40)
            raise RuntimeError("Provider failed")
    assert client.get("/api/state").json()["provider_budget"]["remaining"] == 1
    client.post("/api/demo", json={})
    assert client.get("/api/state").json()["provider_budget"]["remaining"] == 1


def test_empty_plan_trace_describes_the_current_inputs(client):
    cmd(client, "window", data={"budget_minor": 0, "name": "No budget"})
    response = cmd(client, "plan").json()
    assert response["result"]["plans"] == []
    trace = response["state"]["traces"][0]
    assert trace["plan_count"] == 0
    assert trace["input_revision"] == response["state"]["revision"]
    assert (
        "downloadable template"
        in cmd(client, "import", data={"events": [None]}).json()["detail"]
    )
