# PRD implementation coverage

This ledger keeps unfinished items visible. “Implemented” means local functionality, not externally hosted or real-world validation.

| Requirement | Implementation | Status |
|---|---|---|
| FR-01 Resolve favorites | Qloo search, explicit disambiguation, favorites removal | Implemented; local live search verified |
| FR-02 Event evidence | Source, observed time, validity, mode, version | Implemented with synthetic fixtures |
| FR-03 Grounded suggestions | Private request fingerprint/response, mapped catalogue intersection, evidence index | Implemented; mocks and local eight-screening / three-profile live check passed |
| FR-04 Explicit interest | Four response states, version binding; only interested eligible | Implemented and tested |
| FR-05 Hard requirements | Availability, deadline, contribution, access, currency, capacity, companions, mandatory service | Implemented and tested; one USD window |
| FR-06 Resource packages | Explicit event/transport offer pairing, seats, wheelchair capacity, minimum group, expiry | Implemented; fixed packages, no route inference |
| FR-07 Compare plans | Up to three checked candidates, served/unserved, integer costs and solver status | Implemented |
| FR-08 Versioned approvals | Immutable input snapshot/hash, exact version approval | Implemented and tested |
| FR-09 Change handling | Conservative invalidation of all proposals on material input change, repair and diff | Implemented and tested |
| FR-10 Explain infeasibility | Constraint-derived blockers and unserved reasons | Implemented; explanations are not minimal unsat cores |
| FR-11 Export | Version/status JSON, tentative/final ICS, provider-request text draft | Implemented and tested |
| FR-12 Demo isolation | Opaque HttpOnly per-session cookie, hashed server lookup, 24h expiry | Implemented and tested locally; public host pending |
| FR-13 Provider confirmation | Exact offer version, quantity, evidence, expiry; both seats and tickets required | Implemented for synthetic data |
| FR-14 Outcomes | Explicit attended/did not attend/cancelled/unknown plus evidence | Implemented for synthetic data |
| FR-15 Withdrawal | Requirement withdrawal or commitment decline invalidates plans | Implemented and tested |
| FR-16 Repeated planning | Replanning same window | Partial; multiple windows and service history deferred |

## Other PRD acceptance items

- React/TypeScript + FastAPI: implemented. SQLite is intentionally a single-process prototype; PostgreSQL migration and production membership/roles are outstanding.
- One agent with deterministic tools: implemented deterministic workflow and optional model adapter. Model integration is mock-tested; no live model call was made.
- Eight tool rounds, argument validation, unknown-ID rejection, provider/model quotas: implemented. Structured traces are retained without hidden reasoning.
- Two/three candidates where feasible: implemented. Objective is coverage, organizer cost, disruption, stable tie-break. Participant preference ranks are not collected, so no rank objective is invented.
- Unknown essential access facts block applicable assignments. No constraints are silently softened.
- Json import, evidence index, budget/window editor, audit log, consent, direct catalogue path: implemented. CSV import deferred to P1.
- Public source: https://github.com/ankitlade12/unblock-qloo. Public demo is pending Render authentication and provisioning; Docker deployment artifacts, license, and setup instructions are prepared.
- Frozen-input synthetic discovery comparison: implemented with source validation, decision trail, independent plan checks, invalidation, and export. Live Qloo catalogue coverage and three scripted comparisons passed locally without measured improvement. Controlled causal comparison and organizer pilot remain pending real participants/organizer.
- Browser/mobile/keyboard/automated accessibility: see verification report. Screen-reader assistive-technology testing and real-user access testing remain outstanding.
- Provider-facing drafts: implemented and never sent. Bookings/payments/provider integrations remain explicit P2/non-goals.
- Job streaming: not implemented; requests are synchronous with a progress indicator and bounded compute/provider timeouts.
- Private organizer authentication and expiring participant invitations: not implemented; demo-only role simulation is labeled on screen.
- Model/provider failure leaves persisted application inputs unchanged. External call reservations survive failed commands and optimistic-commit conflicts.
- Event performance times are fixed except explicit organizer editing; any change invalidates existing interest for that event version.

## Paths through the application

Welcome → Discover → Requirements → Plans → Proposal → Approval → Commitments → Provider evidence → Final itinerary → Outcomes.

Resources / Catalogue / Interests change → stale proposals → replan → diff → renewed approval and commitment.

Evidence shows source classes and evaluation limitations. Settings manages budget, synthetic import, template download, and deletion.

## Presentation and guided demo

Implemented a six-chapter interactive case study on the existing workspace, with explicit synthetic provenance. Choice counts, proposals, commitment progress, resource cancellation, and repairs come from actual application records. Added snapshot-based itinerary timelines with itemized costs and companion/capacity accounting. Added a visible readiness checklist for live Qloo, optional model, public hosting/source, and private pilot work. No new external integration, live provider validation, or production-auth claim is implied by these interface improvements.

## Audit remediation

| # | Finding | Resolution |
|---|---|---|
| 1 | Withdrawal allowed reassignment | Fixed: withdrawal updates the participant-wide requirement; regression tested |
| 2 | Attendance blocked after the event | Fixed: immutable confirmation history permits historical outcomes; early attendance and expired final exports stay blocked |
| 3 | Departed transport remained eligible | Fixed: departure at or before evaluation time is ineligible; historical comparisons retain frozen time |
| 4 | Title edit kept old Qloo identity | Fixed: clear mapping on title change, clear discovery on event edits, filter suggestions by event version |
| 5 | Provider requests held global write lock | Fixed: compute/network outside transactions, read-only loads, optimistic conflict checks |
| 6 | Cookie spoofing/reset bypassed limits | Fixed: client-address creation limits, authenticated mutation limits, persistent atomic deployment budgets |
| 7 | No public repository/demo | Public source published to ankitlade12/unblock-qloo with explicit approval and passing credential scan. Hosting awaits Render authentication and provisioning |
| 8 | Recommendation value unmeasured / half catalogue unavailable | Eight synthetic offers now cover all screenings; three live comparisons completed and honestly show no improvement. Real utility remains unproven |
| 9 | Duplicate screenings collapsed | Fixed: one Qloo entity maps to every non-cancelled reviewed screening |
| 10 | No fresh-visitor live setup | Fixed: visible mapping → consent/favorites → discovery flow, prerequisite checks and explicit empty states |
| 11 | Optional model unverified | Core is labeled as deterministic tools/workflow; model is optional and mock-tested only. Live model remains unverified |
| 12 | Stale docs and missing regressions | Updated docs, 38 backend tests, configurable browser origin/readiness, offline CI, repeatable opt-in live evaluation |

Existing workspaces preserve their saved fixtures. Start a new demo for the expanded eight-offer catalogue. No real operational availability, causal recommendation uplift, private pilot readiness, or live optional-model capability is claimed.
