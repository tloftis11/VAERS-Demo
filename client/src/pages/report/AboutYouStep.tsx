import { useState } from "react";
import { aboutYouSchema, RELATIONSHIP_OPTIONS_PUBLIC, STATE_OPTIONS } from "../../../../shared/src/schemas";
import type { SubmitterType } from "../../../../shared/src/branchingRules";
import type { AboutYouData } from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { ConversationalStep, type ConversationalFieldSpec } from "../../components/ConversationalStep";
import { AddressFieldGroup, formatAddressSummary } from "../../components/AddressFieldGroup";
import { useLanguage } from "../../i18n/LanguageContext";
import type { TranslationKey } from "../../i18n/translations";

/** Every `*FieldSpecs` builder function in the wizard takes this as its
 * first parameter — the field labels/hints/errors it builds are user-
 * facing text, but the builder itself is a plain function, not a
 * component/hook, so it can't call `useLanguage()` itself. Each of its 3
 * callers (the live step component, ReviewStep, FollowUp) already has
 * `t` in scope via its own `useLanguage()` call and just passes it in. */
type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

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
  t: Translate,
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
    {
      id: "contactName",
      label: t("aboutYou.contactName"),
      required: true,
      kind: "text",
      icon: "person",
      autoComplete: "name",
    },
    {
      id: "contactEmail",
      label: t("aboutYou.contactEmail"),
      required: true,
      kind: "email",
      hint: t("aboutYou.contactEmailHint"),
      icon: "mail",
      autoComplete: "email",
    },
    {
      id: "contactEmailConfirm",
      label: t("aboutYou.contactEmailConfirm"),
      required: true,
      kind: "email",
      autoComplete: "email",
    },
    {
      id: "contactPhone",
      label: t("aboutYou.contactPhone"),
      required: false,
      kind: "tel",
      icon: "phone",
      autoComplete: "tel",
      hint: t("aboutYou.phoneHint"),
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
        label: t("aboutYou.relationship"),
        required: true,
        kind: "choice",
        options:
          relationshipHint === "caregiver"
            ? RELATIONSHIP_OPTIONS_PUBLIC.filter((o) => o.value !== "self")
            : RELATIONSHIP_OPTIONS_PUBLIC,
      },
      { id: "relationshipOther", label: t("aboutYou.relationshipOther"), required: false, kind: "text" }
    );
  }
  fields.push(
    {
      id: "bestContactName",
      label: t("aboutYou.bestContactName"),
      required: false,
      kind: "text",
      hint: t("aboutYou.bestContactNameHint"),
    },
    {
      id: "bestContactPhone",
      label: t("aboutYou.bestContactPhone"),
      required: false,
      kind: "tel",
      autoComplete: "tel",
      hint: t("aboutYou.phoneHint"),
    }
  );
  if (includeMailingAddress) {
    fields.push({
      id: "mailingStreet",
      label: t("aboutYou.mailingAddress"),
      required: false,
      kind: "custom",
      // Folds mailingCity/State/Zip into this same question (see the
      // `render` attached in the component below) — one screen instead of
      // four, with real autoComplete attributes so a browser's own address
      // autofill actually works.
      alsoValidates: ["mailingCity", "mailingState", "mailingZip"],
      describeError: (relativePath, message) => {
        if (relativePath === "mailingCity") return `${t("aboutYou.mailingCity")}: ${message}`;
        if (relativePath === "mailingState") return `${t("aboutYou.mailingState")}: ${message}`;
        if (relativePath === "mailingZip") return `${t("aboutYou.mailingZip")}: ${message}`;
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
  const { t } = useLanguage();
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
  const fields = aboutYouFieldSpecs(t, submitterType, relationshipHint, wantsMailedResponse, {
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
              streetLabel={t("aboutYou.mailingAddress")}
              streetHint={t("address.streetPlaceholderApt")}
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
      stepTitle={t("step.about-you")}
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
            {t("aboutYou.mailToggle")}
          </label>
        ),
      }}
    />
  );
}
