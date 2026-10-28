import { useEffect, useRef } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Users,
  Heart,
  Bus,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  CalendarDays,
  Accessibility,
  Film,
  Download,
  CircleHelp,
} from "lucide-react";
import { DiscoveryPath, PlanAssembly, RepairReveal } from "./VisualStory";
import type { State, Person, Proposal } from "./types";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n % 100 ? 2 : 0,
  }).format(n / 100);
const time = (v: string) =>
  new Date(v).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
const chapters = [
  "The people",
  "Their choices",
  "The possibilities",
  "The commitments",
  "The unexpected",
  "The evidence",
];
export function currentPlans(s: State) {
  return s.proposals.filter(
    (p) =>
      !p.stale &&
      p.input_revision === s.revision &&
      p.status !== "Needs review after a change",
  );
}
const requirements = (p: Person) =>
  [
    p.requirements.wheelchair && "Wheelchair position",
    (p.requirements.step_free || p.requirements.wheelchair) &&
      "Step-free travel",
    p.requirements.companion && "A seat and ticket for a companion",
    p.requirements.hearing_loop && "Hearing loop",
  ].filter(Boolean) as string[];

export function Story({
  s,
  chapter,
  setChapter,
  busy,
  go,
  inspectPerson,
  inspectPlan,
  generate,
  changeOffer,
  interest,
}: {
  s: State;
  chapter: number;
  setChapter: (n: number) => void;
  busy: boolean;
  go: (page: string) => void;
  inspectPerson: (p: Person) => void;
  inspectPlan: (p: Proposal) => void;
  generate: () => void;
  changeOffer: (id: string, active: boolean) => void;
  interest: (pid: string, eid: string, response: string) => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    heading.current?.focus({ preventScroll: true });
  }, [chapter]);
  const plans = currentPlans(s);
  const approved = [...s.proposals].reverse().find((p) => p.approval);
  const latest = plans.at(-1);
  const plan = plans.find((p) => p.approval) || plans[0];
  const subject =
    s.participants.find((p) => p.id === "p2") || s.participants[0];
  const people = [
    subject,
    s.participants.find((p) => p.id === "p5"),
    s.participants.find((p) => p.id === "p7"),
  ].filter((p): p is Person => !!p);
  const interestCount = (eid: string) =>
    s.participants.filter(
      (p) =>
        !p.requirements.withdrawn &&
        p.interests[eid]?.response === "interested" &&
        p.interests[eid]?.event_version ===
          s.events.find((e) => e.id === eid)?.version,
    ).length;
  const shared = [...s.events]
    .sort((a, b) => interestCount(b.id) - interestCount(a.id))
    .slice(0, 3);
  const baseline = approved || s.proposals[0];
  const affectedOffer = baseline
    ? s.offers.find((o) => Object.values(baseline.assignments).includes(o.id))
    : undefined;
  const affectedPeople =
    baseline && affectedOffer
      ? Object.keys(baseline.assignments).filter(
          (id) => baseline.assignments[id] === affectedOffer.id,
        )
      : [];
  const confirmed = plans.find((p) => p.status === "Confirmed");
  const accepted = plan
    ? Object.values(plan.commitments).filter((v) => v === "accepted").length
    : 0;
  const expiredConfirmationCount = plan
    ? Object.values(plan.confirmations).filter(
        (c) => new Date(c.expires_at).getTime() <= Date.now(),
      ).length
    : 0;
  const narration = [
    {
      kicker: "01 / A COMMUNITY, NOT A HEADCOUNT",
      title: "A good invitation should come with a way to say yes.",
      text: `In this fictional Oak Cliff community, ${s.participants.length} people have different interests and different practical needs. The organizer has ${money(s.window.budget_minor)} for tickets and transport. The question is not just what to watch. It is who can actually join.`,
    },
    {
      kicker: "02 / DISCOVERY IS AN INVITATION",
      title: "A shared interest is found. A choice is still theirs.",
      text: "Qloo is designed to widen the cultural possibilities. People decide what they want. Try a response below and watch the shared-interest counts change—without turning a suggestion into consent.",
    },
    {
      kicker: "03 / THE MOMENT A PLAN BECOMES POSSIBLE",
      title: "Now give every “yes” a practical way forward.",
      text: "The planner combines accepted experiences with actual input constraints. Companion tickets, wheelchair positions, shared vehicles, return times, and every cent count. Unknown essential facts block assignments.",
    },
    {
      kicker: "04 / PEOPLE KEEP THE LAST WORD",
      title: "A workable plan is the beginning of a conversation.",
      text: "Review the itinerary. Approve its exact version. Each person commits to those details, and the organizer records evidence for transport and tickets. These are separate decisions, not one “ready” button.",
    },
    {
      kicker: "05 / GOOD PLANS KNOW HOW TO CHANGE",
      title: "Then the shuttle becomes unavailable.",
      text: "Try a real change to this synthetic workspace. The old plan must stop being actionable. UNBLOCK checks the remaining choices and resources, shows the repair, and asks for renewed approval.",
    },
    {
      kicker: "06 / AN HONEST ENDING",
      title: "A clearer next step. And a clear account of what we know.",
      text: "This walkthrough demonstrates a coordination workflow. It does not establish that Qloo improved discovery, that suppliers are available, or that anyone attended. Those are the next experiments—not claims hidden in the demo.",
    },
  ][chapter];
  return (
    <div className="story-page">
      <div className="story-topline">
        <span className="badge green">INTERACTIVE CASE STUDY</span>
        <span>
          Fictional people · real application decisions · about 5 minutes
        </span>
      </div>
      <nav className="chapter-nav" aria-label="Story chapters">
        {chapters.map((name, i) => (
          <button
            key={name}
            aria-current={chapter === i ? "step" : undefined}
            onClick={() => setChapter(i)}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            {name}
          </button>
        ))}
      </nav>
      <section className="story-intro">
        <div className="eyebrow">{narration.kicker}</div>
        <h1 ref={heading} tabIndex={-1}>
          {narration.title}
        </h1>
        <p>{narration.text}</p>
      </section>
      {chapter === 0 && (
        <>
          <div className="story-people">
            {people.map((p, i) => (
              <article className="story-person" key={p.id}>
                <div
                  className={"person-portrait portrait-" + i}
                  aria-hidden="true"
                >
                  <div className="portrait-head" />
                  <div className="portrait-body" />
                  <span>{p.name[0]}</span>
                </div>
                <div className="story-person-body">
                  <span className="eyebrow">FICTIONAL COMMUNITY MEMBER</span>
                  <h2>Meet {p.name}.</h2>
                  <p>
                    {requirements(p).length
                      ? `An invitation works only if the plan includes: ${requirements(p).join(", ").toLowerCase()}.`
                      : "A shared experience still has to fit their schedule and their own choices."}
                  </p>
                  <div className="person-need">
                    <Clock size={15} />
                    Return by {time(p.requirements.available_until)} CT
                  </div>
                  <div className="person-need">
                    <Heart size={15} />
                    {
                      Object.values(p.interests).filter(
                        (v) => v.response === "interested",
                      ).length
                    }{" "}
                    seeded or recorded interests
                  </div>
                  <button
                    className="text-link"
                    onClick={() => inspectPerson(p)}
                  >
                    Inspect {p.name}’s needs <ArrowRight size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="story-principle">
            <ShieldCheck size={23} />
            <div>
              <strong>People are never the constraint to relax.</strong>
              <p>
                The planner can change the grouping. It cannot silently remove a
                companion, infer consent, or overlook an essential access need.
              </p>
            </div>
          </div>
        </>
      )}
      {chapter === 1 && (
        <>
          <DiscoveryPath s={s} person={subject} go={go} />
          <div className="story-source">
            <Sparkles size={24} />
            <div>
              <h2>
                {s.evidence.some((e) => e.path === "/v2/insights")
                  ? "Provider evidence is available to inspect."
                  : "Where cultural intelligence belongs."}
              </h2>
              <p>
                {s.qloo_available
                  ? "The provider is configured. Review film identities, choose approved favorites, and run live discovery. Only returned catalogue matches receive provider evidence."
                  : "Qloo credentials have not arrived. The choices below are authored fixtures and demo responses—not recommendations from Qloo. Live discovery will occupy this step once verified."}
              </p>
              <button className="text-link" onClick={() => go("Discover")}>
                Open personal discovery <ArrowRight size={15} />
              </button>
            </div>
          </div>
          <div className="section-heading">
            <div>
              <h2>What might bring them together?</h2>
              <p>
                Change {subject.name}’s response. Counts use current, explicit
                interests.
              </p>
            </div>
          </div>
          <div className="shared-choices">
            {shared.map((e, i) => (
              <article className="panel choice-story" key={e.id}>
                <span className={"film-marker film-marker-" + i}>
                  <Film size={23} />
                </span>
                <h3>{e.title}</h3>
                <p>{e.description}</p>
                <div className="interest-meter">
                  <strong>{interestCount(e.id)}</strong>
                  <span>
                    of {s.participants.length} participants interested
                  </span>
                </div>
                <div
                  className="mini-people"
                  aria-label={`${interestCount(e.id)} participants interested`}
                >
                  {s.participants.map((p) => (
                    <span
                      key={p.id}
                      title={p.name}
                      className={
                        p.interests[e.id]?.response === "interested" &&
                        p.interests[e.id]?.event_version === e.version &&
                        !p.requirements.withdrawn
                          ? "interested"
                          : ""
                      }
                    >
                      {p.name[0]}
                    </span>
                  ))}
                </div>
                <span className="small-note">
                  Acting as {subject.name} · synthetic response
                </span>
                <div className="interest-options">
                  {["interested", "maybe", "not interested"].map((v) => (
                    <button
                      key={v}
                      disabled={busy || e.cancelled}
                      aria-label={`${subject.name}: ${v} in ${e.title}`}
                      aria-pressed={
                        subject.interests[e.id]?.response === v &&
                        subject.interests[e.id]?.event_version === e.version
                      }
                      onClick={() => interest(subject.id, e.id, v)}
                    >
                      {v === "not interested"
                        ? "Not for me"
                        : v === "interested"
                          ? "Interested"
                          : "Maybe"}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <button
            className="primary spaced"
            onClick={() => go("Compare discovery")}
          >
            Test what discovery changes <ArrowRight size={16} />
          </button>
          <p className="story-footnote">
            Shared interest is not feasibility. A popular screening may still
            fail the budget, transport, or access checks.
          </p>
        </>
      )}
      {chapter === 2 && (
        <>
          <div className="constraint-ribbon">
            <div>
              <Users size={19} />
              <strong>{s.participants.length} people</strong>
              <span>Including unserved people</span>
            </div>
            <div>
              <Bus size={19} />
              <strong>
                {
                  s.offers.filter(
                    (o) =>
                      o.active && new Date(o.expires_at).getTime() > Date.now(),
                  ).length
                }{" "}
                current offers
              </strong>
              <span>Not confirmed bookings</span>
            </div>
            <div>
              <ShieldCheck size={19} />
              <strong>{money(s.window.budget_minor)} budget</strong>
              <span>Integer cents, no hidden subsidy</span>
            </div>
          </div>
          <div className="story-action">
            <div>
              <h2>
                {plan
                  ? "These possibilities have passed the checks."
                  : "Let’s find out what is actually feasible."}
              </h2>
              <p>
                No prewritten success screen. The result comes from this
                workspace’s current inputs.
              </p>
            </div>
            <button className="primary" disabled={busy} onClick={generate}>
              <Sparkles size={17} />
              {busy ? "Checking the possibilities…" : "Run the planning checks"}
            </button>
          </div>
          {plan ? (
            <>
              <div className="story-result">
                <span className="eyebrow">
                  CHECKED FEASIBILITY · NOT A BOOKING
                </span>
                <div>
                  <strong>
                    {plan.served}
                    <span> / {s.participants.length}</span>
                  </strong>
                  <h2>
                    people have a workable option
                    <br />
                    <span>
                      for {money(plan.cost_minor)} in organizer costs.
                    </span>
                  </h2>
                </div>
                <p>
                  {plan.unserved.length
                    ? `${plan.unserved.length} people remain unserved. Their blockers must be reviewed; they do not disappear from the denominator.`
                    : "Everyone in this scenario has a feasible assignment. Their commitments and resource confirmations are still separate."}
                </p>
                <button className="text-link" onClick={() => inspectPlan(plan)}>
                  Inspect this exact plan <ArrowRight size={16} />
                </button>
              </div>
              <PlanAssembly proposal={plan} />
              <details className="itinerary-expand">
                <summary>Inspect times, access, and itemized costs</summary>
                <PlanItinerary proposal={plan} />
              </details>
              <div className="alternatives-strip">
                {plans.slice(-3).map((p) => (
                  <button key={p.id} onClick={() => inspectPlan(p)}>
                    <span>Version {p.version}</span>
                    <strong>
                      {p.served} people · {money(p.cost_minor)}
                    </strong>
                    <span>
                      {p.status}
                      <ArrowRight size={14} />
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : s.traces[0] ? (
            <div className="story-blocked" role="status">
              <AlertCircle />
              <div>
                <h2>There isn’t a checked plan for these inputs.</h2>
                <p>
                  {s.traces[0].blockers.join("; ") ||
                    "Inputs changed. Run the checks again."}
                </p>
                <button className="text-link" onClick={() => go("Resources")}>
                  Review the available resources <ArrowRight size={15} />
                </button>
              </div>
            </div>
          ) : (
            <div className="checks-preview">
              <h3>Five checks before one person is assigned</h3>
              {[
                "Their current response is “interested.”",
                "Travel and the event fit their availability.",
                "Essential venue and vehicle access facts are known.",
                "People and companions fit shared seats and tickets.",
                "The full organizer cost fits the budget.",
              ].map((v, i) => (
                <div key={v}>
                  <span>{i + 1}</span>
                  {v}
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {chapter === 3 && (
        <>
          <div className="consent-story">
            <div>
              <Heart size={27} />
              <h2>
                A “yes” belongs to a person,
                <br />
                and to a particular itinerary.
              </h2>
              <p>
                Choosing a film is not permission to change its time, venue,
                price, or support arrangements. Material changes require renewed
                review.
              </p>
            </div>
            <div className="consent-counts">
              <div>
                <strong>{plan?.approval ? "1" : "0"}</strong>
                <span>current organizer approvals</span>
              </div>
              <div>
                <strong>
                  {accepted}
                  <small> / {plan?.served || 0}</small>
                </strong>
                <span>recorded participant commitments</span>
              </div>
              <div>
                <strong>
                  {plan
                    ? Object.keys(plan.confirmations).length -
                      expiredConfirmationCount
                    : 0}
                  <small>
                    {" "}
                    / {plan ? new Set(Object.values(plan.assignments)).size : 0}
                  </small>
                </strong>
                <span>unexpired resource confirmations</span>
              </div>
            </div>
          </div>
          {plan ? (
            <section className="panel story-review">
              <span className="badge green">{plan.status}</span>
              <h2>Review proposal version {plan.version}.</h2>
              <p>
                Use the proposal screen to approve the exact version, record
                each fictional participant’s decision, and attach synthetic
                provider evidence. No bulk acceptance is invented for the
                walkthrough.
              </p>
              <button className="primary" onClick={() => inspectPlan(plan)}>
                Review commitments & confirmations <ArrowRight size={17} />
              </button>
              {confirmed && (
                <a
                  className="secondary"
                  href={`/api/proposals/${confirmed.id}/export?format=ics&final=true`}
                >
                  <Download size={16} />
                  Download confirmed demo itinerary
                </a>
              )}
            </section>
          ) : (
            <div className="story-blocked">
              <CircleHelp />
              <div>
                <h2>Start with a current, checked proposal.</h2>
                <p>Nothing can be approved until the planning checks pass.</p>
                <button className="primary" onClick={() => setChapter(2)}>
                  Go to the possibilities
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {chapter === 4 && (
        <>
          {!baseline || !affectedOffer ? (
            <div className="story-blocked">
              <CircleHelp />
              <div>
                <h2>Generate a proposal first.</h2>
                <p>
                  This chapter changes a resource actually used by your plan,
                  rather than playing a scripted animation.
                </p>
                <button className="primary" onClick={() => setChapter(2)}>
                  Build the first plan
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="disruption-card">
                <span className="badge amber">CONTROLLED DEMONSTRATION</span>
                <h2>
                  {affectedOffer.active
                    ? `What if ${affectedOffer.provider} can’t make it?`
                    : `${affectedOffer.provider} is now unavailable.`}
                </h2>
                <p>
                  Version {baseline.version} uses this offer for{" "}
                  {affectedPeople.length} participants. Making it unavailable
                  changes the saved workspace and invalidates prior plans. You
                  can restore the offer afterwards.
                </p>
                <div
                  className="affected-people"
                  aria-label="Participants affected by this shuttle"
                >
                  {affectedPeople.map((id) => (
                    <span key={id}>
                      <Users size={15} />
                      {baseline.snapshot.participants.find((p) => p.id === id)
                        ?.name || id}
                      <small>
                        {affectedOffer.active
                          ? "Uses this shuttle"
                          : latest && latest.id !== baseline.id
                            ? "Review the revised plan"
                            : "Needs a new option"}
                      </small>
                    </span>
                  ))}
                </div>
                <div className="button-row">
                  <button
                    className={
                      affectedOffer.active ? "secondary danger" : "secondary"
                    }
                    disabled={busy}
                    onClick={() =>
                      changeOffer(affectedOffer.id, !affectedOffer.active)
                    }
                  >
                    {affectedOffer.active
                      ? "Simulate this shuttle cancellation"
                      : "Restore this shuttle offer"}
                  </button>
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={generate}
                  >
                    <Sparkles size={16} />
                    Check the remaining options
                  </button>
                </div>
              </div>
              {latest && latest.id !== baseline.id && (
                <RepairReveal before={baseline} after={latest} />
              )}
              <div className="repair-grid">
                <section className="panel">
                  <div className="eyebrow">THE EARLIER VERSION</div>
                  <h2>Version {baseline.version}</h2>
                  <span
                    className={
                      "badge " +
                      (baseline.status === "Needs review after a change"
                        ? "amber"
                        : "green")
                    }
                  >
                    {baseline.status}
                  </span>
                  <p className="spaced">
                    {baseline.served} people · {money(baseline.cost_minor)}
                    <br />
                    The original record is retained. Approval cannot carry over
                    silently.
                  </p>
                </section>
                <section className="panel">
                  <div className="eyebrow">THE CURRENT POSSIBILITY</div>
                  <h2>
                    {latest && latest.id !== baseline.id
                      ? `Version ${latest.version}`
                      : "Run a new check"}
                  </h2>
                  {latest && latest.id !== baseline.id ? (
                    <>
                      <span className="badge green">{latest.status}</span>
                      <p className="spaced">
                        {latest.served} people · {money(latest.cost_minor)}
                        <br />
                        {
                          baseline.snapshot.participants.filter(
                            (person) =>
                              baseline.assignments[person.id] !==
                              latest.assignments[person.id],
                          ).length
                        }{" "}
                        participant assignments changed versus version{" "}
                        {baseline.version}.
                      </p>
                      <button
                        className="text-link"
                        onClick={() => inspectPlan(latest)}
                      >
                        Inspect changes and blockers <ArrowRight size={15} />
                      </button>
                    </>
                  ) : (
                    <p className="spaced">
                      The next result may serve fewer people—or be infeasible.
                      The application will say so.
                    </p>
                  )}
                </section>
              </div>
            </>
          )}
        </>
      )}
      {chapter === 5 && (
        <>
          <div className="story-result final-story">
            <span className="eyebrow">THE RESULT IN THIS WORKSPACE</span>
            <h2>
              {confirmed
                ? "A synthetic itinerary has every confirmation."
                : plan
                  ? "A checked possibility. Clear steps to confirmation."
                  : "The next useful step is another feasibility check."}
            </h2>
            <p>
              {plan
                ? `${plan.served} of ${s.participants.length} people assigned, ${plan.unserved.length} unserved, ${money(plan.cost_minor)} organizer cost. Status: ${plan.status}.`
                : "No current proposal is actionable. Review the blockers rather than assuming the original plan still works."}
            </p>
            <div className="button-row">
              <button
                className="primary"
                onClick={() => (plan ? inspectPlan(plan) : setChapter(2))}
              >
                {plan ? "Open the current plan" : "Return to planning"}
                <ArrowRight size={17} />
              </button>
              <button className="secondary" onClick={() => go("Evidence")}>
                Inspect the decision trail
              </button>
            </div>
          </div>
          <div className="proof-grid">
            <section className="panel">
              <CheckCircle2 size={23} />
              <h2>What this demo can show</h2>
              <ul>
                <li>Explicit choices drive assignments.</li>
                <li>Feasibility is checked independently.</li>
                <li>Unserved people and blockers stay visible.</li>
                <li>Changes invalidate earlier decisions.</li>
                <li>Exports retain version and status.</li>
              </ul>
            </section>
            <section className="panel">
              <CircleHelp size={23} />
              <h2>What still needs real evidence</h2>
              <ul>
                <li>Whether Qloo introduces useful accepted choices.</li>
                <li>Whether real event mappings have enough coverage.</li>
                <li>Whether organizers save time after data entry.</li>
                <li>Whether suppliers confirm workable arrangements.</li>
                <li>Whether people attend and want to return.</li>
              </ul>
            </section>
          </div>
          <Readiness s={s} />
        </>
      )}
      <div className="story-pagination">
        <button
          className="secondary"
          disabled={chapter === 0}
          onClick={() => setChapter(chapter - 1)}
        >
          <ArrowLeft size={15} />
          Previous chapter
        </button>
        <span>
          {chapter + 1} of {chapters.length}
        </span>
        <button
          className="primary"
          onClick={() =>
            chapter === 5 ? go("Overview") : setChapter(chapter + 1)
          }
        >
          {chapter === 5
            ? "Back to workspace"
            : "Next: " + chapters[chapter + 1]}
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}

export function PlanItinerary({ proposal: p }: { proposal: Proposal }) {
  const snap = p.snapshot;
  if (!snap) return null;
  const offers = [...new Set(Object.values(p.assignments))]
    .map((id) => snap.offers.find((o) => o.id === id))
    .filter((o) => !!o);
  return (
    <section className="panel itinerary-panel">
      <div className="section-heading">
        <div>
          <h2>The day, made concrete.</h2>
          <p>
            Proposal v{p.version} · {p.status} · synthetic arrangements · all
            times Central
          </p>
        </div>
        <CalendarDays size={23} />
      </div>
      <div className="itinerary-grid">
        {offers.map((o) => {
          const e = snap.events.find((e) => e.id === o.event_id);
          if (!e) return null;
          const people = snap.participants.filter(
            (person) => p.assignments[person.id] === o.id,
          );
          const companions = people.filter(
            (person) => person.requirements.companion,
          ).length;
          const tickets = people.reduce((n) => n + 1, companions);
          const contribution = people.reduce(
            (sum, person) =>
              sum +
              Math.min(
                o.contribution_minor,
                e.ticket_minor * (1 + Number(person.requirements.companion)),
              ),
            0,
          );
          const cost =
            o.fixed_minor +
            people.reduce(
              (n, person) =>
                n +
                Math.max(
                  0,
                  e.ticket_minor * (1 + Number(person.requirements.companion)) -
                    o.contribution_minor,
                ),
              0,
            );
          return (
            <article className="itinerary-outing" key={o.id}>
              <div className="itinerary-event">
                <span>
                  <Film size={21} />
                </span>
                <div>
                  <h3>{e.title}</h3>
                  <p>{e.venue}</p>
                </div>
              </div>
              <ol className="day-timeline">
                <li>
                  <Bus size={16} />
                  <div>
                    <strong>{time(o.departure)}</strong>
                    <span>Depart with {o.provider}</span>
                  </div>
                </li>
                <li>
                  <Film size={16} />
                  <div>
                    <strong>{time(e.start)}</strong>
                    <span>Screening begins · ends {time(e.end)}</span>
                  </div>
                </li>
                <li>
                  <Clock size={16} />
                  <div>
                    <strong>{time(o.returns)}</strong>
                    <span>Planned return</span>
                  </div>
                </li>
              </ol>
              <div className="itinerary-demand">
                <span>
                  {people.length} participants
                  {companions
                    ? ` + ${companions} companion${companions > 1 ? "s" : ""}`
                    : ""}
                </span>
                <span>
                  {tickets} seats / {o.seats} · {tickets} tickets
                </span>
                <span>
                  <Accessibility size={14} />
                  {
                    people.filter((p) => p.requirements.wheelchair).length
                  } / {o.wheelchair} wheelchair positions
                </span>
              </div>
              <details>
                <summary>Who is assigned?</summary>
                <p>{people.map((p) => p.name).join(", ")}</p>
                <small>Synthetic names. This is an organizer view.</small>
              </details>
              <dl className="itinerary-cost">
                <div>
                  <dt>Transport</dt>
                  <dd>{money(o.fixed_minor)}</dd>
                </div>
                <div>
                  <dt>
                    {tickets} tickets × {money(e.ticket_minor)}
                  </dt>
                  <dd>{money(tickets * e.ticket_minor)}</dd>
                </div>
                {contribution > 0 && (
                  <div>
                    <dt>Contributions applied to tickets</dt>
                    <dd>{money(contribution)}</dd>
                  </div>
                )}
                <div className="cost-total">
                  <dt>Organizer cost</dt>
                  <dd>{money(cost)}</dd>
                </div>
              </dl>
              <p className="small-note">
                Offer v{o.version} · valid until {time(o.expires_at)}.{" "}
                {o.source}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function Readiness({ s }: { s: State }) {
  const hasInsights = s.evidence.some((e) => e.path === "/v2/insights");
  const items = [
    {
      title: "Core workflow",
      status: "Available locally",
      detail:
        "Discovery choices, checked plans, exact-version approval, commitments, resource evidence, repair, and exports.",
      ready: true,
    },
    {
      title: "Live cultural grounding",
      status: hasInsights
        ? "Provider evidence retrieved"
        : s.qloo_available
          ? "Configured; verify live coverage"
          : "Awaiting Qloo credential",
      detail:
        "A successful request alone does not prove useful discovery. Check catalogue coverage and participant acceptance.",
      ready: hasInsights,
    },
    {
      title: "Language-model assistant",
      status: s.model_available
        ? "Configured; live validation needed"
        : "Optional credentials not configured",
      detail:
        "Deterministic planning works without it. The model adapter still needs real provider testing.",
      ready: false,
    },
    {
      title: "Public judge access",
      status: "Public demo and source available",
      detail:
        "The demo is hosted at unblock-demo.onrender.com with HTTPS and persistent storage. Public source, license, and verification details are on GitHub.",
      ready: true,
    },
    {
      title: "Private pilot",
      status: "Not enabled",
      detail:
        "Real organizer accounts, participant invitations, production database, and real-user access testing are required before collecting real records.",
      ready: false,
    },
  ];
  return (
    <section className="panel readiness-panel">
      <div className="section-heading">
        <div>
          <h2>What remains before the real thing?</h2>
          <p>
            A visible delivery checklist—not a claim that the whole product is
            finished.
          </p>
        </div>
        <ShieldCheck size={23} />
      </div>
      {items.map((item) => (
        <div className="readiness-item" key={item.title}>
          {item.ready ? <CheckCircle2 size={18} /> : <Clock size={18} />}
          <div>
            <strong>{item.title}</strong>
            <span>{item.status}</span>
            <p>{item.detail}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
