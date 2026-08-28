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
  dateOfBirthUnknown: false,
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
 * shared/src/schemas.ts for the source. Only names/DOB/sex are directly
 * required; age at vaccination (item 6) is derived from DOB + the
 * vaccination date rather than asked directly (see patientSchema) — the
 * `ageYears`/`ageMonths` questions only appear when `dateOfBirthUnknown`
 * is set, since there's nothing to derive age from otherwise.
 * Exported so the final review and the read-only follow-up lookup can show
 * the same human-readable labels instead of raw field keys — those callers
 * pass no argument, which shows the full superset for display purposes.
 */
export function patientFieldSpecs(dateOfBirthUnknown = true): ConversationalFieldSpec[] {
  const fields: ConversationalFieldSpec[] = [
    { id: "patientFirstName", label: "Patient's first name", required: true, kind: "text", icon: "person" },
    { id: "patientLastName", label: "Patient's last name", required: true, kind: "text", icon: "person" },
    {
      id: "patientDateOfBirth",
      label: "Date of birth",
      required: !dateOfBirthUnknown,
      kind: "date",
      icon: "calendar",
      hint: "We use this to work out the patient's age at vaccination automatically.",
    },
    { id: "patientSex", label: "Sex", required: true, kind: "choice", options: SEX_OPTIONS },
  ];
  if (dateOfBirthUnknown) {
    fields.push(
      {
        id: "ageYears",
        label: "How old was the patient when they got the vaccine? (years)",
        required: true,
        kind: "number",
        hint: "Whole years only. If the patient was younger than 1 year old, enter 0 — you'll be able to add months next.",
      },
      {
        id: "ageMonths",
        label: "If younger than 2 years old, how many additional months? (optional)",
        required: false,
        kind: "number",
        hint: "Only for infants and toddlers. For example, a patient who was 1 year and 6 months old: enter 1 above, and 6 here.",
      }
    );
  }
  fields.push(
    {
      id: "patientState",
      label: "Patient's state (optional)",
      required: false,
      kind: "choice",
      options: STATE_OPTIONS,
    },
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
      kind: "multiSelect",
      options: RACE_OPTIONS,
    },
    {
      id: "patientEthnicity",
      label: "Patient's ethnicity (optional)",
      required: false,
      kind: "choice",
      options: ETHNICITY_OPTIONS,
    }
  );
  return fields;
}

export function PatientStep({ submitterType, initialData, onNext, onBack }: PatientStepProps) {
  const schema = patientSchema(submitterType);
  const initial = initialData ?? EMPTY;
  const { values, setValue, errors, validate } = useStepForm(schema, initial);
  const dateOfBirthUnknown = Boolean(values.dateOfBirthUnknown);
  const fields = patientFieldSpecs(dateOfBirthUnknown);

  function handleSetValue(id: string, value: unknown) {
    setValue(id as keyof PatientData, value as any);
  }

  return (
    <ConversationalStep
      stepTitle="About the patient"
      fields={fields}
      values={values as unknown as Record<string, unknown>}
      setValue={handleSetValue}
      errors={errors}
      validate={validate}
      onNext={onNext}
      onBack={onBack}
      initialIndex={schema.safeParse(initial).success ? fields.length : 0}
      extras={{
        patientDateOfBirth: () => (
          <label className="field__inline-toggle">
            <input
              type="checkbox"
              checked={dateOfBirthUnknown}
              onChange={(e) => handleSetValue("dateOfBirthUnknown", e.target.checked)}
            />
            I don't know the exact date of birth
          </label>
        ),
      }}
    />
  );
}
