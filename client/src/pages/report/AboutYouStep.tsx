import { aboutYouSchema, RELATIONSHIP_OPTIONS_PUBLIC } from "../../../../shared/src/schemas";
import type { SubmitterType } from "../../../../shared/src/branchingRules";
import type { AboutYouData } from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { ConversationalStep, type ConversationalFieldSpec } from "../../components/ConversationalStep";

interface AboutYouStepProps {
  submitterType: SubmitterType;
  initialData: AboutYouData | null;
  onNext: (data: Record<string, unknown>) => Promise<void>;
  onBack: () => void;
}

const EMPTY: AboutYouData = { contactName: "", contactEmail: "", contactPhone: "", relationship: "" };

/** Field set for "about you" — shared with the final review and the read-only follow-up lookup. */
export function aboutYouFieldSpecs(submitterType: SubmitterType): ConversationalFieldSpec[] {
  const isHcp = submitterType === "hcp";
  const fields: ConversationalFieldSpec[] = [
    { id: "contactName", label: "Your name", required: true, kind: "text", icon: "person" },
    {
      id: "contactEmail",
      label: "Your email",
      required: true,
      kind: "email",
      hint: "Used only if we need to follow up about this report.",
      icon: "mail",
    },
    { id: "contactPhone", label: "Your phone (optional)", required: false, kind: "text", icon: "phone" },
  ];
  // The real VAERS form has no healthcare-provider sub-role breakdown — HCPs
  // skip this question entirely (submitterType already captured that).
  if (!isHcp) {
    fields.push({
      id: "relationship",
      label: "Your relationship to the patient",
      required: true,
      kind: "choice",
      options: RELATIONSHIP_OPTIONS_PUBLIC,
    });
  }
  return fields;
}

export function AboutYouStep({ submitterType, initialData, onNext, onBack }: AboutYouStepProps) {
  const schema = aboutYouSchema(submitterType);
  const initial = initialData ?? EMPTY;
  const { values, setValue, errors, validate } = useStepForm(schema, initial);
  const fields = aboutYouFieldSpecs(submitterType);

  return (
    <ConversationalStep
      stepTitle="About you"
      fields={fields}
      values={values as unknown as Record<string, unknown>}
      setValue={(id, value) => setValue(id as keyof AboutYouData, value as any)}
      errors={errors}
      validate={validate}
      onNext={onNext}
      onBack={onBack}
      initialIndex={schema.safeParse(initial).success ? fields.length : 0}
    />
  );
}
