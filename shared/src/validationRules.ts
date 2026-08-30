/**
 * Severity-tagged advisory layer (VAL-001) alongside the blocking zod
 * validation in schemas.ts. Zod failures are always ERROR-equivalent
 * (required fields, malformed values); this module adds deterministic
 * cross-field checks that zod's per-step schemas can't express, since they
 * only ever see one step's fields at a time.
 */
import type { StepId } from "./branchingRules";

export type Severity = "ERROR" | "WARNING" | "INFO";

export interface ValidationFinding {
  severity: Severity;
  step: StepId;
  field: string;
  message: string;
}

export interface CrossFieldCheckInput {
  vaccine: { administrationDate: string } | null;
  adverseEvent: { onsetDate: string; dateOfDeath?: string; outcomes?: string[] } | null;
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
      step: "adverse-event",
      field: "outcomes",
      message:
        "A report submitted by the patient themselves can't also report that the patient died — if you're reporting on behalf of someone else, go back and update who's filling out this report.",
    });
  }

  return findings;
}
