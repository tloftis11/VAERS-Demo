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
  const completedSteps = steps.slice(0, currentIndex);

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
      {/* Mobile counterpart to the desktop step-indicator__label--link jump
          controls: those rely on real label text next to each segment,
          which doesn't fit in a narrow flex column without wrapping and
          overlapping the question below (see global.css) — a single select
          gets the same "jump to a completed step" capability into the same
          amount of horizontal space. Hidden at desktop widths, where the
          per-segment labels already cover this. */}
      {onStepClick && completedSteps.length > 0 && (
        <label className="step-indicator__jump">
          <span className="sr-only">Jump to a completed step</span>
          <select
            className="step-indicator__jump-select"
            value=""
            onChange={(e) => {
              const target = e.target.value as StepId;
              if (target) onStepClick(target);
            }}
          >
            <option value="">Jump to a completed step…</option>
            {completedSteps.map((step) => (
              <option key={step} value={step}>
                {STEP_LABELS[step]}
              </option>
            ))}
          </select>
        </label>
      )}
    </nav>
  );
}
