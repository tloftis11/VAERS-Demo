/**
 * Per-step validation schemas (design doc §5.3: "a single source of truth
 * avoids client/server drift").
 *
 * Field sets and option lists are aligned to the official FDA VAERS 2.0
 * paper/PDF form (www.fda.gov/files/about%20fda/published/vaers_form.pdf)
 * and the live vaers.hhs.gov eSubmitter, not invented — e.g. the form has no
 * weight field at all (it asks age in years/months, item 6), route options
 * are the form's simplified public-facing categories rather than clinical
 * IM/SC/ID terminology, and "outcomes" (item 21) is a distinct question from
 * "has the patient recovered?" (item 20). Items 2, 3, 4, 5, 6, 17, 18, and
 * 21 are the form's own "essential" fields; everything else is genuinely
 * optional on the real form too, which is why so few fields below are
 * `requiredString`. The real form also has no healthcare-provider sub-role
 * breakdown (physician/nurse/etc.) and no medical-record-number field, so
 * HCPs are distinguished only via submitterType, not an extra question.
 *
 * Branching (administrationError / adverseEventOccurred as independent
 * questions, PROV-002/003) and the cross-field chronology checks in
 * validationRules.ts are shared with the team's main branch as-is.
 *
 * Deliberately simplified vs. the real form (disclosed, not accidental):
 * - Item 22 (other vaccines received in the prior month) is a repeatable
 *   table on the paper form; here it's a single free-text field rather than
 *   a full add/remove-row UI.
 * - Items 27-28 (U.S. military/DoD-specific fields) are out of scope — a
 *   narrow branch not called out in the PWS.
 */
import { z } from "zod";
import type { StepId, SubmitterType } from "./branchingRules";

const requiredString = (msg = "This field is required") => z.string().trim().min(1, msg);
const optionalString = () =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => v ?? "");

/** Optional single-select: accepts one of `values`, or "" for not-answered. */
function optionalEnum<T extends string>(values: readonly T[]) {
  return z
    .union([z.enum(values as [T, ...T[]]), z.literal("")])
    .optional()
    .transform((v) => v ?? "");
}

const isValidDate = (v: string) => !Number.isNaN(Date.parse(v));
const notInFuture = (v: string) => new Date(v).getTime() <= Date.now();

const dateSchema = (msg = "Enter a valid date") => z.string().refine(isValidDate, msg);
const optionalDate = (msg = "Enter a valid date") =>
  z
    .union([z.string().refine(isValidDate, msg), z.literal("")])
    .optional()
    .transform((v) => v ?? "");
// The empty-string branch must be checked FIRST: z.coerce.number() happily
// coerces "" to 0, which would otherwise pass a .nonnegative()/.min(0) check
// and silently turn "skipped" into "zero".
const optionalBoundedInt = (max: number, msg = `Enter a number from 0 to ${max}`) =>
  z
    .union([z.literal(""), z.coerce.number().int().min(0, msg).max(max, msg)])
    .optional()
    .transform((v) => v ?? "");

/** z.enum()'s default message ("Invalid enum value...") leaks the raw value list to end users; this swaps in a plain-language one for select fields. */
function selectEnum<T extends string>(values: readonly T[], message: string) {
  return z.enum(values as [T, ...T[]], { errorMap: () => ({ message }) });
}

export const RELATIONSHIP_OPTIONS_PUBLIC = [
  { value: "self", label: "Myself (the patient)" },
  { value: "parent_guardian_caregiver", label: "Parent, guardian, or caregiver" },
  { value: "other", label: "Other" },
] as const;

export const SEX_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "unknown", label: "Unknown" },
] as const;

/** PUB-002: state of residence, abbreviated per the team's current convention. */
const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

export const STATE_OPTIONS = Object.keys(STATE_NAMES).map((code) => ({
  value: code,
  label: STATE_NAMES[code],
}));

export const YES_NO_UNKNOWN_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unknown", label: "Unknown" },
] as const;

export const RACE_OPTIONS = [
  { value: "american_indian_alaska_native", label: "American Indian or Alaska Native" },
  { value: "asian", label: "Asian" },
  { value: "black_african_american", label: "Black or African American" },
  { value: "native_hawaiian_pacific_islander", label: "Native Hawaiian or Other Pacific Islander" },
  { value: "white", label: "White" },
  { value: "other", label: "Other" },
  { value: "unknown", label: "Unknown" },
] as const;

export const ETHNICITY_OPTIONS = [
  { value: "hispanic_latino", label: "Hispanic or Latino" },
  { value: "not_hispanic_latino", label: "Not Hispanic or Latino" },
  { value: "unknown", label: "Unknown" },
] as const;

/**
 * Public/self-report path: a public reporter usually doesn't know (and
 * shouldn't be forced to guess) the exact product given — plain-language
 * categories instead of clinical brand names. See VACCINE_TYPES_HCP for the
 * healthcare-professional path, which gets the real system's full brand-
 * level list since that reporter plausibly has it on hand.
 */
export const VACCINE_TYPES = [
  { value: "covid19", label: "COVID-19" },
  { value: "influenza", label: "Influenza (flu)" },
  { value: "mmr", label: "MMR (measles, mumps, rubella)" },
  { value: "tdap", label: "Tdap / Tetanus" },
  { value: "hpv", label: "HPV" },
  { value: "shingles", label: "Shingles" },
  { value: "other", label: "Other / not listed" },
  { value: "unknown", label: "Not sure" },
] as const;

/**
 * Healthcare-professional path: the real VAERS eSubmitter system's actual
 * vaccine+brand dropdown (item 17), captured verbatim from its live HTML.
 * Values are the display label itself (matching the real system's own
 * convention) since nothing downstream branches on a specific vaccine value
 * except "other" (reveals the free-text field below — see VaccineStep.tsx).
 */
export const VACCINE_TYPES_HCP = [
  "Adenovirus (Types 4 & 7, No Brand Name)",
  "Anthrax (BioThrax)",
  "Anthrax (Cyfendus)",
  "Chikungunya (Vimkunya)",
  "Chikungunya Live (Ixchiq)",
  "Cholera (Vaxchora)",
  "COVID19 (Moderna Mnexspike)",
  "COVID19 (Moderna Spikevax)",
  "COVID19 (Novavax Nuvaxovid)",
  "COVID19 (Pfizer-BioNTech Comirnaty)",
  "Dengue Tetravalent (Dengvaxia)",
  "DT Adsorbed (No Brand Name)",
  "DTaP (Daptacel)",
  "DTaP (Infanrix)",
  "DTaP + Hep B + IPV (Pediarix)",
  "DTaP + IPV (Kinrix)",
  "DTaP + IPV (Quadracel)",
  "DTaP + IPV + Hib (Pentacel)",
  "DTaP + IPV + Hib + HepB (Vaxelis)",
  "Ebola Zaire (Ervebo)",
  "Hep A (Havrix)",
  "Hep A (Vaqta)",
  "Hep A + Hep B (Twinrix)",
  "Hep B (Engerix-B)",
  "Hep B (HEPLISAV-B)",
  "Hep B (PreHevbrio)",
  "Hep B (Recombivax HB)",
  "Hib Conjugate (ActHIB)",
  "Hib Conjugate (Hiberix)",
  "Hib Conjugate (PedvaxHIB)",
  "HPV (Gardasil 9)",
  "Inactivated Polio Virus (IPOL)",
  "Influenza (Seasonal) (Afluria)",
  "Influenza (Seasonal) (Fluad)",
  "Influenza (Seasonal) (Fluarix)",
  "Influenza (Seasonal) (Flublok)",
  "Influenza (Seasonal) (Flucelvax)",
  "Influenza (Seasonal) (FluLaval)",
  "Influenza (Seasonal) (FluMist)",
  "Influenza (Seasonal) (Fluzone High-Dose)",
  "Influenza (Seasonal) (Fluzone)",
  "Japanese Encephalitis (Ixiaro)",
  "Measles + Mumps + Rubella (MMR II)",
  "Measles + Mumps + Rubella (Priorix)",
  "Measles + Mumps + Rubella + Varicella (ProQuad)",
  "Meningococcal B (Bexsero)",
  "Meningococcal B (Trumenba)",
  "Meningococcal Conjugate (Menactra)",
  "Meningococcal Conjugate (MenQuadfi)",
  "Meningococcal Conjugate (Menveo)",
  "Meningococcal Conjugate (Penbraya)",
  "Meningococcal Conjugate (Penmenvy)",
  "Pneumo Conjugate (CAPVAXIVE)",
  "Pneumo Conjugate (Prevnar 13)",
  "Pneumo Conjugate (Prevnar 20)",
  "Pneumo Conjugate (Vaxneuvance)",
  "Pneumo Polysaccharide (Pneumovax 23)",
  "Rabies (Imovax)",
  "Rabies (RabAvert)",
  "Rotavirus (Rotarix)",
  "Rotavirus (RotaTeq)",
  "RSV (Abrysvo)",
  "RSV (Arexvy)",
  "RSV (mRESVIA)",
  "Smallpox (ACAM2000)",
  "Smallpox + Monkeypox (Jynneos)",
  "Td Adsorbed (No Brand Name)",
  "Td Adsorbed (TDVAX)",
  "Td Adsorbed (Tenivac)",
  "Tdap (Adacel)",
  "Tdap (Boostrix)",
  "Tick-Borne Enceph (Ticovac)",
  "Typhoid Live Oral Ty21a (Vivotif)",
  "Typhoid Vi (Typhim Vi)",
  "Varicella (Varivax)",
  "Yellow Fever (Stamaril)",
  "Yellow Fever (YF-Vax)",
  "Zoster (Shingrix)",
]
  .map((label) => ({ value: label, label }))
  .concat([
    { value: "foreign", label: "Foreign Vaccine (not U.S.-licensed)" },
    { value: "other", label: "Other Vaccine (not listed)" },
    { value: "unknown", label: "Unknown Vaccine" },
  ]);

/** Matches the real VAERS eSubmitter system's own dose-number dropdown exactly
 * (1-6, then "7+", then Unknown/N-A) — no separate "Booster" value there; a
 * booster is just whichever dose number it is in the series. */
export const DOSE_NUMBER_OPTIONS = [
  { value: "1", label: "1st dose" },
  { value: "2", label: "2nd dose" },
  { value: "3", label: "3rd dose" },
  { value: "4", label: "4th dose" },
  { value: "5", label: "5th dose" },
  { value: "6", label: "6th dose" },
  { value: "7+", label: "7th dose or later" },
  { value: "unknown", label: "Unknown" },
  { value: "n/a", label: "Not applicable" },
] as const;

/** Matches the real form's own grouping — it does not ask laypeople to distinguish IM/SC/ID. */
export const ROUTE_OPTIONS = [
  { value: "injection", label: "Injection or shot" },
  { value: "oral", label: "By mouth (oral)" },
  { value: "intranasal", label: "In the nose (intranasal)" },
  { value: "other", label: "Other" },
  { value: "unknown", label: "Unknown" },
] as const;

export const BODY_SITE_OPTIONS = [
  { value: "right_arm", label: "Right arm" },
  { value: "left_arm", label: "Left arm" },
  { value: "arm_unknown_side", label: "Arm (side unknown)" },
  { value: "right_thigh", label: "Right thigh" },
  { value: "left_thigh", label: "Left thigh" },
  { value: "thigh_unknown_side", label: "Thigh (side unknown)" },
  { value: "nose", label: "Nose" },
  { value: "mouth", label: "Mouth" },
  { value: "other", label: "Other" },
  { value: "unknown", label: "Unknown" },
] as const;

export const FACILITY_TYPE_OPTIONS = [
  { value: "doctors_office_urgent_care_hospital", label: "Doctor's office, urgent care, or hospital" },
  { value: "pharmacy_or_store", label: "Pharmacy or store" },
  { value: "workplace_clinic", label: "Workplace clinic" },
  { value: "public_health_clinic", label: "Public health clinic" },
  { value: "nursing_home_senior_living", label: "Nursing home or senior living facility" },
  { value: "school_student_health_clinic", label: "School or student health clinic" },
  { value: "home", label: "Home" },
  { value: "other", label: "Other" },
  { value: "unknown", label: "Unknown" },
] as const;

/** Item 21 — a distinct question from "has the patient recovered?" (item 20, see RECOVERY_OPTIONS). */
export const OUTCOME_OPTIONS = [
  { value: "doctor_visit", label: "Doctor or other healthcare professional office/clinic visit" },
  { value: "er_visit", label: "Emergency room/department or urgent care" },
  { value: "hospitalization", label: "Hospitalization" },
  { value: "hospitalization_prolonged", label: "Prolongation of an existing hospitalization" },
  { value: "life_threatening", label: "Life-threatening illness" },
  { value: "disability", label: "Disability or permanent damage" },
  { value: "death", label: "Patient died" },
  { value: "birth_defect", label: "Congenital anomaly or birth defect" },
  { value: "none", label: "None of the above" },
] as const;

/** Matches the real form's item 20 exactly — just Yes/No/Unknown; "none of
 * the above" belongs to outcomes (item 21, see OUTCOME_OPTIONS), not here. */
export const RECOVERY_OPTIONS = [
  { value: "yes", label: "Yes, fully recovered" },
  { value: "no", label: "No, not yet recovered" },
  { value: "unknown", label: "Unknown" },
] as const;

/** PUB-003: quick-select symptom chips, complementing (not replacing) the free-text description. */
export const SYMPTOM_OPTIONS = [
  { value: "fever", label: "Fever" },
  { value: "rash", label: "Rash" },
  { value: "injection_site_swelling", label: "Swelling at injection site" },
  { value: "fatigue", label: "Fatigue" },
  { value: "headache", label: "Headache" },
  { value: "nausea_vomiting", label: "Nausea or vomiting" },
  { value: "dizziness", label: "Dizziness" },
  { value: "allergic_reaction", label: "Allergic reaction" },
  { value: "difficulty_breathing", label: "Difficulty breathing" },
  { value: "other", label: "Other" },
] as const;

export const ERROR_TYPES = [
  { value: "wrong_vaccine", label: "Wrong vaccine administered" },
  { value: "wrong_dose", label: "Wrong dose (amount)" },
  { value: "wrong_route", label: "Wrong route of administration" },
  { value: "wrong_age_indication", label: "Given outside age indication" },
  { value: "expired_vaccine", label: "Expired vaccine administered" },
  { value: "storage_handling_error", label: "Storage/handling error (e.g., cold chain)" },
  { value: "other", label: "Other error" },
] as const;

export const submitterTypeSchema = z.object({
  submitterType: z.enum(["public", "hcp"]),
});

export const administrationErrorSchema = z.object({
  administrationError: z.boolean(),
});

export const adverseEventOccurredSchema = z.object({
  adverseEventOccurred: z.boolean(),
});

/** Item 13 — the real form has no healthcare-provider sub-role breakdown, so HCPs skip this question entirely. */
export function aboutYouSchema(submitterType: SubmitterType) {
  const base = z.object({
    contactName: requiredString("Please enter your name"),
    contactEmail: z.string().trim().email("Enter a valid email address"),
    contactPhone: optionalString(),
    relationship: optionalString(),
    mailingStreet: optionalString(),
    mailingCity: optionalString(),
    mailingState: optionalEnum(STATE_OPTIONS.map((o) => o.value)),
    mailingZip: optionalString(),
    bestContactInfo: optionalString(),
  });
  if (submitterType === "hcp") return base;
  return base.extend({
    relationship: selectEnum(
      ["self", "parent_guardian_caregiver", "other"],
      "Select your relationship to the patient"
    ),
  });
}

/**
 * Items 1 (patient demographics), 2 (DOB), 3 (sex), 6 (age), 8 (pregnancy),
 * 9-12 (history), 24-25 (race/ethnicity).
 *
 * Age at vaccination (item 6) is derived from date of birth + the
 * vaccination date rather than typed in directly — a manually-entered age
 * can silently disagree with the DOB a couple of questions earlier, and
 * there's no reason to ask for both when one determines the other. Age is
 * only ever asked directly when `dateOfBirthUnknown` is set, since there's
 * nothing to derive it from in that case. The base object below leaves
 * patientDateOfBirth/ageYears/ageMonths structurally optional; superRefine
 * enforces the actual either/or requirement.
 */
const patientBase = z.object({
  patientFirstName: requiredString("Patient's first name is required"),
  patientLastName: requiredString("Patient's last name is required"),
  patientDateOfBirth: optionalDate("Enter the patient's date of birth"),
  dateOfBirthUnknown: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === "true"),
  patientSex: selectEnum(["female", "male", "unknown"], "Select the patient's sex"),
  ageYears: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(120, "Enter a valid age")])
    .optional()
    .transform((v) => v ?? ""),
  ageMonths: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(11)])
    .optional()
    .transform((v) => v ?? ""),
  patientState: optionalString(),
  pregnant: optionalEnum(["yes", "no", "unknown"]),
  medicationsAtVaccination: optionalString(),
  allergies: optionalString(),
  recentIllnesses: optionalString(),
  chronicConditions: optionalString(),
  patientRace: z.array(z.string()).optional().default([]),
  patientEthnicity: optionalEnum(ETHNICITY_OPTIONS.map((o) => o.value)),
});

export function patientSchema(_submitterType: SubmitterType) {
  return patientBase.superRefine((data, ctx) => {
    if (!data.dateOfBirthUnknown) {
      if (!data.patientDateOfBirth) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["patientDateOfBirth"],
          message: "Enter the patient's date of birth, or mark it as unknown",
        });
      } else if (!isValidDate(data.patientDateOfBirth)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["patientDateOfBirth"], message: "Enter a valid date" });
      } else if (!notInFuture(data.patientDateOfBirth)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["patientDateOfBirth"],
          message: "Date of birth cannot be in the future",
        });
      }
      // ageYears/ageMonths are computed server-side once the vaccination
      // date is known (see reports.ts) — nothing to validate here.
    } else if (data.ageYears === "" || data.ageYears === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ageYears"], message: "Enter age in years" });
    }
  });
}

/** Items 4 (vaccination date/time), 15-16 (facility), 17 (vaccine given), 22 (other recent vaccines). */
export function vaccineSchema(submitterType: SubmitterType) {
  const base = z.object({
    vaccineType: requiredString("Select the vaccine given"),
    vaccineTypeOther: optionalString(),
    doseNumber: optionalEnum(DOSE_NUMBER_OPTIONS.map((o) => o.value)),
    administrationDate: dateSchema("Enter the vaccination date").refine(
      notInFuture,
      "Vaccination date cannot be in the future"
    ),
    administrationTime: optionalString(),
    manufacturer: optionalString(),
    lotNumber: optionalString(),
    route: optionalEnum(ROUTE_OPTIONS.map((o) => o.value)),
    bodySite: optionalEnum(BODY_SITE_OPTIONS.map((o) => o.value)),
    administeringFacility: optionalString(),
    facilityType: optionalEnum(FACILITY_TYPE_OPTIONS.map((o) => o.value)),
    otherVaccinesRecent: optionalString(),
    // Public path only: a lightweight substitute for the HCP path's full
    // second-vaccine slot below — most public reporters won't have a second
    // vaccine's manufacturer/lot/route on hand, so this stays one free-text
    // question instead of a repeated structured block.
    otherVaccinesSameVisit: optionalString(),
    // HCP path only: one additional vaccine slot for the same visit (the
    // real system supports up to 10 rows here; scoped down for the
    // prototype — see VaccineAdministration.vaccine2* in schema.prisma).
    vaccine2Given: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((v) => v === true || v === "true"),
    vaccine2Type: optionalString(),
    vaccine2Manufacturer: optionalString(),
    vaccine2LotNumber: optionalString(),
    vaccine2Route: optionalEnum(ROUTE_OPTIONS.map((o) => o.value)),
    vaccine2BodySite: optionalEnum(BODY_SITE_OPTIONS.map((o) => o.value)),
    vaccine2DoseNumber: optionalEnum(DOSE_NUMBER_OPTIONS.map((o) => o.value)),
  });
  if (submitterType === "hcp") {
    // Not on the real form as a hard requirement, but a reasonable expectation
    // when the clinic itself is filing — kept as our own addition, not essential.
    return base
      .extend({
        manufacturer: requiredString("Manufacturer is required"),
        lotNumber: requiredString("Lot number is required"),
      })
      .superRefine((data, ctx) => {
        if (data.vaccine2Given && !data.vaccine2Type) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["vaccine2Type"],
            message: "Select the second vaccine given, or go back and answer \"no\" above",
          });
        }
      });
  }
  return base;
}

/** Items 5 (onset), 18 (essential description), 19 (labs), 20 (recovery), 21 (essential outcomes), 23 (prior AE history). */
export function adverseEventSchema(_submitterType: SubmitterType) {
  const base = z.object({
    onsetDate: dateSchema("Enter when symptoms started").refine(
      notInFuture,
      "Onset date cannot be in the future"
    ),
    onsetTime: optionalString(),
    description: requiredString("Please describe what happened").min(
      10,
      "Please provide a bit more detail (at least 10 characters)"
    ),
    // PUB-003: quick-select chips alongside (not instead of) the free-text description.
    symptoms: z.array(z.string()).optional().default([]),
    symptomsOther: optionalString(),
    labResults: optionalString(),
    recoveryStatus: optionalEnum(RECOVERY_OPTIONS.map((o) => o.value)),
    // Item 21 is nominally "essential," but most real reports have none of these
    // severe outcomes — matching the real form's usage, this is not a forced minimum.
    outcomes: z
      .array(z.enum(OUTCOME_OPTIONS.map((o) => o.value) as [string, ...string[]]))
      .optional()
      .default([]),
    // Capped at a year — a hospitalization stay longer than that is almost
    // certainly a data-entry mistake, not a real value worth accepting.
    hospitalizationDays: optionalBoundedInt(365),
    hospitalName: optionalString(),
    hospitalCity: optionalString(),
    hospitalState: optionalString(),
    dateOfDeath: optionalDate("Enter a valid date of death"),
    treatmentGiven: optionalString(),
    clinicalCourseNotes: optionalString(),
    previousAdverseEvent: optionalEnum(["yes", "no", "unknown"]),
    previousAdverseEventDetails: optionalString(),
  });
  return base.superRefine((data, ctx) => {
    const hospitalized = data.outcomes.includes("hospitalization") || data.outcomes.includes("hospitalization_prolonged");
    if (hospitalized && data.hospitalizationDays === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hospitalizationDays"],
        message: "Enter the number of days hospitalized (if still hospitalized, enter the days so far)",
      });
    }
    if (data.dateOfDeath && !notInFuture(data.dateOfDeath)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateOfDeath"],
        message: "Date of death cannot be in the future",
      });
    }
  });
}

export const errorDetailSchema = z.object({
  errorType: selectEnum(ERROR_TYPES.map((o) => o.value), "Select the type of error"),
  errorDescription: requiredString("Please describe the error").min(
    10,
    "Please provide a bit more detail (at least 10 characters)"
  ),
  errorDiscoveredDate: dateSchema("Enter when the error was discovered").refine(
    notInFuture,
    "Date cannot be in the future"
  ),
  correctiveActionTaken: optionalString(),
});

export const documentsSchema = z.object({
  supplementalNotes: optionalString(),
});

/** Returns the zod schema that validates a single step's field slice, given current branching state. */
export function getSchemaForStep(step: StepId, submitterType: SubmitterType) {
  switch (step) {
    case "submitter-type":
      return submitterTypeSchema;
    case "administration-error":
      return administrationErrorSchema;
    case "adverse-event-occurred":
      return adverseEventOccurredSchema;
    case "about-you":
      return aboutYouSchema(submitterType);
    case "patient":
      return patientSchema(submitterType);
    case "vaccine":
      return vaccineSchema(submitterType);
    case "adverse-event":
      return adverseEventSchema(submitterType);
    case "error-detail":
      return errorDetailSchema;
    case "documents":
      return documentsSchema;
    case "review":
      return z.object({});
    default:
      return z.object({});
  }
}
