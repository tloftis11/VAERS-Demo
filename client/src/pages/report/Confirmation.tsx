import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getReport, postSubmissionSurvey, type ClientReport } from "../../api/client";
import { SurveyForm } from "../../components/SurveyForm";

const DRAFT_KEY = "vaers_draft_report_id";

export function Confirmation() {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<ClientReport | null>(null);

  useEffect(() => {
    if (!reportId) return;
    getReport(reportId).then(setReport);
    if (localStorage.getItem(DRAFT_KEY) === reportId) {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, [reportId]);

  return (
    <div className="page page--prose">
      <h1>Report submitted</h1>
      <p>Thank you — your report has been received and is now part of vaccine-safety monitoring.</p>
      {report?.duplicateFlag && (
        <p className="notice notice--info">
          This report looks similar to one already on file. That's okay — it's been flagged for
          review and no action is needed on your part.
        </p>
      )}
      <p>
        Reference number: <strong>{reportId}</strong>
      </p>
      <p>
        CDC and FDA staff review submitted reports as part of ongoing vaccine-safety monitoring, and
        may follow up with the contact on this report if more information is needed. You generally
        won't receive an individual response otherwise.
      </p>
      <p>
        Need to add more later? You can still attach medical records or other documents to this
        report using the existing follow-up information tool — you don't need to submit a new report.
      </p>

      {reportId && (
        <SurveyForm
          title="How was your reporting experience?"
          prompt="Rate your experience submitting this report"
          onSubmit={(rating, comment) => postSubmissionSurvey(rating, comment, reportId).then(() => {})}
        />
      )}
    </div>
  );
}
