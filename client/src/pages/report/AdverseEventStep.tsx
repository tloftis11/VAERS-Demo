import {
  adverseEventSchema,
  OUTCOME_OPTIONS,
  RECOVERY_OPTIONS,
  YES_NO_UNKNOWN_OPTIONS,
  STATE_OPTIONS,
  SYMPTOM_OPTIONS,
} from "../../../../shared/src/schemas";
import { isDateBefore, hospitalizationExceedsElapsed, todayIsoDate } from "../../../../shared/src/liveChecks";
import type { SubmitterType } from "../../../../shared/src/branchingRules";
import type { AdverseEventData } from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { ConversationalStep, type ConversationalFieldSpec } from "../../components/ConversationalStep";
import { useLanguage } from "../../i18n/LanguageContext";
import type { TranslationKey } from "../../i18n/translations";

/** Every `*FieldSpecs` builder in the wizard is a plain function, not a
 * component/hook, so it can't call `useLanguage()` itself — `t` is threaded
 * in as the first parameter instead, matching `patientFieldSpecs` etc. */
type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

interface AdverseEventStepProps {
  submitterType: SubmitterType;
  /** True only for a "public" submitter reporting for themselves — see PatientStep for the same flag. */
  isSelfReport?: boolean;
  initialData: AdverseEventData | null;
  /** From the Vaccine step, for live "onset can't be before vaccination" checks. */
  vaccineAdministrationDate?: string;
  onNext: (data: Record<string, unknown>) => Promise<void>;
  onBack: () => void;
  /** Jumps back to the submitter-type step — see the self-report + "Patient died" notice below. */
  onSwitchSubmitterType?: () => void;
}

const EMPTY: AdverseEventData = {
  onsetDate: "",
  onsetTime: "",
  description: "",
  symptoms: [],
  symptomsOther: "",
  labResults: "",
  recoveryStatus: "",
  outcomes: [],
  hospitalizationDays: "",
  hospitalName: "",
  hospitalCity: "",
  hospitalState: "",
  dateOfDeath: "",
  treatmentGiven: "",
  clinicalCourseNotes: "",
  previousAdverseEvent: "",
  previousAdverseEventDetails: "",
};

/**
 * Field set follows the official VAERS form's items 5 (onset), 18
 * (description — essential), 19 (labs), 20 (recovery status), 21 (outcome
 * — essential, but distinct from "recovered?"), and 23 (prior AE history).
 * "Outcomes" intentionally has no required minimum: on the real form most
 * reports have none of these severe outcomes, so forcing a selection here
 * would misrepresent typical cases. "Symptoms" (PUB-003) is a quick-select
 * complement to the free-text description, not a replacement for it.
 *
 * Returns the full superset of possible fields, in display order — the
 * live wizard filters this down based on submitterType/outcomes (see
 * AdverseEventStep below), while the final review and read-only follow-up
 * lookup use it unfiltered and simply skip whichever fields are empty.
 */
export function adverseEventFieldSpecs(
  t: Translate,
  isHcp: boolean,
  isSelfReport = false,
  symptomsOtherValue?: string
): ConversationalFieldSpec[] {
  return [
    {
      id: "onsetDate",
      label: t("adverseEvent.onsetDate"),
      required: true,
      kind: "date",
      icon: "calendar",
      max: todayIsoDate(),
    },
    { id: "onsetTime", label: t("adverseEvent.onsetTime"), required: false, kind: "time12" },
    {
      id: "description",
      label: isHcp ? t("adverseEvent.description.hcp") : t("adverseEvent.description.public"),
      required: true,
      kind: "textarea",
      rows: 5,
      hint: isHcp ? undefined : t("adverseEvent.descriptionHint"),
    },
    {
      id: "symptoms",
      label: t("adverseEvent.symptoms"),
      required: false,
      kind: "checkboxGroup",
      options: SYMPTOM_OPTIONS,
      hint: t("adverseEvent.symptomsHint"),
      // The "Other, please describe" field lives inline under this same
      // question (see the `extras` render in AdverseEventStep) rather than
      // as its own separate sequential question — this just makes sure its
      // validation error still shows up correctly here (live blocking,
      // review-summary row, back-navigation) even though it's a distinct
      // top-level schema field.
      alsoValidates: ["symptomsOther"],
      describeError: (relativePath, message) =>
        relativePath === "symptomsOther" ? message : t("adverseEvent.symptomsError", { msg: message }),
      // Without this, the review screen's recap of a checkboxGroup falls
      // back to the plain option label ("Other") with no indication of
      // what the reporter actually typed for it — the same visibility gap
      // that alsoValidates exists to prevent for errors, just for the
      // recap value instead.
      formatSummary: (value) =>
        ((value as string[]) ?? [])
          .map((v) => {
            const label = SYMPTOM_OPTIONS.find((o) => o.value === v)?.label ?? v;
            return v === "other" && symptomsOtherValue ? `${label} (${symptomsOtherValue})` : label;
          })
          .join(", "),
    },
    {
      id: "labResults",
      label: t("adverseEvent.labResults"),
      required: false,
      kind: "textarea",
      rows: 3,
      hint: t("adverseEvent.labResultsHint"),
    },
    {
      id: "outcomes",
      label: t("adverseEvent.outcomes"),
      required: false,
      kind: "checkboxGroup",
      options: OUTCOME_OPTIONS,
    },
    {
      id: "recoveryStatus",
      label: t(isSelfReport ? "adverseEvent.recoveryStatus.self" : "adverseEvent.recoveryStatus.other"),
      required: false,
      kind: "choice",
      options: RECOVERY_OPTIONS,
    },
    {
      id: "hospitalizationDays",
      label: t("adverseEvent.hospitalizationDays"),
      required: true,
      kind: "number",
      hint: t(
        isSelfReport
          ? "adverseEvent.hospitalizationDaysHint.self"
          : "adverseEvent.hospitalizationDaysHint.other"
      ),
    },
    { id: "hospitalName", label: t("adverseEvent.hospitalName"), required: false, kind: "text" },
    { id: "hospitalCity", label: t("adverseEvent.hospitalCity"), required: false, kind: "text" },
    { id: "hospitalState", label: t("adverseEvent.hospitalState"), required: false, kind: "choice", options: STATE_OPTIONS },
    { id: "dateOfDeath", label: t("adverseEvent.dateOfDeath"), required: false, kind: "date", max: todayIsoDate() },
    { id: "treatmentGiven", label: t("adverseEvent.treatmentGiven"), required: false, kind: "textarea", rows: 3 },
    {
      id: "clinicalCourseNotes",
      label: t("adverseEvent.clinicalCourseNotes"),
      required: false,
      kind: "textarea",
      rows: 4,
    },
    {
      id: "previousAdverseEvent",
      label: t(
        isSelfReport ? "adverseEvent.previousAdverseEvent.self" : "adverseEvent.previousAdverseEvent.other"
      ),
      required: false,
      kind: "choice",
      options: YES_NO_UNKNOWN_OPTIONS,
    },
    {
      id: "previousAdverseEventDetails",
      label: t("adverseEvent.previousAdverseEventDetails"),
      required: false,
      kind: "textarea",
      rows: 3,
    },
  ];
}

export function AdverseEventStep({
  submitterType,
  isSelfReport = false,
  initialData,
  vaccineAdministrationDate,
  onNext,
  onBack,
  onSwitchSubmitterType,
}: AdverseEventStepProps) {
  const { t } = useLanguage();
  const schema = adverseEventSchema(submitterType);
  const initial = initialData ?? EMPTY;
  const { values, setValue, errors, validate } = useStepForm(schema, initial);
  const isHcp = submitterType === "hcp";
  const outcomes = values.outcomes as string[];
  const showHospitalizationDetails =
    outcomes.includes("hospitalization") || outcomes.includes("hospitalization_prolonged");
  const showDateOfDeath = outcomes.includes("death");
  // Same contradiction the cross-field review check (validationRules.ts)
  // blocks submission on — surfaced live, right where it happens, instead
  // of only at final review.
  const selfReportDeathFlag = isSelfReport && outcomes.includes("death");
  const showPreviousDetails = values.previousAdverseEvent === "yes";
  const showSymptomsOther = (values.symptoms as string[]).includes("other");

  function checkFieldLogic(fieldId: string, liveValues: Record<string, unknown>): string | null {
    if (fieldId === "onsetDate" && vaccineAdministrationDate) {
      const onsetDate = String(liveValues.onsetDate ?? "");
      if (onsetDate && isDateBefore(onsetDate, vaccineAdministrationDate)) {
        return t("adverseEvent.onsetBeforeVaccination");
      }
    }
    if (fieldId === "hospitalizationDays") {
      const onsetDate = String(liveValues.onsetDate ?? "");
      const days = Number(liveValues.hospitalizationDays);
      if (onsetDate && Number.isFinite(days)) {
        const message = hospitalizationExceedsElapsed(onsetDate, days);
        if (message) return message;
      }
    }
    if (fieldId === "dateOfDeath") {
      const dateOfDeath = String(liveValues.dateOfDeath ?? "");
      const onsetDate = String(liveValues.onsetDate ?? "");
      if (dateOfDeath && vaccineAdministrationDate && isDateBefore(dateOfDeath, vaccineAdministrationDate)) {
        return t("adverseEvent.deathBeforeVaccination");
      }
      if (dateOfDeath && onsetDate && isDateBefore(dateOfDeath, onsetDate)) {
        return t("adverseEvent.deathBeforeOnset");
      }
    }
    return null;
  }

  function handleSetValue(id: string, value: unknown) {
    setValue(id as keyof AdverseEventData, value as any);

    // A field hidden because its trigger changed shouldn't leave stale data
    // behind to be silently submitted once it's no longer visible.
    if (id === "outcomes") {
      const prevOutcomes = values.outcomes as string[];
      let newOutcomes = value as string[];

      // "None of the above" is mutually exclusive with every real outcome —
      // selecting it clears the rest, and selecting anything else clears it.
      const noneJustAdded = newOutcomes.includes("none") && !prevOutcomes.includes("none");
      if (noneJustAdded) {
        newOutcomes = ["none"];
        setValue("outcomes", newOutcomes);
      } else if (newOutcomes.includes("none") && newOutcomes.length > 1) {
        newOutcomes = newOutcomes.filter((o) => o !== "none");
        setValue("outcomes", newOutcomes);
      }

      if (!newOutcomes.includes("hospitalization") && !newOutcomes.includes("hospitalization_prolonged")) {
        setValue("hospitalizationDays", "");
        setValue("hospitalName", "");
        setValue("hospitalCity", "");
        setValue("hospitalState", "");
      }
      if (!newOutcomes.includes("death")) {
        setValue("dateOfDeath", "");
      }
    }
    if (id === "previousAdverseEvent" && value !== "yes") {
      setValue("previousAdverseEventDetails", "");
    }
    if (id === "symptoms" && !(value as string[]).includes("other")) {
      setValue("symptomsOther", "");
    }
  }

  const fields = adverseEventFieldSpecs(t, isHcp, isSelfReport, values.symptomsOther as string).filter((f) => {
    switch (f.id) {
      case "recoveryStatus":
        // Asking "has the patient recovered?" doesn't make sense once
        // "Patient died" is already recorded as an outcome.
        return !outcomes.includes("death");
      case "hospitalizationDays":
      case "hospitalName":
      case "hospitalCity":
      case "hospitalState":
        return showHospitalizationDetails;
      case "dateOfDeath":
        return showDateOfDeath;
      case "clinicalCourseNotes":
        return isHcp;
      case "previousAdverseEventDetails":
        return showPreviousDetails;
      default:
        return true;
    }
  });

  return (
    <ConversationalStep
      stepTitle={t("step.adverse-event")}
      fields={fields}
      values={values as unknown as Record<string, unknown>}
      setValue={handleSetValue}
      errors={errors}
      validate={validate}
      onNext={onNext}
      onBack={onBack}
      initialIndex={schema.safeParse(initial).success ? fields.length : 0}
      extraFieldValidation={checkFieldLogic}
      extras={{
        symptoms: () =>
          showSymptomsOther ? (
            <div className="field field--nested">
              <label className="field__label" htmlFor="symptoms-other-input">
                {t("adverseEvent.symptomsOtherDescribe")}
              </label>
              <input
                id="symptoms-other-input"
                className="field__input"
                value={values.symptomsOther}
                onChange={(e) => handleSetValue("symptomsOther", e.target.value)}
                aria-invalid={!!errors.symptomsOther}
                aria-describedby={errors.symptomsOther ? "symptoms-other-error" : undefined}
              />
              {errors.symptomsOther && (
                <p id="symptoms-other-error" role="alert" className="field__error">
                  {errors.symptomsOther}
                </p>
              )}
            </div>
          ) : null,
        outcomes: () =>
          selfReportDeathFlag ? (
            <div className="notice notice--warning" role="status">
              <p>{t("adverseEvent.selfReportDeathNotice")}</p>
              <button type="button" className="button button--secondary" onClick={onSwitchSubmitterType}>
                {t("patient.changeWhoIsFilling")}
              </button>
            </div>
          ) : null,
      }}
    />
  );
}
