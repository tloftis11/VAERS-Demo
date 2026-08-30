import {
  patientSchema,
  SEX_OPTIONS,
  STATE_OPTIONS,
  YES_NO_UNKNOWN_OPTIONS,
  RACE_OPTIONS,
  ETHNICITY_OPTIONS,
} from "../../../../shared/src/schemas";
import { ageInYears, todayIsoDate } from "../../../../shared/src/liveChecks";
import type { SubmitterType } from "../../../../shared/src/branchingRules";
import type { PatientData } from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { ConversationalStep, type ConversationalFieldSpec } from "../../components/ConversationalStep";

interface PatientStepProps {
  submitterType: SubmitterType;
  /** True only for a "public" submitter who told us (in About You) that
   * they're reporting for themselves — the only case where the person
   * filling this out and the patient are guaranteed to be the same person. */
  isSelfReport: boolean;
  initialData: PatientData | null;
  onNext: (data: Record<string, unknown>) => Promise<void>;
  onBack: () => void;
  /** Jumps back to the very first step so a self-reporting adult who's actually
   * filling this out for someone else (see the young-self-report notice below)
   * can restart as the right submitter type, instead of just going back one step. */
  onSwitchSubmitterType: () => void;
}

/** Below this age, someone filling out their *own* VAERS report is
 * implausible enough to be worth a gentle "are you sure?" flag — not a
 * hard block, since edge cases exist and we never want to prevent a real
 * report from being filed. */
const SELF_REPORT_MIN_PLAUSIBLE_AGE = 10;

/** A biologically-implausible age for pregnancy (e.g. an infant) skips the
 * question outright rather than just marking it optional — asking it at
 * all reads as a mistake, not a real question. Deliberately conservative
 * (well below the youngest plausible age) so this only ever fires for
 * clear-cut cases, never a real early-adolescent report. */
const PREGNANCY_MIN_PLAUSIBLE_AGE = 9;

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
      max: todayIsoDate(),
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
      kind: "checkboxGroup",
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

export function PatientStep({
  submitterType,
  isSelfReport,
  initialData,
  onNext,
  onBack,
  onSwitchSubmitterType,
}: PatientStepProps) {
  const schema = patientSchema(submitterType);
  const initial = initialData ?? EMPTY;
  const { values, setValue, errors, validate } = useStepForm(schema, initial);
  // Reporting for yourself means you inherently know your own exact
  // birthdate — the "I don't know" escape hatch only makes sense for a
  // caregiver or HCP reporting on someone else's behalf.
  const dateOfBirthUnknown = !isSelfReport && Boolean(values.dateOfBirthUnknown);

  // Best age estimate available at this point in the flow: age *at
  // vaccination* when it was entered directly (DOB unknown), otherwise age
  // *today* from DOB — the actual vaccination date isn't known until the
  // next step, so DOB-derived age is an approximation, but it's already
  // close enough to catch the clear-cut cases these checks care about.
  const bestAgeEstimate = dateOfBirthUnknown
    ? (() => {
        const n = Number(values.ageYears);
        return values.ageYears !== "" && Number.isFinite(n) ? n : null;
      })()
    : values.patientDateOfBirth
      ? ageInYears(values.patientDateOfBirth)
      : null;

  const selfReportAgeFlag =
    isSelfReport && bestAgeEstimate !== null && bestAgeEstimate < SELF_REPORT_MIN_PLAUSIBLE_AGE;

  const pregnancySkipReason =
    values.patientSex === "male"
      ? "the patient is recorded as male"
      : bestAgeEstimate !== null && bestAgeEstimate < PREGNANCY_MIN_PLAUSIBLE_AGE
        ? "the patient's age makes this inapplicable"
        : null;

  const fields = patientFieldSpecs(dateOfBirthUnknown).filter(
    (f) => f.id !== "pregnant" || !pregnancySkipReason
  );

  function handleSetValue(id: string, value: unknown) {
    setValue(id as keyof PatientData, value as any);
    // A field hidden because it's no longer applicable shouldn't leave a
    // stale answer behind to be silently submitted once it's out of view.
    if (id === "patientSex" && value === "male") setValue("pregnant", "");
    if (id === "patientDateOfBirth") {
      const age = ageInYears(String(value));
      if (age !== null && age < PREGNANCY_MIN_PLAUSIBLE_AGE) setValue("pregnant", "");
    }
    if (id === "ageYears") {
      const n = Number(value);
      if (value !== "" && Number.isFinite(n) && n < PREGNANCY_MIN_PLAUSIBLE_AGE) setValue("pregnant", "");
    }
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
          <>
            {!isSelfReport && (
              <label className="field__inline-toggle">
                <input
                  type="checkbox"
                  checked={dateOfBirthUnknown}
                  onChange={(e) => handleSetValue("dateOfBirthUnknown", e.target.checked)}
                />
                I don't know the exact date of birth
              </label>
            )}
            {selfReportAgeFlag && (
              <p className="notice notice--info" role="status">
                This date of birth suggests the patient is younger than {SELF_REPORT_MIN_PLAUSIBLE_AGE}. If
                you're filling this out on someone else's behalf,{" "}
                <button type="button" className="button button--text" onClick={onSwitchSubmitterType}>
                  go back and let us know
                </button>
                .
              </p>
            )}
          </>
        ),
        patientState: () =>
          pregnancySkipReason ? (
            <p className="field__hint" role="status">
              We'll skip asking about pregnancy — {pregnancySkipReason}.
            </p>
          ) : null,
      }}
    />
  );
}
