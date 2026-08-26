import {
  vaccineSchema,
  VACCINE_TYPES,
  ROUTE_OPTIONS,
  BODY_SITE_OPTIONS,
  FACILITY_TYPE_OPTIONS,
} from "../../../../shared/src/schemas";
import type { SubmitterType } from "../../../../shared/src/branchingRules";
import type { VaccineData } from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { ConversationalStep, type ConversationalFieldSpec } from "../../components/ConversationalStep";

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
  administrationTime: "",
  route: "",
  bodySite: "",
  administeringFacility: "",
  facilityType: "",
  otherVaccinesRecent: "",
};

/**
 * Field set follows the official VAERS form's "WHICH VACCINES WERE GIVEN"
 * (item 17) and "INFORMATION ABOUT THE FACILITY" (items 15-16) sections —
 * route/body-site options match the real form's own categories (it groups
 * all injection types together rather than asking IM vs. SC, and lists
 * specific limb/side options for body site) rather than clinical shorthand.
 * Item 22 (other vaccines in the prior month) is a repeatable table on the
 * real form; simplified here to one free-text field.
 * Exported so the final review and the read-only follow-up lookup can show the same labels.
 */
export function vaccineFieldSpecs(isHcp: boolean): ConversationalFieldSpec[] {
  return [
    { id: "vaccineType", label: "Vaccine", required: true, kind: "choice", options: VACCINE_TYPES, icon: "vaccine" },
    { id: "administrationDate", label: "Date administered", required: true, kind: "date", icon: "calendar" },
    { id: "administrationTime", label: "Time administered (optional)", required: false, kind: "text", hint: "e.g. 9:30 AM" },
    { id: "doseNumber", label: "Dose number (optional)", required: false, kind: "text", hint: "e.g. 1st, 2nd, booster" },
    { id: "manufacturer", label: "Manufacturer", required: isHcp, kind: "text" },
    {
      id: "lotNumber",
      label: "Lot number",
      required: isHcp,
      kind: "text",
      hint: !isHcp ? "Check your vaccination card if you have it — otherwise leave blank." : undefined,
    },
    { id: "route", label: "How was it given? (optional)", required: false, kind: "choice", options: ROUTE_OPTIONS },
    { id: "bodySite", label: "Where was it given? (optional)", required: false, kind: "choice", options: BODY_SITE_OPTIONS },
    { id: "administeringFacility", label: "Facility or clinic name (optional)", required: false, kind: "text" },
    {
      id: "facilityType",
      label: "Type of facility (optional)",
      required: false,
      kind: "choice",
      options: FACILITY_TYPE_OPTIONS,
    },
    {
      id: "otherVaccinesRecent",
      label: "Any other vaccines received in the month before this one? (optional)",
      required: false,
      kind: "textarea",
      rows: 2,
    },
  ];
}

export function VaccineStep({ submitterType, initialData, onNext, onBack }: VaccineStepProps) {
  const schema = vaccineSchema(submitterType);
  const initial = initialData ?? EMPTY;
  const { values, setValue, errors, validate } = useStepForm(schema, initial);
  const isHcp = submitterType === "hcp";
  const fields = vaccineFieldSpecs(isHcp);

  return (
    <ConversationalStep
      stepTitle="Vaccine information"
      fields={fields}
      values={values as unknown as Record<string, unknown>}
      setValue={(id, value) => setValue(id as keyof VaccineData, value as any)}
      errors={errors}
      validate={validate}
      onNext={onNext}
      onBack={onBack}
      initialIndex={schema.safeParse(initial).success ? fields.length : 0}
    />
  );
}
