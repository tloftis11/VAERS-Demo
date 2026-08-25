/**
 * Per-step validation schemas (design doc §5.3: "a single source of truth
 * avoids client/server drift"). Field sets are an illustrative stand-in for
 * the real VAERS data-element dictionary (doc Appendix B is a placeholder
 * pending CDC kickoff) but the required/optional shape mirrors the doc's
 * "simplified subset" (public) vs. "full subset" (HCP) distinction.
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

const isValidDate = (v: string) => !Number.isNaN(Date.parse(v));
const notInFuture = (v: string) => new Date(v).getTime() <= Date.now();

const dateSchema = (msg = "Enter a valid date") => z.string().refine(isValidDate, msg);

/** z.enum()'s default message ("Invalid enum value...") leaks the raw value list to end users; this swaps in a plain-language one for select fields. */
function selectEnum<T extends string>(values: readonly T[], message: string) {
  return z.enum(values as [T, ...T[]], { errorMap: () => ({ message }) });
}

export const RELATIONSHIP_OPTIONS_PUBLIC = [
  { value: "self", label: "Myself" },
  { value: "parent_guardian", label: "My child (parent/guardian)" },
  { value: "other_caregiver", label: "Someone I care for" },
  { value: "other", label: "Other" },
] as const;

export const RELATIONSHIP_OPTIONS_HCP = [
  { value: "physician", label: "Physician" },
  { value: "nurse", label: "Nurse" },
  { value: "pharmacist", label: "Pharmacist" },
  { value: "other_clinician", label: "Other clinician" },
] as const;

export const SEX_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "unknown", label: "Unknown" },
] as const;

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

export const ROUTE_OPTIONS = [
  { value: "intramuscular", label: "Intramuscular (IM)" },
  { value: "subcutaneous", label: "Subcutaneous (SC)" },
  { value: "oral", label: "Oral" },
  { value: "intranasal", label: "Intranasal" },
  { value: "other", label: "Other" },
] as const;

export const OUTCOME_OPTIONS = [
  { value: "recovered", label: "Recovered / resolved" },
  { value: "recovering", label: "Still recovering" },
  { value: "not_recovered", label: "Not recovered" },
  { value: "hospitalized", label: "Required hospitalization" },
  { value: "life_threatening", label: "Life-threatening" },
  { value: "death", label: "Death" },
  { value: "unknown", label: "Unknown" },
] as const;

/** PUB-002: plain-language, CDC-approved framing for the patient's state of residence. */
export const STATE_OPTIONS = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM",
  "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA",
  "WV", "WI", "WY",
].map((code) => ({ value: code, label: code }));

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

export function aboutYouSchema(submitterType: SubmitterType) {
  return z.object({
    contactName: requiredString("Please enter your name"),
    contactEmail: z.string().trim().email("Enter a valid email address"),
    contactPhone: optionalString(),
    relationship:
      submitterType === "hcp"
        ? selectEnum(["physician", "nurse", "pharmacist", "other_clinician"], "Select your role")
        : selectEnum(
            ["self", "parent_guardian", "other_caregiver", "other"],
            "Select your relationship to the patient"
          ),
  });
}

export function patientSchema(submitterType: SubmitterType) {
  const base = z.object({
    patientFirstName: requiredString("Patient's first name is required"),
    patientLastName: requiredString("Patient's last name is required"),
    patientDateOfBirth: dateSchema("Enter the patient's date of birth").refine(
      notInFuture,
      "Date of birth cannot be in the future"
    ),
    patientSex: selectEnum(["female", "male", "unknown"], "Select the patient's sex"),
    patientState: optionalString(),
    patientWeightLbs: z
      .union([z.coerce.number().positive(), z.literal("")])
      .optional(),
  });

  if (submitterType === "hcp") {
    return base.extend({
      medicalRecordNumber: requiredString("Medical record number is required"),
    });
  }
  return base.extend({
    medicalRecordNumber: optionalString(),
  });
}

export function vaccineSchema(submitterType: SubmitterType) {
  const base = z.object({
    vaccineType: requiredString("Select the vaccine given"),
    doseNumber: optionalString(),
    administrationDate: dateSchema("Enter the vaccination date").refine(
      notInFuture,
      "Vaccination date cannot be in the future"
    ),
    manufacturer: optionalString(),
    lotNumber: optionalString(),
    route: optionalString(),
    bodySite: optionalString(),
    administeringFacility: optionalString(),
  });

  if (submitterType === "hcp") {
    return base.extend({
      manufacturer: requiredString("Manufacturer is required"),
      lotNumber: requiredString("Lot number is required"),
      route: selectEnum(
        ["intramuscular", "subcutaneous", "oral", "intranasal", "other"],
        "Select the route of administration"
      ),
      bodySite: requiredString("Administration site is required"),
      administeringFacility: requiredString("Administering facility is required"),
    });
  }
  return base;
}

export function adverseEventSchema(submitterType: SubmitterType) {
  const base = z.object({
    onsetDate: dateSchema("Enter when symptoms started").refine(
      notInFuture,
      "Onset date cannot be in the future"
    ),
    description: requiredString("Please describe what happened").min(
      10,
      "Please provide a bit more detail (at least 10 characters)"
    ),
    symptoms: z.array(z.string()).optional().default([]),
    outcomes: z.array(z.enum(OUTCOME_OPTIONS.map((o) => o.value) as [string, ...string[]])).min(
      1,
      "Select at least one outcome"
    ),
    hospitalizationDates: optionalString(),
    treatmentGiven: optionalString(),
    clinicalCourseNotes: optionalString(),
  });

  if (submitterType === "hcp") {
    return base.extend({
      clinicalCourseNotes: requiredString("Clinical course notes are required"),
    });
  }
  return base;
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
