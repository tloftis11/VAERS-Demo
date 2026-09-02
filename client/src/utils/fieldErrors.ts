/**
 * Centralizes "does this zod error belong to this field?" so every place
 * that reads the `errors: Record<string, string>` map (keyed by dot-joined
 * zod issue paths, e.g. "additionalVaccines.0.vaccineType") agrees on the
 * answer. Before this existed, several call sites compared with `=== `
 * only, so a nested error never matched its parent field id — Continue
 * would correctly stay blocked (the schema still failed), but no inline
 * error, review-summary entry, or focus movement ever surfaced why,
 * because none of them recognized the error as belonging to any field on
 * screen.
 */

/** True when `errorPath` is exactly `fieldId`, or nested under it via "."
 * (e.g. "additionalVaccines.0.vaccineType") or "[" (e.g. "items[0].name"). */
export function errorBelongsToField(errorPath: string, fieldId: string): boolean {
  if (errorPath === fieldId) return true;
  if (errorPath.startsWith(`${fieldId}.`)) return true;
  if (errorPath.startsWith(`${fieldId}[`)) return true;
  return false;
}

/** All [path, message] pairs (in insertion order) whose path is fieldId
 * itself or nested under it. */
export function errorsForField(
  errors: Record<string, string>,
  fieldId: string
): Array<{ path: string; message: string }> {
  return Object.keys(errors)
    .filter((path) => errorBelongsToField(path, fieldId))
    .map((path) => ({ path, message: errors[path] }));
}

/** Whether any current error belongs to this field (exact or nested). */
export function fieldHasError(errors: Record<string, string>, fieldId: string): boolean {
  return Object.keys(errors).some((path) => errorBelongsToField(path, fieldId));
}

/** The first matching error's message, for simple single-line inline-error
 * display — most fields only ever have one error at a time anyway. */
export function firstErrorForField(errors: Record<string, string>, fieldId: string): string | undefined {
  return errorsForField(errors, fieldId)[0]?.message;
}

/**
 * Re-bases nested errors under `fieldId` so a custom renderer (e.g. a
 * repeatable-row editor) can look itself up by its own relative paths
 * without knowing its own top-level field id — "additionalVaccines.2.route"
 * becomes "2.route". Errors that belong to the field but aren't nested
 * (the field's own top-level error, if any) keep the empty-string key.
 */
export function relativeErrorsForField(
  errors: Record<string, string>,
  fieldId: string
): Record<string, string> {
  const relative: Record<string, string> = {};
  for (const { path, message } of errorsForField(errors, fieldId)) {
    if (path === fieldId) {
      relative[""] = message;
    } else if (path.startsWith(`${fieldId}.`)) {
      relative[path.slice(fieldId.length + 1)] = message;
    } else if (path.startsWith(`${fieldId}[`)) {
      relative[path.slice(fieldId.length)] = message;
    }
  }
  return relative;
}
