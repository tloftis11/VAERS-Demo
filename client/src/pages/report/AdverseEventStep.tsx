import { useState } from "react";
import {
  adverseEventSchema,
  OUTCOME_OPTIONS,
  RECOVERY_OPTIONS,
  YES_NO_UNKNOWN_OPTIONS,
  STATE_OPTIONS,
  SYMPTOM_OPTIONS,
} from "../../../../shared/src/schemas";
import { isDateBefore, hospitalizationExceedsElapsed, todayIsoDate } from "../../../../shared/src/liveChecks";
import type { SubmitterType } from "../../../../shared/src/branchingRules";
import { checkDescriptionConsistency, type AdverseEventData, type ConsistencyIssue } from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { ConversationalStep, type ConversationalFieldSpec } from "../../components/ConversationalStep";

interface AdverseEventStepProps {
  submitterType: SubmitterType;
  /** True only for a "public" submitter reporting for themselves — see PatientStep for the same flag. */
  isSelfReport?: boolean;
  initialData: AdverseEventData | null;
  /** From the Vaccine step, for live "onset can't be before vaccination" checks. */
  vaccineAdministrationDate?: string;
  onNext: (data: Record<string, unknown>) => Promise<void>;
  onBack: () => void;
  /** Jumps back to the submitter-type step — see the self-report + "Patient died" notice below. */
  onSwitchSubmitterType?: () => void;
}

const EMPTY: AdverseEventData = {
  onsetDate: "",
  onsetTime: "",
  description: "",
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
};

/**
 * Field set follows the official VAERS form's items 5 (onset), 18
 * (description — essential), 19 (labs), 20 (recovery status), 21 (outcome
 * — essential, but distinct from "recovered?"), and 23 (prior AE history).
 * "Outcomes" intentionally has no required minimum: on the real form most
 * reports have none of these severe outcomes, so forcing a selection here
 * would misrepresent typical cases. "Symptoms" (PUB-003) is a quick-select
 * complement to the free-text description, not a replacement for it.
 *
 * Returns the full superset of possible fields, in display order — the
 * live wizard filters this down based on submitterType/outcomes (see
 * AdverseEventStep below), while the final review and read-only follow-up
 * lookup use it unfiltered and simply skip whichever fields are empty.
 */
export function adverseEventFieldSpecs(
  isHcp: boolean,
  isSelfReport = false,
  symptomsOtherValue?: string
): ConversationalFieldSpec[] {
  return [
    {
      id: "onsetDate",
      label: "When did symptoms start?",
      required: true,
      kind: "date",
      icon: "calendar",
      max: todayIsoDate(),
    },
    { id: "onsetTime", label: "Time symptoms started (optional)", required: false, kind: "time12" },
    {
      id: "description",
      label: isHcp ? "Clinical description" : "What happened?",
      required: true,
      kind: "textarea",
      rows: 5,
      hint: isHcp
        ? undefined
        : "Describe the symptoms and what happened in your own words — a short answer like \"Sudden vomiting starting 2 hours after the shot\" is enough.",
    },
    {
      id: "symptoms",
      label: "Did any of these symptoms occur? (optional, select all that apply)",
      required: false,
      kind: "checkboxGroup",
      options: SYMPTOM_OPTIONS,
      hint: "This is a quick-select shortcut — it doesn't replace the description above. Selecting \"Other\" adds a field to name it, right here.",
      // The "Other, please describe" field lives inline under this same
      // question (see the `extras` render in AdverseEventStep) rather than
      // as its own separate sequential question — this just makes sure its
      // validation error still shows up correctly here (live blocking,
      // review-summary row, back-navigation) even though it's a distinct
      // top-level schema field.
      alsoValidates: ["symptomsOther"],
      describeError: (relativePath, message) =>
        relativePath === "symptomsOther" ? message : `Symptoms: ${message}`,
      // Without this, the review screen's recap of a checkboxGroup falls
      // back to the plain option label ("Other") with no indication of
      // what the reporter actually typed for it — the same visibility gap
      // that alsoValidates exists to prevent for errors, just for the
      // recap value instead.
      formatSummary: (value) =>
        ((value as string[]) ?? [])
          .map((v) => {
            const label = SYMPTOM_OPTIONS.find((o) => o.value === v)?.label ?? v;
            return v === "other" && symptomsOtherValue ? `${label} (${symptomsOtherValue})` : label;
          })
          .join(", "),
    },
    {
      id: "labResults",
      label: "Medical tests or lab results related to this event (optional)",
      required: false,
      kind: "textarea",
      rows: 3,
      hint: "Include dates if you can — both abnormal and normal/negative findings are useful.",
    },
    {
      id: "outcomes",
      label: "Did any of these occur? (optional, select all that apply)",
      required: false,
      kind: "checkboxGroup",
      options: OUTCOME_OPTIONS,
    },
    {
      id: "recoveryStatus",
      label: isSelfReport ? "Have you recovered? (optional)" : "Has the patient recovered? (optional)",
      required: false,
      kind: "choice",
      options: RECOVERY_OPTIONS,
    },
    {
      id: "hospitalizationDays",
      label: "Number of days hospitalized",
      required: true,
      kind: "number",
      hint: isSelfReport
        ? "If you're still hospitalized, enter the number of days so far — you can update this later with a follow-up note."
        : "If the patient is still hospitalized, enter the number of days so far — you can update this later with a follow-up note.",
    },
    { id: "hospitalName", label: "Hospital name (optional)", required: false, kind: "text" },
    { id: "hospitalCity", label: "Hospital city (optional)", required: false, kind: "text" },
    { id: "hospitalState", label: "Hospital state (optional)", required: false, kind: "choice", options: STATE_OPTIONS },
    { id: "dateOfDeath", label: "Date of death", required: false, kind: "date", max: todayIsoDate() },
    { id: "treatmentGiven", label: "Treatment given (optional)", required: false, kind: "textarea", rows: 3 },
    {
      id: "clinicalCourseNotes",
      label: "Clinical course notes (optional)",
      required: false,
      kind: "textarea",
      rows: 4,
    },
    {
      id: "previousAdverseEvent",
      label: isSelfReport
        ? "Have you ever had an adverse event after any previous vaccine? (optional)"
        : "Has the patient ever had an adverse event after any previous vaccine? (optional)",
      required: false,
      kind: "choice",
      options: YES_NO_UNKNOWN_OPTIONS,
    },
    {
      id: "previousAdverseEventDetails",
      label: "Describe the previous event (age at the time, vaccination date, vaccine type/brand)",
      required: false,
      kind: "textarea",
      rows: 3,
    },
  ];
}

export function AdverseEventStep({
  submitterType,
  isSelfReport = false,
  initialData,
  vaccineAdministrationDate,
  onNext,
  onBack,
  onSwitchSubmitterType,
}: AdverseEventStepProps) {
  const schema = adverseEventSchema(submitterType);
  const initial = initialData ?? EMPTY;
  const { values, setValue, errors, validate } = useStepForm(schema, initial);
  const isHcp = submitterType === "hcp";
  const outcomes = values.outcomes as string[];
  const showHospitalizationDetails =
    outcomes.includes("hospitalization") || outcomes.includes("hospitalization_prolonged");
  const showDateOfDeath = outcomes.includes("death");
  // Same contradiction the cross-field review check (validationRules.ts)
  // blocks submission on — surfaced live, right where it happens, instead
  // of only at final review.
  const selfReportDeathFlag = isSelfReport && outcomes.includes("death");
  const showPreviousDetails = values.previousAdverseEvent === "yes";
  const showSymptomsOther = (values.symptoms as string[]).includes("other");

  function checkFieldLogic(fieldId: string, liveValues: Record<string, unknown>): string | null {
    if (fieldId === "onsetDate" && vaccineAdministrationDate) {
      const onsetDate = String(liveValues.onsetDate ?? "");
      if (onsetDate && isDateBefore(onsetDate, vaccineAdministrationDate)) {
        return "Symptom onset date can't be before the vaccination date.";
      }
    }
    if (fieldId === "hospitalizationDays") {
      const onsetDate = String(liveValues.onsetDate ?? "");
      const days = Number(liveValues.hospitalizationDays);
      if (onsetDate && Number.isFinite(days)) {
        const message = hospitalizationExceedsElapsed(onsetDate, days);
        if (message) return message;
      }
    }
    if (fieldId === "dateOfDeath") {
      const dateOfDeath = String(liveValues.dateOfDeath ?? "");
      const onsetDate = String(liveValues.onsetDate ?? "");
      if (dateOfDeath && vaccineAdministrationDate && isDateBefore(dateOfDeath, vaccineAdministrationDate)) {
        return "Date of death can't be before the vaccination date.";
      }
      if (dateOfDeath && onsetDate && isDateBefore(dateOfDeath, onsetDate)) {
        return "Date of death can't be before the symptom onset date.";
      }
    }
    return null;
  }

  const [checking, setChecking] = useState(false);
  const [checkIssues, setCheckIssues] = useState<ConsistencyIssue[] | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  function handleSetValue(id: string, value: unknown) {
    setValue(id as keyof AdverseEventData, value as any);
    if (id === "description" || id === "outcomes" || id === "recoveryStatus") setCheckIssues(null);

    // A field hidden because its trigger changed shouldn't leave stale data
    // behind to be silently submitted once it's no longer visible.
    if (id === "outcomes") {
      const prevOutcomes = values.outcomes as string[];
      let newOutcomes = value as string[];

      // "None of the above" is mutually exclusive with every real outcome —
      // selecting it clears the rest, and selecting anything else clears it.
      const noneJustAdded = newOutcomes.includes("none") && !prevOutcomes.includes("none");
      if (noneJustAdded) {
        newOutcomes = ["none"];
        setValue("outcomes", newOutcomes);
      } else if (newOutcomes.includes("none") && newOutcomes.length > 1) {
        newOutcomes = newOutcomes.filter((o) => o !== "none");
        setValue("outcomes", newOutcomes);
      }

      if (!newOutcomes.includes("hospitalization") && !newOutcomes.includes("hospitalization_prolonged")) {
        setValue("hospitalizationDays", "");
        setValue("hospitalName", "");
        setValue("hospitalCity", "");
        setValue("hospitalState", "");
      }
      if (!newOutcomes.includes("death")) {
        setValue("dateOfDeath", "");
      }
    }
    if (id === "previousAdverseEvent" && value !== "yes") {
      setValue("previousAdverseEventDetails", "");
    }
    if (id === "symptoms" && !(value as string[]).includes("other")) {
      setValue("symptomsOther", "");
    }
  }

  async function handleCheckDescription() {
    if (!values.description.trim()) return;
    setChecking(true);
    setCheckError(null);
    setCheckIssues(null);
    try {
      const { issues } = await checkDescriptionConsistency({
        description: values.description,
        outcomes: values.outcomes,
        recoveryStatus: values.recoveryStatus,
        submitterType,
      });
      setCheckIssues(issues);
    } catch {
      setCheckError("Couldn't run the check right now — you can still continue.");
    } finally {
      setChecking(false);
    }
  }

  const fields = adverseEventFieldSpecs(isHcp, isSelfReport, values.symptomsOther as string).filter((f) => {
    switch (f.id) {
      case "recoveryStatus":
        // Asking "has the patient recovered?" doesn't make sense once
        // "Patient died" is already recorded as an outcome.
        return !outcomes.includes("death");
      case "hospitalizationDays":
      case "hospitalName":
      case "hospitalCity":
      case "hospitalState":
        return showHospitalizationDetails;
      case "dateOfDeath":
        return showDateOfDeath;
      case "clinicalCourseNotes":
        return isHcp;
      case "previousAdverseEventDetails":
        return showPreviousDetails;
      default:
        return true;
    }
  });

  return (
    <ConversationalStep
      stepTitle="What happened"
      fields={fields}
      values={values as unknown as Record<string, unknown>}
      setValue={handleSetValue}
      errors={errors}
      validate={validate}
      onNext={onNext}
      onBack={onBack}
      initialIndex={schema.safeParse(initial).success ? fields.length : 0}
      extraFieldValidation={checkFieldLogic}
      extras={{
        symptoms: () =>
          showSymptomsOther ? (
            <div className="field field--nested">
              <label className="field__label" htmlFor="symptoms-other-input">
                Describe the "Other" symptom
              </label>
              <input
                id="symptoms-other-input"
                className="field__input"
                value={values.symptomsOther}
                onChange={(e) => handleSetValue("symptomsOther", e.target.value)}
                aria-invalid={!!errors.symptomsOther}
                aria-describedby={errors.symptomsOther ? "symptoms-other-error" : undefined}
              />
              {errors.symptomsOther && (
                <p id="symptoms-other-error" role="alert" className="field__error">
                  {errors.symptomsOther}
                </p>
              )}
            </div>
          ) : null,
        outcomes: () =>
          selfReportDeathFlag ? (
            <div className="notice notice--warning" role="status">
              <p>
                A report submitted by the patient themselves can't also report that the patient
                died.
              </p>
              <button type="button" className="button button--secondary" onClick={onSwitchSubmitterType}>
                Change who's filling out this report
              </button>
            </div>
          ) : null,
        // Deliberately attached here, not to "description" — this compares
        // the narrative against outcomes/recovery status, and both of those
        // questions come *after* description in the sequence. Running the
        // check right after description meant those fields were always
        // still blank, so the AI routinely (and correctly, given what it
        // was told) flagged "no recovery status selected" as if something
        // had been skipped, when the reporter simply hadn't reached that
        // question yet. previousAdverseEvent is the first field after both
        // outcomes and recoveryStatus that's always shown regardless of
        // branch (recoveryStatus itself is hidden when death is recorded).
        previousAdverseEvent: () => (
          <div className="consistency-check">
            <button
              type="button"
              className="button button--secondary"
              onClick={handleCheckDescription}
              disabled={checking || !values.description.trim()}
            >
              {checking ? "Checking…" : "Double-check for inconsistencies"}
            </button>
            <p className="field__hint">
              Optional — compares what you described in "What happened?" against the outcomes and
              recovery status you selected, in case anything doesn't quite line up.
            </p>
            {checkError && (
              <p role="alert" className="field__error">
                {checkError}
              </p>
            )}
            {checkIssues && checkIssues.length === 0 && (
              <p role="status" className="consistency-check__clear">
                No inconsistencies found.
              </p>
            )}
            {checkIssues && checkIssues.length > 0 && (
              <ul className="consistency-check__list" role="status">
                {checkIssues.map((issue, i) => (
                  <li key={i}>
                    <strong>{issue.issue}</strong>
                    <p>{issue.suggestion}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ),
      }}
    />
  );
}
