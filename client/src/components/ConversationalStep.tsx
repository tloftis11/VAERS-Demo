import { useState } from "react";
import { AnswerChip } from "./AnswerChip";
import { TextField, SelectField, TextAreaField, CheckboxGroupField } from "./Field";

type Option = { value: string; label: string };

export type FieldDescriptor =
  | { type: "text"; name: string; label: string; hint?: string; required?: boolean; inputType?: string }
  | { type: "select"; name: string; label: string; hint?: string; required?: boolean; options: readonly Option[] }
  | { type: "textarea"; name: string; label: string; hint?: string; required?: boolean; rows?: number }
  | { type: "checkbox-group"; name: string; label: string; hint?: string; required?: boolean; options: readonly Option[] };

interface ConversationalStepProps<T extends object> {
  descriptors: FieldDescriptor[];
  values: T;
  setValue: <K extends keyof T>(name: K, value: T[K]) => void;
  errors: Record<string, string>;
  /** Custom chip-display formatting for a field (e.g. mapping a value to its option label). */
  formatValue?: (name: string, value: unknown) => string;
}

function isEmptyValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length === 0;
  return value === "" || value === undefined || value === null;
}

function defaultFormat(_name: string, value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  return value === "" || value == null ? "" : String(value);
}

/**
 * Renders a list of fields one at a time — the reference prototype's
 * "conversational" pattern: answered fields collapse into an editable
 * chip stacked above; the next unanswered field renders below; optional
 * fields get a "Skip" affordance. Reuses the existing Field primitives and
 * plugs into whatever `values`/`setValue`/`errors` a step's `useStepForm`
 * call already produces — the validation layer is unchanged, only the
 * presentation sequencing is new.
 */
export function ConversationalStep<T extends object>({
  descriptors,
  values,
  setValue,
  errors,
  formatValue = defaultFormat,
}: ConversationalStepProps<T>) {
  const [answeredCount, setAnsweredCount] = useState(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [attemptError, setAttemptError] = useState<{ index: number; message: string } | null>(null);

  function confirm(index: number) {
    const descriptor = descriptors[index];
    const current = (values as Record<string, unknown>)[descriptor.name];
    if (descriptor.required && isEmptyValue(current)) {
      setAttemptError({ index, message: "This field is required" });
      return;
    }
    setAttemptError(null);
    if (editingIndex === index) {
      setEditingIndex(null);
    } else {
      setAnsweredCount((c) => Math.max(c, index + 1));
    }
  }

  function skip(index: number) {
    setAttemptError(null);
    setAnsweredCount((c) => Math.max(c, index + 1));
    if (editingIndex === index) setEditingIndex(null);
  }

  return (
    <div className="conversational-step">
      {descriptors.map((descriptor, index) => {
        const isEditing = editingIndex === index;
        const isAnswered = index < answeredCount && !isEditing;
        const isActive = isEditing || (index === answeredCount && editingIndex === null);
        if (!isAnswered && !isActive) return null;

        if (isAnswered) {
          return (
            <AnswerChip
              key={descriptor.name}
              label={descriptor.label}
              displayValue={formatValue(descriptor.name, (values as Record<string, unknown>)[descriptor.name])}
              onEdit={() => setEditingIndex(index)}
            />
          );
        }

        const fieldError =
          errors[descriptor.name] ?? (attemptError?.index === index ? attemptError.message : undefined);

        return (
          <div key={descriptor.name} className="conversational-step__active">
            {renderField(descriptor, values, setValue, fieldError)}
            <div className="conversational-step__field-actions">
              {!descriptor.required && (
                <button type="button" className="button button--text" onClick={() => skip(index)}>
                  Skip →
                </button>
              )}
              <button type="button" className="button button--primary" onClick={() => confirm(index)}>
                {isEditing ? "Save" : "Next"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function renderField<T extends object>(
  descriptor: FieldDescriptor,
  values: T,
  setValue: <K extends keyof T>(name: K, value: T[K]) => void,
  error: string | undefined
) {
  const raw = (values as Record<string, unknown>)[descriptor.name];

  switch (descriptor.type) {
    case "text":
      return (
        <TextField
          id={descriptor.name}
          label={descriptor.label}
          hint={descriptor.hint}
          required={descriptor.required}
          type={descriptor.inputType}
          value={raw == null ? "" : String(raw)}
          onChange={(v) => setValue(descriptor.name as keyof T, v as T[keyof T])}
          error={error}
        />
      );
    case "select":
      return (
        <SelectField
          id={descriptor.name}
          label={descriptor.label}
          hint={descriptor.hint}
          required={descriptor.required}
          options={descriptor.options}
          value={raw == null ? "" : String(raw)}
          onChange={(v) => setValue(descriptor.name as keyof T, v as T[keyof T])}
          error={error}
        />
      );
    case "textarea":
      return (
        <TextAreaField
          id={descriptor.name}
          label={descriptor.label}
          hint={descriptor.hint}
          required={descriptor.required}
          rows={descriptor.rows}
          value={raw == null ? "" : String(raw)}
          onChange={(v) => setValue(descriptor.name as keyof T, v as T[keyof T])}
          error={error}
        />
      );
    case "checkbox-group":
      return (
        <CheckboxGroupField
          legend={descriptor.label}
          hint={descriptor.hint}
          required={descriptor.required}
          options={descriptor.options}
          value={(raw as string[]) ?? []}
          onChange={(v) => setValue(descriptor.name as keyof T, v as T[keyof T])}
          error={error}
        />
      );
  }
}
