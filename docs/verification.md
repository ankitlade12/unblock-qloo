# Verification — October 27, 2026

| Boundary | Result | Evidence |
|---|---|---|
| Backend | Passed | 38 pytest tests, including 12 audit regressions |
| Production frontend | Passed | TypeScript and Vite build |
| Browser → API → SQLite → UI | Passed | Six Playwright journeys on isolated offline server |
| Mobile / keyboard / accessibility | Passed automated checks | 390px layout, keyboard modal behavior, axe WCAG A/AA scans |
| Live Qloo | Passed locally | Eight reviewed movie mappings, three favorite profiles, 14 provider attempts |
| Live comparison | No improvement | Match counts 3/1/1; all profiles 12 served, zero cost and assignment changes |
| Optional model | Mock-tested only | No model credential; no live-model claim |
| Public hosted acceptance | Pending | No authenticated Render/Railway host available |
| Docker execution | Pending | Local daemon unavailable |
| Human accessibility / real impact | Not tested | Synthetic fixtures and scripted choices only |

Audit regressions cover withdrawal across events, attendance after event end, pre-event attendance rejection, expired final-export rejection, exact departure cutoff, frozen comparison time, title/mapping invalidation, multiple screenings per entity, concurrent workspace edits, unrelated reads during slow work, forged-cookie creation limits, persistent global call budgets after failed commands, read-only generation stability, legacy database migration, all-eight-screening offer coverage, unchanged baseline, and health-check storage failure.

Browser tests adapt readiness assertions to actual server configuration, verify the guided setup before consent, and use the configured origin for isolated browser contexts. They do not make provider requests. Six journeys cover commitments, resource confirmation, export, cancellation/repair, story chapters, comparison provenance and invalidation, isolated sessions, and mobile layouts. Results live in ignored `apps/web/test-results/`.

Live evaluation preserves original authored interests at new mapping versions before freezing comparisons. Every returned suggestion was marked interested by the script. This proves the integration and comparison path; it does not demonstrate actual human acceptance or Qloo uplift. The script fails instead of guessing ambiguous movie identities and exports only an aggregate report under ignored `data/`.

Commands are in README. `.github/workflows/verify.yml` automates the offline suite. Creation limits persist across server restarts; use an isolated database or wait for the one-minute window before repeating a full browser suite. Python emits a Starlette test-transport deprecation warning; assertions pass. Automated accessibility checks are not a certification. Hosted acceptance must still verify HTTPS cookies, disk permissions, restart persistence, downloads, and provider access.
