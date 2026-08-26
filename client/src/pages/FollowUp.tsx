import { useState } from "react";
import { Link } from "react-router-dom";
import {
  getReport,
  postFollowUpNote,
  uploadFollowUpAttachment,
  type AttachmentMeta,
  type ClientReport,
} from "../api/client";
import { firstIncompleteStep } from "../reportProgress";
import { TextField, TextAreaField } from "../components/Field";
import { Dropzone } from "../components/Dropzone";
import { FieldIcon } from "../components/illustrations";
import { ReportSummarySection } from "../components/ReportSummary";
import { aboutYouFieldSpecs } from "./report/AboutYouStep";
import { PATIENT_FIELD_SPECS } from "./report/PatientStep";
import { vaccineFieldSpecs } from "./report/VaccineStep";
import { adverseEventFieldSpecs } from "./report/AdverseEventStep";
import { ERROR_DETAIL_FIELD_SPECS } from "./report/ErrorDetailStep";

const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".docx"];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type LookupState = "idle" | "loading" | "not-found" | "error";

export function FollowUp() {
  const [referenceInput, setReferenceInput] = useState("");
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [report, setReport] = useState<ClientReport | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [noteText, setNoteText] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const id = referenceInput.trim();
    if (!id) return;
    setLookupState("loading");
    setReport(null);
    try {
      const found = await getReport(id);
      setReport(found);
      setLookupState("idle");
    } catch (err) {
      const status = (err as { status?: number }).status;
      setLookupState(status === 404 ? "not-found" : "error");
    }
  }

  async function handleFiles(accepted: File[], rejectedCount: number) {
    if (!report) return;
    setUploadError(
      rejectedCount > 0 ? "Some files were skipped — only PDF, JPEG, PNG, or Word documents are accepted." : null
    );
    if (accepted.length === 0) return;

    setUploadingCount((n) => n + accepted.length);
    for (const file of accepted) {
      try {
        const meta = await uploadFollowUpAttachment(report.id, file);
        setReport((prev) => (prev ? { ...prev, attachments: [...prev.attachments, meta] } : prev));
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploadingCount((n) => n - 1);
      }
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!report || !noteText.trim()) return;
    setNoteSubmitting(true);
    try {
      const updated = await postFollowUpNote(report.id, noteText.trim());
      setReport(updated);
      setNoteText("");
    } finally {
      setNoteSubmitting(false);
    }
  }

  return (
    <div className="page page--prose">
      <h1>Provide follow-up information</h1>
      <p>
        Already submitted a report and have new documents or details to add — like a discharge
        summary that arrived later, or an update on how the patient is doing? Look it up with the
        reference number from your confirmation page.
      </p>

      <form className="step-form" onSubmit={handleLookup}>
        <TextField
          id="reference-number"
          label="Reference number"
          hint="Shown on your confirmation page after you submitted the report."
          value={referenceInput}
          onChange={setReferenceInput}
        />
        <div className="step-form__actions">
          <button type="submit" className="button button--primary" disabled={lookupState === "loading"}>
            {lookupState === "loading" ? "Looking up…" : "Find my report"}
          </button>
        </div>
      </form>

      {lookupState === "not-found" && (
        <p role="alert" className="field__error">
          We couldn't find a report with that reference number. Double-check it against your
          confirmation page and try again.
        </p>
      )}
      {lookupState === "error" && (
        <p role="alert" className="field__error">
          Something went wrong looking up that report. Please try again in a moment.
        </p>
      )}

      {report && report.status === "draft" && (
        <p className="notice notice--info">
          This report hasn't been submitted yet.{" "}
          <Link to={`/report/${report.id}/${firstIncompleteStep(report)}`}>Continue completing it</Link> —
          you can add documents on the final steps before you submit.
        </p>
      )}

      {report && report.status === "submitted" && (
        <div className="follow-up__report">
          <dl className="review-list">
            <div className="review-list__row">
              <dt>Reference number</dt>
              <dd>{report.id}</dd>
            </div>
            {report.submittedAt && (
              <div className="review-list__row">
                <dt>Submitted</dt>
                <dd>{formatDate(report.submittedAt)}</dd>
              </div>
            )}
          </dl>

          <h2>What you submitted</h2>
          <ReportSummarySection
            title="About you"
            fields={aboutYouFieldSpecs(report.submitterType ?? "public")}
            values={report.aboutYou}
          />
          <ReportSummarySection title="About the patient" fields={PATIENT_FIELD_SPECS} values={report.patient} />
          <ReportSummarySection
            title="Vaccine information"
            fields={vaccineFieldSpecs(report.submitterType === "hcp")}
            values={report.vaccine}
          />
          <ReportSummarySection
            title="What happened"
            fields={adverseEventFieldSpecs(report.submitterType === "hcp")}
            values={report.adverseEvent}
          />
          <ReportSummarySection
            title="Administration error details"
            fields={ERROR_DETAIL_FIELD_SPECS}
            values={report.errorDetail}
          />
          {report.documents.supplementalNotes && (
            <div className="review-section">
              <h2>Additional context</h2>
              <p>{report.documents.supplementalNotes}</p>
            </div>
          )}

          <h2>Documents on file</h2>
          {report.attachments.length > 0 ? (
            <ul className="attachment-list">
              {report.attachments.map((a: AttachmentMeta) => (
                <li key={a.id} className="attachment-list__item">
                  <span className="attachment-list__info">
                    <FieldIcon name="document" size={18} className="attachment-list__icon" />
                    <span>
                      {a.originalFilename} ({formatSize(a.sizeBytes)})
                      {a.isFollowUp && " — added as follow-up"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="review-list__empty">No documents have been added to this report yet.</p>
          )}

          <h2>Add a document</h2>
          <Dropzone acceptedExtensions={ACCEPTED_EXTENSIONS} onFiles={handleFiles} />
          {uploadingCount > 0 && (
            <p role="status" className="dropzone__status">
              Uploading {uploadingCount} file{uploadingCount === 1 ? "" : "s"}…
            </p>
          )}
          {uploadError && (
            <p role="alert" className="field__error">
              {uploadError}
            </p>
          )}

          <h2>Follow-up notes</h2>
          {report.followUpNotes.length > 0 && (
            <ul className="attachment-list">
              {report.followUpNotes.map((n) => (
                <li key={n.id} className="attachment-list__item">
                  <span className="attachment-list__info">
                    <span>
                      {n.note}
                      <br />
                      <small>{formatDate(n.createdAt)}</small>
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <form className="step-form" onSubmit={handleAddNote}>
            <TextAreaField
              id="follow-up-note"
              label="Add a note"
              hint="For example, an update on recovery, or context for a document you just added."
              rows={3}
              value={noteText}
              onChange={setNoteText}
            />
            <div className="step-form__actions">
              <button
                type="submit"
                className="button button--primary"
                disabled={noteSubmitting || !noteText.trim()}
              >
                {noteSubmitting ? "Adding…" : "Add note"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
