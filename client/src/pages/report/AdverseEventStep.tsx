import { useState } from "react";
import { adverseEventSchema, OUTCOME_OPTIONS } from "../../../../shared/src/schemas";
import type { SubmitterType } from "../../../../shared/src/branchingRules";
import { checkDescriptionConsistency, type AdverseEventData, type ConsistencyIssue } from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { TextField, TextAreaField, CheckboxGroupField } from "../../components/Field";

interface AdverseEventStepProps {
  submitterType: SubmitterType;
  initialData: AdverseEventData | null;
  onNext: (data: Record<string, unknown>) => Promise<void>;
  onBack: () => void;
}

const EMPTY: AdverseEventData = {
  onsetDate: "",
  description: "",
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
      <TextField
        id="onsetDate"
        label="When did symptoms start?"
        type="date"
        required
        value={values.onsetDate}
        onChange={(v) => setValue("onsetDate", v)}
        error={errors.onsetDate}
      />
      <TextAreaField
        id="description"
        label={isHcp ? "Clinical description" : "What happened?"}
        required
        rows={5}
        value={values.description}
        onChange={(v) => {
          setValue("description", v);
          setCheckIssues(null);
        }}
        error={errors.description}
        hint={isHcp ? undefined : "Describe the symptoms and what happened in your own words."}
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
      <CheckboxGroupField
        legend="Outcome (select all that apply)"
        required
        value={values.outcomes}
        onChange={(v) => {
          setValue("outcomes", v);
          setCheckIssues(null);
        }}
        options={OUTCOME_OPTIONS}
        error={errors.outcomes}
      />
      {showHospitalizationDates && (
        <TextField
          id="hospitalizationDates"
          label="Hospitalization dates (optional)"
          value={values.hospitalizationDates}
          onChange={(v) => setValue("hospitalizationDates", v)}
          error={errors.hospitalizationDates}
        />
      )}
      <TextAreaField
        id="treatmentGiven"
        label="Treatment given (optional)"
        rows={3}
        value={values.treatmentGiven}
        onChange={(v) => setValue("treatmentGiven", v)}
        error={errors.treatmentGiven}
      />
      {isHcp && (
        <TextAreaField
          id="clinicalCourseNotes"
          label="Clinical course notes"
          required
          rows={4}
          value={values.clinicalCourseNotes}
          onChange={(v) => setValue("clinicalCourseNotes", v)}
          error={errors.clinicalCourseNotes}
        />
      )}
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
