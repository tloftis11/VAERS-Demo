import {
  patientSchema,
  SEX_OPTIONS,
  STATE_OPTIONS,
  YES_NO_UNKNOWN_OPTIONS,
  RACE_OPTIONS,
  ETHNICITY_OPTIONS,
} from "../../../../shared/src/schemas";
import type { SubmitterType } from "../../../../shared/src/branchingRules";
import type { PatientData } from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { ConversationalStep, type ConversationalFieldSpec } from "../../components/ConversationalStep";

interface PatientStepProps {
  submitterType: SubmitterType;
  initialData: PatientData | null;
  onNext: (data: Record<string, unknown>) => Promise<void>;
  onBack: () => void;
}

const EMPTY: PatientData = {
  patientFirstName: "",
  patientLastName: "",
  patientDateOfBirth: "",
  patientSex: "",
  ageYears: "",
  ageMonths: "",
  patientState: "",
  pregnant: "",
  medicationsAtVaccination: "",
  allergies: "",
  recentIllnesses: "",
  chronicConditions: "",
  patientRace: [],
  patientEthnicity: "",
};

/**
 * Field set and order follow the official VAERS 2.0 form's "INFORMATION
 * ABOUT THE PATIENT" section (items 1, 2, 3, 6, 8-12, 24-25) — see
 * shared/src/schemas.ts for the source. Only names/DOB/sex/age are
 * required; everything else is genuinely optional on the real form too.
 * Exported so the final review and the read-only follow-up lookup can show
 * the same human-readable labels instead of raw field keys.
 */
export const PATIENT_FIELD_SPECS: ConversationalFieldSpec[] = [
  { id: "patientFirstName", label: "Patient's first name", required: true, kind: "text", icon: "person" },
  { id: "patientLastName", label: "Patient's last name", required: true, kind: "text", icon: "person" },
  { id: "patientDateOfBirth", label: "Date of birth", required: true, kind: "date", icon: "calendar" },
  { id: "patientSex", label: "Sex", required: true, kind: "choice", options: SEX_OPTIONS },
  {
    id: "ageYears",
    label: "Age at vaccination — years",
    required: true,
    kind: "number",
    hint: "If younger than 1 year, enter 0 and give months below.",
  },
  {
    id: "ageMonths",
    label: "Age at vaccination — additional months (optional)",
    required: false,
    kind: "number",
    hint: "For infants and toddlers under 2, e.g. 1 year and 6 months.",
  },
  { id: "patientState", label: "Patient's state (optional)", required: false, kind: "choice", options: STATE_OPTIONS },
  {
    id: "pregnant",
    label: "Was the patient pregnant at the time of vaccination? (optional)",
    required: false,
    kind: "choice",
    options: YES_NO_UNKNOWN_OPTIONS,
    hint: "If yes, you'll be able to describe the pregnancy and any complications in the next step.",
  },
  {
    id: "medicationsAtVaccination",
    label: "Prescriptions, OTC medications, or supplements at the time of vaccination (optional)",
    required: false,
    kind: "textarea",
    rows: 3,
  },
  {
    id: "allergies",
    label: "Allergies to medications, food, or other products (optional)",
    required: false,
    kind: "textarea",
    rows: 3,
  },
  {
    id: "recentIllnesses",
    label: "Other illnesses at the time of vaccination or in the month before (optional)",
    required: false,
    kind: "textarea",
    rows: 3,
  },
  {
    id: "chronicConditions",
    label: "Chronic or long-standing health conditions (optional)",
    required: false,
    kind: "textarea",
    rows: 3,
    hint: "e.g. asthma, diabetes, heart disease.",
  },
  {
    id: "patientRace",
    label: "Patient's race (optional, select all that apply)",
    required: false,
    kind: "checkboxGroup",
    options: RACE_OPTIONS,
  },
  {
    id: "patientEthnicity",
    label: "Patient's ethnicity (optional)",
    required: false,
    kind: "choice",
    options: ETHNICITY_OPTIONS,
  },
];

export function PatientStep({ submitterType, initialData, onNext, onBack }: PatientStepProps) {
  const schema = patientSchema(submitterType);
  const initial = initialData ?? EMPTY;
  const { values, setValue, errors, validate } = useStepForm(schema, initial);
  const fields = PATIENT_FIELD_SPECS;

  return (
    <ConversationalStep
      stepTitle="About the patient"
      fields={fields}
      values={values as unknown as Record<string, unknown>}
      setValue={(id, value) => setValue(id as keyof PatientData, value as any)}
      errors={errors}
      validate={validate}
      onNext={onNext}
      onBack={onBack}
      initialIndex={schema.safeParse(initial).success ? fields.length : 0}
    />
  );
}
