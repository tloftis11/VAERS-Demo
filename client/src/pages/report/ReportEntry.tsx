import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { createReport, getReport, type ClientReport } from "../../api/client";
import { firstIncompleteStep } from "../../reportProgress";
import { getDraftReportId, setDraftReportId, getDraftToken, setDraftToken } from "../../draftAuth";

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

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const existingId = getDraftReportId();

      if (!existingId) {
        const report = await createReport();
        if (cancelled) return;
        setDraftReportId(report.id);
        setDraftToken(report.id, report.draftToken!);
        setTarget(`/report/${report.id}/submitter-type`);
        return;
      }

      // Check the leftover local draft and start a fresh report at the same
      // time, instead of one after the other — most of the time that local
      // id points at an already-submitted or long-gone draft, so waiting on
      // the check before even starting the new report doubles a slow
      // request for nothing.
      const [existing, fresh] = await Promise.all([
        getReport(existingId, getDraftToken(existingId)).catch(() => null),
        createReport(),
      ]);
      if (cancelled) return;

      if (existing?.status === "draft") {
        setDraft(existing);
        return;
      }

      setDraftReportId(fresh.id);
      setDraftToken(fresh.id, fresh.draftToken!);
      setTarget(`/report/${fresh.id}/submitter-type`);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  function startNew() {
    setDraft(null);
    createReport().then((report) => {
      setDraftReportId(report.id);
      setDraftToken(report.id, report.draftToken!);
      setTarget(`/report/${report.id}/submitter-type`);
    });
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
