"""Opt-in hosted judge-path check: three live calls, explicit scripted choices."""

import argparse
import json
from pathlib import Path
from uuid import uuid4
import httpx


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8011")
    parser.add_argument("--allow-live", action="store_true")
    parser.add_argument("--output", default="data/judge-evaluation.json")
    args = parser.parse_args()
    if not args.allow_live:
        parser.error(
            "Use --allow-live to authorize three live Qloo calls and scripted synthetic responses"
        )
    profiles = []
    for favorite in ("Inside Out", "Moonrise Kingdom", "My Neighbor Totoro"):
        with httpx.Client(
            base_url=args.base_url, headers={"X-Unblock-Request": "1"}, timeout=60
        ) as c:
            c.post("/api/demo", json={}).raise_for_status()

            def state():
                r = c.get("/api/state")
                r.raise_for_status()
                return r.json()

            def command(action, target="", data=None):
                r = c.post(
                    "/api/command",
                    json={
                        "revision": state()["revision"],
                        "action": action,
                        "target": target,
                        "data": data or {},
                        "idempotency_key": str(uuid4()),
                    },
                )
                r.raise_for_status()
                return r.json()

            baseline = state()
            prepared = command(
                "demo_profile", "p1", {"favorite": favorite, "consent": True}
            )["state"]
            assert prepared["provider_calls"] == 0
            assert [p["interests"] for p in prepared["participants"]] == [
                p["interests"] for p in baseline["participants"]
            ]
            discovered = command("discover", "p1")["result"]
            cid = command("comparison_start")["result"]["id"]
            for option in discovered["new_options"]:
                command(
                    "comparison_response",
                    cid,
                    {
                        "participant_id": "p1",
                        "event_id": option["event_id"],
                        "response": "interested",
                        "source": "qloo",
                    },
                )
            result = command("comparison_evaluate", cid)["result"]
            export = c.get(f"/api/comparisons/{cid}/export")
            export.raise_for_status()
            assert all(d["evidence"]["id"] for d in export.json()["decisions"])
            assert state()["provider_calls"] == 1
            profiles.append(
                {
                    "favorite": favorite,
                    "catalogue_matches": discovered["covered"],
                    "new_options": discovered["new_options"],
                    "contribution": result["discovery_contribution"],
                    "coverage_delta": result["coverage_delta"],
                    "cost_delta_minor": result["cost_delta_minor"],
                    "verdict": result["verdict"],
                    "provider_attempts": 1,
                }
            )
            print(
                f"{favorite}: {len(discovered['new_options'])} new options; {result['verdict']}",
                flush=True,
            )
    report = {
        "mode": "Live Qloo with synthetic preferences and SCRIPTED acceptance of new options",
        "provider_attempts": 3,
        "profiles": profiles,
        "limitation": "Discovery novelty is relative to the authored interested list. This does not measure real human relevance or causal uplift; constraints and original interests were preserved.",
    }
    path = Path(args.output)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
