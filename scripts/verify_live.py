"""Explicitly opt-in live acceptance/evaluation. Never prints credentials or raw responses."""

import argparse
import json
import time
from pathlib import Path
from uuid import uuid4
import httpx

FILMS = [
    ("Soul", 2020),
    ("The Grand Budapest Hotel", 2014),
    ("Spirited Away", 2001),
    ("Hidden Figures", 2016),
    ("Amélie", 2001),
    ("The Secret Life of Walter Mitty", 2013),
    ("Coco", 2017),
    ("Fantastic Mr. Fox", 2009),
]
FAVORITES = [
    ("Inside Out", 2015),
    ("Moonrise Kingdom", 2012),
    ("My Neighbor Totoro", 1988),
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8011")
    parser.add_argument(
        "--allow-live",
        action="store_true",
        help="Authorize up to 14 Qloo requests in a fresh synthetic workspace",
    )
    parser.add_argument("--output", default="data/live-evaluation-summary.json")
    args = parser.parse_args()
    if not args.allow_live:
        parser.error(
            "Live requests require --allow-live; the general test suite never calls Qloo"
        )
    c = httpx.Client(
        base_url=args.base_url, headers={"X-Unblock-Request": "1"}, timeout=65
    )
    provider_times = []

    def state():
        r = c.get("/api/state")
        r.raise_for_status()
        return r.json()

    def command(action, target="", data=None):
        if action in ("resolve", "discover"):
            recent = [at for at in provider_times if time.monotonic() - at < 61]
            if len(recent) >= 7:
                print(
                    "Respecting provider pacing; next request in about one minute.",
                    flush=True,
                )
                time.sleep(max(0, 61 - (time.monotonic() - recent[0])))
            provider_times.append(time.monotonic())
        body = {
            "revision": state()["revision"],
            "action": action,
            "target": target,
            "data": data or {},
            "idempotency_key": str(uuid4()),
        }
        r = c.post("/api/command", json=body)
        if r.status_code == 429 and "Too many requests" in r.text:
            print(
                "Respecting application rate limit; retrying once after one minute.",
                flush=True,
            )
            time.sleep(61)
            r = c.post("/api/command", json=body)
        if not r.is_success:
            raise RuntimeError(
                f"{action} failed: HTTP {r.status_code}; inspect the app's error state"
            )
        return r.json()

    def resolve(title, year):
        result = command("resolve", data={"query": title})["result"]
        candidates = [
            v
            for v in result["choices"]
            if v["name"].casefold() == title.casefold() and v["year"] == year
        ]
        if len(candidates) != 1:
            raise RuntimeError(
                f"Review required for {title} ({year}); no unique exact match. No identity was guessed."
            )
        return candidates[0]["entity_id"]

    try:
        r = c.post("/api/demo", json={})
        r.raise_for_status()
        initial = state()
        if not initial["qloo_available"]:
            raise RuntimeError("Server Qloo credential is not configured")
        original = {
            p["id"]: {eid: v["response"] for eid, v in p["interests"].items()}
            for p in initial["participants"]
        }
        for i, (title, year) in enumerate(FILMS, 1):
            entity = resolve(title, year)
            command("map", f"e{i}", {"entity_id": entity})
            print(f"Reviewed mapping {i}/{len(FILMS)}: {title} ({year})", flush=True)
        # Identity review changes event versions. Renew the identical authored
        # fixture responses, not a weakened baseline and not real human consent.
        for pid, interests in original.items():
            for eid, response in interests.items():
                if response == "interested":
                    command("interest", pid, {"event_id": eid, "response": response})
        command("consent", "p1", {"consent": True})
        evaluations = []
        for index, (title, year) in enumerate(FAVORITES):
            for favorite in state()["participants"][0]["favorites"]:
                command(
                    "favorite",
                    "p1",
                    {"entity_id": favorite["entity_id"], "remove": True},
                )
            entity = resolve(title, year)
            command("favorite", "p1", {"entity_id": entity})
            # Reset only the synthetic test actor to the same original responses.
            for eid, response in original["p1"].items():
                command("interest", "p1", {"event_id": eid, "response": response})
            discovered = command("discover", "p1")["result"]
            comparison_id = command("comparison_start")["result"]["id"]
            for suggestion in discovered["suggestions"]:
                command(
                    "comparison_response",
                    comparison_id,
                    {
                        "participant_id": "p1",
                        "event_id": suggestion["event_id"],
                        "response": "interested",
                        "source": "qloo",
                    },
                )
            result = command("comparison_evaluate", comparison_id)["result"]
            export = c.get(f"/api/comparisons/{comparison_id}/export")
            export.raise_for_status()
            evidence = export.json()
            assert all(
                d["source"] == "qloo" and d["evidence"]["id"]
                for d in evidence["decisions"]
            )
            evaluations.append(
                {
                    "profile": index + 1,
                    "mapped_screenings": discovered["mapped"],
                    "returned_catalogue_matches": discovered["covered"],
                    "recorded_synthetic_choices": len(evidence["decisions"]),
                    "before_served": result["before"]["served"],
                    "after_served": result["after"]["served"],
                    "coverage_delta": result["coverage_delta"],
                    "cost_delta_minor": result["cost_delta_minor"],
                    "changed_assignments": len(result["changed_assignments"]),
                    "complete": result["complete"],
                    "verdict": result["verdict"],
                }
            )
            print(
                f"Profile {index + 1}: {discovered['covered']} catalogue matches; {result['verdict']}",
                flush=True,
            )
        final = state()
        summary = {
            "mode": "live Qloo, synthetic operations and scripted uptake",
            "provider_attempts": final["provider_calls"],
            "profiles": evaluations,
            "limitation": "Every returned catalogue suggestion was marked interested by the test script. This is a sensitivity scenario, not observed human acceptance or causal evidence of Qloo uplift. Original authored interests and operational constraints were preserved across profile baselines.",
        }
        path = Path(args.output)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(summary, indent=2) + "\n")
        print(json.dumps(summary, indent=2), flush=True)
    finally:
        c.close()


if __name__ == "__main__":
    main()
