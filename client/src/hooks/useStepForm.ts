import { useEffect, useState } from "react";
import type { ZodType } from "zod";
import { errorBelongsToField } from "../utils/fieldErrors";

function isEmptyFieldValue(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/**
 * Reuses the exact same zod schema the server re-validates with (design doc
 * §3.6 "defense in depth") to give instant, in-form feedback before a
 * network round-trip.
 */
export function useStepForm<T extends object>(schema: ZodType, initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // A step can mount before a server-side side effect from an earlier step
  // (e.g. auto-filling the patient's name) has resolved, so `initialValues`
  // may change identity after mount. Absorb any newly-available values for
  // fields that are still blank locally — but never overwrite a field the
  // user has already started filling in themselves.
  useEffect(() => {
    setValues((current) => {
      let changed = false;
      const merged = { ...current };
      for (const key of Object.keys(initialValues) as (keyof T)[]) {
        if (isEmptyFieldValue(current[key]) && !isEmptyFieldValue(initialValues[key])) {
          merged[key] = initialValues[key];
          changed = true;
        }
      }
      return changed ? merged : current;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  function setValue<K extends keyof T>(key: K, value: T[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    // Editing a field is a signal its old error(s) may no longer apply —
    // clear them now rather than waiting for the next validate() call,
    // which some navigation paths (e.g. a choice-card selection that both
    // sets the value and advances in one go) never trigger. Full
    // re-validation still happens at Next/Continue, so a genuinely
    // still-invalid value gets re-flagged then. Uses errorBelongsToField
    // (not `key in e`) so replacing a whole array field (e.g.
    // additionalVaccines) also clears every nested per-row error under it —
    // otherwise a stale "additionalVaccines.0.vaccineType" error could keep
    // pointing at a row that no longer exists after the array changed.
    setErrors((e) => {
      const keyStr = String(key);
      const next: Record<string, string> = {};
      let changed = false;
      for (const [path, message] of Object.entries(e)) {
        if (errorBelongsToField(path, keyStr)) {
          changed = true;
        } else {
          next[path] = message;
        }
      }
      return changed ? next : e;
    });
  }

  function validate():
    | { success: true; data: Record<string, unknown> }
    | { success: false; errors: Record<string, string> } {
    const result = schema.safeParse(values);
    if (result.success) {
      setErrors({});
      return { success: true, data: result.data as Record<string, unknown> };
    }
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    setErrors(fieldErrors);
    return { success: false, errors: fieldErrors };
  }

  return { values, setValue, setValues, errors, validate };
}
