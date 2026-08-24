import {
  aboutYouSchema,
  RELATIONSHIP_OPTIONS_HCP,
  RELATIONSHIP_OPTIONS_PUBLIC,
} from "../../../../shared/src/schemas";
import type { SubmitterType } from "../../../../shared/src/branchingRules";
import type { AboutYouData } from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { ConversationalStep, type FieldDescriptor } from "../../components/ConversationalStep";

interface AboutYouStepProps {
  submitterType: SubmitterType;
  initialData: AboutYouData | null;
  onNext: (data: Record<string, unknown>) => Promise<void>;
  onBack: () => void;
}

const EMPTY: AboutYouData = { contactName: "", contactEmail: "", contactPhone: "", relationship: "" };

export function AboutYouStep({ submitterType, initialData, onNext, onBack }: AboutYouStepProps) {
  const { values, setValue, errors, validate } = useStepForm(
    aboutYouSchema(submitterType),
    initialData ?? EMPTY
  );
  const relationshipOptions =
    submitterType === "hcp" ? RELATIONSHIP_OPTIONS_HCP : RELATIONSHIP_OPTIONS_PUBLIC;

  const descriptors: FieldDescriptor[] = [
    { type: "text", name: "contactName", label: "Your name", required: true },
    {
      type: "text",
      name: "contactEmail",
      label: "Your email",
      inputType: "email",
      required: true,
      hint: "Used only if we need to follow up about this report.",
    },
    { type: "text", name: "contactPhone", label: "Your phone (optional)" },
    {
      type: "select",
      name: "relationship",
      label: submitterType === "hcp" ? "Your role" : "Your relationship to the patient",
      required: true,
      options: relationshipOptions,
    },
  ];

  function formatValue(name: string, value: unknown): string {
    if (name === "relationship") {
      return relationshipOptions.find((o) => o.value === value)?.label ?? "";
    }
    return value == null ? "" : String(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validate();
    if (result.success) await onNext(result.data);
  }

  return (
    <form className="step-form" onSubmit={handleSubmit}>
      <h1>About you</h1>
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
