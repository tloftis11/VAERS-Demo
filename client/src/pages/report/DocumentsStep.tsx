import { useEffect, useRef, useState } from "react";
import { documentsSchema } from "../../../../shared/src/schemas";
import type { SubmitterType } from "../../../../shared/src/branchingRules";
import {
  deleteAttachment,
  downloadAttachment,
  getDocumentSuggestions,
  uploadAttachment,
  type AttachmentMeta,
  type DocumentSuggestion,
} from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { TextAreaField } from "../../components/Field";
import { FieldIcon } from "../../components/illustrations";
import { Dropzone } from "../../components/Dropzone";
import { getDraftToken } from "../../draftAuth";
import { useLanguage } from "../../i18n/LanguageContext";

interface DocumentsStepProps {
  reportId: string;
  submitterType: SubmitterType;
  initialSupplementalNotes: string;
  initialAttachments: AttachmentMeta[];
  onNext: (data: Record<string, unknown>) => Promise<void>;
  onBack: () => void;
}

const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".docx"];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export function DocumentsStep({
  reportId,
  submitterType,
  initialSupplementalNotes,
  initialAttachments,
  onNext,
  onBack,
}: DocumentsStepProps) {
  const { t } = useLanguage();
  const { values, setValue, errors, validate } = useStepForm(documentsSchema, {
    supplementalNotes: initialSupplementalNotes,
  });
  const [attachments, setAttachments] = useState<AttachmentMeta[]>(initialAttachments);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<DocumentSuggestion[]>([]);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (submitterType === "hcp") {
      getDocumentSuggestions(reportId).then(setSuggestions);
    }
  }, [reportId, submitterType]);

  async function handleFiles(accepted: File[], rejectedCount: number) {
    setUploadError(rejectedCount > 0 ? t("documents.someFilesSkipped") : null);
    if (accepted.length === 0) return;

    setUploadingCount((n) => n + accepted.length);
    for (const file of accepted) {
      setUploadProgress(0);
      try {
        const meta = await uploadAttachment(reportId, file, getDraftToken(reportId), setUploadProgress);
        setAttachments((prev) => [...prev, meta]);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : t("documents.uploadFailed"));
      } finally {
        setUploadingCount((n) => n - 1);
        setUploadProgress(null);
      }
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    setUploadError(null);
    setDeletingId(id);
    try {
      await deleteAttachment(id, getDraftToken(reportId));
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t("documents.removeFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  function handleReplaceClick(id: string) {
    setReplacingId(id);
    replaceInputRef.current?.click();
  }

  async function handleReplaceFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const targetId = replacingId;
    if (replaceInputRef.current) replaceInputRef.current.value = "";
    setReplacingId(null);
    if (!file || !targetId) return;

    setUploadProgress(0);
    setUploadError(null);
    try {
      const meta = await uploadAttachment(reportId, file, getDraftToken(reportId), setUploadProgress);
      await deleteAttachment(targetId, getDraftToken(reportId));
      setAttachments((prev) => prev.map((a) => (a.id === targetId ? meta : a)));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t("documents.replaceFailed"));
    } finally {
      setUploadProgress(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validate();
    if (result.success) await onNext(result.data);
  }

  return (
    <form className="step-form" onSubmit={handleSubmit}>
      <h1>{t("documents.heading")}</h1>
      <p>{t("documents.lead")}</p>

      {submitterType === "hcp" && suggestions.length > 0 && (
        <div className="suggestion-box" role="note">
          <h2>{t("documents.suggestedForReport")}</h2>
          <ul>
            {suggestions.map((s) => (
              <li key={s.documentType}>
                <strong>{s.documentType}</strong> — {s.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dropzone acceptedExtensions={ACCEPTED_EXTENSIONS} onFiles={handleFiles} />
      <input
        ref={replaceInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(",")}
        onChange={handleReplaceFileChange}
        hidden
      />
      {uploadingCount > 0 && (
        <p role="status" className="dropzone__status">
          {t("documents.uploadingFiles", { n: uploadingCount, plural: uploadingCount === 1 ? "" : "s" })}
        </p>
      )}
      {uploadProgress !== null && (
        <div className="dropzone__progress" role="status" aria-label={t("documents.uploadingAriaLabel")}>
          <div className="dropzone__progress-bar">
            <div className="dropzone__progress-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
          <span>{uploadProgress}%</span>
        </div>
      )}
      {uploadError && (
        <p role="alert" className="field__error">
          {uploadError}
        </p>
      )}

      {attachments.length > 0 && (
        <ul className="attachment-list">
          {attachments.map((a) => (
            <li key={a.id} className="attachment-list__item">
              <span className="attachment-list__info">
                <FieldIcon name="document" size={18} className="attachment-list__icon" />
                <span>
                  {a.originalFilename} ({formatSize(a.sizeBytes)})
                </span>
              </span>
              <span className="attachment-list__actions">
                <button
                  type="button"
                  className="button button--text"
                  onClick={() => downloadAttachment(a.id, a.originalFilename)}
                >
                  {t("documents.download")}
                </button>
                <button
                  type="button"
                  className="button button--text"
                  onClick={() => handleReplaceClick(a.id)}
                  disabled={uploadProgress !== null || deletingId !== null}
                >
                  {t("documents.replace")}
                </button>
                <button
                  type="button"
                  className="button button--text"
                  onClick={() => handleDelete(a.id)}
                  disabled={deletingId !== null}
                >
                  {deletingId === a.id ? t("documents.removing") : t("documents.remove")}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <TextAreaField
        id="supplementalNotes"
        label={t("documents.additionalContext")}
        rows={3}
        value={values.supplementalNotes}
        onChange={(v) => setValue("supplementalNotes", v)}
        error={errors.supplementalNotes}
      />

      <div className="step-form__actions">
        <button type="button" className="button button--text" onClick={onBack}>
          {t("common.back")}
        </button>
        <button type="submit" className="button button--primary">
          {t("documents.continueToReview")}
        </button>
      </div>
    </form>
  );
}
