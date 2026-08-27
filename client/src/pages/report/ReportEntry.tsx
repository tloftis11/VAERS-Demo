import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { createReport, getReport, type ClientReport } from "../../api/client";
import { firstIncompleteStep } from "../../reportProgress";

const DRAFT_KEY = "vaers_draft_report_id";

/**
 * Entry point for the reporting flow. If a draft is already in progress on
 * this browser, asks before jumping back into it — landing here should
 * never silently skip a user past steps they don't remember answering
 * (SUP-XXX bug report: "Start a Report" was resuming an old draft instead
 * of starting fresh).
 */
export function ReportEntry() {
  const [draft, setDraft] = useState<ClientReport | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkForDraft() {
      const existingId = localStorage.getItem(DRAFT_KEY);
      if (existingId) {
        try {
          const report = await getReport(existingId);
          if (report.status === "draft" && !cancelled) {
            setDraft(report);
            setChecked(true);
            return;
          }
        } catch {
          // Draft no longer exists server-side; fall through to starting fresh.
        }
      }
      if (!cancelled) setChecked(true);
    }

    checkForDraft();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!checked || draft) return;
    let cancelled = false;
    createReport().then((report) => {
      if (cancelled) return;
      localStorage.setItem(DRAFT_KEY, report.id);
      setTarget(`/report/${report.id}/submitter-type`);
    });
    return () => {
      cancelled = true;
    };
  }, [checked, draft]);

  function startNew() {
    setDraft(null);
  }

  function resumeDraft() {
    if (!draft) return;
    setTarget(`/report/${draft.id}/${firstIncompleteStep(draft)}`);
  }

  if (target) return <Navigate to={target} replace />;

  if (draft) {
    return (
      <div className="page page--wizard">
        <div className="choice-step">
          <h1>Continue your report?</h1>
          <p>You have a report in progress on this device that hasn't been submitted yet.</p>
          <div className="choice-cards">
            <button type="button" className="choice-card" onClick={resumeDraft}>
              <span>
                <h2>Continue where I left off</h2>
                <p>Pick back up on your in-progress report.</p>
              </span>
            </button>
            <button type="button" className="choice-card" onClick={startNew}>
              <span>
                <h2>Start a new report</h2>
                <p>Your in-progress report stays saved in case you change your mind.</p>
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <p>Loading your report…</p>
    </div>
  );
}
