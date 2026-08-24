/**
 * Branching-logic engine (design doc §4.4 / §5.1).
 *
 * This is the single source of truth for which steps/fields apply to a given
 * report. It is imported by BOTH the client (step navigation + inline
 * validation) and the server (defense-in-depth re-validation on every
 * PATCH/submit) so the two can never drift apart.
 *
 * Field-level detail (exact VAERS data elements) stands in for the real CDC
 * data dictionary, which the source doc flags as pending at kickoff — see
 * Appendix B of the design doc. The step/branch structure itself mirrors the
 * doc's two mandated decision points: submitter type, and (HCP-only)
 * administration-error-with-no-adverse-event.
 */

export type SubmitterType = "public" | "hcp";

export interface BranchingState {
  submitterType: SubmitterType | null;
  /**
   * Both HCP-only, independent (PROV-002/003): a report can have an
   * administration error, an adverse event, both, or neither — they are no
   * longer mutually exclusive. Public reports never ask either question:
   * administrationError is implicitly false and adverseEventOccurred is
   * implicitly true.
   */
  administrationError: boolean | null;
  adverseEventOccurred: boolean | null;
}

export const STEP_IDS = [
  "submitter-type",
  "before-you-start",
  "administration-error",
  "adverse-event-occurred",
  "about-you",
  "patient",
  "vaccine",
  "adverse-event",
  "error-detail",
  "documents",
  "review",
] as const;

export type StepId = (typeof STEP_IDS)[number];

export const STEP_LABELS: Record<StepId, string> = {
  "submitter-type": "Who is reporting?",
  "before-you-start": "Before you start",
  "administration-error": "Administration error?",
  "adverse-event-occurred": "Adverse event?",
  "about-you": "About you",
  patient: "About the patient",
  vaccine: "Vaccine information",
  "adverse-event": "What happened",
  "error-detail": "Administration error details",
  documents: "Supporting documents",
  review: "Review & submit",
};

/**
 * Returns the ordered list of steps that apply given the current branching
 * state. Steps that depend on answers not yet given are still included so
 * the step indicator can show upcoming steps, but they render as
 * not-yet-available until their precondition is met (see isStepUnlocked).
 */
export function getApplicableSteps(state: BranchingState): StepId[] {
  const steps: StepId[] = ["submitter-type", "before-you-start"];
  const isHcp = state.submitterType === "hcp";

  if (isHcp) {
    steps.push("administration-error", "adverse-event-occurred");
  }

  steps.push("about-you", "patient", "vaccine");

  const administrationError = isHcp ? state.administrationError : false;
  // Public reports are always adverse-event-shaped. HCP reports default to
  // showing the adverse-event step until the reporter explicitly answers
  // "no" — this keeps the step list stable while the question is unanswered
  // rather than having it appear/disappear.
  const adverseEventOccurred = isHcp ? state.adverseEventOccurred !== false : true;

  if (administrationError === true) {
    steps.push("error-detail");
  }
  if (adverseEventOccurred) {
    steps.push("adverse-event");
  }

  steps.push("documents", "review");
  return steps;
}

/** Whether a step can be visited yet, given how far branching decisions have progressed. */
export function isStepUnlocked(step: StepId, state: BranchingState): boolean {
  if (step === "submitter-type") return true;
  if (state.submitterType === null) return false;
  if (step === "before-you-start") return true;
  if (step === "administration-error" || step === "adverse-event-occurred") {
    return state.submitterType === "hcp";
  }
  if (
    state.submitterType === "hcp" &&
    (state.administrationError === null || state.adverseEventOccurred === null)
  ) {
    // HCP must answer both gating questions before anything downstream.
    return false;
  }
  return true;
}

export function nextStep(current: StepId, state: BranchingState): StepId | null {
  const steps = getApplicableSteps(state);
  const idx = steps.indexOf(current);
  if (idx === -1 || idx === steps.length - 1) return null;
  return steps[idx + 1];
}

export function prevStep(current: StepId, state: BranchingState): StepId | null {
  const steps = getApplicableSteps(state);
  const idx = steps.indexOf(current);
  if (idx <= 0) return null;
  return steps[idx - 1];
}

/** Public reporters get plain-language copy; HCPs get clinical terminology (doc §4.1/§4.4). */
export function usesClinicalLanguage(state: BranchingState): boolean {
  return state.submitterType === "hcp";
}
