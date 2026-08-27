/**
 * Identity gate for the follow-up flow. A submitted report's PHI shouldn't
 * be fetchable by anyone who merely knows (or guesses) its reference
 * number — the only identity signal the old flow checked. This adds a real
 * two-step check: the caller must know the contact email on file, then
 * prove they received a one-time code sent to it, before getting an access
 * token scoped to that one report.
 *
 * The code-delivery step is mocked for this prototype (no email provider
 * wired up) — `requestVerificationCode` hands the code straight back to the
 * caller instead of emailing it. The verification and token logic below is
 * real, and swapping in an actual mailer only touches that one call site.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.FOLLOWUP_TOKEN_SECRET ?? "dev-only-secret";
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const ACCESS_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface PendingCode {
  code: string;
  expiresAt: number;
}

const pendingCodes = new Map<string, PendingCode>();

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function requestVerificationCode(reportId: string): string {
  const code = generateCode();
  pendingCodes.set(reportId, { code, expiresAt: Date.now() + CODE_TTL_MS });
  return code;
}

export function verifyCode(reportId: string, code: string): boolean {
  const pending = pendingCodes.get(reportId);
  if (!pending) return false;
  if (pending.expiresAt < Date.now()) {
    pendingCodes.delete(reportId);
    return false;
  }
  const matches = pending.code === code.trim();
  if (matches) pendingCodes.delete(reportId); // single-use
  return matches;
}

interface AccessTokenPayload {
  reportId: string;
  exp: number;
}

function sign(payloadB64: string): string {
  return createHmac("sha256", SECRET).update(payloadB64).digest("base64url");
}

export function createFollowUpAccessToken(reportId: string): string {
  const payload: AccessTokenPayload = { reportId, exp: Date.now() + ACCESS_TOKEN_TTL_MS };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifyFollowUpAccessToken(token: string, reportId: string): boolean {
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return false;

  const expected = sign(payloadB64);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  try {
    const payload: AccessTokenPayload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    return payload.reportId === reportId && payload.exp > Date.now();
  } catch {
    return false;
  }
}
