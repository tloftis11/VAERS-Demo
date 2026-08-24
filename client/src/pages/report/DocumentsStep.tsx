import { useEffect, useRef, useState } from "react";
import { documentsSchema } from "../../../../shared/src/schemas";
import type { SubmitterType } from "../../../../shared/src/branchingRules";
import {
  deleteAttachment,
  downloadAttachment,
  getDocumentSuggestions,
  suggestDocumentsFromNarrative,
  uploadAttachment,
  type AiDocumentSuggestion,
  type AttachmentMeta,
  type DocumentSuggestion,
} from "../../api/client";
import { useStepForm } from "../../hooks/useStepForm";
import { TextAreaField } from "../../components/Field";

interface DocumentsStepProps {
  reportId: string;
  submitterType: SubmitterType;
  initialSupplementalNotes: string;
  initialAttachments: AttachmentMeta[];
  onNext: (data: Record<string, unknown>) => Promise<void>;
  onBack: () => void;
}

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
  const { values, setValue, errors, validate } = useStepForm(documentsSchema, {
    supplementalNotes: initialSupplementalNotes,
  });
  const [attachments, setAttachments] = useState<AttachmentMeta[]>(initialAttachments);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<DocumentSuggestion[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AiDocumentSuggestion[]>([]);
  const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const uploading = uploadProgress !== null;

  useEffect(() => {
    if (submitterType === "hcp") {
      getDocumentSuggestions(reportId).then(setSuggestions);
      setAiSuggestionsLoading(true);
      suggestDocumentsFromNarrative(reportId)
        .then(({ suggestions }) => setAiSuggestions(suggestions))
        .catch(() => setAiSuggestions([]))
        .finally(() => setAiSuggestionsLoading(false));
    }
  }, [reportId, submitterType]);

  async function uploadFile(file: File) {
    setUploadProgress(0);
    setUploadError(null);
    try {
      const meta = await uploadAttachment(reportId, file, setUploadProgress);
      setAttachments((prev) => [...prev, meta]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadProgress(null);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  async function handleDelete(id: string) {
    await deleteAttachment(id);
    setAttachments((prev) => prev.filter((a) => a.id !== id));
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
      const meta = await uploadAttachment(reportId, file, setUploadProgress);
      await deleteAttachment(targetId);
      setAttachments((prev) => prev.map((a) => (a.id === targetId ? meta : a)));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Replace failed");
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
      <h1>Supporting documents</h1>
      <p>
        Upload medical records or vaccine-administration documents (PDF, JPEG, PNG, or Word — 15 MB
        max each). You can also add these later using the existing follow-up information tool.
      </p>

      {submitterType === "hcp" && suggestions.length > 0 && (
        <div className="suggestion-box" role="note">
          <h2>Suggested documents for this report</h2>
          <ul>
            {suggestions.map((s) => (
              <li key={s.documentType}>
                <strong>{s.documentType}</strong> — {s.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {submitterType === "hcp" && (aiSuggestionsLoading || aiSuggestions.length > 0) && (
        <div className="suggestion-box suggestion-box--ai" role="note">
          <h2>Based on your description</h2>
          {aiSuggestionsLoading ? (
            <p role="status">Checking for anything specific to this case…</p>
          ) : (
            <>
              <ul>
                {aiSuggestions.map((s) => (
                  <li key={s.documentType}>
                    <strong>{s.documentType}</strong> — {s.reason}
                  </li>
                ))}
              </ul>
              <p className="suggestion-box__ai-disclaimer">
                AI-generated from the description you entered — review before relying on it.
              </p>
            </>
          )}
        </div>
      )}

      <div className="field">
        <label htmlFor="file-upload" className="field__label">
          Add a document
        </label>
        <div
          className={`dropzone${dragActive ? " dropzone--active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <p>Drag and drop a file here, or</p>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            Choose a file
          </button>
          <input
            id="file-upload"
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.docx"
            onChange={handleFileChange}
            disabled={uploading}
            hidden
          />
        </div>
        <input ref={replaceInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" onChange={handleReplaceFileChange} hidden />
        {uploadProgress !== null && (
          <div className="dropzone__progress" role="status" aria-label="Uploading">
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
      </div>

      {attachments.length > 0 && (
        <ul className="attachment-list">
          {attachments.map((a) => (
            <li key={a.id} className="attachment-list__item">
              <span>
                {a.originalFilename} ({formatSize(a.sizeBytes)})
              </span>
              <span className="attachment-list__actions">
                <button
                  type="button"
                  className="button button--text"
                  onClick={() => downloadAttachment(a.id, a.originalFilename)}
                >
                  Download
                </button>
                <button
                  type="button"
                  className="button button--text"
                  onClick={() => handleReplaceClick(a.id)}
                  disabled={uploading}
                >
                  Replace
                </button>
                <button type="button" className="button button--text" onClick={() => handleDelete(a.id)}>
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <TextAreaField
        id="supplementalNotes"
        label="Additional context (optional)"
        rows={3}
        value={values.supplementalNotes}
        onChange={(v) => setValue("supplementalNotes", v)}
        error={errors.supplementalNotes}
      />

      <div className="step-form__actions">
        <button type="button" className="button button--text" onClick={onBack}>
          ← Back
        </button>
        <button type="submit" className="button button--primary">
          Continue to review
        </button>
      </div>
    </form>
  );
}
