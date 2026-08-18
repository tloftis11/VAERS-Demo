import { patientSchema, SEX_OPTIONS } from "../../../../shared/src/schemas";
import type { SubmitterType } from "../../../../shared/src/branchingRules";
import type { PatientData } from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { TextField, SelectField } from "../../components/Field";

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
  patientWeightKg: "",
  medicalRecordNumber: "",
};

export function PatientStep({ submitterType, initialData, onNext, onBack }: PatientStepProps) {
  const { values, setValue, errors, validate } = useStepForm(
    patientSchema(submitterType),
    initialData ?? EMPTY
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validate();
    if (result.success) await onNext(result.data);
  }

  return (
    <form className="step-form" onSubmit={handleSubmit}>
      <h1>About the patient</h1>
      <TextField
        id="patientFirstName"
        label="Patient's first name"
        required
        value={values.patientFirstName}
        onChange={(v) => setValue("patientFirstName", v)}
        error={errors.patientFirstName}
      />
      <TextField
        id="patientLastName"
        label="Patient's last name"
        required
        value={values.patientLastName}
        onChange={(v) => setValue("patientLastName", v)}
        error={errors.patientLastName}
      />
      <TextField
        id="patientDateOfBirth"
        label="Date of birth"
        type="date"
        required
        value={values.patientDateOfBirth}
        onChange={(v) => setValue("patientDateOfBirth", v)}
        error={errors.patientDateOfBirth}
      />
      <SelectField
        id="patientSex"
        label="Sex"
        required
        value={values.patientSex}
        onChange={(v) => setValue("patientSex", v)}
        options={SEX_OPTIONS}
        error={errors.patientSex}
      />
      <TextField
        id="patientWeightKg"
        label="Weight in kg (optional)"
        type="number"
        value={String(values.patientWeightKg ?? "")}
        onChange={(v) => setValue("patientWeightKg", v)}
        error={errors.patientWeightKg}
        hint="Especially useful for pediatric reports."
      />
      {submitterType === "hcp" && (
        <TextField
          id="medicalRecordNumber"
          label="Medical record number"
          required
          value={values.medicalRecordNumber}
          onChange={(v) => setValue("medicalRecordNumber", v)}
          error={errors.medicalRecordNumber}
          hint="Helps link this report back to the source record if follow-up is needed."
        />
      )}
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
