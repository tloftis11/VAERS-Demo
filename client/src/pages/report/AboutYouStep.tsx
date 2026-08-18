import {
  aboutYouSchema,
  RELATIONSHIP_OPTIONS_HCP,
  RELATIONSHIP_OPTIONS_PUBLIC,
} from "../../../../shared/src/schemas";
import type { SubmitterType } from "../../../../shared/src/branchingRules";
import type { AboutYouData } from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { TextField, SelectField } from "../../components/Field";

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validate();
    if (result.success) await onNext(result.data);
  }

  return (
    <form className="step-form" onSubmit={handleSubmit}>
      <h1>About you</h1>
      <TextField
        id="contactName"
        label="Your name"
        required
        value={values.contactName}
        onChange={(v) => setValue("contactName", v)}
        error={errors.contactName}
      />
      <TextField
        id="contactEmail"
        label="Your email"
        type="email"
        required
        value={values.contactEmail}
        onChange={(v) => setValue("contactEmail", v)}
        error={errors.contactEmail}
        hint="Used only if we need to follow up about this report."
      />
      <TextField
        id="contactPhone"
        label="Your phone (optional)"
        value={values.contactPhone}
        onChange={(v) => setValue("contactPhone", v)}
        error={errors.contactPhone}
      />
      <SelectField
        id="relationship"
        label={submitterType === "hcp" ? "Your role" : "Your relationship to the patient"}
        required
        value={values.relationship}
        onChange={(v) => setValue("relationship", v)}
        options={relationshipOptions}
        error={errors.relationship}
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
