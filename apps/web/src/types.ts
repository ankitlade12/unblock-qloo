export type Event = {
  id: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  start: string;
  end: string;
  tickets: number;
  ticket_minor: number;
  step_free: boolean | null;
  hearing_loop: boolean | null;
  source: string;
  observed_at: string;
  valid_until: string;
  entity_id: string | null;
  version: number;
  cancelled: boolean;
  mode: string;
};
export type Offer = {
  id: string;
  event_id: string;
  provider: string;
  vehicle: string;
  departure: string;
  returns: string;
  seats: number;
  wheelchair: number;
  step_free: boolean | null;
  fixed_minor: number;
  contribution_minor: number;
  minimum: number;
  expires_at: string;
  source: string;
  version: number;
  active: boolean;
  mode: string;
};
export type Requirements = {
  available_from: string;
  available_until: string;
  contribution_minor: number;
  wheelchair: boolean;
  step_free: boolean;
  hearing_loop: boolean;
  companion: boolean;
  mandatory: boolean;
  withdrawn: boolean;
};
export type Person = {
  id: string;
  name: string;
  version: number;
  consent: boolean;
  requirements: Requirements;
  favorites: { entity_id: string; name: string }[];
  interests: Record<string, { response: string; event_version: number }>;
  discovery?: {
    covered: number;
    mapped: number;
    already_interested?: number;
    favorite_names?: string[];
    new_options?: {
      event_id: string;
      title: string;
      previous_response: string;
      individually_compatible: boolean;
    }[];
    mode: string;
    evidence_id: string;
    retrieved_at: string;
  };
  suggestions: {
    event_id: string;
    event_version: number;
    rank: number;
    mode: string;
    reason: string;
    evidence_id: string;
    retrieved_at: string;
  }[];
};
export type Proposal = {
  id: string;
  version: number;
  input_revision: number;
  created_at: string;
  input_hash: string;
  snapshot: { events: Event[]; offers: Offer[]; participants: Person[] };
  assignments: Record<string, string>;
  served: number;
  cost_minor: number;
  status: string;
  stale: boolean;
  stale_reason?: string;
  approval: { at: string } | null;
  can_record_outcomes?: boolean;
  outcome_simulation_at?: string;
  confirmed_record?: { at: string };
  commitments: Record<string, string>;
  confirmations: Record<
    string,
    { quantity: number; source: string; expires_at: string }
  >;
  solver_status: string;
  unserved: { participant_id: string; reasons: string[] }[];
  diff_summary?: {
    previous_version: number | null;
    previous_cost_minor: number | null;
    cost_change_minor: number | null;
  };
  diff: {
    participant_id: string;
    before: string | null;
    after: string | null;
  }[];
};
export type State = {
  comparisons?: Comparison[];
  demo_profiles?: string[];
  provider_budget?: {
    limit: number;
    used: number;
    remaining: number;
    utc_day: string;
    reset_at: string;
    scope: string;
  };
  revision: number;
  name: string;
  window: {
    name: string;
    budget_minor: number;
    currency: string;
    timezone: string;
    start: string;
    end: string;
  };
  participants: Person[];
  events: Event[];
  offers: Offer[];
  proposals: Proposal[];
  qloo_available: boolean;
  model_available: boolean;
  agent_messages?: {
    task: string;
    answer: string;
    at: string;
    steps: { tool: string; result: string }[];
    mode: string;
  }[];
  operational_mode: string;
  audit: { at: string; action: string; detail: string }[];
  evidence: {
    id: string;
    path: string;
    retrieved_at: string;
    fingerprint: string;
  }[];
  provider_calls: number;
  outcomes: {
    proposal_id: string;
    participant_id: string;
    attendance: string;
    source: string;
    simulated_at?: string | null;
  }[];
  traces: {
    input_revision?: number;
    plan_count?: number;
    at: string;
    task: string;
    mode: string;
    steps: { tool: string; result: string }[];
    blockers: string[];
  }[];
};

export type ComparisonPlan = {
  served: number | null;
  cost_minor: number | null;
  assignments: Record<string, string>;
  unserved: { participant_id: string; reasons: string[] }[];
  blockers: string[];
  solver_status: string;
  found_plan: boolean;
};
export type Comparison = {
  baseline_summary?: {
    budget_minor: number;
    people: Record<string, string>;
    events: Record<string, string>;
    offer_events: Record<string, string>;
  };
  id: string;
  created_at: string;
  constraints_hash: string;
  invalid_reason: string | null;
  baseline_choices: Record<
    string,
    Record<string, { response: string; event_version: number }>
  >;
  decisions: {
    participant_id: string;
    event_id: string;
    event_version: number;
    before: string;
    response: string;
    source: string;
    at: string;
    evidence: null | {
      id: string;
      retrieved_at: string;
      mode: string;
      rank: number;
      approved_favorites: { name: string; entity_id: string }[];
    };
  }[];
  result: null | {
    decision_paths?: {
      participant_id: string;
      event_id: string;
      source: string;
      baseline_response: string;
      response: string;
      evidence: Comparison["decisions"][number]["evidence"];
      individual_offer_checks: { offer_id: string; blockers: string[] }[];
      eligible_offer_ids: string[];
      assigned_offer_id: string | null;
      selected: boolean;
      outcome:
        | "not_accepted"
        | "blocked"
        | "no_checked_plan"
        | "selected"
        | "available_not_selected";
    }[];
    discovery_contribution?: {
      qloo_choices_reviewed: number;
      newly_accepted_qloo_choices: number;
      newly_accepted_event_ids: string[];
      limitation: string;
    };
    before: ComparisonPlan;
    after: ComparisonPlan;
    coverage_delta: number | null;
    cost_delta_minor: number | null;
    complete: boolean;
    sources: string[];
    evaluated_at: string;
    evaluation_clock: string;
    participants: number;
    verdict: string;
    limitation: string;
    changed_assignments: {
      participant_id: string;
      before: string | null;
      after: string | null;
    }[];
  };
};
