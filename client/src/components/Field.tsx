import type { ReactNode } from "react";

interface FieldWrapperProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

function describedBy(id: string, hint?: string, error?: string) {
  return [hint ? `${id}-hint` : undefined, error ? `${id}-error` : undefined]
    .filter(Boolean)
    .join(" ") || undefined;
}

function FieldWrapper({ id, label, hint, error, required, children }: FieldWrapperProps) {
  return (
    <div className={`field${error ? " field--error" : ""}`}>
      <label htmlFor={id} className="field__label">
        {label}
        {required && (
          <span aria-hidden="true" className="field__required">
            {" "}
            *
          </span>
        )}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}

interface BaseProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

export function TextField({
  id,
  label,
  hint,
  error,
  required,
  value,
  onChange,
  type = "text",
  autoComplete,
}: BaseProps & { value: string; onChange: (v: string) => void; type?: string; autoComplete?: string }) {
  return (
    <FieldWrapper id={id} label={label} hint={hint} error={error} required={required}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={describedBy(id, hint, error)}
        aria-invalid={!!error}
        aria-required={required}
        className="field__input"
        autoComplete={autoComplete}
      />
    </FieldWrapper>
  );
}

export function TextAreaField({
  id,
  label,
  hint,
  error,
  required,
  value,
  onChange,
  rows = 4,
}: BaseProps & { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <FieldWrapper id={id} label={label} hint={hint} error={error} required={required}>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={describedBy(id, hint, error)}
        aria-invalid={!!error}
        aria-required={required}
        className="field__textarea"
      />
    </FieldWrapper>
  );
}

export function SelectField({
  id,
  label,
  hint,
  error,
  required,
  value,
  onChange,
  options,
  placeholder = "Select…",
}: BaseProps & {
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <FieldWrapper id={id} label={label} hint={hint} error={error} required={required}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={describedBy(id, hint, error)}
        aria-invalid={!!error}
        aria-required={required}
        className="field__select"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}

export function CheckboxGroupField({
  legend,
  hint,
  error,
  required,
  value,
  onChange,
  options,
}: {
  legend: string;
  hint?: string;
  error?: string;
  required?: boolean;
  value: string[];
  onChange: (v: string[]) => void;
  options: readonly { value: string; label: string }[];
}) {
  const groupId = legend.toLowerCase().replace(/\s+/g, "-");
  function toggle(optionValue: string) {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  }
  return (
    <fieldset
      className={`field field--checkbox-group${error ? " field--error" : ""}`}
      aria-describedby={describedBy(groupId, hint, error)}
    >
      <legend className="field__label">
        {legend}
        {required && (
          <span aria-hidden="true" className="field__required">
            {" "}
            *
          </span>
        )}
      </legend>
      {hint && (
        <p id={`${groupId}-hint`} className="field__hint">
          {hint}
        </p>
      )}
      <div className="checkbox-group">
        {options.map((opt) => (
          <label key={opt.value} className="checkbox-group__option">
            <input
              type="checkbox"
              checked={value.includes(opt.value)}
              onChange={() => toggle(opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={`${groupId}-error`} role="alert" className="field__error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
