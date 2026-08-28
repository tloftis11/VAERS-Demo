import { useEffect, useState } from "react";
import type { ZodType } from "zod";

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
    // Editing a field is a signal its old error may no longer apply — clear
    // it now rather than waiting for the next validate() call, which some
    // navigation paths (e.g. a choice-card selection that both sets the
    // value and advances in one go) never trigger. Full re-validation still
    // happens at Next/Continue, so a genuinely still-invalid value gets
    // re-flagged then.
    setErrors((e) => {
      if (!(key in e)) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
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
