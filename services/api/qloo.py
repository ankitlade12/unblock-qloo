"""Private, workspace-scoped provider evidence. Never synthesizes provider results."""

import hashlib
import json
import os
from uuid import uuid4
import httpx
from fastapi import HTTPException
from .domain import stamp
from . import store

ORIGINS = {"https://api.qloo.com", "https://hackathon.api.qloo.com"}


def request(s, path, params):
    api_key = os.getenv("QLOO_API_KEY")
    if not api_key:
        raise HTTPException(
            503,
            "Qloo key not configured. Use the labeled synthetic catalogue; live discovery is unavailable.",
        )
    origin = os.getenv("QLOO_API_ORIGIN", "https://hackathon.api.qloo.com").rstrip("/")
    if origin not in ORIGINS:
        raise HTTPException(503, "Qloo origin is not allowlisted")
    fingerprint = hashlib.sha256(
        json.dumps([path, params], sort_keys=True).encode()
    ).hexdigest()
    # Workspace lifetime is 24h. A cached result is always explicitly identified.
    for ev in s["evidence"]:
        if ev["fingerprint"] == fingerprint:
            return ev, "recorded"
    store.consume(s, "provider_calls", int(os.getenv("QLOO_CALL_BUDGET", "40")))
    try:
        response = httpx.get(
            origin + path,
            params=params,
            headers={"X-Api-Key": api_key},
            timeout=15,
            follow_redirects=False,
        )
        if response.status_code == 429:
            raise HTTPException(
                429,
                "Qloo rate limited this request. Try again later; no automatic retry.",
                headers={"Retry-After": response.headers.get("Retry-After", "60")},
            )
        if response.status_code in (401, 403):
            raise HTTPException(
                503, "Qloo rejected the configured credential; live discovery stopped"
            )
        response.raise_for_status()
        raw = response.json()
        if not isinstance(raw, dict):
            raise ValueError("Unexpected provider response")
    except (httpx.HTTPError, ValueError):
        raise HTTPException(
            502, "Qloo request failed or timed out; prior choices are preserved"
        )
    ev = {
        "id": str(uuid4()),
        "fingerprint": fingerprint,
        "retrieved_at": stamp(),
        "path": path,
        "params": params,
        "response": raw,
    }
    s["evidence"].append(ev)
    return ev, "live"


def entities(raw):
    results = raw.get("results", [])
    if isinstance(results, dict):
        results = results.get("entities", [])
    if not isinstance(results, list):
        raise HTTPException(502, "Unexpected Qloo entity response")
    return [
        e
        for e in results
        if isinstance(e, dict)
        and isinstance(e.get("entity_id"), str)
        and isinstance(e.get("name"), str)
    ]


def resolve(s, query):
    ev, mode = request(
        s, "/search", {"query": query, "types": "urn:entity:movie", "take": 8}
    )
    choices = [
        {
            "entity_id": e["entity_id"],
            "name": e["name"],
            "year": e.get("properties", {}).get("release_year"),
            "evidence_id": ev["id"],
        }
        for e in entities(ev["response"])
    ]
    s["entity_candidates"] = (s["entity_candidates"] + choices)[-200:]
    return {"choices": choices, "mode": mode, "evidence_id": ev["id"]}


def discover(s, p):
    if not p["consent"]:
        raise HTTPException(
            422, "Opt in to cultural profiling or choose directly from the catalogue"
        )
    if not p["favorites"]:
        raise HTTPException(422, "Resolve and select a favorite before live discovery")
    mapped = {}
    for event in s["events"]:
        if event["entity_id"] and not event["cancelled"]:
            mapped.setdefault(event["entity_id"], []).append(event)
    if not mapped:
        raise HTTPException(
            422, "Organizer must map catalogue films to verified Qloo entities first"
        )
    ev, mode = request(
        s,
        "/v2/insights",
        {
            "filter.type": "urn:entity:movie",
            "signal.interests.entities": ",".join(
                f["entity_id"] for f in p["favorites"]
            ),
            "take": 50,
        },
    )
    matches = []
    for rank, e in enumerate(entities(ev["response"])):
        for event in mapped.get(e["entity_id"], []):
            matches.append(
                {
                    "event_id": event["id"],
                    "event_version": event["version"],
                    "rank": rank + 1,
                    "affinity": e.get("query", {}).get("affinity"),
                    "evidence_id": ev["id"],
                    "mode": mode,
                    "retrieved_at": ev["retrieved_at"],
                    "reason": "Qloo returned this film for your approved favorites. Relevance is not an RSVP or a probability of enjoyment.",
                }
            )
    p["suggestions"] = matches
    result = {
        "suggestions": matches,
        "covered": len(matches),
        "mapped": sum(len(events) for events in mapped.values()),
        "mode": mode,
        "evidence_id": ev["id"],
    }
    p["discovery"] = {k: v for k, v in result.items() if k != "suggestions"}
    p["discovery"]["retrieved_at"] = ev["retrieved_at"]
    return result
