import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  X,
  LayoutDashboard,
  Users,
  Compass,
  CalendarDays,
  Bus,
  Sparkles,
  ShieldCheck,
  Settings,
  Download,
  RefreshCw,
  ChevronRight,
  CircleHelp,
  CheckCircle2,
  Clock,
  Heart,
  AlertCircle,
  Menu,
  Leaf,
  Film,
  Search,
  Accessibility,
  Wallet,
  ExternalLink,
  Trash2,
} from "lucide-react";
import type { State, Person, Event, Offer, Proposal } from "./types";
import "./style.css";
import { LiveDiscoverySetup } from "./LiveDiscoverySetup";
import { StoryOpening } from "./VisualStory";
import { DiscoveryComparison } from "./Comparison";
import { Story, PlanItinerary, Readiness } from "./Story";
const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n % 100 ? 2 : 0,
  }).format(n / 100);
const when = (v: string) =>
  new Date(v).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
const local = (v: string) => {
  const d = new Date(v);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
async function api(path: string, body?: unknown, method?: string) {
  const r = await fetch("/api" + path, {
    method: method || (body ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", "X-Unblock-Request": "1" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) {
    const text = await r.text();
    let msg = text;
    try {
      const e = JSON.parse(text);
      msg = typeof e.detail === "string" ? e.detail : JSON.stringify(e.detail);
    } catch {}
    throw new Error(msg || r.statusText);
  }
  return r.json();
}
const nav = [
  ["Overview", LayoutDashboard],
  ["The story", Heart],
  ["Compare discovery", Sparkles],
  ["Discover", Compass],
  ["Participants", Users],
  ["Catalogue", CalendarDays],
  ["Resources", Bus],
  ["Plans", Sparkles],
  ["Evidence", ShieldCheck],
] as const;
function Badge({
  children,
  tone = "",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={"badge " + tone}>{children}</span>;
}
function App() {
  const [s, setS] = useState<State | null>(null),
    [page, setPage] = useState("Overview"),
    [chapter, setChapter] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [pid, setPid] = useState("p1"),
    [selected, setSelected] = useState<string | null>(null),
    [mobile, setMobile] = useState(false),
    [welcome, setWelcome] = useState(false),
    [modal, setModal] = useState<React.ReactNode>(null);
  const announce = useRef<HTMLDivElement>(null);
  const personalization = useRef<HTMLDetailsElement>(null);
  const sessionStarted = useRef(false);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page]);
  useEffect(() => {
    let active = true;
    api("/state")
      .then((value) => {
        if (active && !sessionStarted.current) setS(value);
      })
      .catch(() => {
        if (active && !sessionStarted.current) setWelcome(true);
      });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!s || busy) return;
    let active = true;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void api("/state")
        .then((value) => {
          if (active) setS(value);
        })
        .catch(() => {});
    };
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [busy, !!s]);
  async function start() {
    sessionStarted.current = true;
    setBusy(true);
    setError("");
    try {
      setS(await api("/demo", {}));
      setWelcome(false);
      setPage("Overview");
      setSelected(null);
      setChapter(0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function act(
    action: string,
    target = "",
    data: Record<string, unknown> = {},
  ) {
    if (!s) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await api("/command", {
        revision: s.revision,
        action,
        target,
        data,
        idempotency_key: crypto.randomUUID(),
      });
      setS(response.state);
      setNotice(
        ["plan", "replan"].includes(action)
          ? "Planning complete. Review the options and any blockers."
          : "Changes saved.",
      );
      return response.result;
    } catch (e) {
      setError((e as Error).message);
      try {
        setS(await api("/state"));
      } catch {}
      throw e;
    } finally {
      setBusy(false);
    }
  }
  const run = (
    action: string,
    target = "",
    data: Record<string, unknown> = {},
  ) => void act(action, target, data).catch(() => {});
  const go = (next: string) => {
    setPage(next);
    setMobile(false);
    setSelected(null);
  };
  const person =
    s?.participants.find((p) => p.id === pid) || s?.participants[0];
  const current =
    s?.proposals.filter(
      (p) =>
        !p.stale &&
        p.input_revision === s.revision &&
        p.status !== "Needs review after a change",
    ) || [];
  const best = current[0];
  const personName = (id: string) =>
    s?.participants.find((p) => p.id === id)?.name || id;
  const eventFor = (oid: string) =>
    s?.events.find(
      (e) => e.id === s.offers.find((o) => o.id === oid)?.event_id,
    );
  function editRequirements(p: Person) {
    setModal(
      <RequirementsForm
        person={p}
        save={async (data) => {
          await act("requirements", p.id, data);
          setModal(null);
        }}
      />,
    );
  }
  function editRecord(record: Event | Offer, type: "event" | "offer") {
    setModal(
      <RecordForm
        record={record}
        type={type}
        save={async (data) => {
          await act(type, record.id, data);
          setModal(null);
        }}
      />,
    );
  }
  async function plan(repair = false) {
    try {
      await act(repair ? "replan" : "plan");
      go("Plans");
    } catch {}
  }
  if (welcome || !s)
    return (
      <div className="welcome">
        <div className="wordmark">
          <span className="brand-icon">
            <ArrowUpRight />
          </span>
          unblock<span className="brand-dot">.</span>
        </div>
        <div className="welcome-body">
          <Badge tone="green">CULTURE BRINGS US CLOSER</Badge>
          <h1>
            Good experiences.
            <br />
            More people <em>together.</em>
          </h1>
          <p>
            Discover what your community loves. Turn shared interests into
            outings that work—with transport, access needs, and budgets
            considered.
          </p>
          <button className="primary large" disabled={busy} onClick={start}>
            {busy ? "Preparing your workspace…" : "Explore the demo"}
            <ArrowRight size={18} />
          </button>
          <div className="welcome-proof">
            <ShieldCheck size={20} />
            <span>
              Private, isolated walkthrough · 12 fictional participants
              <br />
              No bookings. No real participant data. Expires after 24 hours.
            </span>
          </div>
          {error && <p role="alert">{error}</p>}
        </div>
        <div className="welcome-art">
          <div className="orbit one" />
          <div className="orbit two" />
          <div className="art-note">
            <span>THE NEXT GOOD THING</span>
            <h2>
              A seat for
              <br />
              everyone.
            </h2>
            <div className="people-art">
              ◒ ◕ ◑<br />◑ ◒ ◕
            </div>
            <small>Shared interests. Real possibilities.</small>
          </div>
        </div>
      </div>
    );
  return (
    <div className="app-shell">
      <a className="skip" href="#main">
        Skip to main content
      </a>
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <div className="wordmark">
          <span className="brand-icon">
            <ArrowUpRight />
          </span>
          unblock<span className="brand-dot">.</span>
        </div>
        <div className="workspace">
          <div className="workspace-avatar">OC</div>
          <div>
            <strong>Oak Cliff Community</strong>
            <span>Organizer workspace</span>
          </div>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {nav.map(([label, Icon]) => (
            <button
              key={label}
              aria-label={label}
              className={page === label ? "nav-item active" : "nav-item"}
              onClick={() => go(label)}
            >
              <Icon size={19} />
              {label}
              {label === "Participants" && (
                <span className="nav-count">12</span>
              )}
              {label === "Plans" && current.length > 0 && (
                <span className="nav-count">{current.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-note">
            <span className="status-dot" />
            Your own demo space
            <p>
              Explore freely. All people, events, and resources are fictional.
            </p>
            <button
              onClick={() =>
                setModal(
                  <div>
                    <h2>Start fresh?</h2>
                    <p>
                      Your current workspace will be replaced in this browser.
                      It expires automatically after 24 hours.
                    </p>
                    <button
                      className="primary"
                      onClick={() => {
                        setModal(null);
                        void start();
                      }}
                    >
                      Create a new demo
                    </button>
                  </div>,
                )
              }
            >
              Reset walkthrough <RefreshCw size={13} />
            </button>
          </div>
          <button className="nav-item" onClick={() => go("Settings")}>
            <Settings size={19} />
            Workspace settings
          </button>
          <div className="profile">
            <div className="avatar">AL</div>
            <div>
              <strong>Demo organizer</strong>
              <span>Synthetic workspace</span>
            </div>
            <ShieldCheck size={17} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Toggle navigation"
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>
          <span>
            Workspace <ChevronRight size={14} /> <strong>{page}</strong>
          </span>
          <div>
            <Badge tone="amber">Synthetic operations</Badge>
            <span className="provider-status">
              <span
                className={"status-dot " + (s.qloo_available ? "" : "muted")}
              />
              {s.qloo_available ? "Qloo configured" : "Qloo awaiting key"}
            </span>
            <button
              className="icon-button"
              aria-label="Walkthrough help"
              onClick={() =>
                setModal(
                  <div>
                    <h2>Your three-minute walkthrough</h2>
                    <ol className="help-list">
                      <li>
                        Choose a participant in Discover and record an interest.
                      </li>
                      <li>Check access needs in Participants.</li>
                      <li>Generate and compare plans.</li>
                      <li>
                        Approve an exact version, then record each synthetic
                        participant’s commitment.
                      </li>
                      <li>
                        Record synthetic provider confirmations. Export the
                        itinerary.
                      </li>
                      <li>
                        Make a resource unavailable and generate a repair.
                      </li>
                    </ol>
                    <p>
                      Live Qloo discovery requires a server-side key and
                      reviewed film mappings. No synthetic recommendation is
                      represented as a Qloo response.
                    </p>
                  </div>,
                )
              }
            >
              <CircleHelp size={20} />
            </button>
          </div>
        </header>
        <main id="main">
          <div ref={announce} className="announcements" aria-live="polite">
            {error && (
              <div className="alert error" role="alert">
                <AlertCircle size={18} />
                <span>{error}</span>
                <button aria-label="Dismiss error" onClick={() => setError("")}>
                  <X size={16} />
                </button>
              </div>
            )}
            {notice && (
              <div className="notice">
                <CheckCircle2 size={15} />
                {notice}
              </div>
            )}
            {busy && (
              <div className="loading">
                <span className="spinner" />
                Working on your request…
              </div>
            )}
          </div>
          {page === "Compare discovery" && (
            <DiscoveryComparison s={s} busy={busy} run={run} go={go} />
          )}
          {page === "The story" && (
            <Story
              s={s}
              chapter={chapter}
              setChapter={setChapter}
              busy={busy}
              go={go}
              inspectPerson={editRequirements}
              inspectPlan={(p) => {
                setPage("Plans");
                setSelected(p.id);
              }}
              generate={() => run(s.proposals.length ? "replan" : "plan")}
              changeOffer={(id, active) => run("offer", id, { active })}
              interest={(pid, event_id, response) =>
                run("interest", pid, { event_id, response })
              }
            />
          )}
          {page === "Overview" && (
            <>
              <StoryOpening s={s} start={() => go("The story")} />
              <div className="stats-grid">
                <Stat
                  label="People in your community"
                  value="12"
                  detail="Synthetic participant profiles"
                  icon={<Users />}
                />
                <Stat
                  label="Experiences to discover"
                  value={String(s.events.length)}
                  detail="Curated demonstration screenings"
                  icon={<Compass />}
                />
                <Stat
                  label="Community outing budget"
                  value={money(s.window.budget_minor)}
                  detail="Transport + tickets · USD"
                  icon={<Wallet />}
                />
                <Stat
                  label="Feasible participation"
                  value={best ? `${best.served} / 12` : "— / 12"}
                  detail={
                    best
                      ? "Current candidate, not committed"
                      : "Generate a plan to see coverage"
                  }
                  icon={<Heart />}
                />
              </div>
              <div className="two-columns">
                <section className="panel">
                  <div className="section-heading">
                    <div>
                      <h2>From interest to an outing</h2>
                      <p>A clear next step, every step of the way.</p>
                    </div>
                    <Badge>YOUR WORKFLOW</Badge>
                  </div>
                  <div className="steps">
                    {[
                      [
                        "01",
                        "Get to know your people",
                        "Interests and practical requirements",
                        "Participants",
                      ],
                      [
                        "02",
                        "Find the common ground",
                        "Explore the catalogue and record choices",
                        "Discover",
                      ],
                      [
                        "03",
                        "Build a workable plan",
                        "Check the budget, transport, and access needs",
                        "Plans",
                      ],
                      [
                        "04",
                        "Confirm the details",
                        "Approve, commit, and confirm resources",
                        "Plans",
                      ],
                    ].map(([n, title, desc, dest]) => (
                      <button
                        className="workflow-step"
                        key={n}
                        onClick={() => go(dest)}
                      >
                        <span className="step-number">{n}</span>
                        <span>
                          <strong>{title}</strong>
                          <small>{desc}</small>
                        </span>
                        <ArrowRight size={17} />
                      </button>
                    ))}
                  </div>
                </section>
                <section className="panel next-panel">
                  <span className="mini-icon">
                    <ShieldCheck size={21} />
                  </span>
                  <h2>
                    Confidence comes
                    <br />
                    from clear evidence.
                  </h2>
                  <p>
                    A recommendation isn’t an RSVP. A feasible plan isn’t a
                    booking. Every stage stays visible, with your community in
                    control.
                  </p>
                  <div className="evidence-line">
                    <Check size={15} />
                    Explicit participant choices
                  </div>
                  <div className="evidence-line">
                    <Check size={15} />
                    Independent feasibility checks
                  </div>
                  <div className="evidence-line">
                    <Check size={15} />
                    Versioned approval and commitment
                  </div>
                  <button className="text-link" onClick={() => go("Evidence")}>
                    See how it works <ArrowUpRight size={16} />
                  </button>
                </section>
              </div>
              <div className="section-heading catalogue-heading">
                <div>
                  <h2>A little inspiration</h2>
                  <p>Fictional screenings to explore together.</p>
                </div>
                <button className="text-link" onClick={() => go("Catalogue")}>
                  View catalogue <ArrowRight size={16} />
                </button>
              </div>
              <div className="event-grid three">
                {s.events.slice(0, 3).map((e, i) => (
                  <EventCard
                    key={e.id}
                    event={e}
                    index={i}
                    onOpen={() => go("Discover")}
                  />
                ))}
              </div>
            </>
          )}
          {page === "Participants" && (
            <>
              <Heading
                eyebrow="PEOPLE FIRST"
                title="Your community"
                text="The right outing starts with what people want—and what they need."
              />
              <div className="info-strip">
                <ShieldCheck size={18} />
                <span>
                  All 12 profiles are fictional. This demo lets you act as each
                  participant. Private pilot authentication is not enabled.
                </span>
              </div>
              <div className="panel table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Participant</th>
                      <th>Expressed interest</th>
                      <th>Practical needs</th>
                      <th>Participation</th>
                      <th>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.participants.map((p, i) => (
                      <tr key={p.id}>
                        <td>
                          <div className="person-cell">
                            <div className={"avatar avatar-" + (i % 4)}>
                              {p.name.slice(0, 1)}
                            </div>
                            <div>
                              <strong>{p.name}</strong>
                              <small>Participant {i + 1}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          {
                            Object.values(p.interests).filter(
                              (x) => x.response === "interested",
                            ).length
                          }{" "}
                          experiences
                        </td>
                        <td>
                          <div className="tags">
                            {p.requirements.wheelchair && (
                              <Badge>Wheelchair position</Badge>
                            )}
                            {p.requirements.companion && (
                              <Badge>Companion seat</Badge>
                            )}
                            {p.requirements.hearing_loop && (
                              <Badge>Hearing loop</Badge>
                            )}
                            {p.requirements.step_free && (
                              <Badge>Step-free</Badge>
                            )}
                            {!p.requirements.wheelchair &&
                              !p.requirements.companion &&
                              !p.requirements.hearing_loop &&
                              !p.requirements.step_free && (
                                <span className="muted-text">
                                  No additional access needs
                                </span>
                              )}
                          </div>
                        </td>
                        <td>
                          <Badge
                            tone={p.requirements.withdrawn ? "amber" : "green"}
                          >
                            {p.requirements.withdrawn
                              ? "Withdrawn"
                              : p.requirements.mandatory
                                ? "Service commitment"
                                : "Enrolled"}
                          </Badge>
                        </td>
                        <td>
                          <button
                            className="secondary small"
                            onClick={() => editRequirements(p)}
                          >
                            Requirements
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {page === "Discover" && person && (
            <>
              <Heading
                eyebrow="CULTURE IS PERSONAL"
                title="Find your next good thing."
                text="Explore an experience. Express interest. The final choice is always yours."
              />
              <div className="discover-toolbar">
                <label>
                  Exploring as{" "}
                  <select
                    value={person.id}
                    onChange={(e) => setPid(e.target.value)}
                  >
                    {s.participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · synthetic participant
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="secondary"
                  onClick={() => editRequirements(person)}
                >
                  <Accessibility size={17} />
                  My practical needs
                </button>
              </div>
              <section
                className="discovery-intro"
                aria-label="Your discovery at a glance"
              >
                <div>
                  <span className="eyebrow">AN INVITATION STARTS WITH YOU</span>
                  <h2>
                    A film. A shared feeling.
                    <br />
                    <em>A reason to get together.</em>
                  </h2>
                  <p>
                    Explore the screenings below as {person.name}. Choose what
                    interests you; travel and access checks come next.
                  </p>
                </div>
                <div className="discovery-tally">
                  <Heart size={25} />
                  <strong>
                    {
                      s.events.filter(
                        (e) =>
                          !person.requirements.withdrawn &&
                          person.interests[e.id]?.response === "interested" &&
                          person.interests[e.id]?.event_version === e.version,
                      ).length
                    }
                    <span> / {s.events.length}</span>
                  </strong>
                  <span>current interested choices</span>
                  <small>Seeded or recorded demo responses</small>
                </div>
              </section>
              <LiveDiscoverySetup
                s={s}
                person={person}
                busy={busy}
                review={() => go("Catalogue")}
                personalize={() => {
                  if (personalization.current) {
                    personalization.current.open = true;
                    personalization.current.scrollIntoView({ block: "center" });
                    personalization.current.querySelector("summary")?.focus();
                  }
                }}
                discover={() => run("discover", person.id)}
              />
              <details ref={personalization} className="personalize-disclosure">
                <summary>
                  <Sparkles size={18} />
                  <span>
                    Personalize with Qloo
                    <small>Optional favorites and consent</small>
                  </span>
                  <Plus size={18} />
                </summary>
                <div className="panel taste-panel">
                  <div>
                    <div className="eyebrow">YOUR CULTURAL STARTING POINT</div>
                    <h2>A few things you already love.</h2>
                    <p>
                      Optional: connect film favorites to Qloo. Or skip
                      profiling and explore the catalogue directly.
                    </p>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={person.consent}
                        onChange={(e) =>
                          run("consent", person.id, {
                            consent: e.target.checked,
                          })
                        }
                        disabled={busy}
                      />
                      I agree to use my selected favorites for cultural
                      recommendations.
                    </label>
                    <div className="tags">
                      {person.favorites.map((f) => (
                        <button
                          className="favorite"
                          key={f.entity_id}
                          onClick={() =>
                            run("favorite", person.id, {
                              entity_id: f.entity_id,
                              remove: true,
                            })
                          }
                        >
                          {f.name}
                          <X size={13} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="taste-actions">
                    <button
                      className="secondary"
                      disabled={!person.consent || busy}
                      onClick={() =>
                        setModal(
                          <EntitySearch
                            act={act}
                            onSelect={async (id) => {
                              await act("favorite", person.id, {
                                entity_id: id,
                              });
                              setModal(null);
                            }}
                          />,
                        )
                      }
                    >
                      <Plus size={16} />
                      Add a favorite
                    </button>
                    <button
                      className="primary"
                      disabled={
                        !s.qloo_available ||
                        !person.consent ||
                        !person.favorites.length ||
                        !s.events.some((e) => e.entity_id) ||
                        busy
                      }
                      onClick={() => run("discover", person.id)}
                    >
                      <Sparkles size={16} />
                      Discover with Qloo
                    </button>
                  </div>
                </div>
              </details>
              {!s.qloo_available && (
                <div className="info-strip">
                  <CircleHelp size={18} />
                  <span>
                    Live discovery is awaiting a Qloo API key. These catalogue
                    cards are synthetic examples, not Qloo recommendations. You
                    can still record explicit choices.
                  </span>
                </div>
              )}
              <div className="section-heading">
                <h2>
                  {person.suggestions.length
                    ? "Qloo matches & your catalogue"
                    : "Your community catalogue"}
                </h2>
                <Badge>{s.events.length} experiences</Badge>
              </div>
              <div className="event-grid">
                {[...s.events]
                  .sort(
                    (a, b) =>
                      (person.suggestions.find(
                        (x) =>
                          x.event_id === a.id && x.event_version === a.version,
                      )?.rank ?? 999) -
                      (person.suggestions.find(
                        (x) =>
                          x.event_id === b.id && x.event_version === b.version,
                      )?.rank ?? 999),
                  )
                  .map((e) => (
                    <EventCard key={e.id} event={e} index={s.events.indexOf(e)}>
                      <div className="event-facts">
                        <span>
                          <Accessibility size={14} />
                          {e.step_free === true
                            ? "Step-free (synthetic)"
                            : e.step_free === false
                              ? "Not step-free"
                              : "Step-free access unknown"}
                        </span>
                        <details className="source-disclosure">
                          <summary>Source & event details</summary>
                          <span>Source observed {when(e.observed_at)}</span>
                          <span>
                            Event v{e.version} · {e.source}
                          </span>
                        </details>
                      </div>
                      {person.suggestions.find(
                        (x) =>
                          x.event_id === e.id && x.event_version === e.version,
                      ) && (
                        <div className="recommendation">
                          <Sparkles size={14} />
                          <span>
                            {
                              person.suggestions.find(
                                (x) =>
                                  x.event_id === e.id &&
                                  x.event_version === e.version,
                              )?.reason
                            }
                            <small>
                              Evidence{" "}
                              {person.suggestions
                                .find(
                                  (x) =>
                                    x.event_id === e.id &&
                                    x.event_version === e.version,
                                )
                                ?.evidence_id.slice(0, 8)}{" "}
                              ·{" "}
                              {
                                person.suggestions.find(
                                  (x) =>
                                    x.event_id === e.id &&
                                    x.event_version === e.version,
                                )?.mode
                              }
                            </small>
                          </span>
                        </div>
                      )}
                      <div
                        className="interest-options"
                        aria-label={`Interest in ${e.title}`}
                      >
                        {[
                          ["interested", "Interested"],
                          ["maybe", "Maybe"],
                          ["not interested", "Not for me"],
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            disabled={busy || e.cancelled}
                            aria-pressed={
                              person.interests[e.id]?.response === value &&
                              person.interests[e.id]?.event_version ===
                                e.version
                            }
                            onClick={() =>
                              run("interest", person.id, {
                                event_id: e.id,
                                response: value,
                              })
                            }
                          >
                            {value === "interested" && <Heart size={14} />}{" "}
                            {label}
                          </button>
                        ))}
                      </div>
                      {person.interests[e.id]?.event_version !== e.version &&
                        person.interests[e.id] && (
                          <small className="warning-text">
                            Event changed. Please renew your response.
                          </small>
                        )}
                    </EventCard>
                  ))}
              </div>
            </>
          )}
          {page === "Catalogue" && (
            <>
              <Heading
                eyebrow="THE POSSIBILITIES"
                title="Experiences worth sharing"
                text="Separate cultural relevance from event facts. Review every identity and source."
              />
              <div className="info-strip">
                <Film size={18} />
                <span>
                  All screenings and venue claims are authored fixtures. Film
                  titles do not imply actual local performances.
                </span>
              </div>
              <div className="event-grid">
                {s.events.map((e, i) => (
                  <EventCard event={e} index={i} key={e.id}>
                    <div className="event-facts">
                      <span>
                        {e.tickets} tickets · {money(e.ticket_minor)} each
                      </span>
                      <span>Evidence expires {when(e.valid_until)}</span>
                      <span>
                        {e.entity_id
                          ? "Qloo entity mapped: " + e.entity_id.slice(0, 8)
                          : "Qloo entity not mapped"}
                      </span>
                      <span>{e.source}</span>
                    </div>
                    <div className="button-row">
                      <button
                        className="secondary small"
                        onClick={() => editRecord(e, "event")}
                      >
                        Edit facts
                      </button>
                      <button
                        className="secondary small"
                        disabled={busy}
                        onClick={() =>
                          setModal(
                            <EntitySearch
                              initial={e.title}
                              act={act}
                              onSelect={async (id) => {
                                await act("map", e.id, { entity_id: id });
                                setModal(null);
                              }}
                            />,
                          )
                        }
                      >
                        Review Qloo identity
                      </button>
                    </div>
                  </EventCard>
                ))}
              </div>
            </>
          )}
          {page === "Resources" && (
            <>
              <Heading
                eyebrow="WHAT MAKES IT POSSIBLE"
                title="A way there. A way home."
                text="Transport packages with clear capacities, costs, and evidence."
              />
              <div className="resource-grid">
                {s.offers.map((o) => (
                  <section
                    className={
                      "panel resource-card " + (!o.active ? "inactive" : "")
                    }
                    key={o.id}
                  >
                    <div className="section-heading">
                      <span className="resource-icon">
                        <Bus size={26} />
                      </span>
                      <Badge tone={o.active ? "green" : "amber"}>
                        {o.active ? "Offer available" : "Unavailable"}
                      </Badge>
                    </div>
                    <h2>{o.provider}</h2>
                    <p>
                      {s.events.find((e) => e.id === o.event_id)?.title} ·{" "}
                      {o.vehicle}
                    </p>
                    <div className="resource-stats">
                      <div>
                        <strong>{o.seats}</strong>
                        <span>Total seats</span>
                      </div>
                      <div>
                        <strong>{o.wheelchair}</strong>
                        <span>Wheelchair positions</span>
                      </div>
                      <div>
                        <strong>{money(o.fixed_minor)}</strong>
                        <span>Fixed transport cost</span>
                      </div>
                    </div>
                    <dl className="detail-list">
                      <div>
                        <dt>Departure</dt>
                        <dd>{when(o.departure)}</dd>
                      </div>
                      <div>
                        <dt>Return by</dt>
                        <dd>{when(o.returns)}</dd>
                      </div>
                      <div>
                        <dt>Minimum group</dt>
                        <dd>{o.minimum} participants</dd>
                      </div>
                      <div>
                        <dt>Per-person contribution</dt>
                        <dd>{money(o.contribution_minor)}</dd>
                      </div>
                      <div>
                        <dt>Offer expires</dt>
                        <dd>{when(o.expires_at)}</dd>
                      </div>
                    </dl>
                    <p className="small-note">{o.source}</p>
                    <div className="button-row">
                      <button
                        className="secondary"
                        onClick={() => editRecord(o, "offer")}
                      >
                        Edit offer
                      </button>
                      <button
                        className={o.active ? "text-link danger" : "text-link"}
                        disabled={busy}
                        onClick={() =>
                          run("offer", o.id, { active: !o.active })
                        }
                      >
                        {o.active ? "Mark unavailable" : "Restore offer"}
                      </button>
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
          {page === "Plans" && (
            <>
              <div className="heading-row">
                <Heading
                  eyebrow="FROM POSSIBLE TO PRACTICAL"
                  title={
                    selected
                      ? "A plan you can stand behind."
                      : "Find a shared way forward."
                  }
                  text="Only explicit interest and verified constraints can support an assignment."
                />
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => void plan(s.proposals.length > 0)}
                >
                  <Sparkles size={17} />
                  {s.proposals.length
                    ? "Replan current inputs"
                    : "Generate plans"}
                </button>
              </div>
              {!selected && (
                <section className="panel agent-panel spaced">
                  <div className="section-heading">
                    <div>
                      <h2>Ask the planning assistant</h2>
                      <p>
                        Optional language-model guidance with bounded tools and
                        human review.
                      </p>
                    </div>
                    <Badge>
                      {s.model_available
                        ? "MODEL CONFIGURED"
                        : "AWAITING MODEL KEY"}
                    </Badge>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      run("agent", "", { task: f.get("task") });
                    }}
                  >
                    <label>
                      What would you like to explore?
                      <input
                        name="task"
                        maxLength={1000}
                        required
                        placeholder="Find feasible outings and explain who remains unserved."
                      />
                    </label>
                    <button
                      className="primary"
                      disabled={busy || !s.model_available}
                    >
                      <Sparkles size={16} />
                      Ask assistant
                    </button>
                  </form>
                  {!s.model_available && (
                    <p className="small-note">
                      Model credentials are optional. Generate plans runs the
                      deterministic workflow without them.
                    </p>
                  )}
                  {s.agent_messages?.slice(-3).map((m, i) => (
                    <div className="agent-answer" key={i}>
                      <strong>{m.task}</strong>
                      <p>{m.answer}</p>
                      <small>
                        Model-generated explanation · review tool evidence and
                        proposal details
                      </small>
                      <details>
                        <summary>
                          Inspect tool actions ({m.steps.length})
                        </summary>
                        {m.steps.map((step, j) => (
                          <div key={j}>
                            <strong>{step.tool}</strong>
                            <pre>{step.result}</pre>
                          </div>
                        ))}
                      </details>
                    </div>
                  ))}
                </section>
              )}
              {selected ? (
                (() => {
                  const p = s.proposals.find((x) => x.id === selected);
                  if (!p) return null;
                  const view = p.snapshot || s;
                  const eventFor = (oid: string) =>
                    view.events.find(
                      (e) =>
                        e.id ===
                        view.offers.find((o) => o.id === oid)?.event_id,
                    );
                  const stale = p.status === "Needs review after a change";
                  return (
                    <>
                      <button
                        className="text-link back"
                        onClick={() => setSelected(null)}
                      >
                        <ArrowLeft size={16} />
                        All proposals
                      </button>
                      <section className="panel proposal-detail">
                        <div className="section-heading">
                          <div>
                            <Badge tone={stale ? "amber" : "green"}>
                              {p.status}
                            </Badge>
                            <h2>Proposal version {p.version}</h2>
                            <p>
                              Input revision {p.input_revision} ·{" "}
                              {p.solver_status}
                            </p>
                          </div>
                          <div className="proposal-total">
                            <strong>{money(p.cost_minor)}</strong>
                            <span>{p.served} of 12 participants</span>
                          </div>
                        </div>
                        {stale && (
                          <div className="alert error">
                            <AlertCircle size={18} />
                            This version is no longer actionable.{" "}
                            {p.stale_reason} Replan and renew approvals.
                          </div>
                        )}
                        <div className="plan-stages">
                          {[
                            "Organizer approval",
                            "Participant commitment",
                            "Resource confirmation",
                          ].map((label, i) => (
                            <div
                              key={label}
                              className={
                                (i === 0
                                  ? p.approval
                                  : i === 1
                                    ? Object.keys(p.assignments).every(
                                        (id) =>
                                          p.commitments[id] === "accepted",
                                      )
                                    : Object.keys(p.confirmations).length ===
                                      new Set(Object.values(p.assignments))
                                        .size) && !stale
                                  ? "complete"
                                  : ""
                              }
                            >
                              <CheckCircle2 size={19} />
                              {label}
                            </div>
                          ))}
                        </div>
                        <div className="button-row">
                          {!p.approval && (
                            <button
                              className="primary"
                              disabled={busy || stale}
                              onClick={() => run("approve", p.id)}
                            >
                              <Check size={17} />
                              Approve version {p.version}
                            </button>
                          )}
                          <a
                            className="secondary"
                            href={`/api/proposals/${p.id}/export`}
                          >
                            <Download size={16} />
                            Evidence JSON
                          </a>
                          <a
                            className="secondary"
                            href={`/api/proposals/${p.id}/export?format=provider`}
                          >
                            <Download size={16} />
                            Provider request draft
                          </a>
                          {p.status === "Confirmed" ? (
                            <a
                              className="primary"
                              href={`/api/proposals/${p.id}/export?format=ics&final=true`}
                            >
                              <CalendarDays size={16} />
                              Final calendar itinerary
                            </a>
                          ) : (
                            <a
                              className="secondary"
                              href={`/api/proposals/${p.id}/export?format=ics`}
                            >
                              Tentative calendar
                            </a>
                          )}
                        </div>
                        <p className="small-note">
                          Exports preserve this version and its status. No
                          booking or provider message is sent.
                        </p>
                      </section>
                      <PlanItinerary proposal={p} />
                      <div className="two-columns proposal-columns">
                        <section className="panel">
                          <h2>Participant commitments</h2>
                          <p className="muted-text">
                            Each response applies to this exact itinerary. Demo
                            organizer acts as the fictional participant.
                          </p>
                          {Object.entries(p.assignments).map(([id, oid]) => (
                            <div className="commitment-row" key={id}>
                              <div className="avatar">{personName(id)[0]}</div>
                              <div>
                                <strong>{personName(id)}</strong>
                                <small>
                                  {eventFor(oid)?.title} ·{" "}
                                  {when(
                                    view.offers.find((o) => o.id === oid)!
                                      .departure,
                                  )}
                                </small>
                              </div>
                              <select
                                aria-label={`${personName(id)} commitment`}
                                disabled={!p.approval || stale || busy}
                                value={p.commitments[id] || ""}
                                onChange={(e) =>
                                  run("commit", p.id, {
                                    participant_id: id,
                                    decision: e.target.value,
                                  })
                                }
                              >
                                <option value="" disabled>
                                  Pending
                                </option>
                                <option value="accepted">Commit</option>
                                <option value="declined">Decline</option>
                                <option value="withdrawn">Withdraw</option>
                              </select>
                            </div>
                          ))}
                        </section>
                        <div>
                          <section className="panel">
                            <h2>Confirm arrangements</h2>
                            <p className="muted-text">
                              Record evidence for both tickets and transport.
                              All confirmations here remain synthetic.
                            </p>
                            {[...new Set(Object.values(p.assignments))].map(
                              (oid) => {
                                const o = view.offers.find((x) => x.id === oid);
                                if (!o) return null;
                                const quantity = Object.entries(p.assignments)
                                  .filter(([, v]) => v === oid)
                                  .reduce(
                                    (n, [id]) =>
                                      n +
                                      1 +
                                      Number(
                                        view.participants.find(
                                          (x) => x.id === id,
                                        )?.requirements.companion,
                                      ),
                                    0,
                                  );
                                return (
                                  <div className="confirmation" key={oid}>
                                    <strong>
                                      {o.provider} · {eventFor(oid)?.title}
                                    </strong>
                                    <span>
                                      {quantity} seats and tickets ·{" "}
                                      {when(o.departure)} → {when(o.returns)}
                                    </span>
                                    <Badge
                                      tone={
                                        p.confirmations[oid] ? "green" : "amber"
                                      }
                                    >
                                      {p.confirmations[oid]
                                        ? "Evidence recorded"
                                        : "Confirmation pending"}
                                    </Badge>
                                    <button
                                      className="secondary small"
                                      disabled={!p.approval || stale || busy}
                                      onClick={() =>
                                        setModal(
                                          <ConfirmationForm
                                            offer={o}
                                            quantity={quantity}
                                            save={async (data) => {
                                              await act("confirm", p.id, data);
                                              setModal(null);
                                            }}
                                          />,
                                        )
                                      }
                                    >
                                      Record evidence
                                    </button>
                                  </div>
                                );
                              },
                            )}
                          </section>
                          <section className="panel spaced">
                            <h2>Who remains unserved?</h2>
                            {p.unserved.length ? (
                              p.unserved.map((u) => (
                                <div className="blocker" key={u.participant_id}>
                                  <strong>
                                    {personName(u.participant_id)}
                                  </strong>
                                  <p>{u.reasons.join("; ")}</p>
                                </div>
                              ))
                            ) : (
                              <p>
                                All 12 participants have a feasible assignment
                                in this version. Commitment and confirmation are
                                separate.
                              </p>
                            )}
                          </section>
                        </div>
                      </div>
                      {p.diff.length > 0 && (
                        <section className="panel spaced">
                          <h2>What changed from the previous plan?</h2>
                          {p.diff_summary?.previous_version && (
                            <p>
                              Compared with version{" "}
                              {p.diff_summary.previous_version}: organizer cost{" "}
                              {money(p.diff_summary.previous_cost_minor!)} →{" "}
                              {money(p.cost_minor)}. Change:{" "}
                              {money(p.diff_summary.cost_change_minor!)}.
                            </p>
                          )}
                          <div className="table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Participant</th>
                                  <th>Before</th>
                                  <th>After</th>
                                </tr>
                              </thead>
                              <tbody>
                                {p.diff.map((d) => (
                                  <tr key={d.participant_id}>
                                    <td>{personName(d.participant_id)}</td>
                                    <td>
                                      {d.before
                                        ? eventFor(d.before)?.title || d.before
                                        : "Unassigned"}
                                    </td>
                                    <td>
                                      {d.after
                                        ? eventFor(d.after)?.title || d.after
                                        : "Unassigned"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="small-note">
                            Material changes require renewed approval and
                            participant commitment.
                          </p>
                        </section>
                      )}
                      {p.can_record_outcomes && (
                        <section className="panel spaced">
                          <h2>Record outcomes</h2>
                          <p>
                            Attendance is never inferred from confirmation. Demo
                            outcomes are synthetic. Attendance can be recorded
                            after the event ends, even when the historical plan
                            is no longer actionable.
                          </p>
                          {Object.keys(p.assignments).map((id) => (
                            <div className="outcome-row" key={id}>
                              <strong>{personName(id)}</strong>
                              <select
                                aria-label={`${personName(id)} attendance`}
                                value={
                                  s.outcomes.find(
                                    (x) =>
                                      x.proposal_id === p.id &&
                                      x.participant_id === id,
                                  )?.attendance || "unknown"
                                }
                                onChange={(e) =>
                                  run("outcome", p.id, {
                                    participant_id: id,
                                    attendance: e.target.value,
                                    source:
                                      "Synthetic organizer observation for demo",
                                  })
                                }
                              >
                                {[
                                  "unknown",
                                  "attended",
                                  "did not attend",
                                  "cancelled",
                                ].map((v) => (
                                  <option
                                    key={v}
                                    disabled={
                                      ["attended", "did not attend"].includes(
                                        v,
                                      ) &&
                                      new Date(
                                        view.events.find(
                                          (e) =>
                                            e.id ===
                                            view.offers.find(
                                              (o) => o.id === p.assignments[id],
                                            )?.event_id,
                                        )?.end || "",
                                      ).getTime() > Date.now()
                                    }
                                  >
                                    {v}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </section>
                      )}
                    </>
                  );
                })()
              ) : (
                <>
                  {s.proposals.length === 0 && (
                    <div className="empty-state">
                      <div className="empty-art">
                        <Sparkles size={38} />
                      </div>
                      <h2>Let’s see what’s possible.</h2>
                      <p>
                        The planner will check each person’s accepted
                        experiences against transport, tickets, access
                        requirements, timing, and your{" "}
                        {money(s.window.budget_minor)} budget.
                      </p>
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={() => void plan()}
                      >
                        Generate candidate plans <ArrowRight size={17} />
                      </button>
                    </div>
                  )}
                  <div className="plan-grid">
                    {[...s.proposals].reverse().map((p) => (
                      <section className="panel plan-card" key={p.id}>
                        <div className="section-heading">
                          <Badge tone={p.stale ? "amber" : "green"}>
                            {p.status}
                          </Badge>
                          <span className="muted-text">v{p.version}</span>
                        </div>
                        <h2>{p.served} people. More possibilities.</h2>
                        <p>
                          {[
                            ...new Set(
                              Object.values(p.assignments).map(
                                (oid) =>
                                  p.snapshot?.events.find(
                                    (e) =>
                                      e.id ===
                                      p.snapshot.offers.find(
                                        (o) => o.id === oid,
                                      )?.event_id,
                                  )?.title || oid,
                              ),
                            ),
                          ].join(" + ")}
                        </p>
                        <div className="plan-numbers">
                          <div>
                            <strong>{money(p.cost_minor)}</strong>
                            <span>Organizer cost</span>
                          </div>
                          <div>
                            <strong>{12 - p.served}</strong>
                            <span>Unserved participants</span>
                          </div>
                        </div>
                        <div className="coverage-track">
                          <span
                            style={{ width: `${(p.served / 12) * 100}%` }}
                          />
                        </div>
                        <p className="small-note">
                          {p.solver_status} · input revision {p.input_revision}
                        </p>
                        <button
                          className="secondary full"
                          onClick={() => setSelected(p.id)}
                        >
                          Review proposal <ArrowRight size={16} />
                        </button>
                      </section>
                    ))}
                  </div>
                </>
              )}
              {s.traces[0] && (
                <section className="panel spaced">
                  <div className="section-heading">
                    <div>
                      <h2>Behind the plan</h2>
                      <p>
                        Bounded workflow actions · no hidden claims or automated
                        approval
                      </p>
                    </div>
                    <Badge>DETERMINISTIC AGENT</Badge>
                  </div>
                  {s.traces[0].steps.map((step, i) => (
                    <div className="trace" key={step.tool}>
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      <div>
                        <strong>{step.tool.replaceAll("_", " ")}</strong>
                        <p>{step.result}</p>
                      </div>
                      <CheckCircle2 size={17} />
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
          {page === "Evidence" && (
            <>
              <Heading
                eyebrow="TRUST IS IN THE DETAILS"
                title="Know what’s behind the plan."
                text="Sources, limitations, and a clear record of every decision."
              />
              <Readiness s={s} />
              <div className="stats-grid">
                <Stat
                  label="Qloo requests made"
                  value={String(s.provider_calls)}
                  detail="Server-side, workspace scoped"
                  icon={<Compass />}
                />
                <Stat
                  label="Private evidence records"
                  value={String(s.evidence.length)}
                  detail="Raw responses excluded from exports"
                  icon={<ShieldCheck />}
                />
                <Stat
                  label="People enrolled"
                  value="12"
                  detail="Frozen denominator, including withdrawals"
                  icon={<Users />}
                />
                <Stat
                  label="Real-world impact measured"
                  value="None"
                  detail="Synthetic workflows are not pilot results"
                  icon={<Heart />}
                />
              </div>
              <div className="two-columns">
                <section className="panel">
                  <h2>Two different kinds of evidence.</h2>
                  <dl className="evidence-definitions">
                    <dt>Cultural evidence</dt>
                    <dd>
                      {s.qloo_available
                        ? "Qloo is configured. Only returned, mapped entities receive live or recorded evidence labels."
                        : "Live Qloo unavailable. No affinity scores or provider recommendations have been invented."}
                    </dd>
                    <dt>Operational evidence</dt>
                    <dd>
                      All participants, screening schedules, access facts,
                      prices, and transport offers are synthetic. They
                      demonstrate the workflow and do not represent supplier
                      inventory.
                    </dd>
                    <dt>Participant choices</dt>
                    <dd>
                      Seeded choices and organizer-entered demo responses are
                      synthetic. Only “interested” choices for the current event
                      version enter the planner.
                    </dd>
                  </dl>
                </section>
                <section className="panel">
                  <h2>How we’ll evaluate value.</h2>
                  <p>
                    Compare Qloo-assisted discovery with direct catalogue
                    selection using the same events, exposures, and planner.
                  </p>
                  <ul className="plain-list">
                    <li>Suggestion acceptance: interested / actually shown</li>
                    <li>
                      Feasible coverage: distinct assignments / enrolled people
                    </li>
                    <li>
                      Confirmed coverage: committed people with confirmed
                      resources / enrolled people
                    </li>
                    <li>
                      Attendance: observed attendance, with unknown retained
                    </li>
                    <li>
                      Constraint violations: independently checked per plan
                    </li>
                  </ul>
                  <p className="small-note">
                    No comparative trial or real organizer pilot has been run.
                    No savings or increased attendance are claimed.
                  </p>
                </section>
              </div>
              {s.evidence.length > 0 && (
                <section className="panel spaced">
                  <h2>Provider evidence index</h2>
                  {s.evidence.map((e) => (
                    <div className="audit-row" key={e.id}>
                      <strong>{e.path}</strong>
                      <span>
                        {e.id} · {when(e.retrieved_at)}
                      </span>
                    </div>
                  ))}
                </section>
              )}
              <section className="panel spaced">
                <div className="section-heading">
                  <h2>Decision trail</h2>
                  <Badge>{s.audit.length} records</Badge>
                </div>
                {[...s.audit]
                  .reverse()
                  .slice(0, 60)
                  .map((a, i) => (
                    <div className="audit-row" key={i}>
                      <div>
                        <strong>{a.action}</strong>
                        <p>{a.detail}</p>
                      </div>
                      <time>{when(a.at)}</time>
                    </div>
                  ))}
              </section>
            </>
          )}
          {page === "Settings" && (
            <>
              <Heading
                eyebrow="YOUR PLANNING WINDOW"
                title="A thoughtful foundation."
                text="Manage the budget and demonstration data. Changing inputs requires a fresh review."
              />
              <div className="two-columns">
                <section className="panel">
                  <h2>Window settings</h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      run("window", "", {
                        name: f.get("name"),
                        budget_minor: Math.round(Number(f.get("budget")) * 100),
                      });
                    }}
                  >
                    <label>
                      Planning window name
                      <input
                        name="name"
                        defaultValue={s.window.name}
                        required
                        maxLength={100}
                      />
                    </label>
                    <label>
                      Organizer budget (USD)
                      <input
                        name="budget"
                        type="number"
                        min="0"
                        max="10000"
                        step="0.01"
                        defaultValue={s.window.budget_minor / 100}
                        required
                      />
                    </label>
                    <p className="small-note">
                      {when(s.window.start)} – {when(s.window.end)} ·
                      America/Chicago
                      <br />
                      Integer cents are used in all planning calculations.
                    </p>
                    <button className="primary" disabled={busy}>
                      Save settings
                    </button>
                  </form>
                </section>
                <section className="panel">
                  <h2>Catalogue & resource import</h2>
                  <p>
                    Import a JSON object with events and offers. The public demo
                    accepts synthetic data only. An import resets prior interest
                    responses.
                  </p>
                  <button
                    className="secondary"
                    onClick={() => {
                      const blob = new Blob(
                        [
                          JSON.stringify(
                            {
                              events: s.events.map((e) => ({
                                ...e,
                                entity_id: null,
                              })),
                              offers: s.offers,
                            },
                            null,
                            2,
                          ),
                        ],
                        { type: "application/json" },
                      );
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "unblock-synthetic-template.json";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download size={16} />
                    Download current template
                  </button>
                  <label className="file-input">
                    Import synthetic JSON
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 140000) {
                          setError("Import must be under 140 KB");
                          return;
                        }
                        try {
                          const data = JSON.parse(await file.text());
                          await act("import", "", data);
                        } catch (err) {
                          setError((err as Error).message);
                        }
                      }}
                    />
                  </label>
                  <p className="small-note">
                    Maximum 12 events and 8 transport offers. Duplicate IDs,
                    unknown references, and malformed records are rejected.
                  </p>
                </section>
              </div>
              <section className="panel spaced">
                <h2>Privacy & retention</h2>
                <p>
                  This is an isolated synthetic workspace with a 24-hour expiry.
                  There is no real organizer account or participant invitation
                  system in this prototype. Do not enter private participant
                  records.
                </p>
                <button
                  className="secondary danger"
                  onClick={() =>
                    setModal(
                      <div>
                        <h2>Delete this workspace?</h2>
                        <p>
                          This removes the current demo and its private evidence
                          permanently.
                        </p>
                        <button
                          className="primary"
                          onClick={async () => {
                            try {
                              await api("/workspace", undefined, "DELETE");
                              setS(null);
                              setWelcome(true);
                              setModal(null);
                            } catch (e) {
                              setError((e as Error).message);
                            }
                          }}
                        >
                          Delete workspace
                        </button>
                      </div>,
                    )
                  }
                >
                  <Trash2 size={16} />
                  Delete this workspace
                </button>
              </section>
            </>
          )}
          <footer>
            <span>Made for meaningful moments.</span>
            <span>
              UNBLOCK · Cultural discovery meets practical planning{" "}
              <Leaf size={13} />
            </span>
          </footer>
        </main>
      </div>
      {modal && <Modal close={() => setModal(null)}>{modal}</Modal>}
    </div>
  );
}
function Heading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="page-heading">
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}
function Stat({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="stat">
      <div>
        <span>{label}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
function EventCard({
  event: e,
  index,
  children,
  onOpen,
}: {
  event: Event;
  index: number;
  children?: React.ReactNode;
  onOpen?: () => void;
}) {
  return (
    <article className="event-card">
      <div className={"poster poster-" + (index % 8)}>
        <span className="poster-label">COMMUNITY CINEMA</span>
        <div className="poster-shape" />
        <div className="poster-title">{e.title}</div>
        <div className="poster-bottom">
          <span>ONE FILM. NEW CONNECTIONS.</span>
          <Film size={18} />
        </div>
      </div>
      <div className="event-body">
        <div className="event-meta">
          <Badge>{e.category}</Badge>
          <span>{e.cancelled ? "Cancelled" : "Synthetic screening"}</span>
        </div>
        <h3>{e.title}</h3>
        <p>{e.description}</p>
        <div className="event-location">
          <CalendarDays size={14} />
          {when(e.start)} CT
        </div>
        <div className="event-location">
          <span className="location-dot" />
          {e.venue}
        </div>
        {children}
        {onOpen && (
          <button className="text-link card-link" onClick={onOpen}>
            Explore experience <ArrowUpRight size={15} />
          </button>
        )}
      </div>
    </article>
  );
}
function Modal({
  children,
  close,
}: {
  children: React.ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const old = document.activeElement as HTMLElement;
    ref.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const items = ref.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea, a[href]",
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      old?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Workspace action"
        className="modal"
        tabIndex={-1}
      >
        <button
          className="modal-close icon-button"
          aria-label="Close dialog"
          onClick={close}
        >
          <X />
        </button>
        {children}
      </div>
    </div>
  );
}
function RequirementsForm({
  person: p,
  save,
}: {
  person: Person;
  save: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [err, setErr] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        try {
          await save({
            ...p.requirements,
            available_from: new Date(String(f.get("from"))).toISOString(),
            available_until: new Date(String(f.get("until"))).toISOString(),
            contribution_minor: Math.round(Number(f.get("contribution")) * 100),
            ...Object.fromEntries(
              [
                "wheelchair",
                "step_free",
                "hearing_loop",
                "companion",
                "mandatory",
                "withdrawn",
              ].map((k) => [k, f.has(k)]),
            ),
          });
        } catch (e) {
          setErr((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="eyebrow">PRACTICAL NEEDS</div>
      <h2>{p.name}’s requirements</h2>
      <p>Functional needs only. No diagnoses or exact pickup addresses.</p>
      <label>
        Available from (your browser timezone)
        <input
          name="from"
          type="datetime-local"
          defaultValue={local(p.requirements.available_from)}
          required
        />
      </label>
      <label>
        Must return by (your browser timezone)
        <input
          name="until"
          type="datetime-local"
          defaultValue={local(p.requirements.available_until)}
          required
        />
      </label>
      <label>
        Maximum contribution (USD)
        <input
          name="contribution"
          type="number"
          min="0"
          max="1000"
          step="0.01"
          defaultValue={p.requirements.contribution_minor / 100}
        />
      </label>
      {(
        [
          ["wheelchair", "Wheelchair position required"],
          ["step_free", "Step-free venue and transport required"],
          ["hearing_loop", "Hearing loop required"],
          ["companion", "Companion seat and ticket required"],
          ["mandatory", "Organizer policy: must serve this participant"],
          ["withdrawn", "Withdraw from this planning window"],
        ] as const
      ).map(([key, label]) => (
        <label className="check-label" key={key}>
          <input
            type="checkbox"
            name={key}
            defaultChecked={p.requirements[key]}
          />
          {label}
        </label>
      ))}
      {err && (
        <p role="alert" className="warning-text">
          {err}
        </p>
      )}
      <button className="primary" disabled={busy}>
        Save requirements
      </button>
    </form>
  );
}
function RecordForm({
  record: r,
  type,
  save,
}: {
  record: Event | Offer;
  type: "event" | "offer";
  save: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [err, setErr] = useState(""),
    [busy, setBusy] = useState(false);
  const event = type === "event";
  const dates = event
    ? ["start", "end", "valid_until"]
    : ["departure", "returns", "expires_at"];
  const nums = event
    ? ["tickets", "ticket_minor"]
    : ["seats", "wheelchair", "fixed_minor", "contribution_minor", "minimum"];
  const texts = event
    ? ["title", "venue", "description", "source"]
    : ["provider", "vehicle", "source"];
  const flags = event ? ["step_free", "hearing_loop"] : ["step_free"];
  const data = r as unknown as Record<string, unknown>;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const d: Record<string, unknown> = {};
        texts.forEach((k) => (d[k] = f.get(k)));
        nums.forEach((k) => (d[k] = Number(f.get(k))));
        dates.forEach((k) => (d[k] = new Date(String(f.get(k))).toISOString()));
        flags.forEach(
          (k) => (d[k] = f.get(k) === "unknown" ? null : f.get(k) === "yes"),
        );
        d[event ? "cancelled" : "active"] = f.has("status");
        setBusy(true);
        try {
          await save(d);
        } catch (e) {
          setErr((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Edit {event ? "event facts" : "resource offer"}</h2>
      <p>Synthetic evidence only. Changes invalidate earlier proposals.</p>
      {texts.map((k) => (
        <label key={k}>
          {k.replaceAll("_", " ")}
          <input
            name={k}
            defaultValue={String(data[k])}
            required
            maxLength={k === "description" ? 2000 : 500}
          />
        </label>
      ))}
      <div className="form-grid">
        {nums.map((k) => (
          <label key={k}>
            {k.replaceAll("_minor", " (cents)").replaceAll("_", " ")}
            <input
              type="number"
              name={k}
              defaultValue={Number(data[k])}
              min="0"
              required
            />
          </label>
        ))}
      </div>
      {dates.map((k) => (
        <label key={k}>
          {k.replaceAll("_", " ")} (browser timezone)
          <input
            type="datetime-local"
            name={k}
            defaultValue={local(String(data[k]))}
            required
          />
        </label>
      ))}
      {flags.map((k) => (
        <label key={k}>
          {k.replaceAll("_", " ")}
          <select
            name={k}
            defaultValue={data[k] === null ? "unknown" : data[k] ? "yes" : "no"}
          >
            <option value="unknown">Unknown</option>
            <option value="yes">Confirmed yes (synthetic)</option>
            <option value="no">No</option>
          </select>
        </label>
      ))}
      <label className="check-label">
        <input
          name="status"
          type="checkbox"
          defaultChecked={Boolean(data[event ? "cancelled" : "active"])}
        />
        {event ? "Event cancelled" : "Offer active"}
      </label>
      {err && <p role="alert">{err}</p>}
      <button className="primary" disabled={busy}>
        Save facts
      </button>
    </form>
  );
}
function ConfirmationForm({
  offer: o,
  quantity,
  save,
}: {
  offer: Offer;
  quantity: number;
  save: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [err, setErr] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        try {
          await save({
            offer_id: o.id,
            quantity: Number(f.get("quantity")),
            source: f.get("source"),
            expires_at: new Date(String(f.get("expires"))).toISOString(),
          });
        } catch (e) {
          setErr((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Record provider evidence</h2>
      <p>
        {o.provider} · offer version {o.version}. Confirmation must cover both
        seats and event tickets.
      </p>
      <label>
        Seats and tickets confirmed
        <input
          type="number"
          name="quantity"
          defaultValue={quantity}
          required
          min={1}
        />
      </label>
      <label>
        Evidence / reference
        <input
          name="source"
          defaultValue="Synthetic provider confirmation for demonstration"
          required
          minLength={5}
          maxLength={500}
        />
      </label>
      <label>
        Confirmation valid until (browser timezone)
        <input
          type="datetime-local"
          name="expires"
          defaultValue={local(o.expires_at)}
          required
        />
      </label>
      <p className="small-note">
        This records synthetic evidence. It does not contact a provider or book
        anything.
      </p>
      {err && <p role="alert">{err}</p>}
      <button className="primary" disabled={busy}>
        Record confirmation
      </button>
    </form>
  );
}
function EntitySearch({
  initial = "",
  act,
  onSelect,
}: {
  initial?: string;
  act: (a: string, t?: string, d?: Record<string, unknown>) => Promise<any>;
  onSelect: (id: string) => Promise<void>;
}) {
  const [query, setQuery] = useState(initial),
    [choices, setChoices] = useState<
      { entity_id: string; name: string; year?: number }[] | null
    >(null),
    [err, setErr] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div>
      <h2>Find the right film.</h2>
      <p>
        Review the returned identities before selecting. Similar names may refer
        to different films.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr("");
          try {
            const r = await act("resolve", "", { query });
            setChoices(r.choices);
          } catch (e) {
            setErr((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Film title
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            required
            maxLength={120}
          />
        </label>
        <button className="primary" disabled={busy}>
          <Search size={16} />
          Search Qloo
        </button>
      </form>
      {err && <p role="alert">{err}</p>}
      {choices?.length === 0 && (
        <p>
          No matching entities returned. Try another title or continue with the
          catalogue.
        </p>
      )}
      {choices?.map((c) => (
        <button
          disabled={busy}
          className="entity-choice"
          key={c.entity_id}
          onClick={async () => {
            setBusy(true);
            try {
              await onSelect(c.entity_id);
            } catch (e) {
              setErr((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <span>
            <strong>
              {c.name} {c.year && `(${c.year})`}
            </strong>
            <small>{c.entity_id}</small>
          </span>
          <Plus size={18} />
        </button>
      ))}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
