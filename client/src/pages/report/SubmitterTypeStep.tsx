interface SubmitterTypeStepProps {
  value: "public" | "hcp" | null;
  onSelect: (value: "public" | "hcp", card: "patient" | "caregiver" | "hcp") => Promise<void>;
}

/**
 * First branching decision (FLOW-001/002): three selectable options in the
 * UI, but exactly two underlying rule sets — Patient and Caregiver both map
 * to submitterType "public" (the person/caregiver distinction is captured
 * later by the "relationship" field on the About-You step). The `card`
 * argument carries which of the three was actually clicked purely so the
 * About-You step can pre-fill/simplify that relationship question instead
 * of asking it from scratch — it's never persisted server-side.
 */
export function SubmitterTypeStep({ onSelect }: SubmitterTypeStepProps) {
  return (
    <div className="choice-step">
      <h1>Who is filling out this form?</h1>
      <p>Choose the option that best matches your situation.</p>
      <div className="choice-cards">
        <button type="button" className="choice-card" onClick={() => onSelect("public", "patient")}>
          <span className="choice-card__icon">
            <PersonIcon />
          </span>
          <span>
            <h2>Patient</h2>
            <p>Reporting for yourself</p>
          </span>
        </button>
        <button type="button" className="choice-card" onClick={() => onSelect("public", "caregiver")}>
          <span className="choice-card__icon">
            <PeopleIcon />
          </span>
          <span>
            <h2>Caregiver</h2>
            <p>Reporting for a child, family, etc.</p>
          </span>
        </button>
        <button type="button" className="choice-card" onClick={() => onSelect("hcp", "hcp")}>
          <span className="choice-card__icon">
            <ClinicalIcon />
          </span>
          <span>
            <h2>Healthcare Professional</h2>
            <p>Reporting in a clinical role</p>
          </span>
        </button>
      </div>
    </div>
  );
}

function PersonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" fill="currentColor" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" fill="currentColor" />
      <circle cx="17" cy="9" r="2.6" fill="currentColor" opacity="0.6" />
      <path d="M3 21c0-3.6 2.7-6.5 6-6.5s6 2.9 6 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 15c2.6.4 4.5 2.6 4.5 5.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function ClinicalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
