# UNBLOCK

Turn cultural interests into community outings people can actually join.

[Live demo](https://unblock-demo.onrender.com) · [Architecture](docs/architecture.md) · [Data provenance](docs/data-provenance.md) · [MIT license](LICENSE)

UNBLOCK helps community activity coordinators connect individual choices with transport, accessibility, companion seats, timing, shared inventory, and a budget. Qloo supplies cultural recommendations; explicit participant responses determine what the planner may consider.

**This is a synthetic demonstration.** Participants, screenings, transport, commitments, and simulated outcomes are fictional. Qloo discovery is live when configured. No real booking, payment, provider message, organizer pilot, or attendance benefit is claimed. Workspaces expire after 24 hours; do not enter private participant records.

## Try the product

1. Choose **Explore the demo**, then **Walk through the story** for the six-chapter organizer journey.
2. In **Discover**, select Alex, explicitly consent to a reviewed fictional profile, load it, and run Qloo discovery. Profile loading spends no provider request; discovery uses one Insights request.
3. In **Compare discovery**, freeze current choices, select Qloo-backed suggestions, record a fictional response, and compare checked plans. **Follow each choice into the plan** connects its source, explicit response, individual checks, and actual assignment outcome. Export retains the same evidence.
4. Generate a current proposal in **Plans**. Organizer approval, participant commitments, and resource confirmations are separate gates before final itinerary export.
5. In the story, make a used shuttle unavailable and inspect the repaired assignments and cost. Prior approvals cannot silently carry over.

A compatible new choice may remain unselected. An unchanged comparison is reported honestly. A $0 budget demonstrates the no-plan state. Post-event review is explicitly simulated and does not change real time or planning validity.

## Run locally

Requirements: Python 3.14 and Node 22.12+.

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
npm ci --prefix apps/web
cp .env.example .env
./run.sh
```

Open http://127.0.0.1:8011. No key is required for the synthetic planning workflow. `run.sh` loads `.env` as trusted shell configuration, builds the frontend, and serves UI and API together. Keep credentials out of source control.

## Configuration

See [.env.example](.env.example) for defaults.

| Variable | Purpose |
|---|---|
| `QLOO_API_KEY` | Enables server-side cultural discovery |
| `QLOO_API_ORIGIN` | Defaults to the hackathon API; use an origin matching the issued credential |
| `QLOO_CALL_BUDGET` / `QLOO_DAILY_CALL_BUDGET` | Persistent workspace/deployment attempt limits; failures count |
| `DATABASE_PATH` | SQLite file; use persistent storage when hosted |
| `APP_ORIGIN` | Exact browser origin for same-origin checks |
| `COOKIE_SECURE` | Set `true` behind HTTPS; `false` for local HTTP |
| `MODEL_API_KEY` / `MODEL_NAME` | Optional Responses-compatible assistant; disabled in the public deployment |

Qloo uses `/search` for explicit identity review and `/v2/insights` for selected cultural entity IDs. The reviewed demo catalogue avoids repeated identity searches. Cached results are labeled as recorded evidence. Missing matches never become invented affinity scores. Functional requirements are not sent to Qloo.

The optional model can inspect context, list missing requirements, request consented discovery, and generate checked drafts. It cannot change choices, approve, commit, confirm, book, pay, or send. The normal planning workflow is deterministic and works without a model.

## Verify

```sh
.venv/bin/python -m pytest -q
npm run build --prefix apps/web
cd apps/web
npx playwright install chromium
cd ../..
# Start the application first, then run browser journeys:
npm run test:e2e --prefix apps/web
```

Set `PLAYWRIGHT_BASE_URL` to test another origin, or `CHROMIUM_PATH` to use an installed Chromium. Repeated full browser suites can hit the one-minute workspace-creation limit; use a fresh isolated database locally or wait for the window to expire.

Latest verified release: **55 backend tests, six browser journeys, and ten expanded live scenario groups passed**. Coverage includes constraints, exact-version decisions, isolation, stale writes, import validation, exports, consent withdrawal, disruption/repair, mobile layout, and automated accessibility. The backend test run emits a Starlette test-transport deprecation warning. Automated Chromium/axe checks are not human accessibility certification, cross-browser verification, or load testing.

Optional live checks spend provider requests and create synthetic workspaces:

```sh
# Three profiles; three live Qloo calls and scripted choices.
.venv/bin/python scripts/verify_judge.py --allow-live --base-url https://unblock-demo.onrender.com

# Expanded browser check; one Qloo call, screenshots, and export assertions.
QA_BASE_URL=https://unblock-demo.onrender.com node scripts/browser_qa.cjs --allow-live
```

Reports default to ignored `data/`. GitHub Actions verifies the offline backend, frontend build, and browser journeys. A separate judging-health workflow checks availability and remaining application allowance without calling Qloo.

## Deploy

```sh
docker compose up --build
```

Local Docker URL: http://localhost:8011. [render.yaml](render.yaml) provides an optional paid deployment configuration. Review hosting costs before provisioning.

Run one application process with persistent SQLite storage at `/app/data`. Set `APP_ORIGIN` to the exact public HTTPS URL, `COOKIE_SECURE=true`, and provider keys through host secrets. The disk must be writable by container user 10001. Health endpoint: `/api/health`. Do not horizontally scale this SQLite prototype or place its database on ephemeral storage.

The public Render service uses a single instance and persistent disk. Automatic deployment is disabled; deploy reviewed commits after CI passes. Verify fresh-browser isolation, cookies, exports, provider access, and saved-state persistence after hosting changes.

## Scope and limits

The session owner acts as every fictional participant. Real organizer accounts, participant invitations, participant-level authorization, verified operational providers, and production data-management controls are not implemented. These are prerequisites for a real pilot.

Planning is bounded to 12 events, eight offers, and a three-second search budget. Candidates must pass independent aggregate checks. A timeout never establishes optimality. Individual offer eligibility does not establish group capacity or affordability; the full planner checks those separately.

Comparisons retain original choices, constraints, and a shared evaluation time. Only explicit recorded responses differ. The authored baseline already serves 12 fictional people for $224; new Qloo options do not guarantee coverage or cost improvements. In the demonstrated shuttle disruption, a repair retained coverage at $246 with six changed assignments. These are scenario results, not observed impact.

The proposed next validation step is a counterbalanced organizer study using matched fictional tasks, measuring total planning/repair effort, missed requirements, and facilitator intervention. No such pilot has been conducted. See [data provenance](docs/data-provenance.md) for evidence and privacy boundaries.
