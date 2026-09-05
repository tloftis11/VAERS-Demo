import { useState } from "react";
import { Link } from "react-router-dom";
import {
  getReport,
  getReportStatus,
  requestFollowUpCode,
  verifyFollowUpCode,
  getFollowUpReport,
  postFollowUpNote,
  uploadFollowUpAttachment,
  type AttachmentMeta,
  type ClientReport,
} from "../api/client";
import { firstIncompleteStep } from "../reportProgress";
import { getDraftToken } from "../draftAuth";
import { TextField, TextAreaField } from "../components/Field";
import { Dropzone } from "../components/Dropzone";
import { FieldIcon } from "../components/illustrations";
import { ReportSummarySection } from "../components/ReportSummary";
import { aboutYouFieldSpecs } from "./report/AboutYouStep";
import { patientFieldSpecs } from "./report/PatientStep";
import { vaccineFieldSpecs } from "./report/VaccineStep";
import { adverseEventFieldSpecs } from "./report/AdverseEventStep";
import { ERROR_DETAIL_FIELD_SPECS } from "./report/ErrorDetailStep";
import { useLanguage } from "../i18n/LanguageContext";

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

type LookupState = "idle" | "loading" | "not-found" | "error" | "draft-not-accessible";
/** "email" / "code": the identity gate for a submitted report, before any
 * of its PHI reaches the browser. "verified": gate passed, full report loaded. */
type GatePhase = "email" | "code" | "verified";

export function FollowUp() {
  const { t } = useLanguage();
  const [referenceInput, setReferenceInput] = useState("");
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [draftReport, setDraftReport] = useState<ClientReport | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [gatePhase, setGatePhase] = useState<GatePhase | null>(null);

  const [emailInput, setEmailInput] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const [codeInput, setCodeInput] = useState("");
  const [codeSubmitting, setCodeSubmitting] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [followUpToken, setFollowUpToken] = useState<string | null>(null);

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
    setDraftReport(null);
    setReportId(null);
    setGatePhase(null);
    try {
      const status = await getReportStatus(id);
      setReportId(status.id);
      if (status.status === "draft") {
        // Only succeeds if this is the same browser/device the draft was
        // started on (it's the only place the token is ever stored) —
        // otherwise this correctly 401s, same as anyone else guessing or
        // being told the reference number of someone else's in-progress
        // report, since a draft has no other identity check yet.
        setDraftReport(await getReport(id, getDraftToken(id)));
        setLookupState("idle");
      } else {
        setLookupState("idle");
        setGatePhase("email");
      }
    } catch (err) {
      const status = (err as { status?: number }).status;
      setLookupState(status === 404 ? "not-found" : status === 401 ? "draft-not-accessible" : "error");
    }
  }

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    if (!reportId || !emailInput.trim()) return;
    setEmailSubmitting(true);
    setEmailError(null);
    try {
      const result = await requestFollowUpCode(reportId, emailInput.trim());
      setDevCode(result.devCode);
      setGatePhase("code");
    } catch (err) {
      setEmailError(
        (err as { status?: number }).status === 403
          ? t("followUp.emailMismatch")
          : t("followUp.somethingWentWrong")
      );
    } finally {
      setEmailSubmitting(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!reportId || !codeInput.trim()) return;
    setCodeSubmitting(true);
    setCodeError(null);
    try {
      const { accessToken } = await verifyFollowUpCode(reportId, codeInput.trim());
      setFollowUpToken(accessToken);
      const full = await getFollowUpReport(reportId, accessToken);
      setReport(full);
      setGatePhase("verified");
    } catch {
      setCodeError(t("followUp.codeIncorrect"));
    } finally {
      setCodeSubmitting(false);
    }
  }

  async function handleFiles(accepted: File[], rejectedCount: number) {
    if (!report || !followUpToken) return;
    setUploadError(rejectedCount > 0 ? t("followUp.someFilesSkipped") : null);
    if (accepted.length === 0) return;

    setUploadingCount((n) => n + accepted.length);
    for (const file of accepted) {
      try {
        const meta = await uploadFollowUpAttachment(report.id, file, followUpToken);
        setReport((prev) => (prev ? { ...prev, attachments: [...prev.attachments, meta] } : prev));
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : t("followUp.uploadFailed"));
      } finally {
        setUploadingCount((n) => n - 1);
      }
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!report || !followUpToken || !noteText.trim()) return;
    setNoteSubmitting(true);
    try {
      const updated = await postFollowUpNote(report.id, noteText.trim(), followUpToken);
      setReport(updated);
      setNoteText("");
    } finally {
      setNoteSubmitting(false);
    }
  }

  return (
    <div className="page page--prose">
      <h1>{t("followUp.heading")}</h1>
      <p>{t("followUp.lead")}</p>

      <form className="step-form" onSubmit={handleLookup}>
        <TextField
          id="reference-number"
          label={t("followUp.referenceNumber")}
          hint={t("followUp.referenceHint")}
          value={referenceInput}
          onChange={setReferenceInput}
          // A shared/public browser must never offer to autofill someone
          // else's report reference here — this is a lookup for another
          // person's already-submitted data, not a returning-user
          // convenience.
          autoComplete="off"
        />
        <div className="step-form__actions">
          <button type="submit" className="button button--primary" disabled={lookupState === "loading"}>
            {lookupState === "loading" ? t("followUp.lookingUp") : t("followUp.findReport")}
          </button>
        </div>
      </form>

      {lookupState === "not-found" && (
        <p role="alert" className="field__error">
          {t("followUp.notFound")}
        </p>
      )}
      {lookupState === "error" && (
        <p role="alert" className="field__error">
          {t("followUp.lookupError")}
        </p>
      )}
      {lookupState === "draft-not-accessible" && (
        <p role="alert" className="field__error">
          {t("followUp.draftNotAccessible")}
        </p>
      )}

      {draftReport && (
        <p className="notice notice--info">
          {t("followUp.draftNotice")}{" "}
          <Link to={`/report/${draftReport.id}/${firstIncompleteStep(draftReport)}`}>
            {t("followUp.continueCompleting")}
          </Link>{" "}
          {t("followUp.draftNoticeAfter")}
        </p>
      )}

      {gatePhase === "email" && (
        <form className="step-form identity-gate" onSubmit={handleRequestCode}>
          <h2>{t("followUp.verifyItsYou")}</h2>
          <p className="field__hint">{t("followUp.verifyItsYouHint")}</p>
          <TextField
            id="verify-email"
            label={t("followUp.emailOfRecord")}
            value={emailInput}
            onChange={setEmailInput}
            autoComplete="off"
          />
          {emailError && (
            <p role="alert" className="field__error">
              {emailError}
            </p>
          )}
          <div className="step-form__actions">
            <button type="submit" className="button button--primary" disabled={emailSubmitting}>
              {emailSubmitting ? t("followUp.checking") : t("followUp.sendCode")}
            </button>
          </div>
        </form>
      )}

      {gatePhase === "code" && (
        <form className="step-form identity-gate" onSubmit={handleVerifyCode}>
          <h2>{t("followUp.enterCode")}</h2>
          {devCode && (
            <p className="notice notice--info">
              <strong>{t("followUp.prototypeNoteLabel")}</strong> {t("followUp.prototypeNoteBody")}{" "}
              <strong>{devCode}</strong>
            </p>
          )}
          <TextField
            id="verify-code"
            label={t("followUp.sixDigitCode")}
            value={codeInput}
            onChange={setCodeInput}
          />
          {codeError && (
            <p role="alert" className="field__error">
              {codeError}
            </p>
          )}
          <div className="step-form__actions">
            <button type="submit" className="button button--primary" disabled={codeSubmitting}>
              {codeSubmitting ? t("followUp.verifying") : t("followUp.verify")}
            </button>
          </div>
        </form>
      )}

      {gatePhase === "verified" && report && (
        <div className="follow-up__report">
          <dl className="review-list">
            <div className="review-list__row">
              <dt>{t("followUp.referenceNumberLabel")}</dt>
              <dd>{report.id}</dd>
            </div>
            {report.submittedAt && (
              <div className="review-list__row">
                <dt>{t("followUp.submitted")}</dt>
                <dd>{formatDate(report.submittedAt)}</dd>
              </div>
            )}
          </dl>

          <h2>{t("followUp.whatYouSubmitted")}</h2>
          <ReportSummarySection
            title={t("review.section.aboutYou")}
            fields={aboutYouFieldSpecs(t, report.submitterType ?? "public", null, true, {
              city: report.aboutYou?.mailingCity ?? "",
              state: report.aboutYou?.mailingState ?? "",
              zip: report.aboutYou?.mailingZip ?? "",
            })}
            values={report.aboutYou}
          />
          <ReportSummarySection
            title={t("review.section.aboutPatient")}
            fields={patientFieldSpecs(
              t,
              undefined,
              undefined,
              report.patient?.patientRaceOther,
              {
                city: report.patient?.patientCity ?? "",
                state: report.patient?.patientState ?? "",
                county: report.patient?.patientCounty ?? "",
                zip: report.patient?.patientZip ?? "",
              },
              report.aboutYou?.relationship === "self"
            )}
            values={report.patient}
          />
          <ReportSummarySection
            title={t("review.section.vaccine")}
            fields={vaccineFieldSpecs(
              t,
              report.submitterType === "hcp",
              undefined,
              report.vaccine?.vaccineType,
              report.vaccine?.route,
              report.vaccine?.bodySiteOther,
              {
                city: report.vaccine?.facilityCity ?? "",
                state: report.vaccine?.facilityState ?? "",
                zip: report.vaccine?.facilityZip ?? "",
              }
            )}
            values={report.vaccine}
          />
          {/* Mirrors getApplicableSteps' own gating (branchingRules.ts) and
              ReviewStep.tsx's matching guard — a second, independent check
              against a stale adverseEvent/errorDetail record (e.g. from
              before the server started clearing them on a "No" answer)
              surfacing under a branch that's no longer selected. */}
          {(report.submitterType !== "hcp" || report.adverseEventOccurred !== false) && (
            <ReportSummarySection
              title={t("review.section.whatHappened")}
              fields={adverseEventFieldSpecs(
                t,
                report.submitterType === "hcp",
                report.aboutYou?.relationship === "self",
                report.adverseEvent?.symptomsOther
              )}
              values={report.adverseEvent}
            />
          )}
          {report.submitterType === "hcp" && report.administrationError === true && (
            <ReportSummarySection
              title={t("review.section.errorDetail")}
              fields={ERROR_DETAIL_FIELD_SPECS(t)}
              values={report.errorDetail}
            />
          )}
          {report.documents.supplementalNotes && (
            <div className="review-section">
              <h2>{t("followUp.additionalContext")}</h2>
              <p>{report.documents.supplementalNotes}</p>
            </div>
          )}

          <h2>{t("followUp.documentsOnFile")}</h2>
          {report.attachments.length > 0 ? (
            <ul className="attachment-list">
              {report.attachments.map((a: AttachmentMeta) => (
                <li key={a.id} className="attachment-list__item">
                  <span className="attachment-list__info">
                    <FieldIcon name="document" size={18} className="attachment-list__icon" />
                    <span>
                      {a.originalFilename} ({formatSize(a.sizeBytes)})
                      {a.isFollowUp && ` ${t("followUp.addedAsFollowUp")}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="review-list__empty">{t("followUp.noDocuments")}</p>
          )}

          <h2>{t("followUp.addDocument")}</h2>
          <Dropzone acceptedExtensions={ACCEPTED_EXTENSIONS} onFiles={handleFiles} />
          {uploadingCount > 0 && (
            <p role="status" className="dropzone__status">
              {t("followUp.uploadingFiles", { n: uploadingCount, plural: uploadingCount === 1 ? "" : "s" })}
            </p>
          )}
          {uploadError && (
            <p role="alert" className="field__error">
              {uploadError}
            </p>
          )}

          <h2>{t("followUp.followUpNotes")}</h2>
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
              label={t("followUp.addNote")}
              hint={t("followUp.addNoteHint")}
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
                {noteSubmitting ? t("followUp.adding") : t("followUp.addNoteButton")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
