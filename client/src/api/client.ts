export type { FaqEntry, DocumentSuggestion, ValidationFinding } from "../../../shared/src";
import type { FaqEntry, DocumentSuggestion, ValidationFinding } from "../../../shared/src";

const API_ROOT = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";

export interface AboutYouData {
  contactName: string;
  contactEmail: string;
  contactEmailConfirm: string;
  contactPhone: string;
  relationship: string;
  relationshipOther: string;
  mailingStreet: string;
  mailingCity: string;
  mailingState: string;
  mailingZip: string;
  bestContactInfo: string;
}

export interface PatientData {
  patientFirstName: string;
  patientLastName: string;
  patientDateOfBirth: string;
  dateOfBirthUnknown: boolean;
  patientSex: string;
  ageYears: number | string;
  ageMonths: number | string;
  patientStreet: string;
  patientCity: string;
  patientState: string;
  patientCounty: string;
  patientZip: string;
  patientPhone: string;
  patientEmail: string;
  patientEmailConfirm: string;
  pregnant: string;
  pregnancyDetails: string;
  medicationsAtVaccination: string;
  allergies: string;
  recentIllnesses: string;
  chronicConditions: string;
  patientRace: string[];
  patientRaceOther: string;
  patientEthnicity: string;
}

export interface AdditionalVaccineRow {
  vaccineType: string;
  vaccineTypeOther: string;
  manufacturer: string;
  lotNumber: string;
  route: string;
  bodySite: string;
  doseNumber: string;
}

export interface PriorVaccineRow {
  vaccineName: string;
  administrationDate: string;
}

export interface VaccineData {
  vaccineType: string;
  vaccineTypeOther: string;
  manufacturer: string;
  lotNumber: string;
  doseNumber: string;
  administrationDate: string;
  administrationTime: string;
  route: string;
  bodySite: string;
  administeringFacility: string;
  facilityStreet: string;
  facilityCity: string;
  facilityState: string;
  facilityZip: string;
  facilityPhone: string;
  facilityFax: string;
  facilityType: string;
  facilityTypeOther: string;
  otherVaccinesRecent: string;
  otherVaccinesSameVisit: string;
  additionalVaccines: AdditionalVaccineRow[];
  priorVaccines: PriorVaccineRow[];
}

export interface AdverseEventData {
  onsetDate: string;
  onsetTime: string;
  description: string;
  symptoms: string[];
  symptomsOther: string;
  labResults: string;
  recoveryStatus: string;
  outcomes: string[];
  hospitalizationDays: number | string;
  hospitalName: string;
  hospitalCity: string;
  hospitalState: string;
  dateOfDeath: string;
  treatmentGiven: string;
  clinicalCourseNotes: string;
  previousAdverseEvent: string;
  previousAdverseEventDetails: string;
}

export interface ErrorDetailData {
  errorType: string;
  errorTypeOther: string;
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
  isFollowUp: boolean;
}

export interface FollowUpNote {
  id: string;
  note: string;
  createdAt: string;
}

export interface ClientReport {
  id: string;
  status: "draft" | "submitted";
  submitterType: "public" | "hcp" | null;
  administrationError: boolean | null;
  adverseEventOccurred: boolean | null;
  duplicateFlag: boolean;
  submittedAt: string | null;
  aboutYou: AboutYouData | null;
  patient: PatientData | null;
  vaccine: VaccineData | null;
  adverseEvent: AdverseEventData | null;
  errorDetail: ErrorDetailData | null;
  documents: { supplementalNotes: string };
  attachments: AttachmentMeta[];
  followUpNotes: FollowUpNote[];
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
      findings?: ValidationFinding[];
      status?: number;
    };
    error.errors = body.errors;
    error.incompleteSteps = body.incompleteSteps;
    error.findings = body.findings;
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

/** PHI-free existence/status check — safe to call before identity is verified. */
export function getReportStatus(id: string): Promise<{ id: string; status: "draft" | "submitted" }> {
  return fetch(`${API_ROOT}/reports/${id}/status`).then((r) => asJson(r));
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

export function uploadAttachment(
  reportId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<AttachmentMeta> {
  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_ROOT}/reports/${reportId}/attachments`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: unknown;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as AttachmentMeta);
      } else {
        const message = (body as { error?: string })?.error ?? "Upload failed";
        reject(new Error(message));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(formData);
  });
}

export function listAttachments(reportId: string): Promise<AttachmentMeta[]> {
  return fetch(`${API_ROOT}/reports/${reportId}/attachments`).then((r) => asJson(r));
}

export function uploadFollowUpAttachment(
  reportId: string,
  file: File,
  followUpToken: string
): Promise<AttachmentMeta> {
  const formData = new FormData();
  formData.append("file", file);
  return fetch(`${API_ROOT}/reports/${reportId}/follow-up-attachments`, {
    method: "POST",
    headers: { "X-Followup-Token": followUpToken },
    body: formData,
  }).then((r) => asJson(r));
}

export function postFollowUpNote(
  reportId: string,
  note: string,
  followUpToken: string
): Promise<ClientReport> {
  return fetch(`${API_ROOT}/reports/${reportId}/follow-up-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Followup-Token": followUpToken },
    body: JSON.stringify({ note }),
  }).then((r) => asJson(r));
}

/** Step 1 of the follow-up identity check: confirm the email on file, get a
 * one-time code. `devCode` is only present because this prototype has no
 * email provider — in production the code would be emailed, not returned. */
export function requestFollowUpCode(
  reportId: string,
  email: string
): Promise<{ sent: true; devCode: string }> {
  return fetch(`${API_ROOT}/reports/${reportId}/request-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  }).then((r) => asJson(r));
}

/** Step 2: exchange the code for a short-lived access token scoped to this report. */
export function verifyFollowUpCode(reportId: string, code: string): Promise<{ accessToken: string }> {
  return fetch(`${API_ROOT}/reports/${reportId}/verify-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  }).then((r) => asJson(r));
}

export function getFollowUpReport(reportId: string, followUpToken: string): Promise<ClientReport> {
  return fetch(`${API_ROOT}/reports/${reportId}/follow-up`, {
    headers: { "X-Followup-Token": followUpToken },
  }).then((r) => asJson(r));
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

export function askFaqAssistant(question: string, step?: string): Promise<{ answer: string }> {
  return fetch(`${API_ROOT}/assistant/faq`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, step }),
  }).then((r) => asJson(r));
}

export interface VaccineOption {
  value: string;
  label: string;
}

export function getVaccineOptions(audience: "public" | "hcp"): Promise<VaccineOption[]> {
  return fetch(`${API_ROOT}/vaccine-options?audience=${audience}`).then((r) => asJson(r));
}

export interface AdminVaccineOption {
  id: string;
  value: string;
  label: string;
  audience: "public" | "hcp";
  active: boolean;
  sortOrder: number;
}

function adminHeaders(token: string) {
  return { "Content-Type": "application/json", "X-Admin-Token": token };
}

export function adminListVaccineOptions(token: string): Promise<AdminVaccineOption[]> {
  return fetch(`${API_ROOT}/admin/vaccine-options`, { headers: adminHeaders(token) }).then((r) => asJson(r));
}

export function adminCreateVaccineOption(
  token: string,
  data: { value: string; label: string; audience: "public" | "hcp" }
): Promise<AdminVaccineOption> {
  return fetch(`${API_ROOT}/admin/vaccine-options`, {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify(data),
  }).then((r) => asJson(r));
}

export function adminUpdateVaccineOption(
  token: string,
  id: string,
  data: { label?: string; active?: boolean }
): Promise<AdminVaccineOption> {
  return fetch(`${API_ROOT}/admin/vaccine-options/${id}`, {
    method: "PATCH",
    headers: adminHeaders(token),
    body: JSON.stringify(data),
  }).then((r) => asJson(r));
}

export interface ConsistencyIssue {
  field: "description" | "outcomes" | "recoveryStatus";
  issue: string;
  suggestion: string;
}

export function checkDescriptionConsistency(input: {
  description: string;
  outcomes: string[];
  recoveryStatus?: string;
  submitterType: "public" | "hcp";
}): Promise<{ issues: ConsistencyIssue[] }> {
  return fetch(`${API_ROOT}/assistant/check-description`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((r) => asJson(r));
}

export interface AiDocumentSuggestion {
  documentType: string;
  reason: string;
}

export function suggestDocumentsFromNarrative(
  reportId: string
): Promise<{ suggestions: AiDocumentSuggestion[] }> {
  return fetch(`${API_ROOT}/assistant/suggest-documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportId }),
  }).then((r) => asJson(r));
}
