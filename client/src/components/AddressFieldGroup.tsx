interface StateOption {
  value: string;
  label: string;
}

interface AddressFieldGroupProps {
  /** Distinguishes element ids across the 3 places this renders (mailing/patient/facility). */
  idPrefix: string;
  streetLabel?: string;
  streetHint?: string;
  street: string;
  onStreetChange: (v: string) => void;
  streetError?: string;
  city: string;
  onCityChange: (v: string) => void;
  cityError?: string;
  state: string;
  onStateChange: (v: string) => void;
  stateOptions: readonly StateOption[];
  stateError?: string;
  zip: string;
  onZipChange: (v: string) => void;
  zipError?: string;
  /** Patient address only — mailing/facility don't ask for it. */
  county?: string;
  onCountyChange?: (v: string) => void;
}

/**
 * Street/city/state/zip (plus county where asked) on one screen instead of
 * one question each, with real autoComplete attributes so a browser's own
 * address autofill actually works — "no one is typing complete addresses
 * anymore unless they have to." One shared component for all three address
 * blocks in the app (reporter mailing, patient, facility) rather than
 * three near-duplicate custom-kind field renders, since the layout and
 * autofill behavior are identical across all of them.
 */
export function AddressFieldGroup({
  idPrefix,
  streetLabel = "Street address",
  streetHint,
  street,
  onStreetChange,
  streetError,
  city,
  onCityChange,
  cityError,
  state,
  onStateChange,
  stateOptions,
  stateError,
  zip,
  onZipChange,
  zipError,
  county,
  onCountyChange,
}: AddressFieldGroupProps) {
  return (
    <div className="address-group">
      <div className="field address-group__row">
        <label className="field__label" htmlFor={`${idPrefix}-street`}>
          {streetLabel}
        </label>
        <input
          id={`${idPrefix}-street`}
          className="field__input"
          value={street}
          onChange={(e) => onStreetChange(e.target.value)}
          autoComplete="street-address"
          placeholder={streetHint}
          aria-invalid={!!streetError}
        />
        {streetError && (
          <p role="alert" className="field__error">
            {streetError}
          </p>
        )}
      </div>

      {onCountyChange !== undefined && (
        <div className="field address-group__row">
          <label className="field__label" htmlFor={`${idPrefix}-county`}>
            County
          </label>
          <input
            id={`${idPrefix}-county`}
            className="field__input"
            value={county}
            onChange={(e) => onCountyChange(e.target.value)}
          />
        </div>
      )}

      <div className="address-group__grid">
        <div className="field">
          <label className="field__label" htmlFor={`${idPrefix}-city`}>
            City
          </label>
          <input
            id={`${idPrefix}-city`}
            className="field__input"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            autoComplete="address-level2"
            aria-invalid={!!cityError}
          />
          {cityError && (
            <p role="alert" className="field__error">
              {cityError}
            </p>
          )}
        </div>
        <div className="field">
          <label className="field__label" htmlFor={`${idPrefix}-state`}>
            State
          </label>
          <select
            id={`${idPrefix}-state`}
            className="field__select"
            value={state}
            onChange={(e) => onStateChange(e.target.value)}
            autoComplete="address-level1"
            aria-invalid={!!stateError}
          >
            <option value="">Select…</option>
            {stateOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {stateError && (
            <p role="alert" className="field__error">
              {stateError}
            </p>
          )}
        </div>
        <div className="field">
          <label className="field__label" htmlFor={`${idPrefix}-zip`}>
            ZIP code
          </label>
          <input
            id={`${idPrefix}-zip`}
            className="field__input"
            value={zip}
            onChange={(e) => onZipChange(e.target.value)}
            autoComplete="postal-code"
            aria-invalid={!!zipError}
          />
          {zipError && (
            <p role="alert" className="field__error">
              {zipError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** One readable line for the review screen and read-only follow-up display
 * — the combined question's own formatSummary can't show more than the
 * street value by default, since city/state/zip are separate top-level
 * fields folded into this same question via alsoValidates. */
export function formatAddressSummary(parts: {
  street: string;
  city: string;
  state: string;
  zip: string;
  county?: string;
  stateOptions: readonly StateOption[];
}): string {
  const stateLabel = parts.stateOptions.find((o) => o.value === parts.state)?.label ?? parts.state;
  const line2 = [parts.city, stateLabel, parts.zip].filter(Boolean).join(", ");
  return [parts.street, parts.county, line2].filter(Boolean).join(", ");
}
