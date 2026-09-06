import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext";

interface BeforeYouStartStepProps {
  onNext: () => Promise<void>;
  onBack: () => void;
}

/** Informational screen before the form begins (FLOW-004): what the report is used for, and what's helpful to have on hand. Nothing here is required. */
export function BeforeYouStartStep({ onNext, onBack }: BeforeYouStartStepProps) {
  const { t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="step-form">
      <h1>{t("beforeYouStart.heading")}</h1>

      <div className="notice notice--navy before-you-start__notice">
        <span className="before-you-start__icon" aria-hidden="true">
          <ShieldIcon />
        </span>
        <div className="before-you-start__notice-body">
          <h2>{t("beforeYouStart.notice.title")}</h2>
          <p>{t("beforeYouStart.notice.body")}</p>
        </div>
        <Link to="/about" className="before-you-start__learn-more">
          {t("beforeYouStart.learnMore")}
        </Link>
      </div>

      <h2 className="before-you-start__section-title">{t("beforeYouStart.infoNeeded")}</h2>
      <p>{t("beforeYouStart.infoNeededLead")}</p>

      <ul className="checklist">
        <li className="checklist__item">
          <VaccineIcon />
          {t("beforeYouStart.checklist.vaccine")}
        </li>
        <li className="checklist__item">
          <CalendarIcon />
          {t("beforeYouStart.checklist.date")}
        </li>
        <li className="checklist__item">
          <SymptomIcon />
          {t("beforeYouStart.checklist.symptoms")}
        </li>
      </ul>
      <p className="field__hint">{t("beforeYouStart.hint")}</p>

      {error && (
        <p role="alert" className="field__error">
          {error}
        </p>
      )}
      <div className="step-form__actions">
        <button type="button" className="button button--text" onClick={onBack}>
          {t("common.back")}
        </button>
        <button type="button" className="button button--primary" onClick={handleContinue} disabled={submitting}>
          {submitting ? "Saving…" : t("common.continue")}
        </button>
      </div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3 L20 6 V11 C20 16 16.5 20 12 21 C7.5 20 4 16 4 11 V6 Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function VaccineIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M17 3l4 4-2 2-1-1-8 8-2 3-3 1 1-3 3-2 8-8-1-1z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M4 10h16M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SymptomIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="8" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="2" />
      <path d="M12 12v4M10 14h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
