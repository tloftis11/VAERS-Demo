import { errorDetailSchema, ERROR_TYPES } from "../../../../shared/src/schemas";
import type { ErrorDetailData } from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { ConversationalStep, type FieldDescriptor } from "../../components/ConversationalStep";

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

const descriptors: FieldDescriptor[] = [
  { type: "select", name: "errorType", label: "Type of error", required: true, options: ERROR_TYPES },
  { type: "textarea", name: "errorDescription", label: "Describe the error", required: true, rows: 4 },
  {
    type: "text",
    name: "errorDiscoveredDate",
    label: "Date the error was discovered",
    inputType: "date",
    required: true,
  },
  { type: "textarea", name: "correctiveActionTaken", label: "Corrective action taken (optional)", rows: 3 },
];

export function ErrorDetailStep({ initialData, onNext, onBack }: ErrorDetailStepProps) {
  const { values, setValue, errors, validate } = useStepForm(errorDetailSchema, initialData ?? EMPTY);

  function formatValue(name: string, value: unknown): string {
    if (name === "errorType") return ERROR_TYPES.find((o) => o.value === value)?.label ?? "";
    return value == null ? "" : String(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validate();
    if (result.success) await onNext(result.data);
  }

  return (
    <form className="step-form" onSubmit={handleSubmit}>
      <h1>Administration error details</h1>
      <ConversationalStep
        descriptors={descriptors}
        values={values}
        setValue={setValue}
        errors={errors}
        formatValue={formatValue}
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
