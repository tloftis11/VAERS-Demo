import { describe, expect, it } from "vitest";
import { checkCrossFieldRules, type CrossFieldCheckInput } from "./validationRules";

function baseInput(overrides: Partial<CrossFieldCheckInput> = {}): CrossFieldCheckInput {
  return {
    submitterType: "public",
    administrationError: null,
    adverseEventOccurred: null,
    vaccine: null,
    patient: null,
    adverseEvent: null,
    errorDetail: null,
    aboutYou: null,
    ...overrides,
  };
}

describe("checkCrossFieldRules — existing chronology checks (regression guard)", () => {
  it("flags symptom onset before vaccination", () => {
    const findings = checkCrossFieldRules(
      baseInput({
        vaccine: { administrationDate: "2026-06-10" },
        adverseEvent: { onsetDate: "2026-06-05" },
      })
    );
    expect(findings.some((f) => f.field === "onsetDate")).toBe(true);
  });

  it("passes clean chronology through with no findings", () => {
    const findings = checkCrossFieldRules(
      baseInput({
        vaccine: { administrationDate: "2026-06-01" },
        patient: { dateOfBirth: "1990-01-01" },
        adverseEvent: { onsetDate: "2026-06-02", hospitalizationDays: "" },
      })
    );
    expect(findings).toHaveLength(0);
  });
});

describe("checkCrossFieldRules — vaccination date vs. patient date of birth (server-side enforcement)", () => {
  it("REGRESSION: flags a vaccination date before the patient's date of birth", () => {
    const findings = checkCrossFieldRules(
      baseInput({
        vaccine: { administrationDate: "1990-01-01" },
        patient: { dateOfBirth: "2000-01-01" },
      })
    );
    expect(findings).toEqual([
      expect.objectContaining({ severity: "ERROR", step: "vaccine", field: "administrationDate" }),
    ]);
  });

  it("does not flag a vaccination date on or after the date of birth", () => {
    const findings = checkCrossFieldRules(
      baseInput({
        vaccine: { administrationDate: "2000-01-01" },
        patient: { dateOfBirth: "2000-01-01" },
      })
    );
    expect(findings.some((f) => f.field === "administrationDate")).toBe(false);
  });

  it("skips the check entirely when date of birth is unknown (empty string)", () => {
    const findings = checkCrossFieldRules(
      baseInput({
        vaccine: { administrationDate: "1990-01-01" },
        patient: { dateOfBirth: "" },
      })
    );
    expect(findings).toHaveLength(0);
  });
});

describe("checkCrossFieldRules — hospitalization days vs. elapsed time (server-side enforcement)", () => {
  it("REGRESSION: flags hospitalization days that exceed what could have elapsed since onset", () => {
    const findings = checkCrossFieldRules(
      baseInput({
        adverseEvent: { onsetDate: "2026-01-01", hospitalizationDays: 9999 },
      })
    );
    expect(findings).toEqual([
      expect.objectContaining({ severity: "ERROR", step: "adverse-event", field: "hospitalizationDays" }),
    ]);
  });

  it("does not flag a plausible hospitalization length", () => {
    const findings = checkCrossFieldRules(
      baseInput({
        adverseEvent: { onsetDate: "2026-01-01", hospitalizationDays: 1 },
      })
    );
    expect(findings.some((f) => f.field === "hospitalizationDays")).toBe(false);
  });

  it("skips the check when hospitalizationDays wasn't answered", () => {
    const findings = checkCrossFieldRules(
      baseInput({
        adverseEvent: { onsetDate: "2026-01-01", hospitalizationDays: "" },
      })
    );
    expect(findings).toHaveLength(0);
  });
});

describe("checkCrossFieldRules — HCP report needs at least one of administrationError/adverseEventOccurred", () => {
  it("REGRESSION: flags an HCP report where both are false", () => {
    const findings = checkCrossFieldRules(
      baseInput({ submitterType: "hcp", administrationError: false, adverseEventOccurred: false })
    );
    expect(findings).toEqual([
      expect.objectContaining({ severity: "ERROR", step: "adverse-event-occurred", field: "adverseEventOccurred" }),
    ]);
  });

  it("does not flag when either one is true", () => {
    expect(
      checkCrossFieldRules(baseInput({ submitterType: "hcp", administrationError: true, adverseEventOccurred: false }))
    ).toHaveLength(0);
    expect(
      checkCrossFieldRules(baseInput({ submitterType: "hcp", administrationError: false, adverseEventOccurred: true }))
    ).toHaveLength(0);
  });

  it("does not apply to a public report (the two questions don't exist there)", () => {
    const findings = checkCrossFieldRules(
      baseInput({ submitterType: "public", administrationError: false, adverseEventOccurred: false })
    );
    expect(findings).toHaveLength(0);
  });
});
