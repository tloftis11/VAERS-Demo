import { errorDetailSchema, ERROR_TYPES } from "../../../../shared/src/schemas";
import type { ErrorDetailData } from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { ConversationalStep, type ConversationalFieldSpec } from "../../components/ConversationalStep";

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

/** Exported so the final review and the read-only follow-up lookup can show the same labels. */
export const ERROR_DETAIL_FIELD_SPECS: ConversationalFieldSpec[] = [
  { id: "errorType", label: "Type of error", required: true, kind: "choice", options: ERROR_TYPES },
  { id: "errorDescription", label: "Describe the error", required: true, kind: "textarea", rows: 4 },
  { id: "errorDiscoveredDate", label: "Date the error was discovered", required: true, kind: "date", icon: "calendar" },
  {
    id: "correctiveActionTaken",
    label: "Corrective action taken (optional)",
    required: false,
    kind: "textarea",
    rows: 3,
  },
];

export function ErrorDetailStep({ initialData, onNext, onBack }: ErrorDetailStepProps) {
  const initial = initialData ?? EMPTY;
  const { values, setValue, errors, validate } = useStepForm(errorDetailSchema, initial);
  const fields = ERROR_DETAIL_FIELD_SPECS;

  return (
    <ConversationalStep
      stepTitle="Administration error details"
      fields={fields}
      values={values as unknown as Record<string, unknown>}
      setValue={(id, value) => setValue(id as keyof ErrorDetailData, value as any)}
      errors={errors}
      validate={validate}
      onNext={onNext}
      onBack={onBack}
      initialIndex={errorDetailSchema.safeParse(initial).success ? fields.length : 0}
    />
  );
}
