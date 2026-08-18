import { errorDetailSchema, ERROR_TYPES } from "../../../../shared/src/schemas";
import type { ErrorDetailData } from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { TextField, TextAreaField, SelectField } from "../../components/Field";

interface ErrorDetailStepProps {
  initialData: ErrorDetailData | null;
  onNext: (data: Record<string, unknown>) => Promise<void>;
  onBack: () => void;
}

const EMPTY: ErrorDetailData = {
  errorType: "",
  errorDescription: "",
  errorDiscoveredDate: "",
  correctiveActionTaken: "",
};

export function ErrorDetailStep({ initialData, onNext, onBack }: ErrorDetailStepProps) {
  const { values, setValue, errors, validate } = useStepForm(errorDetailSchema, initialData ?? EMPTY);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validate();
    if (result.success) await onNext(result.data);
  }

  return (
    <form className="step-form" onSubmit={handleSubmit}>
      <h1>Administration error details</h1>
      <SelectField
        id="errorType"
        label="Type of error"
        required
        value={values.errorType}
        onChange={(v) => setValue("errorType", v)}
        options={ERROR_TYPES}
        error={errors.errorType}
      />
      <TextAreaField
        id="errorDescription"
        label="Describe the error"
        required
        rows={4}
        value={values.errorDescription}
        onChange={(v) => setValue("errorDescription", v)}
        error={errors.errorDescription}
      />
      <TextField
        id="errorDiscoveredDate"
        label="Date the error was discovered"
        type="date"
        required
        value={values.errorDiscoveredDate}
        onChange={(v) => setValue("errorDiscoveredDate", v)}
        error={errors.errorDiscoveredDate}
      />
      <TextAreaField
        id="correctiveActionTaken"
        label="Corrective action taken (optional)"
        rows={3}
        value={values.correctiveActionTaken}
        onChange={(v) => setValue("correctiveActionTaken", v)}
        error={errors.correctiveActionTaken}
      />
      <div className="step-form__actions">
        <button type="button" className="button button--text" onClick={onBack}>
          ← Back
        </button>
        <button type="submit" className="button button--primary">
          Continue
        </button>
      </div>
    </form>
  );
}
