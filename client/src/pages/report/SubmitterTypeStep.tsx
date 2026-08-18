interface SubmitterTypeStepProps {
  value: "public" | "hcp" | null;
  onSelect: (value: "public" | "hcp") => Promise<void>;
}

/** First branching decision (design doc §4.4): who is reporting. */
export function SubmitterTypeStep({ value, onSelect }: SubmitterTypeStepProps) {
  return (
    <div className="choice-step">
      <h1>Who is reporting?</h1>
      <p>This helps us ask you only the questions that apply to your situation.</p>
      <div className="choice-cards">
        <button
          type="button"
          className={`choice-card${value === "public" ? " choice-card--selected" : ""}`}
          onClick={() => onSelect("public")}
        >
          <h2>I'm a patient, parent, or caregiver</h2>
          <p>You're reporting on behalf of yourself or someone you care for.</p>
        </button>
        <button
          type="button"
          className={`choice-card${value === "hcp" ? " choice-card--selected" : ""}`}
          onClick={() => onSelect("hcp")}
        >
          <h2>I'm a healthcare provider</h2>
          <p>Physician, nurse, pharmacist, or other clinician reporting professionally.</p>
        </button>
      </div>
    </div>
  );
}
