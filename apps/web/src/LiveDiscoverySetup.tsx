import { useState } from "react";
import { ArrowRight, CheckCircle2, Circle, Sparkles } from "lucide-react";
import type { Person, State } from "./types";

export function LiveDiscoverySetup({
  s,
  person,
  busy,
  review,
  personalize,
  discover,
  loadProfile,
  compare,
}: {
  s: State;
  person: Person;
  busy: boolean;
  review: () => void;
  personalize: () => void;
  discover: () => void;
  loadProfile: (favorite: string) => void;
  compare: () => void;
}) {
  const [favorite, setFavorite] = useState("Inside Out");
  const [demoConsent, setDemoConsent] = useState(false);
  const mapped = s.events.filter((e) => e.entity_id && !e.cancelled).length;
  const approved = person.consent && person.favorites.length > 0;
  const steps = [
    {
      title: "Review film identities",
      detail: `${mapped} of ${s.events.length} screenings mapped. Each selection is reviewed.`,
      done: mapped > 0,
      action: review,
    },
    {
      title: "Choose your favorites",
      detail: approved
        ? `${person.favorites.length} favorites selected with consent.`
        : "Opt in and select the correct film from search results.",
      done: approved,
      action: personalize,
    },
    {
      title: "Get live suggestions",
      detail: person.discovery
        ? `${person.discovery.covered} matches across ${person.discovery.mapped} mapped screenings · ${person.discovery.mode}.`
        : "No discovery request recorded for these inputs yet.",
      done: !!person.discovery,
      action: discover,
    },
  ];
  return (
    <section className="live-setup" aria-label="Live discovery setup">
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR FIRST LIVE DISCOVERY</span>
          <h2>Three steps. Evidence at every connection.</h2>
        </div>
        <span className="badge">
          {s.qloo_available ? "Qloo configured" : "Qloo unavailable"}
        </span>
      </div>
      {!person.favorites.length && (
        <div className="reviewed-demo-profile">
          <div>
            <span className="eyebrow">A SHORTCUT INTO THE STORY</span>
            <h3>Start with a reviewed, fictional taste profile.</h3>
            <p>Eight film identities are already reviewed. Choose a favorite, then run a real Qloo request. Your existing interests and operational constraints stay intact.</p>
          </div>
          <label>Demonstration favorite
            <select value={favorite} onChange={(e) => setFavorite(e.target.value)} disabled={busy}>
              {(s.demo_profiles || ["Inside Out"]).map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
          <label className="check-label"><input type="checkbox" checked={demoConsent} onChange={(e) => setDemoConsent(e.target.checked)} disabled={busy} />Use this fictional profile for {person.name}; I approve sending its selected favorite to Qloo when I run discovery.</label>
          <button className="secondary" disabled={busy || !demoConsent || !!s.proposals.length || !!s.comparisons?.length} onClick={() => loadProfile(favorite)}>Load reviewed demo profile</button>
          {(!!s.proposals.length || !!s.comparisons?.length) && <p className="small-note">Start a new demo to load the reviewed profile, or use your own favorites below.</p>}
        </div>
      )}
      <ol>
        {steps.map((step, index) => (
          <li key={step.title}>
            <span className="setup-check">
              {step.done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
            </span>
            <div>
              <strong>
                {index + 1}. {step.title}
              </strong>
              <p>{step.detail}</p>
              <button
                className="text-link"
                disabled={
                  busy ||
                  (index === 2 && (!s.qloo_available || !mapped || !approved))
                }
                onClick={step.action}
              >
                {index === 2
                  ? "Run Qloo discovery"
                  : index === 0
                    ? "Review catalogue mappings"
                    : "Set up favorites"}
                <ArrowRight size={15} />
              </button>
            </div>
          </li>
        ))}
      </ol>
      {person.discovery && (
        <div className="info-strip" role="status">
          <Sparkles size={18} />
          <span>
            {person.discovery.covered
              ? "Provider matches are shown below. Only your explicit Interested response can enter a plan."
              : "Qloo returned no matches for the mapped screenings. Try other favorites or choose from the catalogue; no scores are invented."}{" "}
            Retrieved {new Date(person.discovery.retrieved_at).toLocaleString()}
            .
          </span>
        </div>
      )}
      {person.discovery?.new_options && (
        <div className="discovery-contribution">
          <span className="eyebrow">WHAT QLOO ADDED AT DISCOVERY TIME</span>
          <h3>{person.discovery.new_options.length} options beyond the current interested list.</h3>
          <p>From {person.discovery.favorite_names?.join(", ")}: {person.discovery.already_interested || 0} returned matches were already interested choices. Qloo supplies the cultural connection; you decide whether to accept it.</p>
          <ul>{person.discovery.new_options.map((option) => <li key={option.event_id}><strong>{option.title}</strong> · previously {option.previous_response} · {option.individually_compatible ? "individual access and timing checks pass if accepted" : "operational requirements still block this option"}</li>)}</ul>
          <p className="small-note">Individual compatibility does not establish group capacity or a feasible plan. These are synthetic preferences, not measured human acceptance or causal uplift.</p>
          <button className="text-link" onClick={compare}>Record a choice and measure what changes <ArrowRight size={15} /></button>
        </div>
      )}
      {s.provider_budget && <p className="small-note" role={s.provider_budget.remaining <= 20 ? "status" : undefined}>
        {s.provider_budget.remaining} live requests remain in today’s shared demo allowance. Recorded evidence does not spend another request. Resets {new Date(s.provider_budget.reset_at).toLocaleString()}. Qloo may impose its own limits.
      </p>}
      {!s.qloo_available && (
        <p className="small-note">
          Direct catalogue choices work now. A server credential is required for
          live Qloo requests.
        </p>
      )}
    </section>
  );
}
