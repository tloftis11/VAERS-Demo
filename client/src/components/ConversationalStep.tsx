import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { FieldIcon, type FieldIconName } from "./illustrations";
import { Combobox } from "./Combobox";
import { MultiSelect } from "./MultiSelect";
import { TimeInput12 } from "./TimeInput12";
import { MonthYearInput } from "./MonthYearInput";
import { errorsForField, relativeErrorsForField } from "../utils/fieldErrors";

/** Errors for a field plus any it claims via `alsoValidates` (see that
 * field's doc comment) — same shape as errorsForField, just unioned across
 * every id this question is responsible for. */
function errorsForFieldAndAliases(
  errors: Record<string, string>,
  field: ConversationalFieldSpec
): Array<{ path: string; message: string }> {
  return [field.id, ...(field.alsoValidates ?? [])].flatMap((id) => errorsForField(errors, id));
}

function firstErrorForFieldAndAliases(errors: Record<string, string>, field: ConversationalFieldSpec): string | undefined {
  return errorsForFieldAndAliases(errors, field)[0]?.message;
}

/** The generic banner's message, deliberately narrower than
 * `firstErrorForFieldAndAliases` above: an aliased field (e.g.
 * bodySiteOther, rendered inline via `extras`) already gets its own
 * dedicated error line right next to that specific input, so surfacing the
 * exact same message a second time up here would just repeat it — this
 * returns a message only when the *question's own* field is the one at
 * fault. Still fine for an alias-only error to leave this blank: `advance`
 * being withheld (decided separately, using every alias) is what actually
 * blocks Next; this only controls what the generic banner shows. */
function ownErrorMessage(errors: Record<string, string>, field: ConversationalFieldSpec): string | undefined {
  return errorsForField(errors, field.id)[0]?.message;
}

export type ConversationalFieldKind =
  | "text"
  | "email"
  | "tel"
  | "number"
  | "date"
  | "textarea"
  | "select"
  | "choice"
  | "checkboxGroup"
  | "multiSelect"
  | "time12"
  | "monthYear"
  | "custom";

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
  /** For kind "date"/"monthYear" — ISO "YYYY-MM-DD" bounds enforced by the input itself, not just the schema. */
  min?: string;
  max?: string;
  /** Passed straight through to the rendered `<input autoComplete>` —
   * e.g. "email"/"tel" so a browser's/password-manager's autofill can
   * recognize the field for what it is. */
  autoComplete?: string;
  /** kind "custom" only — the caller owns the entire input UI (e.g. a
   * repeatable bundled-fields editor) instead of a single input control.
   * `errors` is pre-scoped and re-based to this field (see
   * relativeErrorsForField) — e.g. for field id "additionalVaccines", a
   * zod error at "additionalVaccines.2.vaccineType" arrives here as
   * "2.vaccineType", so the editor can look itself up by row index without
   * knowing its own top-level field id. */
  render?: (value: unknown, onChange: (value: unknown) => void, errors: Record<string, string>) => ReactNode;
  /** kind "custom" only — describes ONE nested error for the review-screen
   * summary, given its path relative to this field (e.g. "0.vaccineType",
   * or "" for a top-level error on this field itself) and its message.
   * Return a human-readable line identifying which row/field it's about,
   * e.g. "Additional vaccine 2: select a vaccine." Falls back to
   * `${field.label}: ${message}` when omitted. */
  describeError?: (relativePath: string, message: string) => string;
  /** kind "custom" only — how to summarize this field's value on the review
   * screen, since formatValue's options-lookup doesn't apply to arbitrary
   * custom data shapes (e.g. an array of rows). */
  formatSummary?: (value: unknown) => string;
  /**
   * Other top-level schema field ids whose errors this question is also
   * responsible for surfacing — for a field rendered inline via `extras`
   * (e.g. a conditional "Other, please specify" input shown under a
   * checkboxGroup question, not asked as its own sequential question) so
   * its validation error isn't orphaned: invisible in the review-screen
   * summary, not blocking the live per-question Next click, and not shown
   * when navigating back to the question that owns it. The aliased field
   * must NOT also appear in `fields` — it exists only in the schema/errors,
   * never as its own question.
   */
  alsoValidates?: string[];
  /**
   * kind "choice" only — option values that reveal more required content on
   * this same screen (typically an "Other, please specify" input rendered
   * via `extras`) and so must NOT auto-advance to the next question when
   * picked, unlike every other option. Without this, picking one of these
   * values still advances immediately (matching every other choice card),
   * so the newly-revealed field is never seen — the reporter lands on the
   * next question already, the field goes unfilled, and Next later blocks
   * with an error for a field they never got a chance to see.
   */
  optionsRequiringFollowUp?: string[];
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
  if (field.formatSummary) return field.formatSummary(value);
  if (Array.isArray(value)) {
    const opts = field.options ?? [];
    return value.map((v) => opts.find((o) => o.value === v)?.label ?? String(v)).join(", ");
  }
  if (field.options) {
    // A yes/no "choice" field (boolean-backed on the server) stores string option
    // values ("true"/"false") client-side, but a submitted report reads
    // back a real boolean from the API — compare against both forms so
    // review/follow-up display resolves "Yes"/"No" instead of falling back
    // to the raw "true"/"false" string.
    return field.options.find((o) => o.value === value || o.value === String(value))?.label ?? String(value);
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
  // The furthest question reached in this step so far — distinct from
  // `index` (the one on screen *right now*), so that going back to fix an
  // earlier answer doesn't strand later, already-answered questions as
  // un-jumpable "upcoming" pills. Only ever grows; mutated directly during
  // render (not via setState/useEffect) since it's a plain derived
  // tracking value, not something that itself needs to trigger a render.
  const maxIndexReachedRef = useRef(initialIndex);
  if (index > maxIndexReachedRef.current) {
    maxIndexReachedRef.current = index;
  }
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

  // An axe-core audit + manual keyboard check caught this: advancing,
  // going back, or jumping between questions left focus on nothing (it
  // fell back to <body>), so a screen-reader or keyboard user got no
  // indication the question had changed at all. Moving focus to the new
  // question's heading on every index change fixes that — it's what
  // announces the change, even though it doesn't drop focus straight into
  // the control itself (which varies too much by field kind to target
  // uniformly).
  const questionHeadingRef = useRef<HTMLElement>(null);
  useEffect(() => {
    questionHeadingRef.current?.focus();
  }, [index]);

  function goBack() {
    if (index === 0) {
      onBack();
      return;
    }
    const prevField = fields[index - 1];
    setActiveError(ownErrorMessage(errors, prevField) ?? null);
    setIndex(index - 1);
  }

  function advance() {
    setActiveError(null);
    setIndex((i) => Math.min(i + 1, fields.length));
  }

  function jumpTo(targetIndex: number) {
    const targetField = fields[targetIndex];
    setActiveError((targetField && ownErrorMessage(errors, targetField)) ?? null);
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
    // One summary row per underlying error, not per field — a field like
    // additionalVaccines can have several distinct nested problems (e.g.
    // row 2 needs a vaccine, row 3 needs its "Other" detail), and each
    // needs its own identifiable, clickable line rather than being
    // collapsed into one generic "additionalVaccines: <first message>".
    const errorRows = fields.flatMap((field, fieldIdx) =>
      errorsForFieldAndAliases(errors, field).map(({ path, message }) => {
        const relativePath = field.alsoValidates?.includes(path)
          ? path
          : path === field.id
            ? ""
            : path.startsWith(`${field.id}[`)
              ? path.slice(field.id.length)
              : path.slice(field.id.length + 1);
        const summary = field.describeError
          ? field.describeError(relativePath, message)
          : `${field.label}: ${message}`;
        return { key: path, fieldIdx, summary };
      })
    );
    return (
      <div className="convo-step convo-step--review">
        <h1 className="convo-step__review-title" ref={questionHeadingRef as never} tabIndex={-1}>
          Review: {stepTitle}
        </h1>

        {errorRows.length > 0 && (
          <div className="review-error" role="alert">
            <p>Please fix the following before continuing:</p>
            <ul>
              {errorRows.map(({ key, fieldIdx, summary }) => (
                <li key={key}>
                  <button type="button" className="button button--text" onClick={() => jumpTo(fieldIdx)}>
                    {summary}
                  </button>
                </li>
              ))}
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
    if (!result.success) {
      // Exact match only would miss a nested error like
      // "additionalVaccines.0.vaccineType" entirely — Continue stayed
      // blocked (validate() still failed) but nothing ever told the user
      // why, since no top-level key matched.
      const message = firstErrorForFieldAndAliases(result.errors, field);
      if (message) {
        // The banner itself only shows a message when it's the question's
        // *own* field at fault — an alias's error (e.g. bodySiteOther)
        // already has its own inline error line via extras, so this would
        // otherwise repeat the exact same text a second time. Next still
        // stays blocked either way; only what's displayed up here differs.
        setActiveError(ownErrorMessage(result.errors, field) ?? null);
        return;
      }
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
                  if (!field.optionsRequiringFollowUp?.includes(opt.value)) {
                    advance();
                  }
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
          <div className="checkbox-table" role="group" aria-labelledby={labelId}>
            {field.options?.map((opt) => {
              const optId = `${controlId}-opt-${opt.value}`;
              return (
                <label key={opt.value} htmlFor={optId} className="checkbox-table__option">
                  <input
                    id={optId}
                    type="checkbox"
                    checked={arr.includes(opt.value)}
                    onChange={() => toggle(opt.value)}
                  />
                  {opt.label}
                </label>
              );
            })}
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
      case "monthYear":
        return (
          <MonthYearInput
            id={controlId}
            value={typeof value === "string" ? value : ""}
            onChange={(v) => setValue(field.id, v)}
            labelledBy={labelId}
            max={field.max}
          />
        );
      case "custom":
        return field.render?.(value, (v) => setValue(field.id, v), relativeErrorsForField(errors, field.id)) ?? null;
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
            autoComplete={field.autoComplete}
          />
        );
    }
  }

  const isGroupControl =
    field.kind === "choice" ||
    field.kind === "checkboxGroup" ||
    field.kind === "multiSelect" ||
    field.kind === "time12" ||
    field.kind === "monthYear" ||
    field.kind === "custom";

  return (
    <div className="convo-step convo-step--question">
      <div className="recap-pill-list">
        {fields.map((f, i) => {
          if (i === index) {
            return (
              <div key={f.id} className="recap-pill recap-pill--current" aria-current="true">
                <span>{f.label}</span>
              </div>
            );
          }
          // Any question already reached — whether it sits before *or
          // after* the one on screen right now (e.g. after going back to
          // fix an earlier answer) — is safe to jump straight to instead
          // of clicking "← Back"/"Next" through everything in between.
          if (i < maxIndexReachedRef.current) {
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
          return (
            <div key={f.id} className="recap-pill recap-pill--upcoming">
              <span>{f.label}</span>
            </div>
          );
        })}
      </div>

      <div className="convo-question-panel">
        <div className="convo-question">
          <p className="convo-question__counter">
            Question {index + 1} of {fields.length}
          </p>
          <div className="convo-question__head">
            {/* Always reserves the same slot whether or not this question
                has an icon — otherwise the question text itself starts at a
                different horizontal position depending on the field, which
                reads as the whole question "jumping" from one to the next. */}
            <span className="convo-question__icon-slot" aria-hidden="true">
              {field.icon && <FieldIcon name={field.icon} className="convo-question__icon" />}
            </span>
            {isGroupControl ? (
              <h2 id={labelId} className="convo-question__label" ref={questionHeadingRef as never} tabIndex={-1}>
                {field.label}
              </h2>
            ) : (
              <label
                htmlFor={controlId}
                id={labelId}
                className="convo-question__label"
                ref={questionHeadingRef as never}
                tabIndex={-1}
              >
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
            ? (!isEmptyValue(value) ? (
                // Revisiting an already-answered card-choice question (e.g.
                // via Edit/jump-back) — clicking a card again would still
                // work, but nothing here visibly indicates the existing
                // answer already counts, so a required question with no
                // Skip button left the user with no forward button at all
                // unless they thought to re-click their own answer.
                // Routed through handleNextClick (not a bare `advance`) so a
                // choice with a required alsoValidates follow-up (e.g. an
                // "Other" selection needing its own description) is actually
                // checked here — otherwise nothing catches a still-blank
                // follow-up until the end-of-step review, several questions
                // and a "why am I blocked" moment later.
                <button type="button" className="button button--primary" onClick={handleNextClick}>
                  Next →
                </button>
              ) : (
                canSkip && (
                  <button type="button" className="button button--text" onClick={advance}>
                    Skip →
                  </button>
                )
              ))
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
    </div>
  );
}
