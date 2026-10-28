import { useState } from "react";
import {
  ArrowRight,
  Bus,
  Film,
  Heart,
  Sparkles,
  Accessibility,
  Users,
} from "lucide-react";
import type { State, Person, Proposal } from "./types";

export function StoryOpening({ s, start }: { s: State; start: () => void }) {
  return (
    <section className="opening-stage">
      <div className="opening-copy">
        <span className="eyebrow">CULTURE BRINGS US CLOSER</span>
        <h1>
          Different tastes.
          <br />
          One afternoon.
          <br />
          <em>A way together.</em>
        </h1>
        <p>
          {s.participants.length} people. One community budget. Discover what
          brings them together—and make a plan they can actually join.
        </p>
        <button className="primary" onClick={start}>
          Walk through the story <ArrowRight size={18} />
        </button>
        <span className="opening-note">
          5-minute interactive story · fictional community
        </span>
      </div>
      <div className="community-scene" aria-hidden="true">
        <div className="scene-orbit" />
        <div className="scene-sun" />
        <div className="scene-cinema">
          <span>THE COMMUNITY CINEMA</span>
          <Film size={45} />
          <strong>
            Something
            <br />
            worth sharing.
          </strong>
          <div className="cinema-doors">
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="scene-ticket">
          <span>AN AFTERNOON OUT</span>
          <strong>Admit together.</strong>
          <span>DISCOVER · CHOOSE · GO</span>
        </div>
        <div className="scene-shuttle">
          <Bus size={30} />
          <span>A way there.</span>
          <i />
          <i />
        </div>
        <div className="scene-people">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`scene-person scene-person-${i}`}>
              <i />
              <b />
            </span>
          ))}
        </div>
        <span className="scene-caption">
          Illustration · no bookings implied
        </span>
      </div>
      <div className="opening-sequence">
        <span>
          <b>01</b> Meet the people
        </span>
        <ArrowRight />
        <span>
          <b>02</b> Find common ground
        </span>
        <ArrowRight />
        <span>
          <b>03</b> Make it possible
        </span>
      </div>
    </section>
  );
}

export function DiscoveryPath({
  s,
  person,
  go,
}: {
  s: State;
  person: Person;
  go: (page: string) => void;
}) {
  const [selected, setSelected] = useState(0);
  const matches = person.suggestions.filter((r) =>
    s.events.some((e) => e.id === r.event_id && e.version === r.event_version),
  );
  const accepted = s.events.filter(
    (e) =>
      person.interests[e.id]?.response === "interested" &&
      person.interests[e.id]?.event_version === e.version &&
      !person.requirements.withdrawn,
  );
  const steps = [
    {
      icon: Heart,
      label: "Their taste",
      value: `${person.favorites.length} favorites`,
      title: `${person.name} starts with what they love.`,
      detail: person.favorites.length
        ? person.favorites.map((f) => f.name).join(" · ")
        : "No favorites selected yet. Resolve a favorite and explicitly choose its identity in personal discovery.",
      action: "Discover",
    },
    {
      icon: Sparkles,
      label: "Cultural discovery",
      value: matches.length
        ? `${matches.length} retained matches`
        : s.qloo_available
          ? "Ready to discover"
          : "Awaiting Qloo",
      title: "A recommendation needs a source.",
      detail: matches.length
        ? matches
            .map(
              (r) =>
                `${s.events.find((e) => e.id === r.event_id)?.title} · ${r.mode} · evidence ${r.evidence_id}`,
            )
            .join("; ")
        : "No provider matches are available for this participant. Qloo results will appear here after consented discovery; catalogue choices remain available now.",
      action: "Discover",
    },
    {
      icon: Film,
      label: "Local possibilities",
      value: `${s.events.filter((e) => !e.cancelled).length} screenings`,
      title: "Culture meets a place and a time.",
      detail:
        "Only mapped events in this organizer’s catalogue can become Qloo-backed suggestions. Times, ticket availability, and access facts still need separate checks.",
      action: "Catalogue",
    },
    {
      icon: Users,
      label: "Their decision",
      value: `${accepted.length} interested`,
      title: "The choice stays with the person.",
      detail: accepted.length
        ? `Current explicit interests: ${accepted.map((e) => e.title).join(", ")}. These may be seeded or demo responses; they are not proof of Qloo influence.`
        : "No current interested responses. A suggestion never becomes acceptance automatically.",
      action: "Compare discovery",
    },
  ];
  const step = steps[selected];
  return (
    <section className="discovery-path" aria-label="From taste to a choice">
      <div className="section-heading">
        <div>
          <span className="eyebrow">FOLLOW THE CONNECTION</span>
          <h2>From “I love this” to “let’s go.”</h2>
        </div>
        <span className="badge">{person.name}’s current records</span>
      </div>
      <div className="path-stages">
        {steps.map((v, i) => (
          <button
            key={v.label}
            aria-pressed={selected === i}
            onClick={() => setSelected(i)}
          >
            <span className="path-icon">
              <v.icon size={22} />
            </span>
            <small>
              0{i + 1} / {v.label}
            </small>
            <strong>{v.value}</strong>
            <ArrowRight size={16} />
          </button>
        ))}
      </div>
      <div className="path-detail" aria-live="polite">
        <div>
          <h3>{step.title}</h3>
          <p>{step.detail}</p>
        </div>
        <button className="text-link" onClick={() => go(step.action)}>
          Open {step.action.toLowerCase()} <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}

export function PlanAssembly({ proposal: p }: { proposal: Proposal }) {
  if (!p.snapshot) return null;
  const snap = p.snapshot;
  const offers = snap.offers.filter((o) =>
    Object.values(p.assignments).includes(o.id),
  );
  return (
    <section className="plan-assembly" aria-label="People grouped by outing">
      <div className="section-heading">
        <div>
          <span className="eyebrow">EVERY PLACE HAS A PERSON</span>
          <h2>See who goes together.</h2>
        </div>
        <span className="badge">Proposal v{p.version} · synthetic</span>
      </div>
      <div className="assembly-grid">
        {offers.map((o) => {
          const people = snap.participants.filter(
            (person) => p.assignments[person.id] === o.id,
          );
          const seats = people.reduce(
            (n, person) => n + 1 + Number(person.requirements.companion),
            0,
          );
          return (
            <article className="assembly-group" key={o.id}>
              <div className="assembly-destination">
                <Film size={23} />
                <h3>
                  {snap.events.find((e) => e.id === o.event_id)?.title ||
                    o.event_id}
                </h3>
              </div>
              <div className="assembly-people">
                {people.map((person) => (
                  <span key={person.id}>
                    <b>{person.name[0]}</b>
                    {person.name}
                    {person.requirements.wheelchair && (
                      <Accessibility
                        size={15}
                        aria-label="Wheelchair position"
                      />
                    )}
                    {person.requirements.companion && (
                      <small>+ companion</small>
                    )}
                  </span>
                ))}
              </div>
              <div className="assembly-transport">
                <Bus size={18} />
                <span>
                  {o.provider}
                  <strong>
                    {seats} / {o.seats} seats required
                  </strong>
                </span>
              </div>
            </article>
          );
        })}
      </div>
      {p.unserved.length > 0 && (
        <div className="assembly-unserved">
          <strong>{p.unserved.length} people still need an option</strong>
          {p.unserved.map((v) => (
            <p key={v.participant_id}>
              {snap.participants.find(
                (person) => person.id === v.participant_id,
              )?.name || v.participant_id}
              : {v.reasons.join("; ")}
            </p>
          ))}
        </div>
      )}
      <p className="small-note">
        Checked assignments, not commitments or confirmed transport. Companion
        seats are included.
      </p>
    </section>
  );
}

export function RepairReveal({
  before,
  after,
}: {
  before: Proposal;
  after: Proposal;
}) {
  const people = before.snapshot.participants;
  const changed = people.filter(
    (person) => before.assignments[person.id] !== after.assignments[person.id],
  );
  const assignment = (proposal: Proposal, pid: string) => {
    const offer = proposal.snapshot.offers.find(
      (o) => o.id === proposal.assignments[pid],
    );
    if (!offer) return "No assignment";
    const event = proposal.snapshot.events.find((e) => e.id === offer.event_id);
    return `${event?.title || offer.event_id} · ${offer.provider}`;
  };
  const difference = after.cost_minor - before.cost_minor;
  return (
    <section className="repair-reveal" aria-label="Before and after the change">
      <div className="repair-reveal-heading">
        <span className="eyebrow">
          THE PLAN CHANGED. THE PEOPLE STILL MATTER.
        </span>
        <h2>
          {changed.length
            ? `${changed.length} people have a different next step.`
            : "The assignments stayed the same."}
        </h2>
        <p>
          Comparing version {before.version} with version {after.version}. These
          are synthetic proposals; renewed review is still required.
        </p>
      </div>
      <div className="repair-score">
        <div>
          <span>Feasible participation</span>
          <strong>
            {before.served} <ArrowRight size={20} /> {after.served}
          </strong>
        </div>
        <div>
          <span>Organizer cost change</span>
          <strong>
            {difference > 0 ? "+" : ""}
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(difference / 100)}
          </strong>
        </div>
      </div>
      <div className="repair-rows">
        {changed.map((person) => (
          <article key={person.id}>
            <div className="repair-person">
              <span>{person.name[0]}</span>
              <strong>{person.name}</strong>
            </div>
            <div>
              <small>EARLIER · V{before.version}</small>
              <p>{assignment(before, person.id)}</p>
            </div>
            <ArrowRight className="repair-arrow" size={20} />
            <div>
              <small>CURRENT · V{after.version}</small>
              <p>{assignment(after, person.id)}</p>
            </div>
          </article>
        ))}
      </div>
      {after.unserved.length > 0 && (
        <div className="repair-unserved">
          <strong>Still without a feasible option</strong>
          {after.unserved.map((person) => (
            <p key={person.participant_id}>
              {after.snapshot.participants.find(
                (p) => p.id === person.participant_id,
              )?.name || person.participant_id}
              : {person.reasons.join("; ")}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
