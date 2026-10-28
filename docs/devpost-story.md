## Inspiration

A good recommendation is only the start of a community outing. Someone still has to ask: can Jordan travel step-free with a companion? Will Morgan have the access support they need? Can everyone return on time, within the shared budget?

We built UNBLOCK for community activity coordinators facing that practical gap between interest and participation. Research from the University of Minnesota for the National Center for Mobility Management identifies accessibility, affordability, service flexibility, and fragmented transportation as barriers to older adults' social participation. That evidence informed our proposed audience; it is not validation of our product. [Read the research](https://www.ccam-tac.org/wp-content/uploads/2020/06/FINAL_FULL_SOCIAL-ISOLATION-RESEARCH-PAPER.pdf).

## What it does

UNBLOCK turns cultural interests into checked outing proposals. Qloo connects a person's selected favorite to reviewed film identities. The person explicitly accepts or declines a suggestion. The planner then checks transport, timing, accessibility, companion seats, shared inventory, and budget.

The product follows a complete fictional community story: meet the people, discover options, inspect a plan, record commitments, handle a disruption, and review the evidence. Approval, participant commitment, and provider confirmation are separate gates. If a shuttle becomes unavailable, prior decisions become stale and the organizer can inspect changed assignments and costs before approving again.

A comparison freezes the original choices and operational inputs. Its decision paths connect favorites, Qloo evidence, explicit responses, individual checks, and the actual planning outcome. If a new option is not selected, the app says so. We preserve a strong baseline and report unchanged results honestly.

## How we built it

The interface uses React and TypeScript, backed by FastAPI and SQLite on a persistent Render disk. Qloo requests run server-side with reviewed entity mappings, retained provenance, caching, consent checks, and persistent request budgets.

A bounded deterministic planning workflow generates candidates; a separate checker verifies feasibility. Optimistic commits prevent slow requests from overwriting newer decisions. Tests cover constraints, isolation, stale edits, imports, quota handling, exports, and browser journeys. The optional language-model adapter is disabled in the public deployment; the demonstrated planning workflow does not depend on it.

## Challenges we ran into

The difficult part was preserving meaning across boundaries. A cultural affinity is not consent. Individual compatibility is not group feasibility. A checked proposal is not a booking. A confirmation is not observed attendance.

We encoded those distinctions in separate records and gates. Testing also exposed mobile evidence overflow, low-contrast source text, unclear no-plan feedback, and a delayed session-response race. We fixed the underlying behavior and added regression coverage.

## Accomplishments that we're proud of

We built a working path from a live Qloo response to an inspectable planning decision, with evidence that survives export. The authored baseline accommodates all 12 fictional participants for $224. In the demonstrated shuttle disruption, a repaired candidate preserves checked coverage at $246 while explicitly showing six changed assignments. That is a scenario result, not a claim about real attendance or cost savings.

We are also proud of the cases where the product refuses to overclaim: unknown access facts block affected choices, withdrawn participants stay out of repaired plans, stale approvals cannot authorize final exports, and unchanged comparison results remain unchanged.

## What we learned

Cultural discovery and practical coordination answer different questions. Qloo can widen the set of options someone might choose; explicit interest and operational constraints determine what can enter a plan. A credible product needs to show both contributions without conflating them.

Automated checks establish implementation behavior, not customer value. Our public demonstration uses fictional participants, operations, commitments, and simulated outcomes. No organizer pilot, real bookings, attendance improvement, or causal Qloo uplift has been established.

## What's next for UNBLOCK

Our next step is a small formative study with community activity coordinators, comparing matched fictional tasks using their current process and UNBLOCK. We will measure total planning and repair time, missed essential requirements, facilitator interventions, and whether organizers understand the evidence and approval gates.

Before real outings, we need private organizer accounts, participant invitations and consent, verified operational sources, provider agreements, and real-world testing. The pilot protocol and evaluation limits are included in the public repository.
