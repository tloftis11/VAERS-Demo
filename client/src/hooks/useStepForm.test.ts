import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { z } from "zod";
import { useStepForm } from "./useStepForm";

const schema = z.object({
  additionalVaccines: z
    .array(z.object({ vaccineType: z.string() }))
    .superRefine((rows, ctx) => {
      rows.forEach((row, i) => {
        if (!row.vaccineType) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i, "vaccineType"], message: "Required" });
        }
      });
    }),
});

describe("useStepForm — nested error clearing", () => {
  it("clears every nested per-row error when the parent array field is replaced", () => {
    const { result } = renderHook(() => useStepForm(schema, { additionalVaccines: [{ vaccineType: "" }] }));

    act(() => {
      result.current.validate();
    });
    expect(result.current.errors["additionalVaccines.0.vaccineType"]).toBeDefined();

    act(() => {
      result.current.setValue("additionalVaccines", [{ vaccineType: "covid19" }]);
    });

    // REGRESSION: the old exact-match-only clear (`key in e`) never removed
    // "additionalVaccines.0.vaccineType" because the literal key it checked
    // for was "additionalVaccines" — the stale nested error survived a fix.
    expect(result.current.errors["additionalVaccines.0.vaccineType"]).toBeUndefined();
  });
});
