interface ReportCharacteristicStepProps {
  value: "adverse_event" | "error_no_ae" | null;
  onSelect: (value: "adverse_event" | "error_no_ae") => Promise<void>;
  onBack: () => void;
}

/** HCP-only second branching decision (design doc §4.4). */
export function ReportCharacteristicStep({ value, onSelect, onBack }: ReportCharacteristicStepProps) {
  return (
    <div className="choice-step">
      <h1>What are you reporting?</h1>
      <p>
        Choose "administration error" only if there was no adverse event — the patient had no
        resulting health problem.
      </p>
      <div className="choice-cards">
        <button
          type="button"
          className={`choice-card${value === "adverse_event" ? " choice-card--selected" : ""}`}
          onClick={() => onSelect("adverse_event")}
        >
          <h2>Adverse event</h2>
          <p>The patient experienced an unexpected health problem after vaccination.</p>
        </button>
        <button
          type="button"
          className={`choice-card${value === "error_no_ae" ? " choice-card--selected" : ""}`}
          onClick={() => onSelect("error_no_ae")}
        >
          <h2>Administration error, no adverse event</h2>
          <p>
            The vaccine was given incorrectly (wrong dose, vaccine, or route) but caused no health
            problem.
          </p>
        </button>
      </div>
      <button type="button" className="button button--text" onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}
