/**
 * Local storage for the current draft's identity and its capability token.
 * Centralized here (rather than each page declaring its own literal key)
 * since both the id and the token need to travel together and be cleared
 * together.
 *
 * The token is deliberately never put in a URL, query string, or any
 * server-rendered markup — only ever sent as the `X-Draft-Token` request
 * header — so it can't leak via browser history, referrer headers, or
 * being logged as part of a URL by any layer (proxy, analytics, error
 * tracker) between the browser and this app.
 */
const DRAFT_ID_KEY = "vaers_draft_report_id";

function tokenKey(reportId: string): string {
  return `vaers_draft_token_${reportId}`;
}

export function getDraftReportId(): string | null {
  return localStorage.getItem(DRAFT_ID_KEY);
}

export function setDraftReportId(reportId: string): void {
  localStorage.setItem(DRAFT_ID_KEY, reportId);
}

export function clearDraftReportId(): void {
  localStorage.removeItem(DRAFT_ID_KEY);
}

export function isDraftReportId(reportId: string): boolean {
  return getDraftReportId() === reportId;
}

export function getDraftToken(reportId: string): string {
  return localStorage.getItem(tokenKey(reportId)) ?? "";
}

export function setDraftToken(reportId: string, token: string): void {
  localStorage.setItem(tokenKey(reportId), token);
}

/** Only ever called once the post-submission confirmation page has loaded
 * successfully — the draft is sealed at that point (the server rejects
 * further writes regardless), so there's nothing left for the token to
 * protect, and the follow-up flow uses its own separate email+code grant. */
export function clearDraftToken(reportId: string): void {
  localStorage.removeItem(tokenKey(reportId));
}
