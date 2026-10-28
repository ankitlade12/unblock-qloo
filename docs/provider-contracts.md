# Provider contracts and pending live checks

Qloo: allowlisted `https://hackathon.api.qloo.com` or `https://api.qloo.com`, `X-Api-Key` header. `GET /search` with query, movie types, and take; user reviews results. `GET /v2/insights` with `filter.type=urn:entity:movie`, comma-separated approved seed IDs, and take. Results are intersected with reviewed catalogue mappings, without an unverified candidate-restriction parameter. No venue, timing, transport, health, or access claim is inferred from the response. Responses are private and workspace-scoped.

References consulted during implementation: [official Qloo documentation repository](https://github.com/qloo/docs-public), [Insights reference](https://github.com/qloo/docs-public/blob/main/reference/insights-api-deep-dive.md). The primary docs.qloo.com pages could not be retrieved in this environment. Verify issued-key origin, movie support, search parameters, actual response envelope, provider warnings, caching terms, and catalogue coverage before calling the integration live-ready.

Optional model: OpenAI Responses API over HTTPS, explicit configured model, function schemas with strict arguments, function-call outputs linked by call ID, no parallel tool execution, no provider-side response storage requested. Only the four allowlisted local tools can run. [Official function-calling documentation](https://developers.openai.com/api/docs/guides/function-calling) was consulted. The code is isolated in `agent.py` so a future provider adapter does not change the deterministic planning rules.

Both adapters are mocked in automated tests. Qloo has also passed the live smoke check below; the model remains mock-tested only. No provider responses or secrets are committed.

## Live Qloo smoke check — October 27, 2026 (America/Chicago)

A supplied hackathon credential was loaded from an ignored local `.env` with mode 0600. Four `/search` requests resolved Inside Out (2015), Soul (2020), Coco (2017), and Spirited Away (2001). The returned year/name pairs were reviewed before selection. One `/v2/insights` request using Inside Out returned catalogue matches for Coco (rank 16) and Spirited Away (rank 25). Soul was not matched. The existing response parser worked without code changes. Five provider calls total.

A separate synthetic workspace was used. Chromium displayed both matches; an explicit fictional Alex response for Coco was recorded with live evidence, and the comparison export returned HTTP 200 with Qloo provenance. No browser page errors occurred. The comparison correctly reported no coverage or cost improvement. Mapping changes had invalidated prior event-version interests, so this is a protocol/UI smoke check, not an impact experiment. No real participant consent, attendance, or supplier availability is implied.

Raw responses remain in the private workspace database. No credential or raw response was added to documentation. The expanded check below supersedes the original limited catalogue coverage. Provider warning handling and deployment-specific validation remain outstanding. Local quota enforcement has regression coverage; actual provider throttling was not load-tested.

## Repeatable expanded check

`scripts/verify_live.py --allow-live` passed with eight mapped screenings, three profiles (Inside Out, Moonrise Kingdom, My Neighbor Totoro), and 14 provider attempts. Catalogue matches were 3, 1, and 1 respectively. Original authored interests were restored at the reviewed mapping versions before comparison, and all eight screenings had synthetic transport packages. Each profile retained 12 served at $224, with no changed assignments or cost reduction. Scripted uptake is explicitly labeled and is not real acceptance or causal benefit. No optional language-model call was made.
