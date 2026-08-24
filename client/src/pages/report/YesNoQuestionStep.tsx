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
}: YesNoQuestionStepProps) {
  return (
    <div className="choice-step">
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="choice-cards">
        <button
          type="button"
          className={`choice-card${value === true ? " choice-card--selected" : ""}`}
          onClick={() => onSelect(true)}
        >
          <span>
            <h2>{yesLabel}</h2>
            {yesHint && <p>{yesHint}</p>}
          </span>
        </button>
        <button
          type="button"
          className={`choice-card${value === false ? " choice-card--selected" : ""}`}
          onClick={() => onSelect(false)}
        >
          <span>
            <h2>{noLabel}</h2>
            {noHint && <p>{noHint}</p>}
          </span>
        </button>
      </div>
      <button type="button" className="button button--text" onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}
