import {
  vaccineSchema,
  VACCINE_TYPES,
  VACCINE_TYPES_HCP,
  DOSE_NUMBER_OPTIONS,
  ROUTE_OPTIONS,
  BODY_SITE_OPTIONS,
  FACILITY_TYPE_OPTIONS,
  getManufacturerOptions,
} from "../../../../shared/src/schemas";
import { suggestBodySiteMismatch, isDateBefore, todayIsoDate } from "../../../../shared/src/liveChecks";
import type { SubmitterType } from "../../../../shared/src/branchingRules";
import type { VaccineData, VaccineOption } from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { useVaccineOptions } from "../../hooks/useVaccineOptions";
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
  otherVaccinesRecentGiven: false,
  otherVaccinesRecent: "",
  otherVaccinesSameVisit: "",
  vaccine2Given: false,
  vaccine2Type: "",
  vaccine2Manufacturer: "",
  vaccine2LotNumber: "",
  vaccine2Route: "",
  vaccine2BodySite: "",
  vaccine2DoseNumber: "",
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
/**
 * `vaccineTypeOptions` defaults to the static seed lists (used by ReviewStep
 * and the read-only follow-up lookup, which only need to resolve a label for
 * an already-submitted value). The live wizard step passes the freshly
 * fetched /api/vaccine-options list instead, so admin-added vaccines show up
 * without a redeploy — see useVaccineOptions.
 */
export function vaccineFieldSpecs(
  isHcp: boolean,
  vaccineTypeOptions: readonly VaccineOption[] = isHcp ? VACCINE_TYPES_HCP : VACCINE_TYPES,
  /** Only used to seed the public path's manufacturer picklist (see below) — unused for HCP. */
  selectedVaccineType?: string
): ConversationalFieldSpec[] {
  const fields: ConversationalFieldSpec[] = [
    {
      id: "vaccineType",
      label: "Vaccine",
      required: true,
      kind: "choice",
      // HCP reporters plausibly have the exact product on hand — give them
      // the real system's full clinical brand list. A public reporter
      // usually doesn't, and forcing that choice just produces guesses or
      // "Unknown", so they get plain-language categories instead.
      options: vaccineTypeOptions,
      icon: "vaccine",
    },
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
    isHcp
      ? { id: "manufacturer", label: "Manufacturer", required: true, kind: "text" }
      : {
          id: "manufacturer",
          label: "Manufacturer (optional)",
          required: false,
          kind: "choice",
          // A public reporter picked a plain-language category, not a brand —
          // seed the picklist with just the manufacturers that actually make
          // that vaccine, so this is a quick pick instead of a guessing game.
          options: getManufacturerOptions(selectedVaccineType ?? ""),
        },
    {
      id: "lotNumber",
      label: "Lot number",
      required: isHcp,
      kind: "text",
      hint: !isHcp ? "Check your vaccination card if you have it — otherwise leave blank." : undefined,
    },
    { id: "route", label: "How was it given? (optional)", required: false, kind: "choice", options: ROUTE_OPTIONS },
    { id: "bodySite", label: "Where was it given? (optional)", required: false, kind: "choice", options: BODY_SITE_OPTIONS },
  ];
  // HCP-only second-vaccine slot (see vaccine2Given in shared/src/schemas.ts)
  // — its own sequential yes/no question followed by the same shape of
  // questions asked for vaccine 1, rather than a checkbox bolted onto the
  // bodySite question (which read as one omnibus block instead of a
  // genuine second pass through "which vaccine, given how").
  if (isHcp) {
    fields.push(
      {
        id: "vaccine2Given",
        label: "Did you administer another vaccine at this same visit?",
        required: false,
        kind: "choice",
        options: [
          { value: "true", label: "Yes" },
          { value: "false", label: "No" },
        ],
      },
      { id: "vaccine2Type", label: "Second vaccine", required: false, kind: "choice", options: vaccineTypeOptions },
      { id: "vaccine2Manufacturer", label: "Manufacturer (second vaccine)", required: false, kind: "text" },
      { id: "vaccine2LotNumber", label: "Lot number (second vaccine)", required: false, kind: "text" },
      {
        id: "vaccine2Route",
        label: "How was the second vaccine given? (optional)",
        required: false,
        kind: "choice",
        options: ROUTE_OPTIONS,
      },
      {
        id: "vaccine2BodySite",
        label: "Where was the second vaccine given? (optional)",
        required: false,
        kind: "choice",
        options: BODY_SITE_OPTIONS,
      },
      {
        id: "vaccine2DoseNumber",
        label: "Dose number for the second vaccine (optional)",
        required: false,
        kind: "choice",
        options: DOSE_NUMBER_OPTIONS,
      }
    );
  }
  fields.push(
    { id: "administeringFacility", label: "Facility or clinic name (optional)", required: false, kind: "text" },
    {
      id: "facilityType",
      label: "Type of facility (optional)",
      required: false,
      kind: "choice",
      options: FACILITY_TYPE_OPTIONS,
    }
  );
  if (isHcp) {
    fields.push(
      {
        id: "otherVaccinesRecentGiven",
        label: "Did the patient receive any other vaccines in the month before this one?",
        required: false,
        kind: "choice",
        options: [
          { value: "true", label: "Yes" },
          { value: "false", label: "No" },
        ],
      },
      {
        id: "otherVaccinesRecent",
        label: "Which vaccine(s), and when?",
        required: false,
        kind: "textarea",
        rows: 2,
      }
    );
  } else {
    fields.push(
      {
        id: "otherVaccinesRecent",
        label: "Any other vaccines received in the month before this one? (optional)",
        required: false,
        kind: "textarea",
        rows: 2,
      },
      {
        id: "otherVaccinesSameVisit",
        label: "Did you receive any other vaccines at this same visit? If so, which ones? (optional)",
        required: false,
        kind: "textarea",
        rows: 2,
      }
    );
  }
  return fields;
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
  const liveVaccineTypeOptions = useVaccineOptions(isHcp ? "hcp" : "public");
  // A required choice field must never end up with zero options — if the
  // live fetch is still loading, still gate on that (below), but once it
  // resolves, an empty result (server unreachable, or a freshly-deployed
  // database that hasn't been seeded yet) falls back to the static list
  // rather than leaving the reporter stuck on a blank, un-skippable question.
  const vaccineTypeOptions =
    liveVaccineTypeOptions && liveVaccineTypeOptions.length > 0
      ? liveVaccineTypeOptions
      : isHcp
        ? VACCINE_TYPES_HCP
        : VACCINE_TYPES;
  // vaccine2Given/otherVaccinesRecentGiven are "choice" fields using string
  // option values "true"/"false" (ConversationalOption.value must be a
  // string) — comparing with a naive Boolean(...) would treat the string
  // "false" as truthy, so check explicitly against both the real boolean
  // and the "true" string the schema's transform also accepts.
  const isYes = (v: unknown) => v === true || v === "true";
  const vaccine2Given = isHcp && isYes(values.vaccine2Given);
  const otherVaccinesRecentGiven = isHcp && isYes(values.otherVaccinesRecentGiven);
  const fields = (liveVaccineTypeOptions
    ? vaccineFieldSpecs(isHcp, vaccineTypeOptions, values.vaccineType as string)
    : []
  ).filter((f) => {
    if (f.id === "vaccineTypeOther") return values.vaccineType === "other" || values.vaccineType === "foreign";
    if (f.id !== "vaccine2Given" && f.id.startsWith("vaccine2")) return vaccine2Given;
    if (f.id === "otherVaccinesRecent" && isHcp) return otherVaccinesRecentGiven;
    return true;
  });
  const siteMismatch = suggestBodySiteMismatch(values.route, values.bodySite);

  function handleSetValue(id: string, value: unknown) {
    setValue(id as keyof VaccineData, value as any);
    // Answering "no" (or clearing) shouldn't leave a stale, now-hidden answer
    // behind to be silently submitted once its gate is off again.
    if (id === "vaccine2Given" && !isYes(value)) {
      setValue("vaccine2Type", "");
      setValue("vaccine2Manufacturer", "");
      setValue("vaccine2LotNumber", "");
      setValue("vaccine2Route", "");
      setValue("vaccine2BodySite", "");
      setValue("vaccine2DoseNumber", "");
    }
    if (id === "otherVaccinesRecentGiven" && !isYes(value)) {
      setValue("otherVaccinesRecent", "");
    }
  }

  function checkFieldLogic(fieldId: string, liveValues: Record<string, unknown>): string | null {
    if (fieldId === "administrationDate" && patientDateOfBirth) {
      const administrationDate = String(liveValues.administrationDate ?? "");
      if (administrationDate && isDateBefore(administrationDate, patientDateOfBirth)) {
        return "Vaccination date can't be before the patient's date of birth.";
      }
    }
    return null;
  }

  if (!liveVaccineTypeOptions) {
    return <div className="page">Loading…</div>;
  }

  return (
    <ConversationalStep
      stepTitle="Vaccine information"
      fields={fields}
      values={values as unknown as Record<string, unknown>}
      setValue={handleSetValue}
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
