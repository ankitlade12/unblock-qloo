from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import timedelta
from threading import Event
from time import monotonic
from uuid import uuid4
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from services.api import store, planner, main, qloo
from services.api.domain import seed, now
from test_api import client, cmd


def test_withdrawal_excludes_person_from_replanning(client):
    p = cmd(client, "plan").json()["state"]["proposals"][0]
    cmd(client, "approve", p["id"])
    result = cmd(
        client, "commit", p["id"], {"participant_id": "p1", "decision": "withdrawn"}
    )
    assert result.json()["state"]["participants"][0]["requirements"]["withdrawn"]
    plans = cmd(client, "replan").json()["result"]["plans"]
    assert plans and all("p1" not in p["assignments"] for p in plans)


def test_departure_cutoff_preserves_historical_checks():
    s = seed()
    offer = s["offers"][0]
    departure = planner.date(offer["departure"])
    offer["expires_at"] = (departure + timedelta(hours=4)).isoformat()
    assert not planner.blockers(
        s, s["participants"][0], offer, departure - timedelta(seconds=1)
    )
    assert "Transport already departed" in planner.blockers(
        s, s["participants"][0], offer, departure
    )


def test_attendance_uses_historical_confirmation(client, monkeypatch):
    p = cmd(client, "plan").json()["state"]["proposals"][0]
    cmd(client, "approve", p["id"])
    for pid in p["assignments"]:
        cmd(client, "commit", p["id"], {"participant_id": pid, "decision": "accepted"})
    for oid in set(p["assignments"].values()):
        quantity = sum(
            1
            + next(x for x in p["snapshot"]["participants"] if x["id"] == pid)[
                "requirements"
            ]["companion"]
            for pid, o in p["assignments"].items()
            if o == oid
        )
        assert (
            cmd(
                client,
                "confirm",
                p["id"],
                {
                    "offer_id": oid,
                    "quantity": quantity,
                    "source": "Synthetic confirmation",
                    "expires_at": (now() + timedelta(days=1)).isoformat(),
                },
            ).status_code
            == 200
        )
    body = {
        "participant_id": "p1",
        "attendance": "attended",
        "source": "Synthetic observation",
    }
    assert cmd(client, "outcome", p["id"], body).status_code == 409
    future = max(planner.date(e["end"]) for e in p["snapshot"]["events"]) + timedelta(
        hours=1
    )
    monkeypatch.setattr(main, "now", lambda: future)
    monkeypatch.setattr(planner, "now", lambda: future)
    state = client.get("/api/state").json()
    assert state["proposals"][0]["status"] == "Needs review after a change"
    assert state["proposals"][0]["can_record_outcomes"]
    assert cmd(client, "outcome", p["id"], body).status_code == 200
    assert client.get(f"/api/proposals/{p['id']}/export?final=true").status_code == 409


def test_title_change_clears_mapping_and_suggestions(client):
    with store.workspace(client.cookies["unblock"]) as s:
        s["events"][0]["entity_id"] = "original"
        s["participants"][0]["suggestions"] = [{"event_id": "e1", "event_version": 1}]
    state = cmd(client, "event", "e1", {"title": "Different film"}).json()["state"]
    assert state["events"][0]["entity_id"] is None
    assert state["participants"][0]["suggestions"] == []


def test_provider_matches_all_screenings(monkeypatch):
    s = seed()
    p = s["participants"][0]
    p.update(consent=True, favorites=[{"entity_id": "favorite"}])
    for e in s["events"][:2]:
        e["entity_id"] = "film"
    ev = {
        "id": "proof",
        "retrieved_at": now().isoformat(),
        "response": {"results": [{"entity_id": "film", "name": "Film"}]},
    }
    monkeypatch.setattr(qloo, "request", lambda *args: (ev, "recorded"))
    result = qloo.discover(s, p)
    assert result["mapped"] == 2 and result["covered"] == 2
    assert {r["event_id"] for r in result["suggestions"]} == {"e1", "e2"}


def test_unrelated_reads_do_not_wait_and_conflicts_do_not_overwrite(client):
    token = client.cookies["unblock"]
    other = store.create()
    started, release = Event(), Event()

    def slow():
        with store.workspace(token) as s:
            s["window"]["name"] = "Slow update"
            started.set()
            assert release.wait(3)

    with ThreadPoolExecutor() as pool:
        pending = pool.submit(slow)
        assert started.wait(1)
        try:
            at = monotonic()
            with store.workspace(other, readonly=True):
                pass
            assert monotonic() - at < 1
            with store.workspace(token) as s:
                s["window"]["name"] = "Newer update"
        finally:
            release.set()
        with pytest.raises(HTTPException) as conflict:
            pending.result()
        assert conflict.value.status_code == 409
    assert store.read(token)[0]["window"]["name"] == "Newer update"


def test_creation_cookies_cannot_bypass_limit(client):
    for i in range(5):
        with TestClient(
            main.app, headers={"X-Unblock-Request": "1", "Cookie": f"unblock={uuid4()}"}
        ) as c:
            assert c.post("/api/demo", json={}).status_code == 200
    with TestClient(
        main.app, headers={"X-Unblock-Request": "1", "Cookie": f"unblock={uuid4()}"}
    ) as c:
        assert c.post("/api/demo", json={}).status_code == 429


def test_global_budget_survives_failure_and_new_workspace(client, monkeypatch):
    monkeypatch.setenv("QLOO_DAILY_CALL_BUDGET", "1")
    token = client.cookies["unblock"]
    with pytest.raises(ValueError):
        with store.workspace(token) as s:
            store.consume(s, "provider_calls", 40)
            raise ValueError("Network failed")
    assert store.read(token)[0]["provider_calls"] == 1
    with store.workspace(store.create()) as s:
        with pytest.raises(HTTPException) as cap:
            store.consume(s, "provider_calls", 40)
        assert cap.value.status_code == 429


def test_readonly_does_not_persist(client):
    token = client.cookies["unblock"]
    before, generation = store.read(token)
    with store.workspace(token, readonly=True) as s:
        s["window"]["name"] = "Not a write"
    after, later = store.read(token)
    assert before == after and generation == later


def test_all_catalogue_events_have_transport_and_baseline_is_preserved():
    s = seed()
    assert {e["id"] for e in s["events"]} == {o["event_id"] for o in s["offers"]}
    result = planner.solve(s)
    assert result["plans"][0]["served"] == 12
    assert result["plans"][0]["cost_minor"] == 22400


def test_health_fails_when_storage_is_unavailable(client, monkeypatch):
    def broken():
        raise OSError("storage unavailable")

    monkeypatch.setattr(store, "connect", broken)
    assert client.get("/api/health").status_code == 503


def test_legacy_database_migration(tmp_path, monkeypatch):
    import sqlite3
    import json

    path = str(tmp_path / "legacy.db")
    monkeypatch.setattr(store, "DB_PATH", path)
    with sqlite3.connect(path) as db:
        db.execute(
            "CREATE TABLE workspaces (token TEXT PRIMARY KEY, expires TEXT NOT NULL, state TEXT NOT NULL)"
        )
        db.execute(
            "INSERT INTO workspaces VALUES (?,?,?)",
            (
                store.key("old-session"),
                (now() + timedelta(hours=1)).isoformat(),
                json.dumps(seed()),
            ),
        )
    with store.workspace("old-session") as s:
        s["window"]["name"] = "Migrated safely"
    assert store.read("old-session")[0]["window"]["name"] == "Migrated safely"
