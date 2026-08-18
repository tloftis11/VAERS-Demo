import { useState } from "react";

interface SurveyFormProps {
  title: string;
  prompt: string;
  onSubmit: (rating: number, comment?: string) => Promise<void>;
  onDismiss?: () => void;
}

/**
 * Shared rating + optional-comment instrument used for both CSAT surveys
 * (site-navigation and post-submission — design doc §4.7). Kept to a
 * single question plus a comment so it doesn't work against the
 * ≤10-minute median submission-time target.
 */
export function SurveyForm({ title, prompt, onSubmit, onDismiss }: SurveyFormProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === null) return;
    setSubmitting(true);
    try {
      await onSubmit(rating, comment.trim() || undefined);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="survey">
        <p role="status">Thank you for your feedback.</p>
      </div>
    );
  }

  return (
    <form className="survey" onSubmit={handleSubmit} aria-label={title}>
      <div className="survey__header">
        <h2 className="survey__title">{title}</h2>
        {onDismiss && (
          <button type="button" className="survey__dismiss" onClick={onDismiss} aria-label="Dismiss survey">
            ×
          </button>
        )}
      </div>
      <fieldset>
        <legend>{prompt}</legend>
        <div className="survey__rating" role="radiogroup" aria-label="Rating, 1 to 5">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className="survey__rating-option">
              <input
                type="radio"
                name="rating"
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
              />
              {value}
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor="survey-comment" className="field__label">
        Comments (optional)
      </label>
      <textarea
        id="survey-comment"
        className="field__textarea"
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <button type="submit" className="button button--secondary" disabled={rating === null || submitting}>
        {submitting ? "Submitting…" : "Submit feedback"}
      </button>
    </form>
  );
}
