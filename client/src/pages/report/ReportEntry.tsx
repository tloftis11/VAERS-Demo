import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { createReport, getReport } from "../../api/client";
import { firstIncompleteStep } from "../../reportProgress";

const DRAFT_KEY = "vaers_draft_report_id";

/** Resumes an existing draft, or starts a new one, then redirects into the wizard. */
export function ReportEntry() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resumeOrCreate() {
      const existingId = localStorage.getItem(DRAFT_KEY);
      if (existingId) {
        try {
          const report = await getReport(existingId);
          if (report.status === "draft" && !cancelled) {
            setTarget(`/report/${report.id}/${firstIncompleteStep(report)}`);
            return;
          }
        } catch {
          // Draft no longer exists server-side; fall through to creating a new one.
        }
      }
      const report = await createReport();
      localStorage.setItem(DRAFT_KEY, report.id);
      if (!cancelled) setTarget(`/report/${report.id}/submitter-type`);
    }

    resumeOrCreate();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!target) {
    return (
      <div className="page">
        <p>Loading your report…</p>
      </div>
    );
  }
  return <Navigate to={target} replace />;
}
