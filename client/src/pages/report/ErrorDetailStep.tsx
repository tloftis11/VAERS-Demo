import { errorDetailSchema, ERROR_TYPES } from "../../../../shared/src/schemas";
import { isDateBefore, todayIsoDate } from "../../../../shared/src/liveChecks";
import type { ErrorDetailData } from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { ConversationalStep, type ConversationalFieldSpec } from "../../components/ConversationalStep";
import { useLanguage } from "../../i18n/LanguageContext";
import type { TranslationKey } from "../../i18n/translations";

interface ErrorDetailStepProps {
  initialData: ErrorDetailData | null;
  /** From the Vaccine step, for a live "discovered can't be before vaccination" check. */
  vaccineAdministrationDate?: string;
  onNext: (data: Record<string, unknown>) => Promise<void>;
  onBack: () => void;
}

const EMPTY: ErrorDetailData = {
  errorType: "",
  errorTypeOther: "",
  errorDescription: "",
  errorDiscoveredDate: "",
  correctiveActionTaken: "",
};

/** Exported so the final review and the read-only follow-up lookup can show
 * the same labels — a function (not a plain constant) for the same reason
 * every other `*FieldSpecs` builder in the wizard is: it needs `t` from
 * whichever caller's own `useLanguage()` call, since this itself is a
 * plain function, not a component/hook. */
export function ERROR_DETAIL_FIELD_SPECS(
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
): ConversationalFieldSpec[] {
  return [
    { id: "errorType", label: t("errorDetail.type"), required: true, kind: "choice", options: ERROR_TYPES },
    { id: "errorTypeOther", label: t("errorDetail.typeOther"), required: false, kind: "text" },
    { id: "errorDescription", label: t("errorDetail.description"), required: true, kind: "textarea", rows: 4 },
    {
      id: "errorDiscoveredDate",
      label: t("errorDetail.discoveredDate"),
      required: true,
      kind: "date",
      icon: "calendar",
      max: todayIsoDate(),
    },
    {
      id: "correctiveActionTaken",
      label: t("errorDetail.correctiveAction"),
      required: false,
      kind: "textarea",
      rows: 3,
    },
  ];
}

export function ErrorDetailStep({
  initialData,
  vaccineAdministrationDate,
  onNext,
  onBack,
}: ErrorDetailStepProps) {
  const { t } = useLanguage();
  const initial = initialData ?? EMPTY;
  const { values, setValue, errors, validate } = useStepForm(errorDetailSchema, initial);
  const fields = ERROR_DETAIL_FIELD_SPECS(t).filter((f) => {
    if (f.id === "errorTypeOther") return values.errorType === "other";
    return true;
  });

  function checkFieldLogic(fieldId: string, liveValues: Record<string, unknown>): string | null {
    if (fieldId === "errorDiscoveredDate" && vaccineAdministrationDate) {
      const discovered = String(liveValues.errorDiscoveredDate ?? "");
      if (discovered && isDateBefore(discovered, vaccineAdministrationDate)) {
        return t("errorDetail.discoveredBeforeVaccination");
      }
    }
    return null;
  }

  function handleSetValue(id: string, value: unknown) {
    setValue(id as keyof ErrorDetailData, value as any);
    if (id === "errorType" && value !== "other") setValue("errorTypeOther", "");
  }

  return (
    <ConversationalStep
      stepTitle={t("step.error-detail")}
      fields={fields}
      values={values as unknown as Record<string, unknown>}
      setValue={handleSetValue}
      errors={errors}
      validate={validate}
      onNext={onNext}
      onBack={onBack}
      initialIndex={errorDetailSchema.safeParse(initial).success ? fields.length : 0}
      extraFieldValidation={checkFieldLogic}
    />
  );
}
