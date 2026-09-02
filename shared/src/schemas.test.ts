import { describe, expect, it } from "vitest";
import { vaccineSchema } from "./schemas";

/** Minimal valid HCP vaccine-step payload — every test below starts from
 * this and only varies additionalVaccines/manufacturer/lotNumber, so a
 * failure always points at the field under test, not an unrelated one. */
function baseHcpVaccineData(overrides: Record<string, unknown> = {}) {
  return {
    vaccineType: "covid19",
    vaccineTypeOther: "",
    doseNumber: "",
    administrationDate: "2026-01-01",
    administrationTime: "",
    manufacturer: "pfizer",
    lotNumber: "ABC123",
    route: "",
    bodySite: "",
    administeringFacility: "",
    facilityType: "",
    otherVaccinesRecent: "",
    otherVaccinesSameVisit: "",
    additionalVaccines: [],
    priorVaccines: [],
    ...overrides,
  };
}

const EMPTY_ADDITIONAL_ROW = {
  vaccineType: "",
  vaccineTypeOther: "",
  manufacturer: "",
  lotNumber: "",
  route: "",
  bodySite: "",
  doseNumber: "",
};

describe("vaccineSchema (HCP) — additionalVaccines rows", () => {
  it("REGRESSION: a completely blank additional-vaccine row must not block validation", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({ additionalVaccines: [{ ...EMPTY_ADDITIONAL_ROW }] })
    );
    expect(result.success).toBe(true);
  });

  it("a partially-filled additional row (manufacturer set, no vaccine type) must fail with a nested path", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({
        additionalVaccines: [{ ...EMPTY_ADDITIONAL_ROW, manufacturer: "moderna" }],
      })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("additionalVaccines.0.vaccineType");
    }
  });

  it("a fully-completed additional row passes", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({
        additionalVaccines: [{ ...EMPTY_ADDITIONAL_ROW, vaccineType: "Influenza (Seasonal) (Fluzone)" }],
      })
    );
    expect(result.success).toBe(true);
  });

  it("two rows validate independently: a blank first row + valid second row still passes", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({
        additionalVaccines: [
          { ...EMPTY_ADDITIONAL_ROW },
          { ...EMPTY_ADDITIONAL_ROW, vaccineType: "Influenza (Seasonal) (Fluzone)" },
        ],
      })
    );
    expect(result.success).toBe(true);
  });

  it("two rows validate independently: a valid first row + partial second row fails only on row 1 (index 1)", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({
        additionalVaccines: [
          { ...EMPTY_ADDITIONAL_ROW, vaccineType: "Influenza (Seasonal) (Fluzone)" },
          { ...EMPTY_ADDITIONAL_ROW, lotNumber: "XYZ" },
        ],
      })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("additionalVaccines.1.vaccineType");
      expect(paths).not.toContain("additionalVaccines.0.vaccineType");
    }
  });
});

describe("vaccineSchema (HCP) — blank-row normalization", () => {
  it("strips a completely blank row out of the parsed data entirely (not just 'allows' it)", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({
        additionalVaccines: [
          { ...EMPTY_ADDITIONAL_ROW, vaccineType: "covid19" },
          { ...EMPTY_ADDITIONAL_ROW },
        ],
      })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.additionalVaccines).toHaveLength(1);
      expect((result.data.additionalVaccines[0] as { vaccineType: string }).vaccineType).toBe("covid19");
    }
  });
});

describe("vaccineSchema — Other/Foreign vaccine detail", () => {
  it("requires vaccineTypeOther when the primary vaccine is 'other'", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(baseHcpVaccineData({ vaccineType: "other", vaccineTypeOther: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain("vaccineTypeOther");
    }
  });

  it("requires vaccineTypeOther when the primary vaccine is 'foreign'", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(baseHcpVaccineData({ vaccineType: "foreign", vaccineTypeOther: "" }));
    expect(result.success).toBe(false);
  });

  it("passes once vaccineTypeOther is filled in for 'other'", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({ vaccineType: "other", vaccineTypeOther: "Some specific brand" })
    );
    expect(result.success).toBe(true);
  });

  it("applies the same rule to an additional-vaccine row selecting 'other'", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({
        additionalVaccines: [{ ...EMPTY_ADDITIONAL_ROW, vaccineType: "other", vaccineTypeOther: "" }],
      })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain(
        "additionalVaccines.0.vaccineTypeOther"
      );
    }
  });

  it("passes once the additional row's vaccineTypeOther is filled in", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({
        additionalVaccines: [
          { ...EMPTY_ADDITIONAL_ROW, vaccineType: "foreign", vaccineTypeOther: "Given abroad" },
        ],
      })
    );
    expect(result.success).toBe(true);
  });
});

describe("vaccineSchema (HCP) — manufacturer/lot number", () => {
  it("REGRESSION: manufacturer must not be required merely because a vaccine was selected", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(baseHcpVaccineData({ manufacturer: "" }));
    expect(result.success).toBe(true);
  });

  it("REGRESSION: lot number must not be required merely because a vaccine was selected", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(baseHcpVaccineData({ lotNumber: "" }));
    expect(result.success).toBe(true);
  });
});
