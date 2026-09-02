import { describe, expect, it } from "vitest";
import { vaccineSchema, aboutYouSchema, patientSchema, adverseEventSchema, errorDetailSchema } from "./schemas";

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

describe("vaccineSchema — facility type 'Other' detail", () => {
  it("requires facilityTypeOther when facilityType is 'other'", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(baseHcpVaccineData({ facilityType: "other", facilityTypeOther: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain("facilityTypeOther");
    }
  });

  it("passes once facilityTypeOther is filled in, and strips it if facilityType changes away from 'other'", () => {
    const schema = vaccineSchema("hcp");
    const ok = schema.safeParse(baseHcpVaccineData({ facilityType: "other", facilityTypeOther: "Mobile clinic" }));
    expect(ok.success).toBe(true);

    const notOther = schema.safeParse(
      baseHcpVaccineData({ facilityType: "home", facilityTypeOther: "stale leftover text" })
    );
    expect(notOther.success).toBe(true);
    if (notOther.success) {
      expect((notOther.data as { facilityTypeOther: string }).facilityTypeOther).toBe("");
    }
  });
});

describe("aboutYouSchema — relationship 'Other' detail (public/caregiver only)", () => {
  function baseAboutYouData(overrides: Record<string, unknown> = {}) {
    return {
      contactName: "Jane Doe",
      contactEmail: "jane@example.com",
      contactPhone: "",
      relationship: "self",
      relationshipOther: "",
      mailingStreet: "",
      mailingCity: "",
      mailingState: "",
      mailingZip: "",
      bestContactInfo: "",
      ...overrides,
    };
  }

  it("requires relationshipOther when relationship is 'other'", () => {
    const schema = aboutYouSchema("public");
    const result = schema.safeParse(baseAboutYouData({ relationship: "other", relationshipOther: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain("relationshipOther");
    }
  });

  it("passes once relationshipOther is filled in", () => {
    const schema = aboutYouSchema("public");
    const result = schema.safeParse(baseAboutYouData({ relationship: "other", relationshipOther: "Family friend" }));
    expect(result.success).toBe(true);
  });

  it("HCP submitters have no relationship enum, so 'other' never applies", () => {
    const schema = aboutYouSchema("hcp");
    const result = schema.safeParse(baseAboutYouData({ relationship: "other", relationshipOther: "" }));
    expect(result.success).toBe(true);
  });
});

describe("patientSchema — race 'Other' detail and pregnancy stale-data clearing", () => {
  function basePatientData(overrides: Record<string, unknown> = {}) {
    return {
      patientFirstName: "Test",
      patientLastName: "Patient",
      patientDateOfBirth: "1990-01-01",
      dateOfBirthUnknown: false,
      patientSex: "female",
      ageYears: "",
      ageMonths: "",
      patientState: "",
      pregnant: "",
      pregnancyDetails: "",
      medicationsAtVaccination: "",
      allergies: "",
      recentIllnesses: "",
      chronicConditions: "",
      patientRace: [],
      patientRaceOther: "",
      patientEthnicity: "",
      ...overrides,
    };
  }

  it("requires patientRaceOther when patientRace includes 'other'", () => {
    const schema = patientSchema("public");
    const result = schema.safeParse(basePatientData({ patientRace: ["other"], patientRaceOther: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain("patientRaceOther");
    }
  });

  it("passes once patientRaceOther is filled in, and strips it if 'other' is deselected", () => {
    const schema = patientSchema("public");
    const ok = schema.safeParse(basePatientData({ patientRace: ["other"], patientRaceOther: "Multiracial" }));
    expect(ok.success).toBe(true);

    const deselected = schema.safeParse(
      basePatientData({ patientRace: ["white"], patientRaceOther: "stale leftover text" })
    );
    expect(deselected.success).toBe(true);
    if (deselected.success) {
      expect((deselected.data as { patientRaceOther: string }).patientRaceOther).toBe("");
    }
  });

  it("REGRESSION: pregnancy answers are stripped server-side when sex is male, even if the client somehow sent them", () => {
    const schema = patientSchema("public");
    const result = schema.safeParse(
      basePatientData({ patientSex: "male", pregnant: "yes", pregnancyDetails: "stale data that should never persist" })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as { pregnant: string; pregnancyDetails: string };
      expect(data.pregnant).toBe("");
      expect(data.pregnancyDetails).toBe("");
    }
  });

  it("REGRESSION: pregnancy answers are stripped server-side when age is implausibly young", () => {
    const schema = patientSchema("public");
    const result = schema.safeParse(
      basePatientData({
        patientDateOfBirth: "",
        dateOfBirthUnknown: true,
        ageYears: "3",
        patientSex: "female",
        pregnant: "yes",
        pregnancyDetails: "stale data that should never persist",
      })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as { pregnant: string; pregnancyDetails: string };
      expect(data.pregnant).toBe("");
      expect(data.pregnancyDetails).toBe("");
    }
  });

  it("keeps pregnancyDetails only when pregnant is 'yes', clearing it for 'no'/'unknown'", () => {
    const schema = patientSchema("public");
    const result = schema.safeParse(basePatientData({ pregnant: "no", pregnancyDetails: "stale text" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as { pregnancyDetails: string }).pregnancyDetails).toBe("");
    }
  });

  it("a plausible adult female patient's real pregnancy answer is preserved", () => {
    const schema = patientSchema("public");
    const result = schema.safeParse(
      basePatientData({ patientSex: "female", pregnant: "yes", pregnancyDetails: "Second trimester" })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as { pregnant: string; pregnancyDetails: string };
      expect(data.pregnant).toBe("yes");
      expect(data.pregnancyDetails).toBe("Second trimester");
    }
  });
});

describe("adverseEventSchema — symptoms 'Other', outcomes exclusivity, previous AE details", () => {
  function baseAdverseEventData(overrides: Record<string, unknown> = {}) {
    return {
      onsetDate: "2026-01-02",
      onsetTime: "",
      description: "Patient developed a mild rash after vaccination.",
      symptoms: [],
      symptomsOther: "",
      labResults: "",
      recoveryStatus: "",
      outcomes: [],
      hospitalizationDays: "",
      hospitalName: "",
      hospitalCity: "",
      hospitalState: "",
      dateOfDeath: "",
      treatmentGiven: "",
      clinicalCourseNotes: "",
      previousAdverseEvent: "",
      previousAdverseEventDetails: "",
      ...overrides,
    };
  }

  it("requires symptomsOther when 'other' is among the selected symptoms", () => {
    const schema = adverseEventSchema("public");
    const result = schema.safeParse(baseAdverseEventData({ symptoms: ["fever", "other"], symptomsOther: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain("symptomsOther");
    }
  });

  it("passes once symptomsOther is filled in, and strips it if 'other' is deselected", () => {
    const schema = adverseEventSchema("public");
    const ok = schema.safeParse(baseAdverseEventData({ symptoms: ["other"], symptomsOther: "Metallic taste" }));
    expect(ok.success).toBe(true);

    const deselected = schema.safeParse(
      baseAdverseEventData({ symptoms: ["fever"], symptomsOther: "stale leftover text" })
    );
    expect(deselected.success).toBe(true);
    if (deselected.success) {
      expect((deselected.data as { symptomsOther: string }).symptomsOther).toBe("");
    }
  });

  it("REGRESSION: 'None of the above' is mutually exclusive with a real outcome", () => {
    const schema = adverseEventSchema("public");
    const result = schema.safeParse(baseAdverseEventData({ outcomes: ["none", "er_visit"] }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain("outcomes");
    }
  });

  it("'None of the above' alone, or a real outcome alone, both pass", () => {
    const schema = adverseEventSchema("public");
    expect(schema.safeParse(baseAdverseEventData({ outcomes: ["none"] })).success).toBe(true);
    expect(schema.safeParse(baseAdverseEventData({ outcomes: ["er_visit"] })).success).toBe(true);
  });

  it("requires previousAdverseEventDetails when previousAdverseEvent is 'yes'", () => {
    const schema = adverseEventSchema("public");
    const result = schema.safeParse(
      baseAdverseEventData({ previousAdverseEvent: "yes", previousAdverseEventDetails: "" })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain("previousAdverseEventDetails");
    }
  });

  it("strips previousAdverseEventDetails if previousAdverseEvent is changed away from 'yes'", () => {
    const schema = adverseEventSchema("public");
    const result = schema.safeParse(
      baseAdverseEventData({ previousAdverseEvent: "no", previousAdverseEventDetails: "stale leftover text" })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as { previousAdverseEventDetails: string }).previousAdverseEventDetails).toBe("");
    }
  });
});

describe("errorDetailSchema — error type 'Other' detail", () => {
  function baseErrorDetailData(overrides: Record<string, unknown> = {}) {
    return {
      errorType: "wrong_dose",
      errorTypeOther: "",
      errorDescription: "Patient received twice the intended dose.",
      errorDiscoveredDate: "2026-01-02",
      correctiveActionTaken: "",
      ...overrides,
    };
  }

  it("requires errorTypeOther when errorType is 'other'", () => {
    const result = errorDetailSchema.safeParse(baseErrorDetailData({ errorType: "other", errorTypeOther: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain("errorTypeOther");
    }
  });

  it("passes once errorTypeOther is filled in, and strips it if errorType changes away from 'other'", () => {
    const ok = errorDetailSchema.safeParse(
      baseErrorDetailData({ errorType: "other", errorTypeOther: "Administered via wrong injection technique" })
    );
    expect(ok.success).toBe(true);

    const notOther = errorDetailSchema.safeParse(
      baseErrorDetailData({ errorType: "wrong_dose", errorTypeOther: "stale leftover text" })
    );
    expect(notOther.success).toBe(true);
    if (notOther.success) {
      expect((notOther.data as { errorTypeOther: string }).errorTypeOther).toBe("");
    }
  });
});
