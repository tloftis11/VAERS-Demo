import { useState } from "react";

interface YesNoQuestionStepProps {
  title: string;
  description: string;
  value: boolean | null;
  onSelect: (value: boolean) => Promise<void>;
  onBack: () => void;
  yesLabel?: string;
  yesHint?: string;
  noLabel?: string;
  noHint?: string;
  /** Runs before an answer is saved — return a message to block that
   * specific answer (e.g. it would combine with an already-answered
   * sibling question into an invalid combination) instead of an inline
   * error, same styling as a failed save. Return null to let it through. */
  blockAnswer?: (value: boolean) => string | null;
}

/**
 * Shared yes/no branching-question layout for the two independent HCP gate
 * questions (PROV-002/003: administration error? / adverse event?). Both
 * questions can be true at once, so each is asked and stored separately
 * rather than as a single either/or choice.
 */
export function YesNoQuestionStep({
  title,
  description,
  value,
  onSelect,
  onBack,
  yesLabel = "Yes",
  yesHint,
  noLabel = "No",
  noHint,
  blockAnswer,
}: YesNoQuestionStepProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // No review screen of its own to retry from — draft saving is still
  // authoritative: disable both cards while the answer is being saved, and
  // surface a retryable error rather than silently doing nothing if it fails.
  async function handleSelect(v: boolean) {
    if (submitting) return;
    const blockMessage = blockAnswer?.(v);
    if (blockMessage) {
      setError(blockMessage);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSelect(v);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="choice-step">
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="choice-cards">
        <button
          type="button"
          className={`choice-card${value === true ? " choice-card--selected" : ""}`}
          onClick={() => handleSelect(true)}
          disabled={submitting}
        >
          <span>
            <h2>{yesLabel}</h2>
            {yesHint && <p>{yesHint}</p>}
          </span>
        </button>
        <button
          type="button"
          className={`choice-card${value === false ? " choice-card--selected" : ""}`}
          onClick={() => handleSelect(false)}
          disabled={submitting}
        >
          <span>
            <h2>{noLabel}</h2>
            {noHint && <p>{noHint}</p>}
          </span>
        </button>
      </div>
      {error && (
        <p role="alert" className="field__error">
          {error}
        </p>
      )}
      <button type="button" className="button button--text" onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}
