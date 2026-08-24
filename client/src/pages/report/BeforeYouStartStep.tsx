import { Link } from "react-router-dom";

interface BeforeYouStartStepProps {
  onNext: () => Promise<void>;
  onBack: () => void;
}

/** Informational screen before the form begins (FLOW-004): what the report is used for, and what's helpful to have on hand. Nothing here is required. */
export function BeforeYouStartStep({ onNext, onBack }: BeforeYouStartStepProps) {
  return (
    <div className="step-form">
      <h1>Before You Start</h1>

      <div className="notice notice--navy before-you-start__notice">
        <span className="before-you-start__icon" aria-hidden="true">
          <ShieldIcon />
        </span>
        <div className="before-you-start__notice-body">
          <h2>How Your Report Is Used</h2>
          <p>
            Your report helps CDC and FDA monitor vaccine safety. Personal information is only
            used for follow-up if necessary and is protected.
          </p>
        </div>
        <Link to="/about" className="before-you-start__learn-more">
          Learn More ›
        </Link>
      </div>

      <h2 className="before-you-start__section-title">Information Needed</h2>
      <p>Having this information will help you complete your report faster.</p>

      <ul className="checklist">
        <li className="checklist__item">
          <VaccineIcon />
          Vaccine name
        </li>
        <li className="checklist__item">
          <CalendarIcon />
          Date of vaccination
        </li>
        <li className="checklist__item">
          <SymptomIcon />
          Symptoms experienced
        </li>
      </ul>
      <p className="field__hint">
        These are helpful to have on hand — nothing here is required to start your report.
      </p>

      <div className="step-form__actions">
        <button type="button" className="button button--text" onClick={onBack}>
          ← Back
        </button>
        <button type="button" className="button button--primary" onClick={() => onNext()}>
          Continue
        </button>
      </div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3 L20 6 V11 C20 16 16.5 20 12 21 C7.5 20 4 16 4 11 V6 Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function VaccineIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M17 3l4 4-2 2-1-1-8 8-2 3-3 1 1-3 3-2 8-8-1-1z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M4 10h16M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SymptomIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="8" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="2" />
      <path d="M12 12v4M10 14h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
