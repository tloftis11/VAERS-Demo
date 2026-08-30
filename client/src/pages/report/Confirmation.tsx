import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getReport, postSubmissionSurvey, type ClientReport } from "../../api/client";
import { SurveyForm } from "../../components/SurveyForm";
import { CheckBadge } from "../../components/illustrations";

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
      <CheckBadge className="confirmation__badge" />
      <h1 className="confirmation__heading">Thank you for reporting</h1>
      <p className="confirmation__lead">
        Your report has been received and is now part of the national effort to keep vaccines
        safe. Reports like yours are what make this system work.
      </p>
      <p className="confirmation__lead">
        <strong>You're done — there's nothing else you need to do</strong> unless we contact you
        for more information.
      </p>

      <div className="confirmation__reference">
        <span className="confirmation__reference-label">Your reference number</span>
        <span className="confirmation__reference-value">{reportId}</span>
        <span className="confirmation__reference-hint">
          Write this down or take a screenshot — you'll need it if you want to add documents or
          updates to this report later.
        </span>
      </div>

      <button
        type="button"
        className="button button--secondary confirmation__print-button"
        onClick={() => window.print()}
      >
        Print or save a copy of this page
      </button>

      {report?.duplicateFlag && (
        <div className="notice notice--info">
          <p>
            <strong>This report may be similar to one already on file.</strong> That's okay — no
            action is needed on your part.
          </p>
          <p className="confirmation__duplicate-detail">
            We automatically compared the patient, vaccine, and description against existing
            reports; a CDC reviewer will take a closer look before anything is merged or discarded.
          </p>
        </div>
      )}

      <h2 className="confirmation__next-heading">What happens next</h2>
      <ol className="confirmation__next-steps">
        <li>CDC and FDA staff review your report as part of ongoing vaccine-safety monitoring.</li>
        <li>
          They may follow up with the contact on this report if more information is needed — you
          generally won't receive an individual response otherwise.
        </li>
        <li>
          If a discharge summary or other document comes in later, you can{" "}
          <Link to="/follow-up">add it to this report</Link> using your reference number above — no
          need to submit a new one.
        </li>
      </ol>

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
