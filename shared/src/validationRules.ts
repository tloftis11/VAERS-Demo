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
  adverseEvent: { onsetDate: string } | null;
  errorDetail: { errorDiscoveredDate: string } | null;
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

  return findings;
}
