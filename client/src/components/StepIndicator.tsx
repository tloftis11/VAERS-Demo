import { STEP_LABELS, type StepId } from "../../../shared/src/branchingRules";

interface StepIndicatorProps {
  steps: StepId[];
  currentStep: StepId;
}

/** Persistent breadcrumb-style step indicator (design doc §4.2): gives users a clear sense of location and remaining effort. */
export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  const currentIndex = steps.indexOf(currentStep);

  return (
    <nav aria-label="Report progress" className="step-indicator">
      <ol>
        {steps.map((step, index) => {
          const status =
            index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming";
          return (
            <li key={step} className={`step-indicator__item step-indicator__item--${status}`}>
              <span
                className="step-indicator__marker"
                aria-current={status === "current" ? "step" : undefined}
              >
                {status === "complete" ? "✓" : index + 1}
              </span>
              <span className="step-indicator__label">{STEP_LABELS[step]}</span>
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
