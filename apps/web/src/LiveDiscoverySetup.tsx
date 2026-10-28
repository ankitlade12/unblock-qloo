import { ArrowRight, CheckCircle2, Circle, Sparkles } from "lucide-react";
import type { Person, State } from "./types";

export function LiveDiscoverySetup({
  s,
  person,
  busy,
  review,
  personalize,
  discover,
}: {
  s: State;
  person: Person;
  busy: boolean;
  review: () => void;
  personalize: () => void;
  discover: () => void;
}) {
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
      {!s.qloo_available && (
        <p className="small-note">
          Direct catalogue choices work now. A server credential is required for
          live Qloo requests.
        </p>
      )}
    </section>
  );
}
