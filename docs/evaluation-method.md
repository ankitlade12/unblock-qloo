# Evaluation method

No real recommendation experiment, pilot, savings estimate, or attendance improvement has been measured.

1. Freeze a catalogue and enrolled participant denominator. Preserve withdrawals in reporting.
2. Randomize equal-size exposure to direct catalogue ordering, a clearly documented baseline, and Qloo-assisted suggestions. Keep event and resource facts identical.
3. Record actual exposure, response, and provenance; unseen items do not enter the suggestion-acceptance denominator.
4. Use the same independent planner for all accepted-choice sets. Compare feasible coverage, organizer cost, essential violations, and unserved reasons.
5. Record commitments and provider confirmations separately. Observe attendance after an actual event; retain unknown outcomes.
6. Include organizer data-entry effort when measuring time. A 12-person test is formative and cannot establish broad market effects.

This implementation checks synthetic feasibility and protocol behavior. The seeded accepted-choice matrix is a test fixture, not evidence that discovery changes preferences. Do not compare it against a deliberately weakened baseline or treat synthetic outcomes as actual impact.

Metrics: suggestion acceptance = interested / shown; feasible coverage = distinct assigned / enrolled; confirmed coverage = committed with confirmed resources / enrolled; observed attendance = attendees / committed, with unknown reported separately. Qloo affinities are not probabilities and missing evidence is not zero preference.

## Implemented synthetic comparison

The **Compare discovery** flow freezes existing choices without weakening them. It retains a fixed participant denominator, event and transport facts, requirements, budget, and evaluation clock. Only decisions recorded through the comparison alter the second input; unrelated edits invalidate further evaluation. Both searches use the same planner and independent verifier. No-plan results have unknown numeric deltas, and incomplete searches are labeled candidate comparisons rather than optimal results.

Each decision records its prior response, new response, event version, timestamp, and discovery source. A Qloo source requires consent and retained Insights evidence matching the current approved favorites and mapped event. Direct catalogue responses remain available without credentials. The export retains frozen planning inputs and provenance, but excludes raw provider responses. Historical results never become approved plans automatically.

This is a paired synthetic scenario, not the randomized experiment above. The baseline already serves all 12 fictional people, so unchanged coverage is expected in many explorations. New choices may change cost or assignments; neither improvement nor real participant acceptance is promised. Mixed-source changes cannot be attributed solely to Qloo.


## Decision-path interpretation

Each latest participant/event decision has an exported path tied to the frozen evaluation clock: source evidence, baseline and latest response, individual offer blockers, individually eligible offer IDs, actual assigned offer, and outcome. Individual eligibility does not prove aggregate feasibility: minimum groups, shared inventory, conflicting vehicles, and the overall budget are checked by the solver and independent verifier. A compatible new option may remain unselected; a missing group plan never becomes a numerical success. Repeated responses produce one current path while the original decision history remains retained.

The proposed real-organizer protocol is in [impact-and-pilot.md](impact-and-pilot.md); it has not been conducted.
