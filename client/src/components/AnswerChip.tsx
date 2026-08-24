interface AnswerChipProps {
  label: string;
  displayValue: string;
  onEdit: () => void;
}

/** A collapsed, already-answered question in the conversational form pattern — click the pencil to reopen it without disturbing other answers. */
export function AnswerChip({ label, displayValue, onEdit }: AnswerChipProps) {
  return (
    <div className="answer-chip">
      <div className="answer-chip__text">
        <span className="answer-chip__label">{label}</span>
        <span className="answer-chip__value">{displayValue || "Skipped"}</span>
      </div>
      <button type="button" className="answer-chip__edit" onClick={onEdit} aria-label={`Edit: ${label}`}>
        <EditIcon />
      </button>
    </div>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
