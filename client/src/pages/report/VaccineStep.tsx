import { vaccineSchema, VACCINE_TYPES, ROUTE_OPTIONS } from "../../../../shared/src/schemas";
import type { SubmitterType } from "../../../../shared/src/branchingRules";
import type { VaccineData } from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { ConversationalStep, type FieldDescriptor } from "../../components/ConversationalStep";

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

  const descriptors: FieldDescriptor[] = [
    { type: "select", name: "vaccineType", label: "Vaccine", required: true, options: VACCINE_TYPES },
    {
      type: "text",
      name: "administrationDate",
      label: "Date administered",
      inputType: "date",
      required: true,
    },
    { type: "text", name: "doseNumber", label: "Dose number (optional)", hint: "e.g. 1st, 2nd, booster" },
    { type: "text", name: "manufacturer", label: "Manufacturer", required: isHcp },
    {
      type: "text",
      name: "lotNumber",
      label: "Lot number",
      required: isHcp,
      hint: !isHcp ? "Check your vaccination card if you have it — otherwise leave blank." : undefined,
    },
    ...(isHcp
      ? ([
          {
            type: "select",
            name: "route",
            label: "Route of administration",
            required: true,
            options: ROUTE_OPTIONS,
          },
        ] as FieldDescriptor[])
      : []),
    {
      type: "text",
      name: "bodySite",
      label: "Administration site",
      required: isHcp,
      hint: "e.g. left deltoid",
    },
    {
      type: "text",
      name: "administeringFacility",
      label: isHcp ? "Administering facility" : "Where was it given? (optional)",
      required: isHcp,
    },
  ];

  function formatValue(name: string, value: unknown): string {
    if (name === "vaccineType") return VACCINE_TYPES.find((o) => o.value === value)?.label ?? "";
    if (name === "route") return ROUTE_OPTIONS.find((o) => o.value === value)?.label ?? "";
    return value == null ? "" : String(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validate();
    if (result.success) await onNext(result.data);
  }

  return (
    <form className="step-form" onSubmit={handleSubmit}>
      <h1>Vaccine information</h1>
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
