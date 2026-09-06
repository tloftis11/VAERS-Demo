/**
 * Severity-tagged advisory layer (VAL-001) alongside the blocking zod
 * validation in schemas.ts. Zod failures are always ERROR-equivalent
 * (required fields, malformed values); this module adds deterministic
 * cross-field checks that zod's per-step schemas can't express, since they
 * only ever see one step's fields at a time.
 */
import type { StepId } from "./branchingRules";
import { hospitalizationExceedsElapsed } from "./liveChecks";

export type Severity = "ERROR" | "WARNING" | "INFO";

export interface ValidationFinding {
  severity: Severity;
  step: StepId;
  field: string;
  message: string;
  /** Label for the "go fix this" button (see ReviewStep.tsx) — defaults to
   * a generic label when omitted, since most findings' `step`/`field`
   * already point straight at the problem field itself. Set this
   * explicitly when the fix isn't at that field but somewhere else
   * entirely (e.g. changing who's filling out the report), so the button
   * says what it actually does instead of reading like restating the
   * problem. */
  actionLabel?: string;
}

export interface CrossFieldCheckInput {
  submitterType?: "public" | "hcp" | null;
  administrationError?: boolean | null;
  adverseEventOccurred?: boolean | null;
  vaccine: { administrationDate: string } | null;
  patient: { dateOfBirth?: string } | null;
  adverseEvent: {
    onsetDate: string;
    dateOfDeath?: string;
    outcomes?: string[];
    hospitalizationDays?: number | string;
  } | null;
  errorDetail: { errorDiscoveredDate: string } | null;
  aboutYou: { relationship?: string } | null;
}

function isBefore(a: string, b: string): boolean {
  const da = Date.parse(a);
  const db = Date.parse(b);
  return !Number.isNaN(da) && !Number.isNaN(db) && da < db;
}

/**
 * Deterministic checks spanning more than one step's fields (VAL-003):
 * logically impossible chronology. These are ERROR-severity — they block
 * submission, same as a missing required field would.
 */
export function checkCrossFieldRules(report: CrossFieldCheckInput): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const administrationDate = report.vaccine?.administrationDate;

  if (administrationDate && report.adverseEvent?.onsetDate) {
    if (isBefore(report.adverseEvent.onsetDate, administrationDate)) {
      findings.push({
        severity: "ERROR",
        step: "adverse-event",
        field: "onsetDate",
        message: "Symptom onset date is before the vaccination date.",
      });
    }
  }

  if (administrationDate && report.errorDetail?.errorDiscoveredDate) {
    if (isBefore(report.errorDetail.errorDiscoveredDate, administrationDate)) {
      findings.push({
        severity: "ERROR",
        step: "error-detail",
        field: "errorDiscoveredDate",
        message: "The error-discovered date is before the vaccination date.",
      });
    }
  }

  const dateOfDeath = report.adverseEvent?.dateOfDeath;
  if (dateOfDeath) {
    if (administrationDate && isBefore(dateOfDeath, administrationDate)) {
      findings.push({
        severity: "ERROR",
        step: "adverse-event",
        field: "dateOfDeath",
        message: "Date of death is before the vaccination date.",
      });
    } else if (report.adverseEvent?.onsetDate && isBefore(dateOfDeath, report.adverseEvent.onsetDate)) {
      // Only checked when the vaccination-date comparison above didn't already
      // fire — a date that's before administration is necessarily also before
      // onset (onset can't precede administration either), so this avoids
      // surfacing two findings for what's really one impossible date.
      findings.push({
        severity: "ERROR",
        step: "adverse-event",
        field: "dateOfDeath",
        message: "Date of death is before the symptom onset date.",
      });
    }
  }

  // The real VAERS eSubmitter system has a dedicated check for exactly this
  // contradiction (its own error id is literally "deathrelation") — a
  // self-reporting submitter can't also be reporting their own death.
  if (report.aboutYou?.relationship === "self" && report.adverseEvent?.outcomes?.includes("death")) {
    findings.push({
      severity: "ERROR",
      // Routes to "submitter-type", not "adverse-event" — the fix isn't on
      // the outcomes checkbox that triggered this, it's changing *who's
      // filling this out*, so the button needs to land where that's
      // actually editable and say what it does, not restate the problem.
      step: "submitter-type",
      field: "outcomes",
      message: "A report submitted by the patient themselves can't also report that the patient died.",
      actionLabel: "Change who's filling out this report",
    });
  }

  // The live UI (VaccineStep.tsx) already blocks this on the administration
  // date question itself — this is the same check enforced independently
  // server-side, since that live check is trivially bypassed by anything
  // that doesn't go through the browser UI (a direct API call, a stale
  // client build, etc.).
  const dateOfBirth = report.patient?.dateOfBirth;
  if (administrationDate && dateOfBirth && isBefore(administrationDate, dateOfBirth)) {
    findings.push({
      severity: "ERROR",
      step: "vaccine",
      field: "administrationDate",
      message: "Vaccination date is before the patient's date of birth.",
    });
  }

  // Same defense-in-depth rationale as above — the live UI (AdverseEventStep.tsx)
  // already blocks this on the hospitalization-days question via the same
  // hospitalizationExceedsElapsed helper.
  const hospitalizationDays = report.adverseEvent?.hospitalizationDays;
  const onsetDate = report.adverseEvent?.onsetDate;
  if (onsetDate && hospitalizationDays !== undefined && hospitalizationDays !== "") {
    const message = hospitalizationExceedsElapsed(onsetDate, Number(hospitalizationDays));
    if (message) {
      findings.push({ severity: "ERROR", step: "adverse-event", field: "hospitalizationDays", message });
    }
  }

  // An HCP report needs at least one of these to be true — otherwise
  // there's neither an administration error nor an adverse event to
  // actually report. The live UI (YesNoQuestionStep, wired in
  // ReportWizard.tsx) already blocks answering the second question "No"
  // once the other is already "No"; this is the same rule enforced
  // independently server-side.
  if (
    report.submitterType === "hcp" &&
    report.administrationError === false &&
    report.adverseEventOccurred === false
  ) {
    findings.push({
      severity: "ERROR",
      step: "adverse-event-occurred",
      field: "adverseEventOccurred",
      message: "A report needs at least an administration error or an adverse event to submit — both are answered \"No\" here.",
      actionLabel: "Change one of these answers",
    });
  }

  return findings;
}
