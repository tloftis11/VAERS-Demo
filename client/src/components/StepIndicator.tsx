import { STEP_LABELS, type StepId } from "../../../shared/src/branchingRules";

interface StepIndicatorProps {
  steps: StepId[];
  currentStep: StepId;
}

/** Consolidated stage groupings for display only — the underlying step list stays granular for navigation/data. */
const STAGE_LABELS: Record<StepId, string> = {
  "submitter-type": "Getting Started",
  "before-you-start": "Getting Started",
  "administration-error": "Getting Started",
  "adverse-event-occurred": "Getting Started",
  "about-you": "Patient",
  patient: "Patient",
  vaccine: "Vaccine",
  "adverse-event": "What Happened",
  "error-detail": "What Happened",
  documents: "Documents",
  review: "Submit",
};

/** Thin top progress bar + consolidated stage labels (FORM-001), styled after the reference prototype. */
export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  const currentIndex = steps.indexOf(currentStep);
  const progressPercent = ((currentIndex + 1) / steps.length) * 100;
  const currentStage = STAGE_LABELS[currentStep];

  const stages: string[] = [];
  for (const step of steps) {
    const stage = STAGE_LABELS[step];
    if (!stages.includes(stage)) stages.push(stage);
  }

  return (
    <nav aria-label="Report progress" className="step-indicator">
      <div
        className="step-indicator__bar"
        role="progressbar"
        aria-valuenow={Math.round(progressPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="step-indicator__bar-fill" style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="step-indicator__stages">
        {stages.map((stage) => (
          <span
            key={stage}
            className={`step-indicator__stage${stage === currentStage ? " step-indicator__stage--current" : ""}`}
          >
            {stage}
          </span>
        ))}
      </div>
      <p className="step-indicator__progress-text">
        Step {currentIndex + 1} of {steps.length}: {STEP_LABELS[currentStep]}
      </p>
    </nav>
  );
}
