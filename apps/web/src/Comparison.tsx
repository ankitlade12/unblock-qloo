import { useState } from "react";
import {
  ArrowRight,
  LockKeyhole,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Download,
  CheckCircle2,
} from "lucide-react";
import type { State, ComparisonPlan } from "./types";
const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n / 100,
  );
const when = (s: string) =>
  new Date(s).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "medium",
    timeStyle: "short",
  });
export function DiscoveryComparison({
  s,
  busy,
  run,
  go,
}: {
  s: State;
  busy: boolean;
  run: (
    action: string,
    target?: string,
    data?: Record<string, unknown>,
  ) => void;
  go: (page: string) => void;
}) {
  const [pid, setPid] = useState("p1"),
    [source, setSource] = useState<"catalogue" | "qloo">("catalogue");
  const c = s.comparisons?.at(-1);
  const p = s.participants.find((x) => x.id === pid) || s.participants[0];
  const results = c?.result;
  const events =
    source === "catalogue"
      ? s.events
      : s.events.filter((e) =>
          p.suggestions.some(
            (r) => r.event_id === e.id && r.event_version === e.version,
          ),
        );
  const newAccepted = c
    ? Object.entries(c.baseline_choices).reduce(
        (n, [id, interests]) =>
          n +
          s.events.filter(
            (e) =>
              interests[e.id]?.response !== "interested" &&
              s.participants.find((x) => x.id === id)?.interests[e.id]
                ?.response === "interested",
          ).length,
        0,
      )
    : 0;
  const planName = (id: string | null) =>
    id
      ? c?.baseline_summary?.events[c.baseline_summary.offer_events[id]] || id
      : "Unassigned";
  return (
    <div className="comparison-page">
      <div className="page-heading">
        <div className="eyebrow">MAKE THE CONTRIBUTION VISIBLE</div>
        <h1>What did discovery actually change?</h1>
        <p>
          Same people. Same resources. Only recorded choices change. Let the
          result speak.
        </p>
      </div>
      <div className="comparison-promise">
        <ShieldCheck size={22} />
        <div>
          <strong>A comparison, not a staged success.</strong>
          <p>
            We preserve the starting choices. Neither the budget nor the
            catalogue is adjusted to create a win. All people and operational
            data remain synthetic; even real Qloo evidence would not establish
            real participant acceptance.
          </p>
        </div>
      </div>
      <section className="panel comparison-freeze">
        <div>
          <span className="eyebrow">01 / FREEZE THE STARTING POINT</span>
          <h2>
            {c
              ? "Your baseline is retained."
              : "Start with the choices you actually have."}
          </h2>
          <p>
            {c
              ? `${Object.keys(c.baseline_choices).length} participants · ${money(c.baseline_summary?.budget_minor ?? s.window.budget_minor)} frozen budget · baseline recorded ${when(c.created_at)} CT`
              : "The existing interests become the baseline. We do not remove accepted choices to make discovery look better."}
          </p>
          <p className="small-note">
            For Qloo evidence: review catalogue mappings and resolve favorites
            before freezing. Direct catalogue exploration is available without
            credentials.
          </p>
        </div>
        <button
          className="primary"
          disabled={busy}
          onClick={() => run("comparison_start")}
        >
          <LockKeyhole size={16} />
          {c ? "Freeze a new baseline" : "Freeze current choices"}
        </button>
      </section>
      {c && (
        <>
          {c.invalid_reason && (
            <div className="alert error" role="status">
              <AlertCircle size={18} />
              {c.invalid_reason} Existing results remain historical.
            </div>
          )}
          <section className="panel spaced">
            <div className="section-heading">
              <div>
                <div className="eyebrow">02 / EXPLORE, THEN CHOOSE</div>
                <h2>Suggestions do not become interest automatically.</h2>
                <p>
                  Record one fictional participant’s decision at a time. These
                  responses also update their workspace interests.
                </p>
              </div>
            </div>
            <div className="comparison-controls">
              <label>
                Acting as
                <select value={p.id} onChange={(e) => setPid(e.target.value)}>
                  {s.participants.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name} · synthetic participant
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Discovery source
                <select
                  value={source}
                  onChange={(e) =>
                    setSource(e.target.value as "catalogue" | "qloo")
                  }
                >
                  <option value="catalogue">Direct catalogue — not Qloo</option>
                  <option value="qloo">Qloo-backed suggestions</option>
                </select>
              </label>
              <button className="secondary" onClick={() => go("Discover")}>
                Manage favorites & discovery
                <ArrowRight size={15} />
              </button>
            </div>
            {source === "qloo" && (
              <div className="info-strip">
                <Sparkles size={18} />
                <span>
                  {s.qloo_available
                    ? "Only retained provider suggestions are shown. If your favorites changed, run discovery again."
                    : "Live Qloo is awaiting credentials. No synthetic recommendations are substituted. Previously retained suggestions, if any, stay dated."}
                </span>
              </div>
            )}
            {events.length === 0 ? (
              <div className="comparison-empty">
                <h3>No Qloo-backed catalogue matches for {p.name}.</h3>
                <p>
                  Resolve approved favorites, map films, and run discovery
                  first. Empty coverage is a result to report, not a score of
                  zero.
                </p>
                <button className="text-link" onClick={() => go("Catalogue")}>
                  Review catalogue identities
                  <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <div className="comparison-events">
                {events.map((e) => {
                  const suggestion = p.suggestions.find(
                    (r) => r.event_id === e.id && r.event_version === e.version,
                  );
                  const prior =
                    c.baseline_choices[p.id]?.[e.id]?.response || "unseen";
                  return (
                    <article key={e.id}>
                      <div>
                        <h3>{e.title}</h3>
                        <span className="badge">Baseline: {prior}</span>
                        <p>{e.description}</p>
                        {source === "qloo" && suggestion && (
                          <div className="comparison-provider">
                            <strong>
                              Qloo → catalogue match → your decision
                            </strong>
                            <span>
                              Favorites:{" "}
                              {p.favorites.map((f) => f.name).join(", ")}
                            </span>
                            <span>
                              Rank {suggestion.rank} in this request ·{" "}
                              {suggestion.mode} · retrieved{" "}
                              {when(suggestion.retrieved_at)} CT
                            </span>
                            <span>Evidence: {suggestion.evidence_id}</span>
                            <span>
                              Relevance is not a probability of enjoyment.
                              Missing affinity is never invented.
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="interest-options">
                        {["interested", "maybe", "not interested"].map(
                          (response) => (
                            <button
                              key={response}
                              disabled={
                                busy || !!c.invalid_reason || e.cancelled
                              }
                              aria-label={`${p.name}: ${response} after exploring ${e.title}`}
                              aria-pressed={
                                p.interests[e.id]?.response === response &&
                                p.interests[e.id]?.event_version === e.version
                              }
                              onClick={() =>
                                run("comparison_response", c.id, {
                                  participant_id: p.id,
                                  event_id: e.id,
                                  response,
                                  source,
                                })
                              }
                            >
                              {response === "not interested"
                                ? "Not for me"
                                : response === "interested"
                                  ? "Interested"
                                  : "Maybe"}
                            </button>
                          ),
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
          <section className="panel spaced">
            <div className="section-heading">
              <div>
                <div className="eyebrow">03 / COMPARE THE SAME INPUTS</div>
                <h2>
                  {c.decisions.length} recorded decisions.{" "}
                  {c.invalid_reason
                    ? "Review changed inputs."
                    : `${newAccepted} newly accepted choices.`}
                </h2>
                <p>
                  Both searches use the frozen evaluation time and the same
                  constraints. Results are historical comparisons, not approved
                  outings.
                </p>
              </div>
              <button
                className="primary"
                disabled={busy || !!c.invalid_reason}
                onClick={() => run("comparison_evaluate", c.id)}
              >
                <Sparkles size={16} />
                Compare checked plans
              </button>
            </div>
            {results && (
              <>
                <div
                  className={
                    "comparison-verdict " +
                    (!results.complete ? "uncertain" : "")
                  }
                  role="status"
                >
                  <CheckCircle2 size={20} />
                  <div>
                    <strong>{results.verdict}</strong>
                    <p>
                      {results.sources.length === 0
                        ? "No discovery source recorded."
                        : results.sources.includes("qloo")
                          ? results.sources.includes("catalogue")
                            ? "Mixed Qloo and direct-catalogue decisions; changes cannot be attributed solely to Qloo."
                            : "Qloo evidence accompanies these demo decisions; causal impact and real acceptance are not established."
                          : "Direct-catalogue decisions only. This is not evidence of Qloo uplift."}
                    </p>
                  </div>
                </div>
                {results.discovery_contribution && (
                  <div className="discovery-contribution">
                    <span className="eyebrow">DISCOVERY CONTRIBUTION</span>
                    <h3>
                      {
                        results.discovery_contribution
                          .newly_accepted_qloo_choices
                      }{" "}
                      new Qloo-backed interested choices
                    </h3>
                    <p>
                      From{" "}
                      {results.discovery_contribution.qloo_choices_reviewed}{" "}
                      distinct Qloo-backed choices reviewed in this comparison.{" "}
                      {results.discovery_contribution.newly_accepted_event_ids
                        .map((id) => c.baseline_summary?.events[id] || id)
                        .join(", ")}
                    </p>
                    <p className="small-note">
                      {results.discovery_contribution.limitation} Planning
                      results below are measured separately.
                    </p>
                  </div>
                )}
                {!!results.decision_paths?.length && (
                  <section
                    className="choice-paths"
                    aria-label="Discovery to planning evidence"
                  >
                    <span className="eyebrow">
                      FROM TASTE TO A CHECKED DECISION
                    </span>
                    <h3>Follow each choice into the plan.</h3>
                    <p>
                      Individual checks cover access, timing, consented
                      interest, and available transport. The group planner
                      separately checks shared capacity, minimum group sizes,
                      and the total budget.
                    </p>
                    {results.decision_paths.map((path) => (
                      <article
                        className="choice-path"
                        key={`${path.participant_id}:${path.event_id}`}
                      >
                        <h4>
                          {c.baseline_summary?.people[path.participant_id]} ·{" "}
                          {c.baseline_summary?.events[path.event_id]}
                        </h4>
                        <ol>
                          <li>
                            <strong>Discovery</strong>
                            <span>
                              {path.source === "qloo"
                                ? `Qloo connected ${path.evidence?.approved_favorites.map((f) => f.name).join(", ")} to this screening.`
                                : "Explored directly in the catalogue; no Qloo attribution."}
                            </span>
                          </li>
                          <li>
                            <strong>Explicit choice</strong>
                            <span>
                              {path.baseline_response} → {path.response}.
                              Recorded for this fictional participant.
                            </span>
                          </li>
                          <li>
                            <strong>Practical checks</strong>
                            <span>
                              {path.eligible_offer_ids.length} transport options
                              pass individual checks.
                            </span>
                          </li>
                          <li>
                            <strong>Planning result</strong>
                            <span>
                              {
                                {
                                  not_accepted:
                                    "Not eligible for assignment: the participant has not accepted this choice.",
                                  blocked:
                                    "Not eligible for assignment: no transport option passes the individual checks.",
                                  no_checked_plan:
                                    "Individual checks pass, but no checked group plan was found. Participation is not established.",
                                  selected:
                                    "This screening appears in the checked comparison plan. Approval, commitments, and provider confirmation are still required.",
                                  available_not_selected:
                                    "Kept as an accepted option, but not selected in this comparison plan. The planner prioritizes coverage, then cost, then a stable tie-break; it does not force a Qloo match into the outing.",
                                }[path.outcome]
                              }
                            </span>
                          </li>
                        </ol>
                        <details>
                          <summary>Inspect checks and source evidence</summary>
                          {path.individual_offer_checks.length === 0 && (
                            <p>No transport offer exists for this screening.</p>
                          )}
                          {path.individual_offer_checks.map((check) => (
                            <p key={check.offer_id}>
                              <strong>{check.offer_id}</strong>:{" "}
                              {check.blockers.length
                                ? check.blockers.join("; ")
                                : "Individual checks pass; group capacity and budget checked separately."}
                            </p>
                          ))}
                          {path.evidence && (
                            <p>
                              Qloo evidence {path.evidence.id} ·{" "}
                              {path.evidence.mode} ·{" "}
                              {when(path.evidence.retrieved_at)} CT. Included in
                              the comparison export.
                            </p>
                          )}
                        </details>
                      </article>
                    ))}
                  </section>
                )}
                <div className="comparison-results">
                  <ResultCard
                    title="Before exploration"
                    plan={results.before}
                    total={results.participants}
                  />
                  <ResultCard
                    title="After recorded decisions"
                    plan={results.after}
                    total={results.participants}
                  />
                </div>
                <div className="comparison-deltas">
                  <span>
                    Coverage change{" "}
                    <strong>
                      {results.coverage_delta === null
                        ? "Not established"
                        : `${results.coverage_delta > 0 ? "+" : ""}${results.coverage_delta} people`}
                    </strong>
                  </span>
                  <span>
                    Organizer cost change{" "}
                    <strong>
                      {results.cost_delta_minor === null
                        ? "Not established"
                        : `${results.cost_delta_minor > 0 ? "+" : ""}${money(results.cost_delta_minor)}`}
                    </strong>
                  </span>
                  <span>
                    Evaluation time{" "}
                    <strong>{when(results.evaluation_clock)} CT</strong>
                  </span>
                </div>
                {results.changed_assignments.length > 0 && (
                  <details className="comparison-diff">
                    <summary>
                      Inspect {results.changed_assignments.length} changed
                      assignments
                    </summary>
                    {results.changed_assignments.map((x) => (
                      <div key={x.participant_id}>
                        <strong>
                          {c.baseline_summary?.people[x.participant_id] ||
                            x.participant_id}
                        </strong>
                        <span>
                          {planName(x.before)} → {planName(x.after)}
                        </span>
                      </div>
                    ))}
                  </details>
                )}
                <p className="small-note">{results.limitation}</p>
                <a
                  className="secondary"
                  href={`/api/comparisons/${c.id}/export`}
                >
                  <Download size={16} />
                  Export comparison evidence
                </a>
                <button className="text-link" onClick={() => go("Plans")}>
                  Generate a current proposal separately
                  <ArrowRight size={14} />
                </button>
              </>
            )}
          </section>
          {c.decisions.length > 0 && (
            <section className="panel spaced">
              <h2>The decision trail</h2>
              <p>No inferred responses. No rewritten starting preferences.</p>
              {[...c.decisions]
                .reverse()
                .slice(0, 20)
                .map((d, i) => (
                  <div className="comparison-decision" key={i}>
                    <strong>
                      {c.baseline_summary?.people[d.participant_id] ||
                        d.participant_id}{" "}
                      · {c.baseline_summary?.events[d.event_id] || d.event_id}
                    </strong>
                    <span>
                      {d.before} → {d.response}
                    </span>
                    <span>
                      {d.source === "qloo"
                        ? `Qloo evidence ${d.evidence?.id}`
                        : "Direct catalogue; no Qloo claim"}{" "}
                      · {when(d.at)} CT
                    </span>
                  </div>
                ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
function ResultCard({
  title,
  plan,
  total,
}: {
  title: string;
  plan: ComparisonPlan;
  total: number;
}) {
  return (
    <article>
      <span className="eyebrow">{title}</span>
      <h3>
        {plan.found_plan ? `${plan.served} / ${total}` : "No checked plan"}
      </h3>
      <p>
        {plan.found_plan
          ? `${money(plan.cost_minor!)} organizer cost · ${total - plan.served!} unserved`
          : "No numerical improvement inferred from missing results."}
      </p>
      <span className="badge">{plan.solver_status}</span>
      {plan.blockers.length > 0 && (
        <p className="small-note">{plan.blockers.join("; ")}</p>
      )}
      {plan.unserved.length > 0 && (
        <details>
          <summary>Unserved participants and constraints</summary>
          {plan.unserved.map((x) => (
            <p key={x.participant_id}>
              {x.participant_id}: {x.reasons.join("; ")}
            </p>
          ))}
        </details>
      )}
    </article>
  );
}
