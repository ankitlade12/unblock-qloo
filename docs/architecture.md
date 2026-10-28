# Architecture

Browser → same-origin FastAPI → workspace snapshot → validated domain command → deterministic planner / Qloo / optional model → persisted result → UI.

- `services/api/domain.py`: bounded schemas and authored fixtures with relative future dates. All money is integer USD cents.
- `services/api/store.py`: SQLite workspace records; high-entropy session token hashed at rest; transactions prevent partial writes. Session records expire after 24 hours, and new-workspace creation purges expired records.
- `services/api/planner.py`: backtracking search with early capacity/budget pruning and a three-second wall-clock limit. Independent aggregate verification recomputes costs, shared inventory, seat demand, wheelchair demand, vehicle conflicts, minimum groups, and mandatory service. It reuses eligibility predicates but does not trust search running totals.
- `services/api/main.py`: command API, optimistic input revision checks, idempotency, exact proposal approvals, commitment/confirmation gates, audit, exports and static hosting.
- `services/api/qloo.py`: allowlisted HTTPS endpoints, timeouts, workspace-private caching and evidence, explicit identity choices, missing coverage handling. Functional needs and transport facts never enter taste requests.
- `services/api/agent.py`: Responses-compatible adapter. Model access is limited to four validated tools. It cannot mutate consent, inputs, or approval state. The normal Generate plans button is a deterministic workflow and makes no model claim.
- `apps/web/src`: responsive UI, synthetic-mode labeling, role simulation, provenance, interest controls, proposal inspection, evidence, data import and exports.

A proposal stores the exact snapshot, input hash, assignments, costs, and trade-offs. Later material edits mark prior proposals stale. Approval/commitment metadata is appended separately. Status is derived each time from current inputs, expiry, and confirmation records. Exports read the original snapshot even after catalogue replacement. A final export requires Confirmed; ordinary exports preserve unresolved state.

## Security boundaries

This release has one role: synthetic session owner. No endpoint creates real participant data. HttpOnly SameSite cookies plus required custom mutation headers and same-origin checks protect session mutations. No arbitrary URLs are fetched. Provider and model credentials remain on the server. Session objects are never looked up outside the cookie-scoped workspace. JSON imports are schema-validated and bounded; imported descriptions have no tool authority and React renders them as text. External call counts survive failed mutations. Raw provider responses are excluded from normal state responses and exports.

SQLite holds only short write transactions. Read-only requests do not write state; provider calls and planning run outside transactions. Generation checks reject conflicting commits with HTTP 409. Provider attempts are atomically reserved before network calls, survive failure, and count against workspace and persistent daily deployment caps. Creation limits use client address, not caller-supplied cookies; mutation limits require a valid workspace. Limits persist in SQLite across restarts. Known deployment limits: SQLite serializes brief writes and remains a single-host deployment. The reverse proxy must also limit request body size and creation rate. The default session is suitable for synthetic public demonstration only, not a production multi-tenant pilot. Add real membership/role checks, secure invitations, durable jobs, PostgreSQL, proxy rate limiting, backups, and retention jobs before handling real records.

No global optimum is claimed after a search timeout. A timed-out result must pass the independent checker. No feasible assignment is returned when none has been checked.

Successful confirmation preserves an immutable confirmation record. Historical attendance can be recorded after event end even when current proposal validity has expired; this does not enable expired final exports. Explicit withdrawal changes the participant requirement, excluding them from every new assignment. Eligibility rejects transport that has already departed, including at the departure boundary.
