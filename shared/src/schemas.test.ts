import { describe, expect, it } from "vitest";
import {
  vaccineSchema,
  aboutYouSchema,
  patientSchema,
  adverseEventSchema,
  errorDetailSchema,
  getBodySiteOptionsForRoute,
} from "./schemas";
import { isValidPhone, isValidUsZip, isValidPostalCodeForState } from "./contactValidation";

/** Minimal valid HCP vaccine-step payload — every test below starts from
 * this and only varies additionalVaccines/manufacturer/lotNumber, so a
 * failure always points at the field under test, not an unrelated one.
 * manufacturer is "unknown" (not a specific brand) since "covid19" here is
 * a plain-language code, not one of the HCP path's full-name vaccineType
 * values — "unknown" is the one manufacturer value valid for every vaccine
 * regardless of that mismatch. */
function baseHcpVaccineData(overrides: Record<string, unknown> = {}) {
  return {
    vaccineType: "covid19",
    vaccineTypeOther: "",
    doseNumber: "",
    administrationDate: "2026-01-01",
    administrationTime: "",
    manufacturer: "unknown",
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

const EMPTY_PRIOR_ROW = {
  vaccineType: "",
  vaccineTypeOther: "",
  manufacturer: "",
  lotNumber: "",
  route: "",
  bodySite: "",
  doseNumber: "",
  administrationDate: "",
};

describe("vaccineSchema (HCP) — priorVaccines rows (parity with additionalVaccines)", () => {
  it("REGRESSION: a completely blank prior-vaccine row must not block validation", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(baseHcpVaccineData({ priorVaccines: [{ ...EMPTY_PRIOR_ROW }] }));
    expect(result.success).toBe(true);
  });

  it("a partially-filled prior row (manufacturer set, no vaccine type) fails with a nested path", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({ priorVaccines: [{ ...EMPTY_PRIOR_ROW, manufacturer: "moderna" }] })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain("priorVaccines.0.vaccineType");
    }
  });

  it("a fully-completed prior row (with its own administrationDate) passes", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({
        priorVaccines: [
          { ...EMPTY_PRIOR_ROW, vaccineType: "Influenza (Seasonal) (Fluzone)", administrationDate: "2025-12-01" },
        ],
      })
    );
    expect(result.success).toBe(true);
  });

  it("requires vaccineTypeOther when a prior row selects 'other'", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({ priorVaccines: [{ ...EMPTY_PRIOR_ROW, vaccineType: "other", vaccineTypeOther: "" }] })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain("priorVaccines.0.vaccineTypeOther");
    }
  });

  it("strips a completely blank prior row out of the parsed data entirely", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({
        priorVaccines: [{ ...EMPTY_PRIOR_ROW, vaccineType: "covid19" }, { ...EMPTY_PRIOR_ROW }],
      })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priorVaccines).toHaveLength(1);
      expect((result.data.priorVaccines[0] as { vaccineType: string }).vaccineType).toBe("covid19");
    }
  });

  it("a row with only a date (no vaccine picked) is not treated as blank — it still requires a vaccine", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({ priorVaccines: [{ ...EMPTY_PRIOR_ROW, administrationDate: "2025-12-01" }] })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain("priorVaccines.0.vaccineType");
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

describe("vaccineSchema — manufacturer must match the selected vaccine", () => {
  const PFIZER_COVID = "COVID19 (Pfizer-BioNTech Comirnaty)";

  it("REGRESSION: rejects a manufacturer that doesn't make the selected HCP vaccine", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({ vaccineType: PFIZER_COVID, manufacturer: "moderna" })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain("manufacturer");
    }
  });

  it("accepts the manufacturer that actually matches the selected HCP vaccine", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({ vaccineType: PFIZER_COVID, manufacturer: "pfizer_biontech" })
    );
    expect(result.success).toBe(true);
  });

  it("'Unknown' is always accepted regardless of the selected vaccine", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({ vaccineType: PFIZER_COVID, manufacturer: "unknown" })
    );
    expect(result.success).toBe(true);
  });

  it("REGRESSION: switching to a mismatched manufacturer on an additionalVaccines row is rejected the same way", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({
        additionalVaccines: [{ ...EMPTY_ADDITIONAL_ROW, vaccineType: PFIZER_COVID, manufacturer: "moderna" }],
      })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain("additionalVaccines.0.manufacturer");
    }
  });

  it("REGRESSION: a mismatched manufacturer on a priorVaccines row is rejected the same way", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({
        priorVaccines: [{ ...EMPTY_PRIOR_ROW, vaccineType: PFIZER_COVID, manufacturer: "moderna" }],
      })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain("priorVaccines.0.manufacturer");
    }
  });
});

describe("vaccineSchema — priorVaccines date chronology ('the month before')", () => {
  it("REGRESSION: rejects a prior-vaccine date after the primary vaccination date", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({
        administrationDate: "2026-06-10",
        priorVaccines: [{ ...EMPTY_PRIOR_ROW, vaccineType: "covid19", administrationDate: "2026-06-11" }],
      })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain("priorVaccines.0.administrationDate");
    }
  });

  it("accepts a prior-vaccine date on the same day as the primary vaccination", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({
        administrationDate: "2026-06-10",
        priorVaccines: [{ ...EMPTY_PRIOR_ROW, vaccineType: "covid19", administrationDate: "2026-06-10" }],
      })
    );
    expect(result.success).toBe(true);
  });

  it("REGRESSION: rejects a prior-vaccine date more than a calendar month before the primary vaccination date", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({
        administrationDate: "2026-06-15",
        // One day earlier than the "2026-05-15" calendar-month cutoff.
        priorVaccines: [{ ...EMPTY_PRIOR_ROW, vaccineType: "covid19", administrationDate: "2026-05-14" }],
      })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain("priorVaccines.0.administrationDate");
    }
  });

  it("accepts a prior-vaccine date exactly at the calendar-month cutoff", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({
        administrationDate: "2026-06-15",
        priorVaccines: [{ ...EMPTY_PRIOR_ROW, vaccineType: "covid19", administrationDate: "2026-05-15" }],
      })
    );
    expect(result.success).toBe(true);
  });

  describe("calendar-month cutoff clamps to the last valid day of the preceding month", () => {
    function acceptsCutoff(primary: string, expectedCutoff: string) {
      const schema = vaccineSchema("hcp");
      const result = schema.safeParse(
        baseHcpVaccineData({
          administrationDate: primary,
          priorVaccines: [{ ...EMPTY_PRIOR_ROW, vaccineType: "covid19", administrationDate: expectedCutoff }],
        })
      );
      expect(result.success).toBe(true);
    }

    function rejectsOneDayBeforeCutoff(primary: string, oneDayBeforeCutoff: string) {
      const schema = vaccineSchema("hcp");
      const result = schema.safeParse(
        baseHcpVaccineData({
          administrationDate: primary,
          priorVaccines: [{ ...EMPTY_PRIOR_ROW, vaccineType: "covid19", administrationDate: oneDayBeforeCutoff }],
        })
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.map((i) => i.path.join("."))).toContain("priorVaccines.0.administrationDate");
      }
    }

    it("REGRESSION: May 31 -> April 30 (naive rollover would produce May 1 instead)", () => {
      acceptsCutoff("2026-05-31", "2026-04-30");
      rejectsOneDayBeforeCutoff("2026-05-31", "2026-04-29");
    });

    it("March 31 -> February 28 (non-leap year)", () => {
      acceptsCutoff("2026-03-31", "2026-02-28");
      rejectsOneDayBeforeCutoff("2026-03-31", "2026-02-27");
    });

    it("leap-year March 31 -> February 29", () => {
      acceptsCutoff("2024-03-31", "2024-02-29");
      rejectsOneDayBeforeCutoff("2024-03-31", "2024-02-28");
    });

    it("January 31 -> December 31 (of the preceding year)", () => {
      acceptsCutoff("2026-01-31", "2025-12-31");
      rejectsOneDayBeforeCutoff("2026-01-31", "2025-12-30");
    });
  });

  it("REGRESSION: rejects a partial/incomplete prior-vaccine date", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({
        priorVaccines: [{ ...EMPTY_PRIOR_ROW, vaccineType: "covid19", administrationDate: "2026-05" }],
      })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain("priorVaccines.0.administrationDate");
    }
  });

  it("a row with no date at all is unaffected by the chronology check", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({
        priorVaccines: [{ ...EMPTY_PRIOR_ROW, vaccineType: "covid19", administrationDate: "" }],
      })
    );
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
      contactEmailConfirm: "jane@example.com",
      contactPhone: "",
      relationship: "self",
      relationshipOther: "",
      mailingStreet: "",
      mailingCity: "",
      mailingState: "",
      mailingZip: "",
      bestContactName: "",
      bestContactPhone: "",
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

describe("contactValidation — phone", () => {
  it("accepts common US formats", () => {
    expect(isValidPhone("(404) 555-1212")).toBe(true);
    expect(isValidPhone("404-555-1212")).toBe(true);
    expect(isValidPhone("+1 404 555 1212")).toBe(true);
    expect(isValidPhone("4045551212")).toBe(true);
  });

  it("accepts a foreign number given with its own country code", () => {
    expect(isValidPhone("+44 20 7946 0958")).toBe(true);
  });

  it("REGRESSION: accepts a real-looking number even when its area code/exchange isn't in libphonenumber's assigned-range data", () => {
    // e.g. any "555" area code — extremely common in real-world examples/
    // testing and, before this fix, rejected as "impossible" even though
    // it's a perfectly plausible 10-digit US number.
    expect(isValidPhone("(555) 123-4567")).toBe(true);
  });

  it("rejects an impossible number", () => {
    expect(isValidPhone("555-1212")).toBe(false); // too short — no area code
    expect(isValidPhone("not a phone number")).toBe(false);
    expect(isValidPhone("123")).toBe(false);
  });

  it("treats blank as valid (optional field)", () => {
    expect(isValidPhone("")).toBe(true);
    expect(isValidPhone("   ")).toBe(true);
  });
});

describe("contactValidation — US ZIP", () => {
  it("accepts 5-digit and ZIP+4", () => {
    expect(isValidUsZip("20201")).toBe(true);
    expect(isValidUsZip("20201-0001")).toBe(true);
  });

  it("rejects malformed ZIPs", () => {
    expect(isValidUsZip("2020")).toBe(false);
    expect(isValidUsZip("202011")).toBe(false);
    expect(isValidUsZip("ABCDE")).toBe(false);
  });

  it("treats blank as valid (optional field)", () => {
    expect(isValidUsZip("")).toBe(true);
  });
});

describe("aboutYouSchema — email confirmation, phone, mailing ZIP", () => {
  function baseAboutYouData(overrides: Record<string, unknown> = {}) {
    return {
      contactName: "Jane Doe",
      contactEmail: "jane@example.com",
      contactEmailConfirm: "jane@example.com",
      contactPhone: "",
      relationship: "self",
      relationshipOther: "",
      mailingStreet: "",
      mailingCity: "",
      mailingState: "",
      mailingZip: "",
      bestContactName: "",
      bestContactPhone: "",
      ...overrides,
    };
  }

  it("REGRESSION: rejects a mismatched email confirmation", () => {
    const schema = aboutYouSchema("public");
    const result = schema.safeParse(baseAboutYouData({ contactEmailConfirm: "typo@example.com" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain("contactEmailConfirm");
    }
  });

  it("matches case-insensitively after trimming", () => {
    const schema = aboutYouSchema("public");
    const result = schema.safeParse(
      baseAboutYouData({ contactEmail: "Jane@Example.com", contactEmailConfirm: "  jane@example.COM  " })
    );
    expect(result.success).toBe(true);
  });

  it("also enforces email confirmation for HCP submitters", () => {
    const schema = aboutYouSchema("hcp");
    const result = schema.safeParse(baseAboutYouData({ contactEmailConfirm: "typo@example.com" }));
    expect(result.success).toBe(false);
  });

  it("rejects an invalid phone number with a specific message", () => {
    const schema = aboutYouSchema("public");
    const result = schema.safeParse(baseAboutYouData({ contactPhone: "555-1212" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.join(".") === "contactPhone");
      expect(issue?.message).toMatch(/valid phone number/i);
    }
  });

  it("accepts a foreign phone number given with a country code", () => {
    const schema = aboutYouSchema("public");
    const result = schema.safeParse(baseAboutYouData({ contactPhone: "+44 20 7946 0958" }));
    expect(result.success).toBe(true);
  });

  it("rejects a malformed mailing ZIP", () => {
    const schema = aboutYouSchema("public");
    const result = schema.safeParse(baseAboutYouData({ mailingZip: "2020" }));
    expect(result.success).toBe(false);
  });

  it("accepts a ZIP+4 mailing code", () => {
    const schema = aboutYouSchema("public");
    const result = schema.safeParse(baseAboutYouData({ mailingZip: "20201-0001" }));
    expect(result.success).toBe(true);
  });
});

describe("contactValidation — postal code gated on state", () => {
  it("requires the US ZIP pattern for a real US state", () => {
    expect(isValidPostalCodeForState("2020", "MD")).toBe(false);
    expect(isValidPostalCodeForState("20201", "MD")).toBe(true);
  });

  it("permits any postal code (or none) for 'foreign'", () => {
    expect(isValidPostalCodeForState("SW1A 1AA", "foreign")).toBe(true);
    expect(isValidPostalCodeForState("", "foreign")).toBe(true);
  });

  it("doesn't impose US validation when no state is given", () => {
    expect(isValidPostalCodeForState("not a real zip", "")).toBe(true);
  });
});

describe("patientSchema — address/contact block (section 6)", () => {
  function basePatientAddressData(overrides: Record<string, unknown> = {}) {
    return {
      patientFirstName: "Test",
      patientLastName: "Patient",
      patientDateOfBirth: "1990-01-01",
      dateOfBirthUnknown: false,
      patientSex: "female",
      ageYears: "",
      ageMonths: "",
      patientStreet: "",
      patientCity: "",
      patientState: "",
      patientCounty: "",
      patientZip: "",
      patientPhone: "",
      patientEmail: "",
      patientEmailConfirm: "",
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

  it("rejects a malformed ZIP for a real US state", () => {
    const schema = patientSchema("public");
    const result = schema.safeParse(basePatientAddressData({ patientState: "MD", patientZip: "2020" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain("patientZip");
    }
  });

  it("permits a non-US postal code when state is 'foreign'", () => {
    const schema = patientSchema("public");
    const result = schema.safeParse(
      basePatientAddressData({ patientState: "foreign", patientZip: "SW1A 1AA" })
    );
    expect(result.success).toBe(true);
  });

  it("rejects an impossible patient phone number", () => {
    const schema = patientSchema("public");
    const result = schema.safeParse(basePatientAddressData({ patientPhone: "555-1212" }));
    expect(result.success).toBe(false);
  });

  it("REGRESSION: rejects a mismatched patient email confirmation", () => {
    const schema = patientSchema("public");
    const result = schema.safeParse(
      basePatientAddressData({ patientEmail: "patient@example.com", patientEmailConfirm: "typo@example.com" })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain("patientEmailConfirm");
    }
  });

  it("doesn't require email confirmation when patient email is blank", () => {
    const schema = patientSchema("public");
    const result = schema.safeParse(basePatientAddressData({ patientEmail: "", patientEmailConfirm: "" }));
    expect(result.success).toBe(true);
  });

  it("accepts a fully-completed US address", () => {
    const schema = patientSchema("public");
    const result = schema.safeParse(
      basePatientAddressData({
        patientStreet: "123 Main St",
        patientCity: "Bethesda",
        patientState: "MD",
        patientCounty: "Montgomery",
        patientZip: "20814",
        patientPhone: "(301) 555-1212",
        patientEmail: "patient@example.com",
        patientEmailConfirm: "patient@example.com",
      })
    );
    expect(result.success).toBe(true);
  });
});

describe("vaccineSchema — facility address/contact block (section 6)", () => {
  it("rejects a malformed facility ZIP for a real US state", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({ facilityState: "MD", facilityZip: "2020" })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain("facilityZip");
    }
  });

  it("permits a non-US postal code when facility state is 'foreign'", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({ facilityState: "foreign", facilityZip: "SW1A 1AA" })
    );
    expect(result.success).toBe(true);
  });

  it("rejects an impossible facility phone/fax number", () => {
    const schema = vaccineSchema("hcp");
    expect(schema.safeParse(baseHcpVaccineData({ facilityPhone: "555-1212" })).success).toBe(false);
    expect(schema.safeParse(baseHcpVaccineData({ facilityFax: "555-1212" })).success).toBe(false);
  });

  it("accepts a fully-completed facility address", () => {
    const schema = vaccineSchema("hcp");
    const result = schema.safeParse(
      baseHcpVaccineData({
        facilityStreet: "456 Clinic Way",
        facilityCity: "Bethesda",
        facilityState: "MD",
        facilityZip: "20814-1234",
        facilityPhone: "(301) 555-1212",
        facilityFax: "(301) 555-1213",
      })
    );
    expect(result.success).toBe(true);
  });
});

describe("getBodySiteOptionsForRoute", () => {
  it("narrows to arm/thigh/other/unknown for an injection", () => {
    const values = getBodySiteOptionsForRoute("injection").map((o) => o.value);
    expect(values).toEqual([
      "right_arm",
      "left_arm",
      "arm_unknown_side",
      "right_thigh",
      "left_thigh",
      "thigh_unknown_side",
      "other",
      "unknown",
    ]);
  });

  it("narrows to mouth/other/unknown for oral", () => {
    expect(getBodySiteOptionsForRoute("oral").map((o) => o.value)).toEqual(["mouth", "other", "unknown"]);
  });

  it("narrows to nose/other/unknown for intranasal", () => {
    expect(getBodySiteOptionsForRoute("intranasal").map((o) => o.value)).toEqual(["nose", "other", "unknown"]);
  });

  it("REGRESSION: an unset/'other'/'unknown' route can't rule anything out, so it gets the full list", () => {
    const all = getBodySiteOptionsForRoute("").map((o) => o.value);
    expect(all).toContain("mouth");
    expect(all).toContain("nose");
    expect(all).toContain("right_arm");
    expect(getBodySiteOptionsForRoute("other").length).toBe(all.length);
    expect(getBodySiteOptionsForRoute("unknown").length).toBe(all.length);
  });
});

describe("patientSchema — ageMonths only applies to a plausible infant", () => {
  function basePatientData(overrides: Record<string, unknown> = {}) {
    return {
      patientFirstName: "Test",
      patientLastName: "Patient",
      patientDateOfBirth: "",
      dateOfBirthUnknown: true,
      patientSex: "female",
      ageYears: "1",
      ageMonths: "6",
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

  it("keeps ageMonths when age (years) is 2 or under", () => {
    const schema = patientSchema("public");
    const result = schema.safeParse(basePatientData({ ageYears: "2", ageMonths: "6" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as { ageMonths: string | number }).ageMonths).toBe(6);
    }
  });

  it("REGRESSION: strips a stale ageMonths server-side once age (years) is over 2", () => {
    const schema = patientSchema("public");
    const result = schema.safeParse(
      basePatientData({ ageYears: "3", ageMonths: "6" /* stale leftover from before the user corrected years */ })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as { ageMonths: string | number }).ageMonths).toBe("");
    }
  });

  it("does not apply the age>2 skip when date of birth is known (age is derived, not typed)", () => {
    const schema = patientSchema("public");
    const result = schema.safeParse(
      basePatientData({
        dateOfBirthUnknown: false,
        patientDateOfBirth: "1990-01-01",
        ageYears: "",
        ageMonths: "6",
      })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as { ageMonths: string | number }).ageMonths).toBe(6);
    }
  });

  it("REGRESSION: a future date of birth is rejected even while a later required field (patientSex) is still blank", () => {
    // This is the exact bug this test guards against: z.enum()'s own
    // validation failure used to abort zod's parse before the wrapping
    // superRefine ever ran, silently discarding the "date of birth can't be
    // in the future" issue whenever patientSex (a later question in the
    // same step) hadn't been answered yet — meaning the live per-question
    // Next-click check never caught it, only the final full-step submit did.
    const schema = patientSchema("public");
    const result = schema.safeParse(
      basePatientData({
        dateOfBirthUnknown: false,
        patientDateOfBirth: "2099-01-01",
        patientSex: "", // deliberately still unanswered, as it would be mid-step
      })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => `${i.path.join(".")}:${i.message}`);
      expect(messages).toContain("patientDateOfBirth:Date of birth cannot be in the future");
      // The later field's own "required" issue must still be reported too —
      // this isn't a case of superRefine replacing the object-level checks,
      // both must survive together.
      expect(messages).toContain("patientSex:Select the patient's sex");
    }
  });
});
