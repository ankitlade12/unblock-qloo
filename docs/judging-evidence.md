# Judging evidence map

The [official criteria](https://qloo.devpost.com/rules) weight implementation, design, potential impact, and idea equally. This map describes evidence, not a predicted score or guarantee.

| Criterion | What to inspect | Concrete evidence | Limit |
|---|---|---|---|
| Technological implementation | Discover → Compare discovery → decision path → export | Server-side live Qloo, reviewed entities, consent, retained provenance, cached responses, quota controls, explicit choices, individual offer blockers, actual checked assignment | Optional model remains disabled; provider results can vary |
| Design | Overview → six story chapters → comparison → repair | Coherent people-first story, responsive screens, actionable empty/error states, explicit gates, exported evidence | Synthetic workspaces, no real accounts or bookings |
| Potential impact | Overview audience section; impact-and-pilot.md | Named first user and job, cited problem research, operational constraints demonstrated, predeclared formative pilot measures | No interviews or organizer pilot conducted; no measured time savings or attendance uplift |
| Quality of idea | Follow the favorite-to-planning path, then cancel a used shuttle | Cultural discovery expands options; explicit decisions and constraints determine action; disruptions preserve historical evidence and require renewed review | Product differentiation is demonstrated as a combination of capabilities, not a market-superiority claim |

## What this release strengthens

- Makes Qloo's contribution inspectable through the exact decision and planning outcome, including accepted-but-unselected options.
- Exports individual offer checks with the matched-input comparison, using the same frozen evaluation time.
- Tests six outcome scenarios: selected, compatible but unselected, declined, missing transport, unknown access, and compatible options with no affordable group plan.
- States the proposed audience and problem evidence inside the app rather than relying on a submission paragraph.
- Provides a copy-paste project story, three-minute presentation script, and an unexecuted organizer-validation protocol.

## Verification

Local: **55 backend tests**, production build, and **six browser journeys** passed. These include exact exported provenance, latest-decision deduplication, meaningful planning outcomes, mobile overflow, and automated accessibility checks. The optional Starlette test-transport deprecation warning remains. Release `8dcae65` is live on Render (deployment `dep-dbh3ei6k1f9s738jp9c0`). [GitHub CI](https://github.com/ankitlade12/unblock-qloo/actions/runs/40740377768) passed. The public live check passed **ten scenario groups**, including the actual favorite-to-choice-to-planning path, exact exported decision-path equality, mobile layout/accessibility, consent withdrawal, stale actions, replanning, and deletion. It used one Qloo request, returned three matches and two new options, and recorded zero page exceptions.

[Desktop decision path](screenshots/rubric-2026-10-28/decision-path.png) · [Mobile decision path](screenshots/rubric-2026-10-28/decision-path-mobile.png) · [Machine-readable live checks](screenshots/rubric-2026-10-28/checks.json)

The live scripted choice accepted Coco. Its individual offer checks passed, while the group comparison retained a different assignment; the new view reported that outcome accurately. No numerical uplift or real human acceptance is inferred.

A strong hackathon submission can demonstrate potential without claiming a pilot. The remaining real-world evidence must come from actual consenting organizers and participants; code and presentation cannot supply it.
