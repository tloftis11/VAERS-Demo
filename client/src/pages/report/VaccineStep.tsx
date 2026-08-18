import { vaccineSchema, VACCINE_TYPES, ROUTE_OPTIONS } from "../../../../shared/src/schemas";
import type { SubmitterType } from "../../../../shared/src/branchingRules";
import type { VaccineData } from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { TextField, SelectField } from "../../components/Field";

interface VaccineStepProps {
  submitterType: SubmitterType;
  initialData: VaccineData | null;
  onNext: (data: Record<string, unknown>) => Promise<void>;
  onBack: () => void;
}

const EMPTY: VaccineData = {
  vaccineType: "",
  manufacturer: "",
  lotNumber: "",
  doseNumber: "",
  administrationDate: "",
  route: "",
  bodySite: "",
  administeringFacility: "",
};

export function VaccineStep({ submitterType, initialData, onNext, onBack }: VaccineStepProps) {
  const { values, setValue, errors, validate } = useStepForm(
    vaccineSchema(submitterType),
    initialData ?? EMPTY
  );
  const isHcp = submitterType === "hcp";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validate();
    if (result.success) await onNext(result.data);
  }

  return (
    <form className="step-form" onSubmit={handleSubmit}>
      <h1>Vaccine information</h1>
      <SelectField
        id="vaccineType"
        label="Vaccine"
        required
        value={values.vaccineType}
        onChange={(v) => setValue("vaccineType", v)}
        options={VACCINE_TYPES}
        error={errors.vaccineType}
      />
      <TextField
        id="administrationDate"
        label="Date administered"
        type="date"
        required
        value={values.administrationDate}
        onChange={(v) => setValue("administrationDate", v)}
        error={errors.administrationDate}
      />
      <TextField
        id="doseNumber"
        label="Dose number (optional)"
        value={values.doseNumber}
        onChange={(v) => setValue("doseNumber", v)}
        error={errors.doseNumber}
        hint="e.g. 1st, 2nd, booster"
      />
      <TextField
        id="manufacturer"
        label="Manufacturer"
        required={isHcp}
        value={values.manufacturer}
        onChange={(v) => setValue("manufacturer", v)}
        error={errors.manufacturer}
      />
      <TextField
        id="lotNumber"
        label="Lot number"
        required={isHcp}
        value={values.lotNumber}
        onChange={(v) => setValue("lotNumber", v)}
        error={errors.lotNumber}
        hint={!isHcp ? "Check your vaccination card if you have it — otherwise leave blank." : undefined}
      />
      {isHcp && (
        <SelectField
          id="route"
          label="Route of administration"
          required
          value={values.route}
          onChange={(v) => setValue("route", v)}
          options={ROUTE_OPTIONS}
          error={errors.route}
        />
      )}
      <TextField
        id="bodySite"
        label="Administration site"
        required={isHcp}
        value={values.bodySite}
        onChange={(v) => setValue("bodySite", v)}
        error={errors.bodySite}
        hint="e.g. left deltoid"
      />
      <TextField
        id="administeringFacility"
        label={isHcp ? "Administering facility" : "Where was it given? (optional)"}
        required={isHcp}
        value={values.administeringFacility}
        onChange={(v) => setValue("administeringFacility", v)}
        error={errors.administeringFacility}
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
