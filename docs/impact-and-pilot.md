# UNBLOCK: audience, value, and validation plan

## The first audience

Proposed first user: an activity coordinator at a community centre who organizes small cultural outings for adults with different transport and accessibility needs. The buyer, if a pilot demonstrates value, would be the organization running the outings. Neither customer demand nor willingness to pay has been validated.

The job: turn individual interests into a reviewed outing, then recover when a resource or participant decision changes. The prototype targets a bounded 12-person workflow; it is not a city-wide transport optimizer.

## Problem evidence

A University of Minnesota report for the National Center for Mobility Management identifies accessibility, affordability, service flexibility, and fragmented transport services as barriers to older adults' social participation. It also identifies gaps in tools that connect transport with social needs and preferences. This supports investigating the problem; it does not validate our product or imply an endorsement. [The Role of Transportation in Addressing Social Isolation in Older Adults (2020), executive summary, pp. 4–5](https://www.ccam-tac.org/wp-content/uploads/2020/06/FINAL_FULL_SOCIAL-ISOLATION-RESEARCH-PAPER.pdf).

Our product hypothesis: combining cultural discovery with explicit choices and operational checks can help a coordinator explore more acceptable options while maintaining essential requirements. It must be tested with actual organizers. We do not claim to reduce loneliness, improve health, or increase attendance.

## Why this combination matters

| Approach | What it contributes | What UNBLOCK demonstrates beyond that component |
|---|---|---|
| Taste suggestions alone | Culturally related films | An explicit choice followed by access, timing, transport, and group checks |
| A static itinerary | An agreed destination and schedule | Version-bound decisions, resource changes, and reviewable repairs |
| Constraint planning alone | A feasible assignment from known choices | Qloo can surface additional options for a person to accept or decline |

This is a comparison of capabilities, not a claim about every competing product.

## Evidence already available

- Real Qloo responses map to reviewed catalogue entities; source evidence accompanies explicit synthetic decisions.
- Existing choices are retained. A new Qloo-backed option can remain unselected when the group plan does not use it; the decision path makes this visible.
- The authored baseline serves 12 fictional people for $224. In the demonstrated shuttle disruption, the repaired candidate still serves 12 for $246, with six changed assignments. This is a scenario result, not savings or observed participation.
- Requirements, approvals, commitments, resource confirmation, and simulated attendance are distinct records.
- Local, CI, and public-browser tests cover documented flows. Automated correctness is not user validation.

## Proposed formative pilot — not yet conducted

Recruit five community activity coordinators for a 30–45 minute consented session. Do not contact anyone without authorization. Use fictional records; do not upload private participant information to this public demo.

1. Ask the coordinator to describe a recent outing, tools used, failure points, and constraints they actually check. Do not introduce UNBLOCK before this interview.
2. Give two comparable fictional outing tasks with identical information. Counterbalance which is performed first and which uses their usual method versus UNBLOCK. Include time spent entering and checking data.
3. Introduce the same disruption in each task. Ask them to repair the plan and explain which approvals must be renewed.
4. Have a second reviewer assess missed requirements and unsupported confirmations using a fixed checklist.
5. Ask which part was useful, confusing, or unnecessary, and whether they would volunteer for a supervised pilot. Record refusals and negative feedback.

Record per task: preparation minutes, planning minutes, repair minutes, missed essential constraints, number of participants with checked assignments, unresolved facts, facilitator interventions, and whether the coordinator can explain the provenance and remaining confirmation gates. Do not treat speed without correctness as success.

Proposed progression criteria, fixed before sessions: no essential requirement silently weakened; at least four of five coordinators complete the flow without a facilitator taking over; and at least three find a specific recurring task worth piloting. These are product-learning thresholds, not statistical proof. Report every session and the sample size, including failures.

A later supervised real outing needs private accounts, participant consent and invitations, verified operational sources, provider agreements, and an appropriate retention policy. Only then measure observed attendance; retain unknown outcomes and avoid attributing changes to Qloo without a suitable comparison design.

## Interview prompts

- Walk me through the last outing you organized. Where did you spend the most time?
- What makes an interested person unable to join?
- How do you check companion seats, accessibility facts, and return deadlines?
- What happened the last time transport changed?
- What would you need to trust before using a generated plan?
- Which step in this demo would you keep, change, or remove?

Feedback record: session date; consent to record; anonymized role; task order; observed actions; task metrics; exact quote if permission granted; negative feedback; recommended change. Leave all fields blank until a real session happens.
