# Verification — October 27, 2026

| Boundary | Result | Evidence |
|---|---|---|
| Backend | Passed | 48 pytest tests, including both audit regression sets |
| Production frontend | Passed | TypeScript and Vite build |
| Browser → API → SQLite → UI | Passed | Six Playwright journeys on isolated offline server |
| Mobile / keyboard / accessibility | Passed automated checks | 390px layout, keyboard modal behavior, axe WCAG A/AA scans |
| Live Qloo | Passed locally and hosted | Eight reviewed movie mappings, three favorite profiles, 14 provider attempts |
| Live comparison | No improvement | Match counts 3/1/1; all profiles 12 served, zero cost and assignment changes |
| Optional model | Mock-tested only | No model credential; no live-model claim |
| Public hosted acceptance | Passed | Six browser journeys at https://unblock-demo.onrender.com |
| Docker execution | Passed on Render | Container build, non-root runtime, writable persistent disk |
| Human accessibility / real impact | Not tested | Synthetic fixtures and scripted choices only |

Audit regressions cover withdrawal across events, attendance after event end, pre-event attendance rejection, expired final-export rejection, exact departure cutoff, frozen comparison time, title/mapping invalidation, multiple screenings per entity, concurrent workspace edits, unrelated reads during slow work, forged-cookie creation limits, persistent global call budgets after failed commands, read-only generation stability, legacy database migration, all-eight-screening offer coverage, unchanged baseline, and health-check storage failure.

Browser tests adapt readiness assertions to actual server configuration, verify the guided setup before consent, and use the configured origin for isolated browser contexts. They do not make provider requests. Six journeys cover commitments, resource confirmation, export, cancellation/repair, story chapters, comparison provenance and invalidation, isolated sessions, and mobile layouts. Results live in ignored `apps/web/test-results/`.

Live evaluation preserves original authored interests at new mapping versions before freezing comparisons. Every returned suggestion was marked interested by the script. This proves the integration and comparison path; it does not demonstrate actual human acceptance or Qloo uplift. The script fails instead of guessing ambiguous movie identities and exports only an aggregate report under ignored `data/`.

Commands are in README. `.github/workflows/verify.yml` automates the offline suite. Creation limits persist across server restarts; use an isolated database or wait for the one-minute window before repeating a full browser suite. Python emits a Starlette test-transport deprecation warning; assertions pass. Automated accessibility checks are not a certification. Hosted acceptance verified HTTPS cookies, disk permissions, restart persistence, downloads, and provider access.

## Public deployment follow-up

Render service `unblock-demo` in Ohio uses one Starter instance and a 1 GB disk mounted at `/app/data`. The first hosted run exposed a race where an initial unauthorized session response arrived after successful demo creation and restored the welcome screen. The app now ignores that superseded request; the first browser journey explicitly reproduces the delayed response. The corrected commit passes CI and all six hosted browser journeys.

Hosted Qloo evaluation passed eight mappings and three profiles (14 attempts), with 3/1/1 matches and no coverage, cost, or assignment improvement. A private test workspace retained identical state across the corrected release restart. Cookie attributes Secure, HttpOnly, and SameSite were verified. Raw responses and test cookies remain in ignored local data. Optional model and real-human impact remain unverified.

## Second-audit verification — October 28, 2026

The 48-test backend suite covers metadata-only discovery preserving approved and legacy-snapshot plans, strict malformed import rejection, chunked oversized bodies, bounded body replay, explicit reviewed-profile consent, unchanged authored interests and baseline, distinct/latest Qloo acceptance counting, labeled simulated outcomes with confirmation gates, and shared remaining budget after failure/new workspace.

The first browser journey now loads a reviewed profile, completes confirmation/export, simulates the post-event clock, records fictional attendance, and verifies the explicit timestamp. Automated accessibility caught a new low-contrast eyebrow label in the comparison panel; its color was corrected and the affected journey passed again. Local live `verify_judge.py` passed three profiles with three total provider attempts and 2/1/0 newly surfaced options. Acceptance is scripted and planning results remain unchanged. Release CI and hosted results are recorded after deployment.

Release `8807794` passed GitHub CI (48 backend tests, build, six browser journeys) and was deployed to Render. The hosted live browser path loaded the reviewed profile with explicit consent, used one Insights request, displayed Coco and The Grand Budapest Hotel as new options, recorded one synthetic Coco choice, and exported its matching Qloo evidence. Coverage and cost stayed unchanged. Desktop/mobile axe and overflow checks passed with zero page errors. Screenshots are in `docs/screenshots/`. The judging-health workflow was manually dispatched and passed; its hourly schedule performs no provider calls.

Final hosted acceptance on release `8807794`: all six Playwright journeys passed in 31.4 seconds, including reviewed-profile loading, confirmation/export, simulated attendance, mobile/keyboard/axe checks, isolation, comparison, and disruption repair. Hosted `verify_judge.py` also passed all three profiles with 2/1/0 new options and three provider attempts total. The public health check reported working storage, configured Qloo, and 181/200 application attempts remaining at verification time. This is a point-in-time result, not a guarantee of future upstream availability.


## Judging-evidence release — October 28, 2026

Release `8dcae65` adds exported decision paths and a specific audience/problem case. Local and CI verification passed 55 backend tests, the production build, and six browser journeys. The public live check passed ten scenario groups with one Qloo request, three matches, two new options, and zero page exceptions. The new path connected Inside Out → Coco → a scripted interested response → one individually eligible transport offer → an accepted but unselected outcome in the checked group comparison. Exact exported paths, mobile accessibility, and existing negative scenarios passed. See [judging evidence](judging-evidence.md) for screenshots and provenance. No organizer pilot or real impact is claimed.
