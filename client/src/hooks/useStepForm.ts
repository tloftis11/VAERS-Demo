import { useState } from "react";
import type { ZodType } from "zod";

/**
 * Reuses the exact same zod schema the server re-validates with (design doc
 * §3.6 "defense in depth") to give instant, in-form feedback before a
 * network round-trip.
 */
export function useStepForm<T extends object>(schema: ZodType, initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setValue<K extends keyof T>(key: K, value: T[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function validate(): { success: true; data: Record<string, unknown> } | { success: false } {
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
    return { success: false };
  }

  return { values, setValue, setValues, errors, validate };
}
