import { useState } from "react";
import { STEP_LABELS, type StepId } from "../../../../shared/src/branchingRules";
import type { ClientReport } from "../../api/client";

interface ReviewStepProps {
  report: ClientReport;
  onSubmit: () => Promise<{ incompleteSteps?: StepId[] } | void>;
  onBack: () => void;
  onGoToStep: (step: StepId) => void;
}

function SummarySection({ title, data }: { title: string; data: object | null }) {
  if (!data) return null;
  const record = data as Record<string, unknown>;
  const entries = Object.entries(record).filter(([, v]) => v !== "" && v !== null && !Array.isArray(v));
  const arrayEntries = Object.entries(record).filter(
    ([, v]) => Array.isArray(v) && (v as unknown[]).length > 0
  );
  if (entries.length === 0 && arrayEntries.length === 0) return null;
  return (
    <div className="review-section">
      <h2>{title}</h2>
      <dl>
        {entries.map(([key, value]) => (
          <div key={key} className="review-section__row">
            <dt>{key}</dt>
            <dd>{String(value)}</dd>
          </div>
        ))}
        {arrayEntries.map(([key, value]) => (
          <div key={key} className="review-section__row">
            <dt>{key}</dt>
            <dd>{(value as string[]).join(", ")}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ReviewStep({ report, onSubmit, onBack, onGoToStep }: ReviewStepProps) {
  const [incompleteSteps, setIncompleteSteps] = useState<StepId[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await onSubmit();
      if (result?.incompleteSteps?.length) {
        setIncompleteSteps(result.incompleteSteps);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong submitting your report.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="step-form">
      <h1>Review & submit</h1>
      <p>Please review your report before submitting. You can go back to fix anything.</p>

      {incompleteSteps.length > 0 && (
        <div className="review-error" role="alert">
          <p>Please complete these sections before submitting:</p>
          <ul>
            {incompleteSteps.map((step) => (
              <li key={step}>
                <button type="button" className="button button--text" onClick={() => onGoToStep(step)}>
                  {STEP_LABELS[step]}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && (
        <p role="alert" className="field__error">
          {error}
        </p>
      )}

      <SummarySection title="About you" data={report.aboutYou} />
      <SummarySection title="About the patient" data={report.patient} />
      <SummarySection title="Vaccine information" data={report.vaccine} />
      <SummarySection title="What happened" data={report.adverseEvent} />
      <SummarySection title="Administration error details" data={report.errorDetail} />

      <div className="review-section">
        <h2>Supporting documents</h2>
        {report.attachments.length === 0 ? (
          <p>No documents attached.</p>
        ) : (
          <ul>
            {report.attachments.map((a) => (
              <li key={a.id}>{a.originalFilename}</li>
            ))}
          </ul>
        )}
        {report.documents.supplementalNotes && <p>{report.documents.supplementalNotes}</p>}
      </div>

      <div className="step-form__actions">
        <button type="button" className="button button--text" onClick={onBack}>
          ← Back
        </button>
        <button type="button" className="button button--primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit report"}
        </button>
      </div>
    </div>
  );
}
