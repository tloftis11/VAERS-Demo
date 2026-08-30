import {
  vaccineSchema,
  VACCINE_TYPES,
  DOSE_NUMBER_OPTIONS,
  ROUTE_OPTIONS,
  BODY_SITE_OPTIONS,
  FACILITY_TYPE_OPTIONS,
} from "../../../../shared/src/schemas";
import { suggestBodySiteMismatch, isDateBefore, todayIsoDate } from "../../../../shared/src/liveChecks";
import type { SubmitterType } from "../../../../shared/src/branchingRules";
import type { VaccineData } from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { ConversationalStep, type ConversationalFieldSpec } from "../../components/ConversationalStep";

interface VaccineStepProps {
  submitterType: SubmitterType;
  initialData: VaccineData | null;
  /** From the Patient step, for a live "vaccination can't precede birth" check — absent when DOB is unknown. */
  patientDateOfBirth?: string;
  onNext: (data: Record<string, unknown>) => Promise<void>;
  onBack: () => void;
}

const EMPTY: VaccineData = {
  vaccineType: "",
  vaccineTypeOther: "",
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
    { id: "vaccineTypeOther", label: "Please specify the vaccine", required: false, kind: "text" },
    {
      id: "administrationDate",
      label: "Date administered",
      required: true,
      kind: "date",
      icon: "calendar",
      max: todayIsoDate(),
    },
    { id: "administrationTime", label: "Time administered (optional)", required: false, kind: "time12" },
    { id: "doseNumber", label: "Dose number (optional)", required: false, kind: "choice", options: DOSE_NUMBER_OPTIONS },
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

export function VaccineStep({
  submitterType,
  initialData,
  patientDateOfBirth,
  onNext,
  onBack,
}: VaccineStepProps) {
  const schema = vaccineSchema(submitterType);
  const initial = initialData ?? EMPTY;
  const { values, setValue, errors, validate } = useStepForm(schema, initial);
  const isHcp = submitterType === "hcp";
  const fields = vaccineFieldSpecs(isHcp).filter(
    (f) => f.id !== "vaccineTypeOther" || values.vaccineType === "other"
  );
  const siteMismatch = suggestBodySiteMismatch(values.route, values.bodySite);

  function checkFieldLogic(fieldId: string, liveValues: Record<string, unknown>): string | null {
    if (fieldId === "administrationDate" && patientDateOfBirth) {
      const administrationDate = String(liveValues.administrationDate ?? "");
      if (administrationDate && isDateBefore(administrationDate, patientDateOfBirth)) {
        return "Vaccination date can't be before the patient's date of birth.";
      }
    }
    return null;
  }

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
      extraFieldValidation={checkFieldLogic}
      extras={{
        bodySite: () =>
          siteMismatch ? (
            <p role="status" className="field__advisory">
              {siteMismatch}
            </p>
          ) : null,
      }}
    />
  );
}
