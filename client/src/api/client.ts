export type { FaqEntry, DocumentSuggestion } from "../../../shared/src";
import type { FaqEntry, DocumentSuggestion } from "../../../shared/src";

const API_ROOT = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";

export interface AboutYouData {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  relationship: string;
}

export interface PatientData {
  patientFirstName: string;
  patientLastName: string;
  patientDateOfBirth: string;
  patientSex: string;
  patientWeightKg: number | string;
  medicalRecordNumber: string;
}

export interface VaccineData {
  vaccineType: string;
  manufacturer: string;
  lotNumber: string;
  doseNumber: string;
  administrationDate: string;
  route: string;
  bodySite: string;
  administeringFacility: string;
}

export interface AdverseEventData {
  onsetDate: string;
  description: string;
  outcomes: string[];
  hospitalizationDates: string;
  treatmentGiven: string;
  clinicalCourseNotes: string;
}

export interface ErrorDetailData {
  errorType: string;
  errorDescription: string;
  errorDiscoveredDate: string;
  correctiveActionTaken: string;
}

export interface AttachmentMeta {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface ClientReport {
  id: string;
  status: "draft" | "submitted";
  submitterType: "public" | "hcp" | null;
  reportCharacteristic: "adverse_event" | "error_no_ae" | null;
  duplicateFlag: boolean;
  submittedAt: string | null;
  aboutYou: AboutYouData | null;
  patient: PatientData | null;
  vaccine: VaccineData | null;
  adverseEvent: AdverseEventData | null;
  errorDetail: ErrorDetailData | null;
  documents: { supplementalNotes: string };
  attachments: AttachmentMeta[];
}

export interface FieldError {
  path: string;
  message: string;
}

async function asJson<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (!res.ok) {
    const error = new Error(body.error ?? "Request failed") as Error & {
      errors?: FieldError[];
      incompleteSteps?: string[];
      status?: number;
    };
    error.errors = body.errors;
    error.incompleteSteps = body.incompleteSteps;
    error.status = res.status;
    throw error;
  }
  return body as T;
}

export function createReport(): Promise<ClientReport> {
  return fetch(`${API_ROOT}/reports`, { method: "POST" }).then((r) => asJson(r));
}

export function getReport(id: string): Promise<ClientReport> {
  return fetch(`${API_ROOT}/reports/${id}`).then((r) => asJson(r));
}

export function patchReport(
  id: string,
  step: string,
  data: Record<string, unknown>
): Promise<ClientReport> {
  return fetch(`${API_ROOT}/reports/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step, data }),
  }).then((r) => asJson(r));
}

export function submitReport(
  id: string
): Promise<{ id: string; status: string; duplicateFlag: boolean }> {
  return fetch(`${API_ROOT}/reports/${id}/submit`, { method: "POST" }).then((r) => asJson(r));
}

export function uploadAttachment(reportId: string, file: File): Promise<AttachmentMeta> {
  const formData = new FormData();
  formData.append("file", file);
  return fetch(`${API_ROOT}/reports/${reportId}/attachments`, {
    method: "POST",
    body: formData,
  }).then((r) => asJson(r));
}

export function listAttachments(reportId: string): Promise<AttachmentMeta[]> {
  return fetch(`${API_ROOT}/reports/${reportId}/attachments`).then((r) => asJson(r));
}

export function deleteAttachment(attachmentId: string): Promise<void> {
  return fetch(`${API_ROOT}/attachments/${attachmentId}`, { method: "DELETE" }).then((r) => {
    if (!r.ok) throw new Error("Failed to delete attachment");
  });
}

export async function downloadAttachment(attachmentId: string, filename: string): Promise<void> {
  const { token } = await fetch(`${API_ROOT}/attachments/${attachmentId}/download-token`).then(
    (r) => asJson<{ token: string }>(r)
  );
  const res = await fetch(`${API_ROOT}/attachments/${attachmentId}/download?token=${token}`);
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getDocumentSuggestions(reportId: string): Promise<DocumentSuggestion[]> {
  return fetch(`${API_ROOT}/reports/${reportId}/document-suggestions`).then((r) => asJson(r));
}

export function searchFaq(query: string, step?: string): Promise<FaqEntry[]> {
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  if (step) params.set("step", step);
  return fetch(`${API_ROOT}/faq?${params.toString()}`).then((r) => asJson(r));
}

export function postNavigationSurvey(rating: number, comment?: string): Promise<{ id: string }> {
  return fetch(`${API_ROOT}/surveys/navigation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating, comment }),
  }).then((r) => asJson(r));
}

export function postSubmissionSurvey(
  rating: number,
  comment: string | undefined,
  reportId: string
): Promise<{ id: string }> {
  return fetch(`${API_ROOT}/surveys/post-submission`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating, comment, reportId }),
  }).then((r) => asJson(r));
}

export interface ConsistencyIssue {
  field: "description" | "outcomes" | "hospitalizationDates";
  issue: string;
  suggestion: string;
}

export function askFaqAssistant(question: string, step?: string): Promise<{ answer: string }> {
  return fetch(`${API_ROOT}/assistant/faq`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, step }),
  }).then((r) => asJson(r));
}

export function checkDescriptionConsistency(input: {
  description: string;
  outcomes: string[];
  hospitalizationDates?: string;
  submitterType: "public" | "hcp";
}): Promise<{ issues: ConsistencyIssue[] }> {
  return fetch(`${API_ROOT}/assistant/check-description`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((r) => asJson(r));
}
