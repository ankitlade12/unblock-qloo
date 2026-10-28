# UNBLOCK

Discover shared cultural interests. Turn explicit choices into feasible community outings.

React + TypeScript frontend; FastAPI backend; SQLite persistence; server-side Qloo adapter; optional bounded language-model tools; deterministic planner with an independent feasibility checker.

**Current release is an isolated synthetic demonstration, not a private pilot service.** All 12 participants, eight screenings, operational claims, quotes, and confirmations are fictional. No booking, payment, or external message is made. Credentials are not included in source. Live Qloo search and Insights were verified locally on October 27, 2026; the optional model remains unverified. Public hosting remains pending; source publication is tracked in the submission checklist.

## Run locally

Prerequisites: Python 3.14 and Node 22.12+ (tested on Python 3.14 / Node 25).

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
npm ci --prefix apps/web
cp .env.example .env
./run.sh
```

Open **http://127.0.0.1:8011**. No API key is needed for the synthetic workflow. `run.sh` loads the local `.env`, builds the frontend, and serves both UI and API. Treat `.env` as trusted shell configuration; never paste untrusted content into it. For frontend hot reload, run the API on port 8000 and `npm run dev --prefix apps/web` in another terminal.

## Walkthrough

Start with **Walk through the story** on Overview (or **The story** in the sidebar). Six chapters introduce the people, capture choices, run actual planning checks, explain commitments, simulate a used-shuttle cancellation, and show the evidence and remaining work. Chapters reflect the current workspace; they never auto-approve or invent a successful result. The plan detail now includes the full day, assigned participants/companions, capacity, and itemized cost from its immutable snapshot.

1. Open **Explore the demo**. Every browser context gets its own private, 24-hour synthetic workspace.
2. In **Discover**, choose a fictional participant and mark an experience interested, maybe, or not for me. Seeded interests are synthetic, explicit test inputs.
3. In **Participants**, edit availability, maximum contribution, functional needs, companion requirements, or a mandatory service policy.
4. **Generate plans**. Compare up to three independently checked assignments, costs, and unserved people. No interest is inferred from affinity.
5. Review and approve an exact proposal version. Record each fictional participant's commitment to that itinerary.
6. Record synthetic provider evidence covering the exact number of seats **and** tickets. Once all conditions hold, download the final calendar itinerary.
7. Mark a used transport resource unavailable. Earlier versions require review. Replan, inspect the diff, and renew approval/commitments.
8. Review **Evidence**, download evidence JSON or an unsent provider-request draft, and optionally record synthetic attendance.

A budget of zero demonstrates an honest infeasible result. `Maybe`, rejected, unseen, withdrawn, and stale-interest choices cannot support actionable assignments.

## Compare discovery

Open **Compare discovery** (also linked from chapter two). Freeze the current choices, select a fictional participant, record an explicit response to a catalogue item, then compare checked plans. Both searches use the frozen resources, budget, requirements, and evaluation time. An unchanged result is reported honestly; missing plans are not treated as zero-cost wins. Changing resources or interests outside this flow requires a new baseline.

Direct catalogue decisions work without credentials and carry no Qloo claim. To record Qloo-backed decisions, first resolve favorites, review catalogue identities, and run consented discovery. The server checks the returned entity, event version, and current favorite IDs against retained provider evidence. Export includes frozen planning inputs, decision provenance, checked results, and limitations, excluding raw provider responses. Comparisons are historical; create a current proposal separately for approval.

## Enable real cultural discovery

Set `QLOO_API_KEY` in the server environment and restart. Default origin is `https://hackathon.api.qloo.com`; use `https://api.qloo.com` only if that matches the issued credential. Both are allowlisted. The code uses `/search` and `/v2/insights` with `filter.type=urn:entity:movie` and approved `signal.interests.entities`.

1. In **Catalogue**, review each film's Qloo identity. Select a returned result; no title is auto-resolved.
2. In **Discover**, opt in, search a favorite, and select the correct entity.
3. Click **Discover with Qloo**. Recommendations are intersected with mapped catalogue entities. Missing entities get no invented affinity. Returned recommendation rank and evidence IDs are retained.
4. Mapping changes increment event versions, so participants must renew interest.

Live cultural evidence does **not** make the fictional operations real. Provider responses are stored privately in the database, excluded from JSON exports and the repository. Repeated requests return explicitly labeled recorded evidence scoped to the workspace. Default budgets: 40 actual Qloo attempts per workspace and 200 per deployment per UTC day, including failed calls. Reservations and rate limits persist in SQLite across restarts; creating another workspace does not reset the deployment cap. No automatic adapter retries.

Initial live smoke check passed on October 27, 2026: four movie searches and one Insights request through the application. Inside Out (2015) produced matches for Coco and Spirited Away among three reviewed catalogue mappings. The browser displayed the evidence and exported an explicit synthetic Qloo-backed choice. This small check does not establish broad coverage or causal benefit; warnings, quotas, and hosted behavior still need deployment-specific checks.

## Optional language-model assistant

Set `MODEL_API_KEY` and an explicitly selected Responses-compatible `MODEL_NAME`. The adapter defaults to `https://api.openai.com/v1/responses`; no model is silently selected. The **Plans** screen then enables the assistant.

The model can read context, list missing requirements, ask for Qloo discovery for a consented profile, and generate checked drafts. It cannot edit inputs, approve, commit, confirm, book, pay, or send. The server validates tool names and arguments, limits calls to eight per task and 24 model requests per workspace, and displays tool actions. Model prose is labeled as generated and is never used to authorize a state transition. Repeated solve calls in one task reuse the result. Without model credentials, the deterministic workflow remains available and is labeled accurately.

## Validation

```sh
.venv/bin/python -m pytest -q
npm run build --prefix apps/web
# Run the built API/UI on port 8011 first:
npm run test:e2e --prefix apps/web
```

Install the Playwright Chromium browser if needed with `cd apps/web && npx playwright install chromium`. Alternatively set `CHROMIUM_PATH` to an installed Chromium executable. Tests cover the actual UI/API/database journey, mobile layouts, keyboard navigation, automated accessibility scanning, isolation, stale versions, idempotency, independent solver verification, small exhaustive-oracle cases, and mocked provider/tool boundaries. Current results: 38 backend tests and six browser scenarios passed. See [verification](docs/verification.md) for the actual run results and limits.

## Deploy

```sh
docker compose up --build
```

Local Docker URL: http://localhost:8011. Container builds are supplied but have not been executed in this environment.

For a public demo, deploy the Dockerfile on a container host with **one application process and a persistent disk at `/app/data`**. Set `APP_ORIGIN` to the exact HTTPS origin and `COOKIE_SECURE=true`. Set provider keys as host secrets. Keep TLS termination enabled. Health check: `/api/health`. Do not use ephemeral serverless storage for SQLite or horizontally scale this prototype. Use the published public URL in Playwright and run the journey there before claiming hosted readiness.

**Deployment remains outstanding.** No host account/project was selected or provisioned, and no external URL is claimed. The separate Sites hosting runtime is Workers-based and does not run this PRD's Python/SQLite service; the application preserves the requested Python architecture instead of publishing a nonfunctional frontend-only shell.

## Scope and limits

See [PRD coverage](docs/requirements-coverage.md). P0 application workflows are implemented, with a local Qloo smoke check complete and hosted acceptance pending. Selected P1 capabilities (withdrawal, provider evidence, explicit outcomes) are included. Private organizer accounts, expiring invitations, participant-level authorization for real records, PostgreSQL, multiple planning windows, CSV imports, production job streaming, and real provider integrations are not implemented. These must precede a real pilot. No organizer interview, controlled recommendation experiment, cost savings, or real attendance improvement is claimed.

The demo deliberately lets its session owner act as every **fictional** participant. It must not be used to host real people. Backend limits include 12 events, eight offers, 30 proposals per workspace, and a three-second search budget. Search results report whether exhaustive enumeration finished. Provider/model calls run outside database transactions. Short optimistic commits reject concurrent workspace edits with HTTP 409 rather than overwriting them; production use still needs durable jobs and a production database.

[Architecture](docs/architecture.md) · [Data provenance](docs/data-provenance.md) · [Judge guide](docs/judge-guide.md) · [Submission checklist](docs/submission.md) · [MIT license](LICENSE)

## Optional Render deployment

`render.yaml` prepares a single Docker web service with a 1 GB persistent disk. This uses paid resources; no account, service, or charge has been created. Render documents disks as paid-service features: https://render.com/docs/disks. Blueprint reference: https://render.com/docs/blueprint-spec.

1. Create a public source repository containing this project (exclude `.env`, `data`, caches, and dependencies using the supplied ignore files), then connect it to a Render account.
2. Create a Blueprint from the repository. Review the quoted service and disk costs before applying. Set `APP_ORIGIN` to the exact assigned HTTPS origin; correct it and redeploy if the assigned hostname differs.
3. Add `QLOO_API_KEY` as a secret only when issued. The unconfigured service supports the labeled synthetic workflow. Add model secrets only if using the optional assistant.
4. Check build/start logs and `/api/health`. Verify the mounted `/app/data` is writable by container user 10001; a disk permission error must be resolved before accepting the deployment.
5. Run the browser journey on the public origin and verify a saved workspace survives a service restart. Test cookies, downloads, fresh-browser isolation, and live Qloo separately. The blueprint has not been deployed or provider-validated here.

The visual walkthrough now opens with an illustrated community scene, an inspectable taste-to-choice path, participant groups by outing, and affected-person chips during a shuttle disruption. Illustrations do not imply live bookings or measured outcomes.

## Audit remediation and live evaluation

The October 27 audit fixes and remaining external work are tracked in [requirements coverage](docs/requirements-coverage.md#audit-remediation). New demo workspaces now have transport offers for all eight screenings; existing workspaces retain their saved inputs. Start a new demo to use the expanded fixture. The original baseline remains 12 served for $224.

Discover includes a three-step setup: review catalogue mappings, explicitly consent and select favorites, then run discovery. It distinguishes no request, no catalogue matches, and retained results. Changing a film title clears its old entity mapping; all event edits invalidate stale suggestions.

An opt-in repeatable live check mapped all eight screenings, tested three favorite profiles, and verified exported Qloo provenance using 14 provider attempts. It returned 3, 1, and 1 catalogue matches. All three comparisons remained 12 served, with zero cost change and zero assignment changes. Scripted acceptance is not observed human acceptance or evidence of causal benefit.

```sh
# Uses a new synthetic workspace and spends up to 14 Qloo attempts.
.venv/bin/python scripts/verify_live.py --allow-live
```

The aggregate report is saved under ignored `data/`. Run offline browser checks against an isolated server/database with empty provider keys; set `PLAYWRIGHT_BASE_URL` to its origin. Test expectations also adapt to configured Qloo readiness, without making paid/provider requests. GitHub Actions runs the offline build, backend tests, and browser journey.
