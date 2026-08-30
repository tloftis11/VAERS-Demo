import { aboutYouSchema, RELATIONSHIP_OPTIONS_PUBLIC } from "../../../../shared/src/schemas";
import type { SubmitterType } from "../../../../shared/src/branchingRules";
import type { AboutYouData } from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { ConversationalStep, type ConversationalFieldSpec } from "../../components/ConversationalStep";

/** Which submitter-type card the user actually clicked (see SubmitterTypeStep) — never persisted, just a same-session hint for simplifying this step. */
export type RelationshipHint = "patient" | "caregiver" | "hcp" | null;

interface AboutYouStepProps {
  submitterType: SubmitterType;
  initialData: AboutYouData | null;
  relationshipHint?: RelationshipHint;
  onNext: (data: Record<string, unknown>) => Promise<void>;
  onBack: () => void;
}

const EMPTY: AboutYouData = {
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  relationship: "",
  mailingAddress: "",
  bestContactInfo: "",
};

/** Field set for "about you" — shared with the final review and the read-only follow-up lookup (both call this without a hint, since they're displaying an already-answered relationship, not asking it). */
export function aboutYouFieldSpecs(
  submitterType: SubmitterType,
  relationshipHint: RelationshipHint = null
): ConversationalFieldSpec[] {
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
  // Reporters who just told us they're the patient don't need to be asked
  // their relationship to the patient — it's implied. Caregivers still get
  // the question (parent vs. other relative isn't implied), just without
  // the now-irrelevant "Myself" option.
  if (!isHcp && relationshipHint !== "patient") {
    fields.push({
      id: "relationship",
      label: "Your relationship to the patient",
      required: true,
      kind: "choice",
      options:
        relationshipHint === "caregiver"
          ? RELATIONSHIP_OPTIONS_PUBLIC.filter((o) => o.value !== "self")
          : RELATIONSHIP_OPTIONS_PUBLIC,
    });
  }
  fields.push(
    {
      id: "bestContactInfo",
      label: "Best doctor or healthcare professional to contact about this adverse event (optional)",
      required: false,
      kind: "text",
      hint: "Name and phone number, if there's someone better placed than you to discuss the clinical details.",
    },
    {
      id: "mailingAddress",
      label: "Want a mailed response instead of email? Enter your mailing address (optional)",
      required: false,
      kind: "textarea",
      rows: 2,
      hint: "Leave this blank if email is fine — that's the default.",
    }
  );
  return fields;
}

export function AboutYouStep({ submitterType, initialData, relationshipHint = null, onNext, onBack }: AboutYouStepProps) {
  const schema = aboutYouSchema(submitterType);
  const initial = initialData ?? EMPTY;
  const seededInitial =
    relationshipHint === "patient" && !initial.relationship ? { ...initial, relationship: "self" } : initial;
  const { values, setValue, errors, validate } = useStepForm(schema, seededInitial);
  const fields = aboutYouFieldSpecs(submitterType, relationshipHint);

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
      initialIndex={schema.safeParse(seededInitial).success ? fields.length : 0}
    />
  );
}
