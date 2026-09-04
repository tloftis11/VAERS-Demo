import { useState } from "react";
import { aboutYouSchema, RELATIONSHIP_OPTIONS_PUBLIC, STATE_OPTIONS } from "../../../../shared/src/schemas";
import type { SubmitterType } from "../../../../shared/src/branchingRules";
import type { AboutYouData } from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { ConversationalStep, type ConversationalFieldSpec } from "../../components/ConversationalStep";
import { AddressFieldGroup, formatAddressSummary } from "../../components/AddressFieldGroup";

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
  contactEmailConfirm: "",
  contactPhone: "",
  relationship: "",
  relationshipOther: "",
  mailingStreet: "",
  mailingCity: "",
  mailingState: "",
  mailingZip: "",
  bestContactName: "",
  bestContactPhone: "",
};

/**
 * Field set for "about you" — shared with the final review and the
 * read-only follow-up lookup (both call this without a hint or gate, since
 * they're displaying already-answered data, not asking new questions).
 * `includeMailingAddress` gates the structured street/city/state/zip block
 * behind the "want a mailed response?" toggle in the live wizard — off by
 * default there until the reporter opts in, but always included (superset)
 * for review/follow-up display.
 */
export function aboutYouFieldSpecs(
  submitterType: SubmitterType,
  relationshipHint: RelationshipHint = null,
  includeMailingAddress = true,
  /** Only needed for the review-summary line (street/city/state/zip
   * combined) — the live wizard's own `render` (attached in the component
   * below, not here) reads current values directly via closure instead. */
  mailingAddressValues?: { city: string; state: string; zip: string }
): ConversationalFieldSpec[] {
  const isHcp = submitterType === "hcp";
  const fields: ConversationalFieldSpec[] = [
    { id: "contactName", label: "Your name", required: true, kind: "text", icon: "person", autoComplete: "name" },
    {
      id: "contactEmail",
      label: "Your email",
      required: true,
      kind: "email",
      hint: "Used only if we need to follow up about this report.",
      icon: "mail",
      autoComplete: "email",
    },
    {
      id: "contactEmailConfirm",
      label: "Confirm your email",
      required: true,
      kind: "email",
      autoComplete: "email",
    },
    {
      id: "contactPhone",
      label: "Your phone (optional)",
      required: false,
      kind: "tel",
      icon: "phone",
      autoComplete: "tel",
      hint: "e.g. (404) 555-1212 or +1 404 555 1212.",
    },
  ];
  // The real VAERS form has no healthcare-provider sub-role breakdown — HCPs
  // skip this question entirely (submitterType already captured that).
  // Reporters who just told us they're the patient don't need to be asked
  // their relationship to the patient — it's implied. Caregivers still get
  // the question (parent vs. other relative isn't implied), just without
  // the now-irrelevant "Myself" option.
  if (!isHcp && relationshipHint !== "patient") {
    fields.push(
      {
        id: "relationship",
        label: "Your relationship to the patient",
        required: true,
        kind: "choice",
        options:
          relationshipHint === "caregiver"
            ? RELATIONSHIP_OPTIONS_PUBLIC.filter((o) => o.value !== "self")
            : RELATIONSHIP_OPTIONS_PUBLIC,
      },
      { id: "relationshipOther", label: "Please describe your relationship to the patient", required: false, kind: "text" }
    );
  }
  fields.push(
    {
      id: "bestContactName",
      label: "Is there a doctor or nurse we could contact for more details? (optional)",
      required: false,
      kind: "text",
      hint: "Only if that's someone other than you.",
    },
    {
      id: "bestContactPhone",
      label: "Their phone number (optional)",
      required: false,
      kind: "tel",
      autoComplete: "tel",
      hint: "e.g. (404) 555-1212 or +1 404 555 1212.",
    }
  );
  if (includeMailingAddress) {
    fields.push({
      id: "mailingStreet",
      label: "Mailing address",
      required: false,
      kind: "custom",
      // Folds mailingCity/State/Zip into this same question (see the
      // `render` attached in the component below) — one screen instead of
      // four, with real autoComplete attributes so a browser's own address
      // autofill actually works.
      alsoValidates: ["mailingCity", "mailingState", "mailingZip"],
      describeError: (relativePath, message) => {
        if (relativePath === "mailingCity") return `Mailing city: ${message}`;
        if (relativePath === "mailingState") return `Mailing state: ${message}`;
        if (relativePath === "mailingZip") return `Mailing ZIP: ${message}`;
        return message;
      },
      formatSummary: (streetValue) =>
        mailingAddressValues
          ? formatAddressSummary({
              street: (streetValue as string) ?? "",
              ...mailingAddressValues,
              stateOptions: STATE_OPTIONS,
            })
          : String(streetValue ?? ""),
    });
  }
  return fields;
}

export function AboutYouStep({ submitterType, initialData, relationshipHint = null, onNext, onBack }: AboutYouStepProps) {
  const schema = aboutYouSchema(submitterType);
  const initial = initialData ?? EMPTY;
  // "self" is a valid *schema* value regardless of hint, so switching from
  // Patient to Caregiver (e.g. after the self-report+death contradiction
  // notice sends someone back to change who's filling this out) would
  // otherwise leave a stale "self" answer that still passes validation —
  // jumping straight to this step's review screen with a relationship
  // question that was never actually re-asked, and "self" isn't even among
  // the options shown under a caregiver hint, so revisiting it looked like
  // nothing was selected with no way forward. Clearing it here forces a
  // real re-answer instead of silently carrying the old one forward.
  const seededInitial =
    relationshipHint === "patient" && !initial.relationship
      ? { ...initial, relationship: "self" }
      : relationshipHint === "caregiver" && initial.relationship === "self"
        ? { ...initial, relationship: "" }
        : initial;
  const { values, setValue, errors, validate } = useStepForm(schema, seededInitial);
  const [wantsMailedResponse, setWantsMailedResponse] = useState(
    () => !!(initial.mailingStreet || initial.mailingCity || initial.mailingState || initial.mailingZip)
  );
  const fields = aboutYouFieldSpecs(submitterType, relationshipHint, wantsMailedResponse, {
    city: values.mailingCity,
    state: values.mailingState,
    zip: values.mailingZip,
  })
    .filter((f) => {
      if (f.id === "relationshipOther") return values.relationship === "other";
      return true;
    })
    .map((f) => {
      // render is attached here, not in aboutYouFieldSpecs, since it needs
      // this component's own values/handleSetValue for the sibling
      // mailingCity/State/Zip fields folded into this same question.
      if (f.id === "mailingStreet") {
        return {
          ...f,
          render: (streetValue: unknown, onStreetChange: (v: unknown) => void) => (
            <AddressFieldGroup
              idPrefix="mailing"
              streetLabel="Mailing address"
              streetHint="Street number and name, plus apartment/suite/unit if any — e.g. 123 Main St, Apt 4B."
              street={streetValue as string}
              onStreetChange={onStreetChange}
              streetError={errors.mailingStreet}
              city={values.mailingCity}
              onCityChange={(v) => handleSetValue("mailingCity", v)}
              cityError={errors.mailingCity}
              state={values.mailingState}
              onStateChange={(v) => handleSetValue("mailingState", v)}
              stateOptions={STATE_OPTIONS}
              stateError={errors.mailingState}
              zip={values.mailingZip}
              onZipChange={(v) => handleSetValue("mailingZip", v)}
              zipError={errors.mailingZip}
            />
          ),
        };
      }
      return f;
    });

  function handleSetValue(id: string, value: unknown) {
    setValue(id as keyof AboutYouData, value as any);
    if (id === "relationship" && value !== "other") setValue("relationshipOther", "");
  }

  function handleMailToggle(checked: boolean) {
    setWantsMailedResponse(checked);
    if (!checked) {
      handleSetValue("mailingStreet", "");
      handleSetValue("mailingCity", "");
      handleSetValue("mailingState", "");
      handleSetValue("mailingZip", "");
    }
  }

  return (
    <ConversationalStep
      stepTitle="About you"
      fields={fields}
      values={values as unknown as Record<string, unknown>}
      setValue={handleSetValue}
      errors={errors}
      validate={validate}
      onNext={onNext}
      onBack={onBack}
      initialIndex={schema.safeParse(seededInitial).success ? fields.length : 0}
      extras={{
        // Attached to the reporter's *own* phone question, not
        // bestContactPhone (the HCP contact's number) a few questions
        // later — that placement read as if the checkbox might be about
        // mailing something to the HCP instead of the reporter. Checking
        // it here reveals the mailing-address block once the flow reaches
        // it, same as before.
        contactPhone: () => (
          <label className="field__inline-toggle">
            <input
              type="checkbox"
              checked={wantsMailedResponse}
              onChange={(e) => handleMailToggle(e.target.checked)}
            />
            I'd like VAERS to also mail me a copy of this report, in addition to emailing it
          </label>
        ),
      }}
    />
  );
}
