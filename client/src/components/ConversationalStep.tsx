import { useState } from "react";
import type { ReactNode } from "react";
import { FieldIcon, type FieldIconName } from "./illustrations";
import { Combobox } from "./Combobox";
import { MultiSelect } from "./MultiSelect";
import { TimeInput12 } from "./TimeInput12";

export type ConversationalFieldKind =
  | "text"
  | "email"
  | "number"
  | "date"
  | "textarea"
  | "select"
  | "choice"
  | "checkboxGroup"
  | "multiSelect"
  | "time12";

export interface ConversationalOption {
  value: string;
  label: string;
}

export interface ConversationalFieldSpec {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  kind: ConversationalFieldKind;
  options?: readonly ConversationalOption[];
  rows?: number;
  icon?: FieldIconName;
  /** For kind "date" — ISO "YYYY-MM-DD" bounds enforced by the native picker itself, not just the schema. */
  min?: string;
  max?: string;
}

interface ConversationalStepProps {
  /** Used only for the "Review: {stepTitle}" heading at the end of this step. */
  stepTitle: string;
  fields: ConversationalFieldSpec[];
  values: Record<string, unknown>;
  setValue: (id: string, value: unknown) => void;
  errors: Record<string, string>;
  validate: () =>
    | { success: true; data: Record<string, unknown> }
    | { success: false; errors: Record<string, string> };
  onNext: (data: Record<string, unknown>) => Promise<void>;
  onBack: () => void;
  /** Where to start: pass fields.length to land directly on the review screen for an already-complete step. */
  initialIndex?: number;
  /** Extra content (e.g. an AI helper action) rendered under one specific active question. */
  extras?: Partial<Record<string, () => ReactNode>>;
  /**
   * Deterministic checks the per-step zod schema can't express — cross-field
   * logic (e.g. "onset can't be before vaccination") or checks that need
   * data from another step. Runs for the active field only, right before
   * advancing; returning a message blocks Next with that message, same as a
   * schema validation failure.
   */
  extraFieldValidation?: (fieldId: string, values: Record<string, unknown>) => string | null;
}

function isEmptyValue(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

export function formatValue(field: ConversationalFieldSpec, value: unknown): string {
  if (isEmptyValue(value)) return "";
  if (Array.isArray(value)) {
    const opts = field.options ?? [];
    return value.map((v) => opts.find((o) => o.value === v)?.label ?? String(v)).join(", ");
  }
  if (field.options) {
    return field.options.find((o) => o.value === value)?.label ?? String(value);
  }
  return String(value);
}

/**
 * Single-question-at-a-time step engine (design doc §4.3, matching the
 * Vercel reference prototype's "Responsive Form" mode). Wraps the same
 * zod-validated values/errors/validate a step already gets from
 * useStepForm — this only changes how one step's fields are *presented*,
 * not how they're validated or persisted (onNext keeps the exact contract
 * ReportWizard already wires up).
 */
export function ConversationalStep({
  stepTitle,
  fields,
  values,
  setValue,
  errors,
  validate,
  onNext,
  onBack,
  initialIndex = 0,
  extras,
  extraFieldValidation,
}: ConversationalStepProps) {
  const [index, setIndex] = useState(initialIndex);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Error shown under the *active* question. Deliberately not just
  // `errors[field.id]` — that map comes from validating the whole step's
  // schema at once, so it always includes "required" errors for fields the
  // user hasn't reached yet. This only ever gets set by an actual attempt
  // on the field currently on screen (a blocked Next, or navigating back to
  // a field that already had a known issue), and is cleared on every
  // forward move into new territory.
  const [activeError, setActiveError] = useState<string | null>(null);
  const reviewing = index >= fields.length;

  function goBack() {
    if (index === 0) {
      onBack();
      return;
    }
    const prevField = fields[index - 1];
    setActiveError(errors[prevField.id] ?? null);
    setIndex(index - 1);
  }

  function advance() {
    setActiveError(null);
    setIndex((i) => Math.min(i + 1, fields.length));
  }

  function jumpTo(targetIndex: number) {
    const targetField = fields[targetIndex];
    setActiveError((targetField && errors[targetField.id]) ?? null);
    setIndex(targetIndex);
  }

  async function handleReviewContinue() {
    setSubmitError(null);
    const result = validate();
    if (!result.success) return;
    setSubmitting(true);
    try {
      await onNext(result.data);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (reviewing) {
    const errorFieldIds = Object.keys(errors).filter((key) => fields.some((f) => f.id === key));
    return (
      <div className="convo-step convo-step--review">
        <h1 className="convo-step__review-title">Review: {stepTitle}</h1>

        {errorFieldIds.length > 0 && (
          <div className="review-error" role="alert">
            <p>Please fix the following before continuing:</p>
            <ul>
              {errorFieldIds.map((id) => {
                const fieldIdx = fields.findIndex((f) => f.id === id);
                const field = fields[fieldIdx];
                if (!field) return null;
                return (
                  <li key={id}>
                    <button type="button" className="button button--text" onClick={() => jumpTo(fieldIdx)}>
                      {field.label}: {errors[id]}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {submitError && (
          <p role="alert" className="field__error">
            {submitError}
          </p>
        )}

        <dl className="review-list">
          {fields.map((field, i) => {
            const display = formatValue(field, values[field.id]);
            return (
              <div key={field.id} className="review-list__row">
                <dt>{field.label}</dt>
                <dd>
                  {display ? <span>{display}</span> : <span className="review-list__empty">Not provided</span>}
                  <button
                    type="button"
                    className="review-list__edit"
                    onClick={() => jumpTo(i)}
                    aria-label={`Edit answer: ${field.label}`}
                  >
                    Edit
                  </button>
                </dd>
              </div>
            );
          })}
        </dl>

        <div className="step-form__actions">
          <button type="button" className="button button--text" onClick={() => jumpTo(fields.length - 1)}>
            ← Back
          </button>
          <button type="button" className="button button--primary" onClick={handleReviewContinue} disabled={submitting}>
            {submitting ? "Saving…" : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  const field = fields[index];
  const value = values[field.id];
  const error = activeError;
  const canSkip = !field.required;
  const useCombobox = field.kind === "choice" && (field.options?.length ?? 0) > 4;
  const isCardChoice = field.kind === "choice" && !useCombobox;
  const controlId = `q-${field.id}`;
  const labelId = `${controlId}-label`;
  const errorId = `${controlId}-error`;

  // Runs the real zod validation for this question before letting the user
  // move on — a malformed answer (bad email, out-of-range number, etc.)
  // stops them here with an inline error instead of only surfacing at the
  // end-of-section review, by which point they've already answered several
  // more questions and have to navigate back to fix it.
  function handleNextClick() {
    const result = validate();
    if (!result.success && result.errors[field.id]) {
      setActiveError(result.errors[field.id]);
      return;
    }
    const extraMessage = extraFieldValidation?.(field.id, values);
    if (extraMessage) {
      setActiveError(extraMessage);
      return;
    }
    advance();
  }

  function renderActiveInput() {
    switch (field.kind) {
      case "choice": {
        if (useCombobox) {
          return (
            <Combobox
              id={controlId}
              options={field.options ?? []}
              value={typeof value === "string" ? value : ""}
              labelledBy={labelId}
              onSelect={(v) => setValue(field.id, v)}
            />
          );
        }
        return (
          <div className="choice-cards" role="group" aria-labelledby={labelId}>
            {field.options?.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`choice-card${value === opt.value ? " choice-card--selected" : ""}`}
                onClick={() => {
                  setValue(field.id, opt.value);
                  advance();
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );
      }
      case "checkboxGroup": {
        const arr: string[] = Array.isArray(value) ? (value as string[]) : [];
        function toggle(v: string) {
          setValue(field.id, arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
        }
        return (
          <div className="choice-chip-grid" role="group" aria-labelledby={labelId}>
            {field.options?.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`choice-chip${arr.includes(opt.value) ? " choice-chip--selected" : ""}`}
                aria-pressed={arr.includes(opt.value)}
                onClick={() => toggle(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );
      }
      case "multiSelect": {
        const arr: string[] = Array.isArray(value) ? (value as string[]) : [];
        return (
          <MultiSelect
            id={controlId}
            options={field.options ?? []}
            value={arr}
            onChange={(v) => setValue(field.id, v)}
            labelledBy={labelId}
          />
        );
      }
      case "time12":
        return (
          <TimeInput12
            id={controlId}
            value={typeof value === "string" ? value : ""}
            onChange={(v) => setValue(field.id, v)}
            labelledBy={labelId}
          />
        );
      case "select":
        return (
          <select
            id={controlId}
            className="convo-input convo-input--select"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => setValue(field.id, e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
          >
            <option value="">Select…</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      case "textarea":
        return (
          <textarea
            id={controlId}
            className="convo-input convo-input--textarea"
            rows={field.rows ?? 4}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => setValue(field.id, e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
          />
        );
      default:
        return (
          <input
            id={controlId}
            className="convo-input"
            type={field.kind}
            value={value === undefined || value === null ? "" : String(value)}
            onChange={(e) => setValue(field.id, e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            min={field.kind === "date" ? field.min : undefined}
            max={field.kind === "date" ? field.max : undefined}
          />
        );
    }
  }

  const isGroupControl =
    field.kind === "choice" || field.kind === "checkboxGroup" || field.kind === "multiSelect" || field.kind === "time12";

  return (
    <div className="convo-step convo-step--question">
      <div className="recap-pill-list">
        {fields.map((f, i) => {
          if (i < index) {
            const display = formatValue(f, values[f.id]);
            return (
              <button
                key={f.id}
                type="button"
                className={`recap-pill recap-pill--complete${display ? "" : " recap-pill--empty"}`}
                onClick={() => jumpTo(i)}
                aria-label={`Edit answer: ${f.label}`}
              >
                <span className="recap-pill__text">
                  <span className="recap-pill__label">{f.label}</span>
                  <span className="recap-pill__value">{display || "Not provided"}</span>
                </span>
                <span className="recap-pill__edit" aria-hidden="true">
                  ✎
                </span>
              </button>
            );
          }
          if (i === index) {
            return (
              <div key={f.id} className="recap-pill recap-pill--current" aria-current="true">
                <span>{f.label}</span>
              </div>
            );
          }
          return (
            <div key={f.id} className="recap-pill recap-pill--upcoming">
              <span>{f.label}</span>
            </div>
          );
        })}
      </div>

      <div className="convo-question">
        <p className="convo-question__counter">
          Question {index + 1} of {fields.length}
        </p>
        <div className="convo-question__head">
          {field.icon && <FieldIcon name={field.icon} className="convo-question__icon" />}
          {isGroupControl ? (
            <h2 id={labelId} className="convo-question__label">
              {field.label}
            </h2>
          ) : (
            <label htmlFor={controlId} id={labelId} className="convo-question__label">
              {field.label}
            </label>
          )}
        </div>
        {field.hint && <p className="field__hint">{field.hint}</p>}
        {renderActiveInput()}
        {error && (
          <p id={errorId} role="alert" className="field__error">
            {error}
          </p>
        )}
        {extras?.[field.id]?.()}
      </div>

      <div className="step-form__actions">
        <button type="button" className="button button--text" onClick={goBack}>
          ← Back
        </button>
        {isCardChoice
          ? canSkip && (
              <button type="button" className="button button--text" onClick={advance}>
                Skip →
              </button>
            )
          : (
            <button
              type="button"
              className="button button--primary"
              onClick={handleNextClick}
              disabled={!!field.required && isEmptyValue(value)}
            >
              Next →
            </button>
          )}
      </div>
    </div>
  );
}
