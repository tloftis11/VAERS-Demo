import { useState } from "react";
import { adverseEventSchema, OUTCOME_OPTIONS, SYMPTOM_OPTIONS } from "../../../../shared/src/schemas";
import type { SubmitterType } from "../../../../shared/src/branchingRules";
import { checkDescriptionConsistency, type AdverseEventData, type ConsistencyIssue } from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { ConversationalStep, type FieldDescriptor } from "../../components/ConversationalStep";

interface AdverseEventStepProps {
  submitterType: SubmitterType;
  initialData: AdverseEventData | null;
  onNext: (data: Record<string, unknown>) => Promise<void>;
  onBack: () => void;
}

const EMPTY: AdverseEventData = {
  onsetDate: "",
  description: "",
  symptoms: [],
  outcomes: [],
  hospitalizationDates: "",
  treatmentGiven: "",
  clinicalCourseNotes: "",
};

export function AdverseEventStep({ submitterType, initialData, onNext, onBack }: AdverseEventStepProps) {
  const { values, setValue, errors, validate } = useStepForm(
    adverseEventSchema(submitterType),
    initialData ?? EMPTY
  );
  const isHcp = submitterType === "hcp";
  const showHospitalizationDates = values.outcomes.includes("hospitalized");

  const [checking, setChecking] = useState(false);
  const [checkIssues, setCheckIssues] = useState<ConsistencyIssue[] | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  const descriptors: FieldDescriptor[] = [
    { type: "text", name: "onsetDate", label: "When did symptoms start?", inputType: "date", required: true },
    {
      type: "checkbox-group",
      name: "symptoms",
      label: "Symptoms experienced (optional)",
      hint: "Quick-select common symptoms — describe anything else in the next field.",
      options: SYMPTOM_OPTIONS,
    },
    {
      type: "textarea",
      name: "description",
      label: isHcp ? "Clinical description" : "What happened?",
      required: true,
      rows: 5,
      hint: isHcp ? undefined : "Describe the symptoms and what happened in your own words.",
    },
    {
      type: "checkbox-group",
      name: "outcomes",
      label: "Outcome (select all that apply)",
      required: true,
      options: OUTCOME_OPTIONS,
    },
    ...(showHospitalizationDates
      ? ([{ type: "text", name: "hospitalizationDates", label: "Hospitalization dates (optional)" }] as FieldDescriptor[])
      : []),
    { type: "textarea", name: "treatmentGiven", label: "Treatment given (optional)", rows: 3 },
    ...(isHcp
      ? ([
          {
            type: "textarea",
            name: "clinicalCourseNotes",
            label: "Clinical course notes",
            required: true,
            rows: 4,
          },
        ] as FieldDescriptor[])
      : []),
  ];

  function formatValue(name: string, value: unknown): string {
    if (name === "symptoms" || name === "outcomes") {
      const options = name === "symptoms" ? SYMPTOM_OPTIONS : OUTCOME_OPTIONS;
      const selected = (value as string[]) ?? [];
      return selected.map((v) => options.find((o) => o.value === v)?.label ?? v).join(", ");
    }
    return value == null ? "" : String(value);
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
        hospitalizationDates: values.hospitalizationDates,
        submitterType,
      });
      setCheckIssues(issues);
    } catch {
      setCheckError("Couldn't run the check right now — you can still continue.");
    } finally {
      setChecking(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validate();
    if (result.success) await onNext(result.data);
  }

  return (
    <form className="step-form" onSubmit={handleSubmit}>
      <h1>What happened</h1>
      <ConversationalStep
        descriptors={descriptors}
        values={values}
        setValue={setValue}
        errors={errors}
        formatValue={formatValue}
      />
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
      <div className="step-form__actions">
        <button type="button" className="button button--text" onClick={onBack}>
          ← Back
        </button>
        <button type="submit" className="button button--primary">
          Continue
        </button>
      </div>
    </form>
  );
}
