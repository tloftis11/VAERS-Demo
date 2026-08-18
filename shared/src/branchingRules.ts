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
export type ReportCharacteristic = "adverse_event" | "error_no_ae";

export interface BranchingState {
  submitterType: SubmitterType | null;
  /** Only meaningful when submitterType === "hcp"; public reports are always adverse_event-shaped. */
  reportCharacteristic: ReportCharacteristic | null;
}

export const STEP_IDS = [
  "submitter-type",
  "report-characteristic",
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
  "report-characteristic": "What are you reporting?",
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
  const steps: StepId[] = ["submitter-type"];

  if (state.submitterType === "hcp") {
    steps.push("report-characteristic");
  }

  steps.push("about-you", "patient", "vaccine");

  const characteristic =
    state.submitterType === "hcp" ? state.reportCharacteristic : "adverse_event";

  if (characteristic === "error_no_ae") {
    steps.push("error-detail");
  } else {
    // Default/public path, and HCP explicitly reporting an adverse event.
    steps.push("adverse-event");
  }

  steps.push("documents", "review");
  return steps;
}

/** Whether a step can be visited yet, given how far branching decisions have progressed. */
export function isStepUnlocked(step: StepId, state: BranchingState): boolean {
  if (step === "submitter-type") return true;
  if (state.submitterType === null) return false;
  if (step === "report-characteristic") return state.submitterType === "hcp";
  if (state.submitterType === "hcp" && state.reportCharacteristic === null) {
    // HCP must answer the characteristic question before anything downstream.
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
