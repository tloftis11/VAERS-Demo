import {
  vaccineSchema,
  VACCINE_TYPES,
  VACCINE_TYPES_HCP,
  DOSE_NUMBER_OPTIONS,
  ROUTE_OPTIONS,
  getBodySiteOptionsForRoute,
  FACILITY_TYPE_OPTIONS,
  STATE_OR_FOREIGN_OPTIONS,
  getManufacturerOptions,
  getManufacturerOptionsForHcpVaccine,
  isBlankAdditionalVaccineRow,
  isBlankPriorVaccineRow,
} from "../../../../shared/src/schemas";
import { suggestBodySiteMismatch, isDateBefore, todayIsoDate } from "../../../../shared/src/liveChecks";
import type { SubmitterType } from "../../../../shared/src/branchingRules";
import type { VaccineData, VaccineOption, AdditionalVaccineRow, PriorVaccineRow } from "../../api/client";
import { useEffect, useRef } from "react";
import { useStepForm } from "../../hooks/useStepForm";
import { useVaccineOptions } from "../../hooks/useVaccineOptions";
import { Combobox } from "../../components/Combobox";
import { ConversationalStep, type ConversationalFieldSpec } from "../../components/ConversationalStep";
import { AddressFieldGroup, formatAddressSummary } from "../../components/AddressFieldGroup";

const OTHER_OR_FOREIGN = new Set(["other", "foreign"]);

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
  bodySiteOther: "",
  administeringFacility: "",
  facilityStreet: "",
  facilityCity: "",
  facilityState: "",
  facilityZip: "",
  facilityPhone: "",
  facilityFax: "",
  facilityType: "",
  facilityTypeOther: "",
  otherVaccinesRecent: "",
  otherVaccinesSameVisit: "",
  additionalVaccines: [],
  priorVaccines: [],
};

const EMPTY_ADDITIONAL_VACCINE: AdditionalVaccineRow = {
  vaccineType: "",
  vaccineTypeOther: "",
  manufacturer: "",
  lotNumber: "",
  route: "",
  bodySite: "",
  bodySiteOther: "",
  doseNumber: "",
};

function describeAdditionalVaccineError(relativePath: string, message: string): string {
  const [rowIndexStr, field] = relativePath.split(".");
  const rowNumber = Number(rowIndexStr) + 2;
  if (field === "vaccineType") return `Additional vaccine ${rowNumber}: select a vaccine.`;
  if (field === "vaccineTypeOther") return `Additional vaccine ${rowNumber}: enter the vaccine name.`;
  if (field === "bodySiteOther") return `Additional vaccine ${rowNumber}: describe where it was given.`;
  return `Additional vaccine ${rowNumber}: ${message}`;
}

const EMPTY_PRIOR_VACCINE: PriorVaccineRow = {
  vaccineType: "",
  vaccineTypeOther: "",
  manufacturer: "",
  lotNumber: "",
  route: "",
  bodySite: "",
  bodySiteOther: "",
  doseNumber: "",
  administrationDate: "",
};

function describePriorVaccineError(relativePath: string, message: string): string {
  const [rowIndexStr, field] = relativePath.split(".");
  const rowNumber = Number(rowIndexStr) + 1;
  if (field === "vaccineType") return `Prior vaccine ${rowNumber}: select a vaccine.`;
  if (field === "vaccineTypeOther") return `Prior vaccine ${rowNumber}: enter the vaccine name.`;
  if (field === "bodySiteOther") return `Prior vaccine ${rowNumber}: describe where it was given.`;
  return `Prior vaccine ${rowNumber}: ${message}`;
}

/**
 * Field set follows the official VAERS form's "WHICH VACCINES WERE GIVEN"
 * (item 17) and "INFORMATION ABOUT THE FACILITY" (items 15-16) sections —
 * route/body-site options match the real form's own categories (it groups
 * all injection types together rather than asking IM vs. SC, and lists
 * specific limb/side options for body site) rather than clinical shorthand.
 * Exported so the final review and the read-only follow-up lookup can show the same labels.
 *
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
  selectedVaccineType?: string,
  /** Narrows "where was it given?" to sites actually possible for this route. */
  selectedRoute?: string,
  bodySiteOtherValue?: string,
  /** Only needed for the review-summary line — the live wizard's own
   * `render` (attached in the component below) reads current values
   * directly via closure instead. */
  facilityAddressValues?: { city: string; state: string; zip: string }
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
    (() => {
      const manufacturerOptions = isHcp
        ? getManufacturerOptionsForHcpVaccine(selectedVaccineType ?? "")
        : getManufacturerOptions(selectedVaccineType ?? "");
      return {
        id: "manufacturer",
        label: "Manufacturer (optional)",
        required: false,
        kind: "choice" as const,
        // The selected vaccine already names a specific branded product
        // (HCP) or a specific-enough category (public), so this is
        // normally a one-manufacturer pick plus Unknown — a reporter
        // genuinely may not have it on hand even when they know the
        // vaccine itself, so it stays skippable like every other
        // vaccine-detail field here (never required merely because a
        // vaccine was selected).
        options: manufacturerOptions,
        // "Unknown" being the only choice looks broken without an
        // explanation — this is expected for "Other/Not sure" vaccine
        // selections, or an HCP vaccine not in our curated manufacturer
        // list, not a bug.
        hint:
          manufacturerOptions.length === 1
            ? "We don't have a specific manufacturer list for this vaccine."
            : undefined,
      };
    })(),
    {
      id: "lotNumber",
      label: "Lot number (optional)",
      required: false,
      kind: "text",
      hint: "Check your vaccination card if you have it — otherwise leave blank.",
    },
    { id: "route", label: "How was it given? (optional)", required: false, kind: "choice", options: ROUTE_OPTIONS },
    {
      id: "bodySite",
      label: "Where was it given? (optional)",
      required: false,
      kind: "choice",
      options: getBodySiteOptionsForRoute(selectedRoute ?? ""),
      hint: "Selecting \"Other\" adds a field to describe it, right here.",
      alsoValidates: ["bodySiteOther"],
      // Selecting "Other" reveals the inline description field below (via
      // extras.bodySite) — auto-advancing straight past it, like every
      // other option here does, would mean the reporter never sees that
      // field appear on this screen at all.
      optionsRequiringFollowUp: ["other"],
      formatSummary: (value) => {
        const opts = getBodySiteOptionsForRoute(selectedRoute ?? "");
        const label = opts.find((o) => o.value === value)?.label ?? String(value);
        return value === "other" && bodySiteOtherValue ? `${label} (${bodySiteOtherValue})` : label;
      },
    },
  ];
  fields.push(
    { id: "administeringFacility", label: "Facility or clinic name (optional)", required: false, kind: "text" },
    {
      id: "facilityStreet",
      label: "Facility address (optional)",
      required: false,
      kind: "custom",
      // Folds city/state/zip into this same question (see the `render`
      // attached in the component below) — one screen instead of four,
      // with real autoComplete attributes for browser address autofill.
      alsoValidates: ["facilityCity", "facilityState", "facilityZip"],
      describeError: (relativePath, message) => {
        if (relativePath === "facilityCity") return `Facility city: ${message}`;
        if (relativePath === "facilityState") return `Facility state: ${message}`;
        if (relativePath === "facilityZip") return `Facility ZIP: ${message}`;
        return message;
      },
      formatSummary: (streetValue) =>
        facilityAddressValues
          ? formatAddressSummary({
              street: (streetValue as string) ?? "",
              ...facilityAddressValues,
              stateOptions: STATE_OR_FOREIGN_OPTIONS,
            })
          : String(streetValue ?? ""),
    },
    {
      id: "facilityPhone",
      label: "Facility phone (optional)",
      required: false,
      kind: "tel",
      autoComplete: "tel",
      hint: "e.g. (404) 555-1212 or +1 404 555 1212.",
    },
    { id: "facilityFax", label: "Facility fax (optional)", required: false, kind: "tel" },
    {
      id: "facilityType",
      label: "Type of facility (optional)",
      required: false,
      kind: "choice",
      options: FACILITY_TYPE_OPTIONS,
    },
    { id: "facilityTypeOther", label: "Please describe the type of facility", required: false, kind: "text" }
  );
  // Same structured, repeatable-row format for every submitter type — not
  // just HCP — so "what else did you get" is captured with the same
  // vaccine/manufacturer/lot/route/site/dose detail regardless of who's
  // reporting, instead of a public reporter's answer landing as a single
  // unparseable paragraph of free text. The vaccine-type options list still
  // differs by path (plain-language for public, full brand list for HCP —
  // see `vaccineTypeOptions` above), matching the primary vaccine question.
  // Same-visit vaccines are asked before prior-month ones (matches the real
  // form's own item order: item 17 before item 22).
  fields.push(
    {
      id: "additionalVaccines",
      label: "Additional vaccines given at this same visit (optional)",
      required: false,
      kind: "custom",
      // A completely blank row (added, then never touched) is silently
      // dropped at submit time — counting it here too would show "2
      // additional vaccines" when only 1 will actually be saved.
      formatSummary: (v) => {
        const count = (v as AdditionalVaccineRow[]).filter((row) => !isBlankAdditionalVaccineRow(row)).length;
        return count === 0 ? "" : `${count} additional vaccine${count === 1 ? "" : "s"}`;
      },
      describeError: describeAdditionalVaccineError,
    },
    {
      id: "priorVaccines",
      label: "Other vaccines received in the month before the vaccination you're reporting (optional)",
      required: false,
      kind: "custom",
      formatSummary: (v) => {
        const count = (v as PriorVaccineRow[]).filter((row) => !isBlankPriorVaccineRow(row)).length;
        return count === 0 ? "" : `${count} prior vaccine${count === 1 ? "" : "s"}`;
      },
      describeError: describePriorVaccineError,
    }
  );
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
  const fields = (liveVaccineTypeOptions
    ? vaccineFieldSpecs(
        isHcp,
        vaccineTypeOptions,
        values.vaccineType as string,
        values.route as string,
        values.bodySiteOther as string,
        { city: values.facilityCity, state: values.facilityState, zip: values.facilityZip }
      )
    : []
  )
    .filter((f) => {
      if (f.id === "vaccineTypeOther") return values.vaccineType === "other" || values.vaccineType === "foreign";
      if (f.id === "facilityTypeOther") return values.facilityType === "other";
      return true;
    })
    .map((f) => {
      // render is attached here, not in vaccineFieldSpecs, since it needs
      // the live vaccineTypeOptions list in scope.
      if (f.id === "additionalVaccines") {
        return {
          ...f,
          render: (value: unknown, onChange: (v: unknown) => void, rowErrors: Record<string, string>) => (
            <AdditionalVaccinesEditor
              value={value}
              onChange={onChange}
              vaccineTypeOptions={vaccineTypeOptions}
              isHcp={isHcp}
              errors={rowErrors}
            />
          ),
        };
      }
      if (f.id === "priorVaccines") {
        return {
          ...f,
          render: (value: unknown, onChange: (v: unknown) => void, rowErrors: Record<string, string>) => (
            <PriorVaccinesEditor
              value={value}
              onChange={onChange}
              vaccineTypeOptions={vaccineTypeOptions}
              isHcp={isHcp}
              errors={rowErrors}
            />
          ),
        };
      }
      if (f.id === "facilityStreet") {
        return {
          ...f,
          render: (streetValue: unknown, onStreetChange: (v: unknown) => void) => (
            <AddressFieldGroup
              idPrefix="facility"
              streetLabel="Facility street address"
              streetHint="e.g. 123 Main St, Suite 200"
              street={streetValue as string}
              onStreetChange={onStreetChange}
              streetError={errors.facilityStreet}
              city={values.facilityCity}
              onCityChange={(v) => handleSetValue("facilityCity", v)}
              cityError={errors.facilityCity}
              state={values.facilityState}
              onStateChange={(v) => handleSetValue("facilityState", v)}
              stateOptions={STATE_OR_FOREIGN_OPTIONS}
              stateError={errors.facilityState}
              zip={values.facilityZip}
              onZipChange={(v) => handleSetValue("facilityZip", v)}
              zipError={errors.facilityZip}
            />
          ),
        };
      }
      return f;
    });
  const siteMismatch = suggestBodySiteMismatch(values.route, values.bodySite);

  function handleSetValue(id: string, value: unknown) {
    setValue(id as keyof VaccineData, value as any);
    if (id === "facilityType" && value !== "other") setValue("facilityTypeOther", "");
    // A body site that's no longer possible for the newly-selected route
    // (e.g. switching from "injection" to "oral" with "Left arm" already
    // picked) shouldn't linger as a stale, now-nonsensical answer.
    if (id === "route") {
      const stillValid = getBodySiteOptionsForRoute(String(value)).some((o) => o.value === values.bodySite);
      if (!stillValid) {
        setValue("bodySite", "");
        setValue("bodySiteOther", "");
      }
    }
    if (id === "bodySite" && value !== "other") setValue("bodySiteOther", "");
    // Same idea for the primary vaccine — changing it can leave a
    // manufacturer or "please specify" detail behind that no longer makes
    // sense for the new selection (matches the same clearing already done
    // per-row in AdditionalVaccinesEditor/PriorVaccinesEditor below).
    if (id === "vaccineType") {
      const newVaccineType = String(value);
      if (!OTHER_OR_FOREIGN.has(newVaccineType)) setValue("vaccineTypeOther", "");
      const manufacturerOptions = isHcp
        ? getManufacturerOptionsForHcpVaccine(newVaccineType)
        : getManufacturerOptions(newVaccineType);
      const stillValidManufacturer = manufacturerOptions.some((o) => o.value === values.manufacturer);
      if (!stillValidManufacturer) setValue("manufacturer", "");
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
        bodySite: () => (
          <>
            {siteMismatch && (
              <p role="status" className="field__advisory">
                {siteMismatch}
              </p>
            )}
            {values.bodySite === "other" && (
              <div className="field field--nested">
                <label className="field__label" htmlFor="body-site-other-input">
                  Describe where it was given
                </label>
                <input
                  id="body-site-other-input"
                  className="field__input"
                  value={values.bodySiteOther}
                  onChange={(e) => handleSetValue("bodySiteOther", e.target.value)}
                  aria-invalid={!!errors.bodySiteOther}
                  aria-describedby={errors.bodySiteOther ? "body-site-other-error" : undefined}
                />
                {errors.bodySiteOther && (
                  <p id="body-site-other-error" role="alert" className="field__error">
                    {errors.bodySiteOther}
                  </p>
                )}
              </div>
            )}
          </>
        ),
      }}
    />
  );
}

// ---- Bundled repeatable-row editors (kind "custom" — see ConversationalStep) ----

export function AdditionalVaccinesEditor({
  value,
  onChange,
  vaccineTypeOptions,
  isHcp,
  errors,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  vaccineTypeOptions: readonly VaccineOption[];
  isHcp: boolean;
  errors: Record<string, string>;
}) {
  const rows = (value as AdditionalVaccineRow[] | undefined) ?? [];
  const hasFocusedRef = useRef(false);

  function updateRow(index: number, patch: Partial<AdditionalVaccineRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function selectVaccineType(index: number, newValue: string) {
    updateRow(index, {
      vaccineType: newValue,
      manufacturer: "",
      // "Other"/"Foreign" free text is only meaningful for those two
      // selections — clear it the moment the row moves to anything else so
      // a stale name from a prior choice never lingers or gets submitted.
      ...(OTHER_OR_FOREIGN.has(newValue) ? {} : { vaccineTypeOther: "" }),
    });
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  // Move focus to the first row/field with an error the first time this
  // editor sees one — e.g. after the reporter clicks a review-summary error
  // and lands back on this question. Runs once per error set, not on every
  // keystroke (guarded by hasFocusedRef, reset whenever errors go away).
  useEffect(() => {
    const errorKeys = Object.keys(errors);
    if (errorKeys.length === 0) {
      hasFocusedRef.current = false;
      return;
    }
    if (hasFocusedRef.current) return;
    hasFocusedRef.current = true;
    const [firstRowIndex, firstField] = errorKeys[0].split(".");
    const targetId =
      firstField === "vaccineType"
        ? `additional-${firstRowIndex}-type`
        : `additional-${firstRowIndex}-type-other`;
    document.getElementById(targetId)?.focus();
  }, [errors]);

  return (
    <div className="vaccine-rows">
      {rows.map((row, i) => {
        // Mirrors the primary vaccine question's own manufacturer matching
        // (vaccineFieldSpecs above) — a public reporter's row uses the
        // simplified plain-language vaccine codes, so it must resolve
        // manufacturers through the same public-path function, not the
        // HCP one (which expects the full clinical brand codes and would
        // otherwise silently fall through to "Unknown" for every row).
        const manufacturerOptions = isHcp
          ? getManufacturerOptionsForHcpVaccine(row.vaccineType)
          : getManufacturerOptions(row.vaccineType);
        const typeError = errors[`${i}.vaccineType`];
        const typeOtherError = errors[`${i}.vaccineTypeOther`];
        const typeErrorId = `additional-${i}-type-error`;
        const typeOtherErrorId = `additional-${i}-type-other-error`;
        return (
          <div className="vaccine-row" key={i}>
            <div className="vaccine-row__header">
              <span>Vaccine {i + 2}</span>
              <button type="button" className="button button--text" onClick={() => removeRow(i)}>
                Remove
              </button>
            </div>
            <div className="vaccine-row__grid">
              <div className="field">
                <label className="field__label" id={`additional-${i}-type-label`}>
                  Vaccine
                </label>
                <Combobox
                  id={`additional-${i}-type`}
                  options={vaccineTypeOptions}
                  value={row.vaccineType}
                  labelledBy={`additional-${i}-type-label`}
                  onSelect={(v) => selectVaccineType(i, v)}
                  invalid={!!typeError}
                  describedBy={typeError ? typeErrorId : undefined}
                />
                {typeError && (
                  <p id={typeErrorId} role="alert" className="field__error">
                    {typeError}
                  </p>
                )}
              </div>
              {OTHER_OR_FOREIGN.has(row.vaccineType) && (
                <div className="field">
                  <label className="field__label" htmlFor={`additional-${i}-type-other`}>
                    Please specify the vaccine
                  </label>
                  <input
                    id={`additional-${i}-type-other`}
                    className="field__input"
                    value={row.vaccineTypeOther}
                    onChange={(e) => updateRow(i, { vaccineTypeOther: e.target.value })}
                    aria-invalid={!!typeOtherError}
                    aria-describedby={typeOtherError ? typeOtherErrorId : undefined}
                  />
                  {typeOtherError && (
                    <p id={typeOtherErrorId} role="alert" className="field__error">
                      {typeOtherError}
                    </p>
                  )}
                </div>
              )}
              <div className="field">
                <label className="field__label" htmlFor={`additional-${i}-manufacturer`}>
                  Manufacturer
                </label>
                <select
                  id={`additional-${i}-manufacturer`}
                  className="field__select"
                  value={row.manufacturer}
                  onChange={(e) => updateRow(i, { manufacturer: e.target.value })}
                >
                  <option value="">Select…</option>
                  {manufacturerOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {manufacturerOptions.length === 1 && (
                  <p className="field__hint">We don't have a specific manufacturer list for this vaccine.</p>
                )}
              </div>
              <div className="field">
                <label className="field__label" htmlFor={`additional-${i}-lot`}>
                  Lot number
                </label>
                <input
                  id={`additional-${i}-lot`}
                  className="field__input"
                  value={row.lotNumber}
                  onChange={(e) => updateRow(i, { lotNumber: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor={`additional-${i}-route`}>
                  How was it given? (optional)
                </label>
                <select
                  id={`additional-${i}-route`}
                  className="field__select"
                  value={row.route}
                  onChange={(e) => {
                    const newRoute = e.target.value;
                    const stillValid = getBodySiteOptionsForRoute(newRoute).some((o) => o.value === row.bodySite);
                    updateRow(i, {
                      route: newRoute,
                      ...(stillValid ? {} : { bodySite: "", bodySiteOther: "" }),
                    });
                  }}
                >
                  <option value="">Select…</option>
                  {ROUTE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field__label" htmlFor={`additional-${i}-site`}>
                  Where was it given? (optional)
                </label>
                <select
                  id={`additional-${i}-site`}
                  className="field__select"
                  value={row.bodySite}
                  onChange={(e) => {
                    const newBodySite = e.target.value;
                    updateRow(i, {
                      bodySite: newBodySite,
                      ...(newBodySite === "other" ? {} : { bodySiteOther: "" }),
                    });
                  }}
                >
                  <option value="">Select…</option>
                  {getBodySiteOptionsForRoute(row.route).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {row.bodySite === "other" && (
                  <div className="field field--nested">
                    <label className="field__label" htmlFor={`additional-${i}-site-other`}>
                      Describe where it was given
                    </label>
                    <input
                      id={`additional-${i}-site-other`}
                      className="field__input"
                      value={row.bodySiteOther}
                      onChange={(e) => updateRow(i, { bodySiteOther: e.target.value })}
                      aria-invalid={!!errors[`${i}.bodySiteOther`]}
                    />
                    {errors[`${i}.bodySiteOther`] && (
                      <p role="alert" className="field__error">
                        {errors[`${i}.bodySiteOther`]}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="field">
                <label className="field__label" htmlFor={`additional-${i}-dose`}>
                  Dose number (optional)
                </label>
                <select
                  id={`additional-${i}-dose`}
                  className="field__select"
                  value={row.doseNumber}
                  onChange={(e) => updateRow(i, { doseNumber: e.target.value })}
                >
                  <option value="">Select…</option>
                  {DOSE_NUMBER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );
      })}
      <button
        type="button"
        className="button button--secondary"
        onClick={() => onChange([...rows, { ...EMPTY_ADDITIONAL_VACCINE }])}
      >
        + Add another vaccine
      </button>
    </div>
  );
}

/**
 * Same vaccine/manufacturer/lot/route/site/dose detail as
 * AdditionalVaccinesEditor above (item 17), plus its own administration
 * date — a prior vaccine happened at a different, independently-relevant
 * time rather than sharing the primary vaccine's visit date. Deliberately a
 * near-duplicate of that editor rather than a shared component: the two
 * differ only in row id prefix, row label, and the extra date field, and
 * AdditionalVaccinesEditor already has dedicated component tests pinned to
 * its exact DOM (ids, row labels) that a shared abstraction risks disturbing
 * for no real benefit.
 */
function PriorVaccinesEditor({
  value,
  onChange,
  vaccineTypeOptions,
  isHcp,
  errors,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  vaccineTypeOptions: readonly VaccineOption[];
  isHcp: boolean;
  errors: Record<string, string>;
}) {
  const rows = (value as PriorVaccineRow[] | undefined) ?? [];
  const hasFocusedRef = useRef(false);

  function updateRow(index: number, patch: Partial<PriorVaccineRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function selectVaccineType(index: number, newValue: string) {
    updateRow(index, {
      vaccineType: newValue,
      manufacturer: "",
      ...(OTHER_OR_FOREIGN.has(newValue) ? {} : { vaccineTypeOther: "" }),
    });
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  useEffect(() => {
    const errorKeys = Object.keys(errors);
    if (errorKeys.length === 0) {
      hasFocusedRef.current = false;
      return;
    }
    if (hasFocusedRef.current) return;
    hasFocusedRef.current = true;
    const [firstRowIndex, firstField] = errorKeys[0].split(".");
    const targetId = firstField === "vaccineType" ? `prior-${firstRowIndex}-type` : `prior-${firstRowIndex}-type-other`;
    document.getElementById(targetId)?.focus();
  }, [errors]);

  return (
    <div className="vaccine-rows">
      {rows.map((row, i) => {
        // See the identical comment in AdditionalVaccinesEditor above —
        // must match the reporter's own path (public vs. HCP), not always
        // the HCP function, or a public reporter's row silently collapses
        // to "Unknown" regardless of the vaccine actually selected.
        const manufacturerOptions = isHcp
          ? getManufacturerOptionsForHcpVaccine(row.vaccineType)
          : getManufacturerOptions(row.vaccineType);
        const typeError = errors[`${i}.vaccineType`];
        const typeOtherError = errors[`${i}.vaccineTypeOther`];
        const typeErrorId = `prior-${i}-type-error`;
        const typeOtherErrorId = `prior-${i}-type-other-error`;
        return (
          <div className="vaccine-row" key={i}>
            <div className="vaccine-row__header">
              <span>Prior vaccine {i + 1}</span>
              <button type="button" className="button button--text" onClick={() => removeRow(i)}>
                Remove
              </button>
            </div>
            <div className="vaccine-row__grid">
              <div className="field">
                <label className="field__label" id={`prior-${i}-type-label`}>
                  Vaccine
                </label>
                <Combobox
                  id={`prior-${i}-type`}
                  options={vaccineTypeOptions}
                  value={row.vaccineType}
                  labelledBy={`prior-${i}-type-label`}
                  onSelect={(v) => selectVaccineType(i, v)}
                  invalid={!!typeError}
                  describedBy={typeError ? typeErrorId : undefined}
                />
                {typeError && (
                  <p id={typeErrorId} role="alert" className="field__error">
                    {typeError}
                  </p>
                )}
              </div>
              {OTHER_OR_FOREIGN.has(row.vaccineType) && (
                <div className="field">
                  <label className="field__label" htmlFor={`prior-${i}-type-other`}>
                    Please specify the vaccine
                  </label>
                  <input
                    id={`prior-${i}-type-other`}
                    className="field__input"
                    value={row.vaccineTypeOther}
                    onChange={(e) => updateRow(i, { vaccineTypeOther: e.target.value })}
                    aria-invalid={!!typeOtherError}
                    aria-describedby={typeOtherError ? typeOtherErrorId : undefined}
                  />
                  {typeOtherError && (
                    <p id={typeOtherErrorId} role="alert" className="field__error">
                      {typeOtherError}
                    </p>
                  )}
                </div>
              )}
              <div className="field">
                <label className="field__label" htmlFor={`prior-${i}-manufacturer`}>
                  Manufacturer
                </label>
                <select
                  id={`prior-${i}-manufacturer`}
                  className="field__select"
                  value={row.manufacturer}
                  onChange={(e) => updateRow(i, { manufacturer: e.target.value })}
                >
                  <option value="">Select…</option>
                  {manufacturerOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {manufacturerOptions.length === 1 && (
                  <p className="field__hint">We don't have a specific manufacturer list for this vaccine.</p>
                )}
              </div>
              <div className="field">
                <label className="field__label" htmlFor={`prior-${i}-lot`}>
                  Lot number
                </label>
                <input
                  id={`prior-${i}-lot`}
                  className="field__input"
                  value={row.lotNumber}
                  onChange={(e) => updateRow(i, { lotNumber: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor={`prior-${i}-route`}>
                  How was it given? (optional)
                </label>
                <select
                  id={`prior-${i}-route`}
                  className="field__select"
                  value={row.route}
                  onChange={(e) => {
                    const newRoute = e.target.value;
                    const stillValid = getBodySiteOptionsForRoute(newRoute).some((o) => o.value === row.bodySite);
                    updateRow(i, {
                      route: newRoute,
                      ...(stillValid ? {} : { bodySite: "", bodySiteOther: "" }),
                    });
                  }}
                >
                  <option value="">Select…</option>
                  {ROUTE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field__label" htmlFor={`prior-${i}-site`}>
                  Where was it given? (optional)
                </label>
                <select
                  id={`prior-${i}-site`}
                  className="field__select"
                  value={row.bodySite}
                  onChange={(e) => {
                    const newBodySite = e.target.value;
                    updateRow(i, {
                      bodySite: newBodySite,
                      ...(newBodySite === "other" ? {} : { bodySiteOther: "" }),
                    });
                  }}
                >
                  <option value="">Select…</option>
                  {getBodySiteOptionsForRoute(row.route).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {row.bodySite === "other" && (
                  <div className="field field--nested">
                    <label className="field__label" htmlFor={`prior-${i}-site-other`}>
                      Describe where it was given
                    </label>
                    <input
                      id={`prior-${i}-site-other`}
                      className="field__input"
                      value={row.bodySiteOther}
                      onChange={(e) => updateRow(i, { bodySiteOther: e.target.value })}
                      aria-invalid={!!errors[`${i}.bodySiteOther`]}
                    />
                    {errors[`${i}.bodySiteOther`] && (
                      <p role="alert" className="field__error">
                        {errors[`${i}.bodySiteOther`]}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="field">
                <label className="field__label" htmlFor={`prior-${i}-dose`}>
                  Dose number (optional)
                </label>
                <select
                  id={`prior-${i}-dose`}
                  className="field__select"
                  value={row.doseNumber}
                  onChange={(e) => updateRow(i, { doseNumber: e.target.value })}
                >
                  <option value="">Select…</option>
                  {DOSE_NUMBER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field__label" htmlFor={`prior-${i}-date`}>
                  Date administered (optional)
                </label>
                <input
                  id={`prior-${i}-date`}
                  type="date"
                  className="field__input"
                  max={todayIsoDate()}
                  value={row.administrationDate}
                  onChange={(e) => updateRow(i, { administrationDate: e.target.value })}
                />
              </div>
            </div>
          </div>
        );
      })}
      <button
        type="button"
        className="button button--secondary"
        onClick={() => onChange([...rows, { ...EMPTY_PRIOR_VACCINE }])}
      >
        + Add another vaccine
      </button>
    </div>
  );
}
