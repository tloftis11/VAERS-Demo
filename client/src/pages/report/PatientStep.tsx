import {
  patientSchema,
  SEX_OPTIONS,
  STATE_OR_FOREIGN_OPTIONS,
  YES_NO_UNKNOWN_OPTIONS,
  RACE_OPTIONS,
  ETHNICITY_OPTIONS,
} from "../../../../shared/src/schemas";
import { useEffect, useState } from "react";
import { ageInYears, todayIsoDate, PREGNANCY_MIN_PLAUSIBLE_AGE } from "../../../../shared/src/liveChecks";
import type { SubmitterType } from "../../../../shared/src/branchingRules";
import type { PatientData } from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { ConversationalStep, type ConversationalFieldSpec } from "../../components/ConversationalStep";
import { AddressFieldGroup, formatAddressSummary } from "../../components/AddressFieldGroup";

interface PatientStepProps {
  submitterType: SubmitterType;
  /** True only for a "public" submitter who told us (in About You) that
   * they're reporting for themselves — the only case where the person
   * filling this out and the patient are guaranteed to be the same person. */
  isSelfReport: boolean;
  /** The reporter's own email from About You — only used to silently mirror
   * it into patientEmail for a self-report (see isSelfReport below), so the
   * already-answered address isn't asked again under a different label. */
  reporterEmail?: string;
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

const EMPTY: PatientData = {
  patientFirstName: "",
  patientLastName: "",
  patientDateOfBirth: "",
  dateOfBirthUnknown: false,
  patientSex: "",
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
export function patientFieldSpecs(
  dateOfBirthUnknown = true,
  dobPartialMode = false,
  patientRaceOtherValue?: string,
  /** Only needed for the review-summary line — the live wizard's own
   * `render` (attached in the component below) reads current values
   * directly via closure instead. */
  patientAddressValues?: { city: string; state: string; county: string; zip: string },
  /** True only for a "public" submitter reporting on themselves — see
   * PatientStep's own prop doc. Every label below defaults to third-person
   * ("the patient") since that's correct for both a caregiver and an HCP;
   * a self-report is the one case where the person answering and the
   * patient are the same, so it's the only branch that switches to
   * "you"/"your" instead. */
  isSelfReport = false
): ConversationalFieldSpec[] {
  const fields: ConversationalFieldSpec[] = [
    {
      id: "patientFirstName",
      label: isSelfReport ? "Your first name" : "Patient's first name",
      required: true,
      kind: "text",
      icon: "person",
      autoComplete: "given-name",
    },
    {
      id: "patientLastName",
      label: isSelfReport ? "Your last name" : "Patient's last name",
      required: true,
      kind: "text",
      icon: "person",
      autoComplete: "family-name",
    },
    {
      id: "patientDateOfBirth",
      label: "Date of birth",
      required: !dateOfBirthUnknown,
      kind: dobPartialMode ? "monthYear" : "date",
      icon: "calendar",
      hint: isSelfReport
        ? "We use this to work out your age at vaccination automatically."
        : "We use this to work out the patient's age at vaccination automatically.",
      min: "1900-01-01",
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
      id: "patientStreet",
      label: isSelfReport ? "Your address (optional)" : "Patient's address (optional)",
      required: false,
      kind: "custom",
      // Folds city/state/county/zip into this same question (see the
      // `render` attached in the component below) — one screen instead of
      // five, with real autoComplete attributes for browser address autofill.
      alsoValidates: ["patientCity", "patientState", "patientCounty", "patientZip"],
      describeError: (relativePath, message) => {
        const prefix = isSelfReport ? "Your" : "Patient's";
        if (relativePath === "patientCity") return `${prefix} city: ${message}`;
        if (relativePath === "patientState") return `${prefix} state: ${message}`;
        if (relativePath === "patientZip") return `${prefix} ZIP: ${message}`;
        return message;
      },
      formatSummary: (streetValue) =>
        patientAddressValues
          ? formatAddressSummary({
              street: (streetValue as string) ?? "",
              ...patientAddressValues,
              stateOptions: STATE_OR_FOREIGN_OPTIONS,
            })
          : String(streetValue ?? ""),
    },
    {
      id: "patientPhone",
      label: isSelfReport ? "Your phone (optional)" : "Patient's phone (optional)",
      required: false,
      kind: "tel",
      autoComplete: "tel",
      hint: "e.g. (404) 555-1212 or +1 404 555 1212.",
    },
    { id: "patientEmail", label: "Patient's email (optional)", required: false, kind: "email", autoComplete: "email" },
    {
      id: "patientEmailConfirm",
      label: "Confirm patient's email",
      required: false,
      kind: "email",
      autoComplete: "email",
    },
    {
      id: "pregnant",
      label: isSelfReport
        ? "Were you pregnant at the time of vaccination? (optional)"
        : "Was the patient pregnant at the time of vaccination? (optional)",
      required: false,
      kind: "choice",
      options: YES_NO_UNKNOWN_OPTIONS,
      hint: "If yes, you'll be able to describe the pregnancy and any complications next.",
    },
    {
      id: "pregnancyDetails",
      label: "Describe the pregnancy and any complications (optional)",
      required: false,
      kind: "textarea",
      rows: 3,
      hint: "e.g. trimester at vaccination, and any pregnancy-related complications since.",
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
      label: isSelfReport ? "Your race (optional, select all that apply)" : "Patient's race (optional, select all that apply)",
      required: false,
      kind: "checkboxGroup",
      options: RACE_OPTIONS,
      hint: "Selecting \"Other\" adds a field to describe it, right here.",
      // Same inline-detail pattern as the adverse-event step's symptoms
      // question — see that field's own comment for the full rationale
      // (avoids reintroducing an orphaned-nested-error display bug).
      alsoValidates: ["patientRaceOther"],
      describeError: (relativePath, message) =>
        relativePath === "patientRaceOther" ? message : `Race: ${message}`,
      formatSummary: (value) =>
        ((value as string[]) ?? [])
          .map((v) => {
            const label = RACE_OPTIONS.find((o) => o.value === v)?.label ?? v;
            return v === "other" && patientRaceOtherValue ? `${label} (${patientRaceOtherValue})` : label;
          })
          .join(", "),
    },
    {
      id: "patientEthnicity",
      label: isSelfReport ? "Your ethnicity (optional)" : "Patient's ethnicity (optional)",
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
  reporterEmail,
  initialData,
  onNext,
  onBack,
  onSwitchSubmitterType,
}: PatientStepProps) {
  const schema = patientSchema(submitterType);
  const initial = initialData ?? EMPTY;
  const { values, setValue, errors, validate } = useStepForm(schema, initial);
  // Self-reporting means the patient *is* the reporter — their email was
  // already collected (and confirmed) in About You, so asking for it again
  // here under a different label is pure redundancy. Instead of asking,
  // silently mirror it into patientEmail (both copies, since they're
  // already confirmed-equal) so the data is still there for anything
  // downstream that reads the patient record specifically.
  useEffect(() => {
    if (isSelfReport && reporterEmail && values.patientEmail !== reporterEmail) {
      setValue("patientEmail", reporterEmail);
      setValue("patientEmailConfirm", reporterEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelfReport, reporterEmail, values.patientEmail]);
  // Reporting for yourself means you inherently know your own exact
  // birthdate — the "I don't know" escape hatch only makes sense for a
  // caregiver or HCP reporting on someone else's behalf.
  const dateOfBirthUnknown = !isSelfReport && Boolean(values.dateOfBirthUnknown);
  // "Only know the month and year" is available to everyone (matches the
  // real VAERS eSubmitter system's own mm/yyyy option) — infer the initial
  // toggle state from whatever's already stored, so revisiting the question
  // doesn't silently switch modes on someone.
  const [dobPartialMode, setDobPartialMode] = useState(
    () => /^\d{4}-\d{2}$/.test(String(initial.patientDateOfBirth ?? ""))
  );

  // Best age estimate available at this point in the flow: age *at
  // vaccination* when it was entered directly (DOB unknown), otherwise age
  // *today* from DOB (partial "YYYY-MM" values parse fine here, just assumed
  // to be the 1st of the month) — the actual vaccination date isn't known
  // until the next step, so DOB-derived age is an approximation, but it's
  // already close enough to catch the clear-cut cases these checks care about.
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
  // A second, independent signal: an adult reporting for *themselves* should
  // always know at least the month and year they were born, even if not the
  // exact day — not knowing that much at all is itself a sign this might
  // actually be a caregiver report.
  const selfReportPartialDobFlag = isSelfReport && dobPartialMode && Boolean(values.patientDateOfBirth);
  const selfReportRedirectMessage = selfReportAgeFlag
    ? `This date of birth suggests the patient is younger than ${SELF_REPORT_MIN_PLAUSIBLE_AGE}.`
    : selfReportPartialDobFlag
      ? "Not knowing your own exact date of birth is unusual for a self-report."
      : null;

  const pregnancySkipReason =
    values.patientSex === "male"
      ? isSelfReport
        ? "you're recorded as male"
        : "the patient is recorded as male"
      : bestAgeEstimate !== null && bestAgeEstimate < PREGNANCY_MIN_PLAUSIBLE_AGE
        ? isSelfReport
          ? "your age makes this inapplicable"
          : "the patient's age makes this inapplicable"
        : null;

  // Once the patient is clearly past toddlerhood, "additional months" has
  // nothing left to add — asking it anyway reads as a mistake, not a real
  // question (matches the pregnancy-skip treatment below).
  const ageMonthsSkipReason =
    bestAgeEstimate !== null && bestAgeEstimate > 2 ? "the patient's age makes this inapplicable" : null;

  const showPatientRaceOther = (values.patientRace as string[]).includes("other");

  const fields = patientFieldSpecs(
    dateOfBirthUnknown,
    dobPartialMode,
    values.patientRaceOther as string,
    {
      city: values.patientCity,
      state: values.patientState,
      county: values.patientCounty,
      zip: values.patientZip,
    },
    isSelfReport
  )
    .filter((f) => {
      if (f.id === "ageMonths") return !ageMonthsSkipReason;
      if (f.id === "pregnant") return !pregnancySkipReason;
      if (f.id === "pregnancyDetails") return !pregnancySkipReason && values.pregnant === "yes";
      if (f.id === "patientEmail" && isSelfReport) return false;
      if (f.id === "patientEmailConfirm") return isSelfReport ? false : !!(values.patientEmail as string).trim();
      return true;
    })
    .map((f) => {
      // A browser's saved "name" profile belongs to whoever is using the
      // browser, not necessarily the patient — offering it here would be
      // actively wrong for a caregiver reporting on someone else's behalf.
      // Only self-reports get the autofill hint; everyone else gets it
      // explicitly turned off rather than left to the browser's own guess.
      if ((f.id === "patientFirstName" || f.id === "patientLastName") && !isSelfReport) {
        return { ...f, autoComplete: "off" };
      }
      // render is attached here, not in patientFieldSpecs, since it needs
      // this component's own values/handleSetValue for the sibling
      // city/state/county/zip fields folded into this same question.
      if (f.id === "patientStreet") {
        return {
          ...f,
          render: (streetValue: unknown, onStreetChange: (v: unknown) => void) => (
            <AddressFieldGroup
              idPrefix="patient"
              streetLabel={isSelfReport ? "Your street address" : "Patient's street address"}
              streetHint="e.g. 123 Main St, Apt 4B"
              street={streetValue as string}
              onStreetChange={onStreetChange}
              streetError={errors.patientStreet}
              city={values.patientCity}
              onCityChange={(v) => handleSetValue("patientCity", v)}
              cityError={errors.patientCity}
              state={values.patientState}
              onStateChange={(v) => handleSetValue("patientState", v)}
              stateOptions={STATE_OR_FOREIGN_OPTIONS}
              stateError={errors.patientState}
              zip={values.patientZip}
              onZipChange={(v) => handleSetValue("patientZip", v)}
              zipError={errors.patientZip}
              county={values.patientCounty}
              onCountyChange={(v) => handleSetValue("patientCounty", v)}
            />
          ),
        };
      }
      return f;
    });

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
      if (value !== "" && Number.isFinite(n) && n > 2) setValue("ageMonths", "");
    }
    if (id === "pregnant" && value !== "yes") setValue("pregnancyDetails", "");
    if (id === "patientRace" && !(value as string[]).includes("other")) setValue("patientRaceOther", "");
    if (id === "patientEmail" && !String(value).trim()) setValue("patientEmailConfirm", "");
  }

  // The two checkboxes below are alternatives ("These two options are
  // different: one still lets us estimate age automatically, the other
  // asks for age directly instead") but nothing enforced that — both could
  // end up checked at once, which is self-contradictory (one still expects
  // a birth date, the other says none of it is known).
  function handleDobPartialToggle(checked: boolean) {
    setDobPartialMode(checked);
    if (checked) handleSetValue("dateOfBirthUnknown", false);
    const current = String(values.patientDateOfBirth ?? "");
    if (checked && /^\d{4}-\d{2}-\d{2}$/.test(current)) {
      // Keep whatever month/year they'd already entered, just drop the day.
      handleSetValue("patientDateOfBirth", current.slice(0, 7));
    } else if (!checked && /^\d{4}-\d{2}$/.test(current)) {
      // Can't recover a day that was never entered — start the full picker fresh.
      handleSetValue("patientDateOfBirth", "");
    }
  }

  function handleDateOfBirthUnknownToggle(checked: boolean) {
    handleSetValue("dateOfBirthUnknown", checked);
    if (checked && dobPartialMode) setDobPartialMode(false);
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
              <p className="field__hint">
                These two options are different: one still lets us estimate age automatically, the
                other asks for age directly instead.
              </p>
            )}
            <label className="field__inline-toggle">
              <input
                type="checkbox"
                checked={dobPartialMode}
                onChange={(e) => handleDobPartialToggle(e.target.checked)}
              />
              I know the birth month and year, just not the exact day
            </label>
            <p className="field__hint field__hint--nested">We'll still estimate age automatically from this.</p>
            {!isSelfReport && (
              <>
                <label className="field__inline-toggle">
                  <input
                    type="checkbox"
                    checked={dateOfBirthUnknown}
                    onChange={(e) => handleDateOfBirthUnknownToggle(e.target.checked)}
                  />
                  I don't know any part of the date of birth
                </label>
                <p className="field__hint field__hint--nested">
                  We'll ask for the patient's age directly instead — skip this if you were able to
                  give a month and year above.
                </p>
              </>
            )}
            {selfReportRedirectMessage && (
              <div className="notice notice--warning" role="status">
                <p>{selfReportRedirectMessage}</p>
                <button type="button" className="button button--secondary" onClick={onSwitchSubmitterType}>
                  Change who's filling out this report
                </button>
              </div>
            )}
          </>
        ),
        patientState: () =>
          pregnancySkipReason ? (
            <p className="field__hint" role="status">
              We'll skip asking about pregnancy — {pregnancySkipReason}.
            </p>
          ) : null,
        patientRace: () =>
          showPatientRaceOther ? (
            <div className="field field--nested">
              <label className="sr-only" htmlFor="patient-race-other-input">
                {isSelfReport ? "Describe your race" : "Describe the patient's race"}
              </label>
              <input
                id="patient-race-other-input"
                className="field__input"
                placeholder="Please specify"
                value={values.patientRaceOther}
                onChange={(e) => handleSetValue("patientRaceOther", e.target.value)}
                aria-invalid={!!errors.patientRaceOther}
                aria-describedby={errors.patientRaceOther ? "patient-race-other-error" : undefined}
              />
              {errors.patientRaceOther && (
                <p id="patient-race-other-error" role="alert" className="field__error">
                  {errors.patientRaceOther}
                </p>
              )}
            </div>
          ) : null,
      }}
    />
  );
}
