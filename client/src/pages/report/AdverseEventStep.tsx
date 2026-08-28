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
  initialData: AdverseEventData | null;
  /** From the Vaccine step, for live "onset can't be before vaccination" checks. */
  vaccineAdministrationDate?: string;
  onNext: (data: Record<string, unknown>) => Promise<void>;
  onBack: () => void;
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
export function adverseEventFieldSpecs(isHcp: boolean): ConversationalFieldSpec[] {
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
      hint: isHcp ? undefined : "Describe the symptoms and what happened in your own words.",
    },
    {
      id: "symptoms",
      label: "Did any of these symptoms occur? (optional, select all that apply)",
      required: false,
      kind: "multiSelect",
      options: SYMPTOM_OPTIONS,
      hint: "This is a quick-select shortcut — it doesn't replace the description above.",
    },
    {
      id: "symptomsOther",
      label: "Describe the \"Other\" symptom",
      required: false,
      kind: "text",
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
      kind: "multiSelect",
      options: OUTCOME_OPTIONS,
    },
    {
      id: "recoveryStatus",
      label: "Has the patient recovered? (optional)",
      required: false,
      kind: "choice",
      options: RECOVERY_OPTIONS,
    },
    {
      id: "hospitalizationDays",
      label: "Number of days hospitalized",
      required: true,
      kind: "number",
      hint: "If the patient is still hospitalized, enter the number of days so far — you can update this later with a follow-up note.",
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
      label: "Has the patient ever had an adverse event after any previous vaccine? (optional)",
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
  initialData,
  vaccineAdministrationDate,
  onNext,
  onBack,
}: AdverseEventStepProps) {
  const schema = adverseEventSchema(submitterType);
  const initial = initialData ?? EMPTY;
  const { values, setValue, errors, validate } = useStepForm(schema, initial);
  const isHcp = submitterType === "hcp";
  const outcomes = values.outcomes as string[];
  const showHospitalizationDetails =
    outcomes.includes("hospitalization") || outcomes.includes("hospitalization_prolonged");
  const showDateOfDeath = outcomes.includes("death");
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
      const newOutcomes = value as string[];
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

  const fields = adverseEventFieldSpecs(isHcp).filter((f) => {
    switch (f.id) {
      case "symptomsOther":
        return showSymptomsOther;
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
        description: () => (
          <div className="consistency-check">
            <button
              type="button"
              className="button button--secondary"
              onClick={handleCheckDescription}
              disabled={checking || !values.description.trim()}
            >
              {checking ? "Checking…" : "Check my description"}
            </button>
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
