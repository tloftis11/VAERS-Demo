import { patientSchema, SEX_OPTIONS, STATE_OPTIONS } from "../../../../shared/src/schemas";
import type { SubmitterType } from "../../../../shared/src/branchingRules";
import type { PatientData } from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { ConversationalStep, type FieldDescriptor } from "../../components/ConversationalStep";

interface PatientStepProps {
  submitterType: SubmitterType;
  initialData: PatientData | null;
  onNext: (data: Record<string, unknown>) => Promise<void>;
  onBack: () => void;
}

const EMPTY: PatientData = {
  patientFirstName: "",
  patientLastName: "",
  patientDateOfBirth: "",
  patientSex: "",
  patientState: "",
  patientWeightKg: "",
  medicalRecordNumber: "",
};

export function PatientStep({ submitterType, initialData, onNext, onBack }: PatientStepProps) {
  const { values, setValue, errors, validate } = useStepForm(
    patientSchema(submitterType),
    initialData ?? EMPTY
  );
  const isHcp = submitterType === "hcp";

  const descriptors: FieldDescriptor[] = [
    { type: "text", name: "patientFirstName", label: "Patient's first name", required: true },
    { type: "text", name: "patientLastName", label: "Patient's last name", required: true },
    { type: "text", name: "patientDateOfBirth", label: "Date of birth", inputType: "date", required: true },
    { type: "select", name: "patientSex", label: "Sex", required: true, options: SEX_OPTIONS },
    {
      type: "select",
      name: "patientState",
      label: "What is the patient's state of residence? (optional)",
      options: STATE_OPTIONS,
    },
    {
      type: "text",
      name: "patientWeightKg",
      label: "Weight in kg (optional)",
      inputType: "number",
      hint: "Especially useful for pediatric reports.",
    },
    ...(isHcp
      ? ([
          {
            type: "text",
            name: "medicalRecordNumber",
            label: "Medical record number",
            required: true,
            hint: "Helps link this report back to the source record if follow-up is needed.",
          },
        ] as FieldDescriptor[])
      : []),
  ];

  function formatValue(name: string, value: unknown): string {
    if (name === "patientSex") return SEX_OPTIONS.find((o) => o.value === value)?.label ?? "";
    if (name === "patientState") return STATE_OPTIONS.find((o) => o.value === value)?.label ?? "";
    return value == null ? "" : String(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validate();
    if (result.success) await onNext(result.data);
  }

  return (
    <form className="step-form" onSubmit={handleSubmit}>
      <h1>About the patient</h1>
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
