import { getApplicableSteps, type BranchingState, type StepId } from "../../shared/src/branchingRules";
import type { ClientReport } from "./api/client";

export function branchingStateFromReport(report: ClientReport): BranchingState {
  return {
    submitterType: report.submitterType,
    administrationError: report.administrationError,
    adverseEventOccurred: report.adverseEventOccurred,
  };
}

/** Where to resume a draft: the first step that still needs the user's attention. */
export function firstIncompleteStep(report: ClientReport): StepId {
  const state = branchingStateFromReport(report);
  const steps = getApplicableSteps(state);

  for (const step of steps) {
    switch (step) {
      case "submitter-type":
        if (!report.submitterType) return step;
        break;
      case "before-you-start":
        // Purely informational — nothing to persist, so never blocks resume.
        break;
      case "administration-error":
        if (report.administrationError === null) return step;
        break;
      case "adverse-event-occurred":
        if (report.adverseEventOccurred === null) return step;
        break;
      case "about-you":
        if (!report.aboutYou) return step;
        break;
      case "patient":
        if (!report.patient) return step;
        break;
      case "vaccine":
        if (!report.vaccine) return step;
        break;
      case "adverse-event":
        if (!report.adverseEvent) return step;
        break;
      case "error-detail":
        if (!report.errorDetail) return step;
        break;
      case "documents":
        // Always stop here once reached — uploads/notes are optional, so
        // there's no persisted signal that the user is "done" with this
        // step, but it's a single click through to Review either way.
        return step;
      case "review":
        break;
    }
  }
  return "review";
}

/** All applicable steps still missing required data — for the Review page's proactive checklist (VAL-002). */
export function missingRequiredSteps(report: ClientReport): StepId[] {
  const state = branchingStateFromReport(report);
  const steps = getApplicableSteps(state);
  const missing: StepId[] = [];

  for (const step of steps) {
    switch (step) {
      case "submitter-type":
        if (!report.submitterType) missing.push(step);
        break;
      case "administration-error":
        if (report.administrationError === null) missing.push(step);
        break;
      case "adverse-event-occurred":
        if (report.adverseEventOccurred === null) missing.push(step);
        break;
      case "about-you":
        if (!report.aboutYou) missing.push(step);
        break;
      case "patient":
        if (!report.patient) missing.push(step);
        break;
      case "vaccine":
        if (!report.vaccine) missing.push(step);
        break;
      case "adverse-event":
        if (!report.adverseEvent) missing.push(step);
        break;
      case "error-detail":
        if (!report.errorDetail) missing.push(step);
        break;
      default:
        break;
    }
  }
  return missing;
}
