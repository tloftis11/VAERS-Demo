import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getReport, postSubmissionSurvey, type ClientReport } from "../../api/client";
import { SurveyForm } from "../../components/SurveyForm";
import { CheckBadge } from "../../components/illustrations";
import { useLanguage } from "../../i18n/LanguageContext";
import { getDraftToken, clearDraftToken, isDraftReportId, clearDraftReportId } from "../../draftAuth";

export function Confirmation() {
  const { t } = useLanguage();
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<ClientReport | null>(null);

  useEffect(() => {
    if (!reportId) return;
    // The report is already submitted by the time this page is reached, so
    // the draft token is no longer checked server-side either way — but
    // only clear it (and the "continue your report" pointer) once this
    // confirmation load has actually succeeded, so a failed request here
    // doesn't strand a still-draft report with its access already discarded.
    getReport(reportId, getDraftToken(reportId)).then((r) => {
      setReport(r);
      if (isDraftReportId(reportId)) clearDraftReportId();
      clearDraftToken(reportId);
    });
  }, [reportId]);

  return (
    <div className="page page--prose">
      <CheckBadge className="confirmation__badge" />
      <h1 className="confirmation__heading">{t("confirmation.heading")}</h1>
      <p className="confirmation__lead">{t("confirmation.lead1")}</p>
      <p className="confirmation__lead">{t("confirmation.lead2")}</p>

      <div className="confirmation__reference">
        <span className="confirmation__reference-label">{t("confirmation.referenceLabel")}</span>
        <span className="confirmation__reference-value">{reportId}</span>
        <span className="confirmation__reference-hint">{t("confirmation.referenceHint")}</span>
      </div>

      <button
        type="button"
        className="button button--secondary confirmation__print-button"
        onClick={() => window.print()}
      >
        {t("confirmation.printButton")}
      </button>

      {report?.duplicateFlag && (
        <div className="notice notice--info">
          <p>
            <strong>{t("confirmation.duplicateTitle")}</strong> {t("confirmation.duplicateNoAction")}
          </p>
          <p className="confirmation__duplicate-detail">{t("confirmation.duplicateDetail")}</p>
        </div>
      )}

      <h2 className="confirmation__next-heading">{t("confirmation.nextHeading")}</h2>
      <ol className="confirmation__next-steps">
        <li>{t("confirmation.next1")}</li>
        <li>{t("confirmation.next2")}</li>
        <li>
          {t("confirmation.next3.before")} <Link to="/follow-up">{t("confirmation.next3.link")}</Link>{" "}
          {t("confirmation.next3.after")}
        </li>
      </ol>

      {reportId && (
        <SurveyForm
          title={t("confirmation.surveyTitle")}
          prompt={t("confirmation.surveyPrompt")}
          onSubmit={(rating, comment) => postSubmissionSurvey(rating, comment, reportId).then(() => {})}
        />
      )}
    </div>
  );
}
