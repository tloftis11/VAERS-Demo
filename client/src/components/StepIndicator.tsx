import { STEP_LABELS, type StepId } from "../../../shared/src/branchingRules";

interface StepIndicatorProps {
  steps: StepId[];
  currentStep: StepId;
  /** Jump directly to an already-completed step instead of clicking "← Back"
   * through every step in between — only offered for steps before the
   * current one, since there's nothing to jump to for the current/upcoming
   * ones. */
  onStepClick?: (step: StepId) => void;
}

/** Persistent breadcrumb-style step indicator (design doc §4.2): gives users a clear sense of location and remaining effort. */
export function StepIndicator({ steps, currentStep, onStepClick }: StepIndicatorProps) {
  const currentIndex = steps.indexOf(currentStep);

  return (
    <nav aria-label="Report progress" className="step-indicator">
      <ol>
        {steps.map((step, index) => {
          const status =
            index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming";
          const label = STEP_LABELS[step];
          return (
            <li key={step} className={`step-indicator__item step-indicator__item--${status}`}>
              <span
                className="step-indicator__marker"
                aria-current={status === "current" ? "step" : undefined}
              />
              {status === "complete" && onStepClick ? (
                <button
                  type="button"
                  className="step-indicator__label step-indicator__label--link"
                  onClick={() => onStepClick(step)}
                >
                  {label}
                </button>
              ) : (
                <span className="step-indicator__label">{label}</span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="step-indicator__progress-text">
        Step {currentIndex + 1} of {steps.length}: {STEP_LABELS[currentStep]}
      </p>
    </nav>
  );
}
