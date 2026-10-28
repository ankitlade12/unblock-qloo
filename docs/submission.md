# Devpost submission package

Use [the updated copy-paste project story](devpost-story.md), [three-minute presentation](demo-script.md), and [audience/pilot evidence](impact-and-pilot.md). These describe the current decision-path demonstration without claiming an organizer pilot.

Project name: **UNBLOCK**

Tagline: **Discover a shared interest. Make the outing possible.**

Live demo: https://unblock-demo.onrender.com

Public source: https://github.com/ankitlade12/unblock-qloo

License: MIT (recognized in GitHub’s repository About section).

Team membership and eligibility/ownership declarations: supplied by the team representative. The user will handle team details. No completed Devpost submission is claimed until the platform confirms it.

## Inspiration

Finding something a community member likes is only the beginning. An outing still needs transport, accessible venues, companion seats, an affordable plan, and a way to recover when a shuttle disappears. UNBLOCK connects culturally grounded discovery to that practical decision trail.

## What it does

Start with fictional Alex and a reviewed film favorite. Qloo’s taste graph returns actual recommendations, which the app intersects with eight reviewed catalogue identities. The discovery panel distinguishes already-interested films from newly surfaced options and checks individual access and timing constraints. Nothing becomes an RSVP automatically.

Record an explicit response, freeze the comparison, and inspect what changed. A deterministic planning workflow finds and independently checks feasible groups, capacity, shared tickets, companions, budgets, and transport conflicts. Exact-version approval, individual commitments, and provider confirmation are separate gates. If a shuttle is cancelled, the old proposal becomes stale and the organizer can inspect a repair.

A clearly labeled post-event simulation completes the fictional story without pretending that attendance happened. Evidence exports preserve the distinction between provider results, explicit synthetic choices, checked plans, and simulated outcomes.

## What makes it Qloo-powered

Qloo supplies the taste-based connection between a selected favorite and a catalogue film. No language model invents affinities or movie matches. The reviewed demo skips repeated identity searches, but its discovery result comes from an actual Insights request and retains provider evidence.

The reviewed-profile check produced two new options for Inside Out (Coco and The Grand Budapest Hotel), one for Moonrise Kingdom (Fantastic Mr. Fox), and none beyond the existing interested list for My Neighbor Totoro. These results describe novelty relative to authored synthetic interests, not human relevance ratings. A script explicitly accepted the new options; all original constraints and interests were preserved. Planning coverage and cost remained unchanged. We show discovery contribution separately instead of manufacturing optimization uplift.

## How we built it

React and TypeScript provide the responsive interface. FastAPI validates commands and serves the same-origin application. SQLite stores isolated, expiring synthetic workspaces on a persistent Render disk. Qloo runs only on the server. A bounded deterministic tool workflow produces candidates, then a separate aggregate checker validates them. Optimistic commits prevent slow requests from overwriting newer edits, and persistent workspace/deployment quotas bound provider usage.

The public demo does not require a language model. An optional model adapter is mock-tested, disabled in the deployment, and not presented as live functionality.

## Challenges and what we learned

The difficult boundary is between a recommendation and an actionable commitment. We keep those records separate and bind decisions to the right event version. Hosted testing exposed a late session response that could replace a newly created workspace; a regression test now deliberately reproduces that timing. Additional checks cover withdrawal, historical outcomes, duplicate screenings, malformed imports, chunked request limits, quotas, and concurrency.

A working API call is not proof of user benefit. Our comparison preserves a strong baseline, records unchanged results honestly, and distinguishes discovery novelty from observed human acceptance and causal impact.

## Judge quickstart — about three minutes

1. Open the live demo and choose **Explore the demo → Discover**.
2. Keep Alex selected. Choose **Inside Out** in the reviewed fictional profile, explicitly check the consent box, and click **Load reviewed demo profile**.
3. Click **Run Qloo discovery**. Inspect new options, compatibility caveats, and retained evidence. This spends one provider request; loading the profile spends none.
4. Open **Compare discovery**, freeze the baseline, choose Qloo-backed suggestions, and record a response. Compare checked plans, inspect **Follow each choice into the plan**, and export evidence. The path links the approved favorite and Qloo evidence to the explicit response, individual checks, and actual assignment outcome. Unchanged cost/coverage is an honest result.
5. Use **The story** or **Plans** to generate a current proposal. Approve, collect fictional commitments, and confirm the required seats and tickets. Download the final itinerary.
6. In the proposal, use **Simulate post-event review · fictional outcomes only** and explicitly record an outcome. Exported records include the simulated timestamp. Cancel a used shuttle to inspect stale state and repair.

All participants, operations, confirmations, and outcomes are synthetic. No booking, payment, provider message, or real attendance claim is made. No login or private key is required from judges. Workspaces expire after 24 hours; start a fresh demo to reset.

## Submission status

- [x] Public app, public source, and MIT license
- [x] English description and judge instructions
- [x] Local and hosted verification (see docs/verification.md for release-specific results)
- [x] Reviewed demo profiles and explicit Qloo contribution
- [x] Spending controls and judging availability workflow
- [ ] Team details and personal declarations (team representative)
- [ ] Devpost entry submitted and confirmation captured

Deadline: October 30, 2026, 10:45 p.m. America/Chicago. Judging ends November 5, 2026, 10:45 p.m. America/Chicago; keep the demo available through judging and any finalist follow-up. Official rules: https://qloo.devpost.com/rules . Videos are not required. Cleanup is not scheduled automatically.

## Submission screenshots

Captured from the public application on October 28, 2026, using a fictional profile and a live Qloo response:

- [Live discovery and newly surfaced options](screenshots/live-discovery.png)
- [Mobile discovery](screenshots/live-discovery-mobile.png)
- [Qloo-backed choice and unchanged planning comparison](screenshots/qloo-comparison.png)

The screenshots contain synthetic preferences and explicit demo choices, not measured human acceptance. Provider results and remaining allowance can change on later runs.
