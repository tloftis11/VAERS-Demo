import { getApplicableSteps, type BranchingState, type StepId } from "../../shared/src/branchingRules";
import type {
  AboutYouData,
  AdverseEventData,
  ClientReport,
  ErrorDetailData,
  PatientData,
  VaccineData,
} from "./api/client";

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

/**
 * Merges a step's just-submitted (already client-validated) data onto the
 * in-memory report immediately, so the wizard can navigate to the next step
 * without waiting on the PATCH round-trip first. The background PATCH
 * response still overwrites this via setReport once it resolves — this is
 * only what's shown in the gap between the click and that response.
 */
export function applyOptimisticUpdate(
  report: ClientReport,
  step: StepId,
  data: Record<string, unknown>
): ClientReport {
  switch (step) {
    case "submitter-type":
      return { ...report, submitterType: data.submitterType as ClientReport["submitterType"] };
    case "administration-error":
      return { ...report, administrationError: data.administrationError as boolean };
    case "adverse-event-occurred":
      return { ...report, adverseEventOccurred: data.adverseEventOccurred as boolean };
    case "about-you":
      return { ...report, aboutYou: data as unknown as AboutYouData };
    case "patient":
      return { ...report, patient: data as unknown as PatientData };
    case "vaccine":
      return { ...report, vaccine: data as unknown as VaccineData };
    case "adverse-event":
      return { ...report, adverseEvent: data as unknown as AdverseEventData };
    case "error-detail":
      return { ...report, errorDetail: data as unknown as ErrorDetailData };
    case "documents":
      return {
        ...report,
        documents: { supplementalNotes: (data.supplementalNotes as string) ?? "" },
      };
    default:
      return report;
  }
}

/**
 * Reconciles one step's optimistic update with its authoritative server
 * response once the background PATCH resolves. Merges only that step's
 * slice rather than replacing the whole report, so an in-flight patch for
 * an earlier step (which can resolve after a later one if requests race)
 * can't stomp on steps the user has since moved past optimistically.
 */
export function mergeServerUpdate(report: ClientReport, step: StepId, server: ClientReport): ClientReport {
  switch (step) {
    case "submitter-type":
      return { ...report, submitterType: server.submitterType };
    case "administration-error":
      return { ...report, administrationError: server.administrationError };
    case "adverse-event-occurred":
      return { ...report, adverseEventOccurred: server.adverseEventOccurred };
    case "about-you":
      return { ...report, aboutYou: server.aboutYou };
    case "patient":
      return { ...report, patient: server.patient };
    case "vaccine":
      return { ...report, vaccine: server.vaccine };
    case "adverse-event":
      return { ...report, adverseEvent: server.adverseEvent };
    case "error-detail":
      return { ...report, errorDetail: server.errorDetail };
    case "documents":
      return { ...report, documents: server.documents, attachments: server.attachments };
    default:
      return report;
  }
}
