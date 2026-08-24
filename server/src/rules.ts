/**
 * Thin server-side wrapper around the shared branching/validation engine.
 * Re-validating here (in addition to the client) is the "defense in depth"
 * behavior called for in design doc §3.6 — a client bug or a direct API
 * call can never persist a report with fields inconsistent with the
 * submitter-type/administration-error/adverse-event-occurred rules.
 */
export * from "../../shared/src/branchingRules.js";
export * from "../../shared/src/schemas.js";
export * from "../../shared/src/documentSuggestions.js";
export * from "../../shared/src/validationRules.js";
export * from "../../shared/src/faqData.js";

import type { StepId, SubmitterType } from "../../shared/src/branchingRules.js";
import { getSchemaForStep } from "../../shared/src/schemas.js";

export interface ValidationResult {
  success: boolean;
  data?: Record<string, unknown>;
  errors?: { path: string; message: string }[];
}

export function validateStep(
  step: StepId,
  submitterType: SubmitterType,
  data: unknown
): ValidationResult {
  const schema = getSchemaForStep(step, submitterType);
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as Record<string, unknown> };
  }
  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
}
