/**
 * Short-lived, scope-limited attachment download tokens — a lightweight
 * stand-in for the doc's "time-limited SAS tokens" (§3.3/§6.5) without
 * needing real Azure Blob Storage.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.DOWNLOAD_TOKEN_SECRET ?? "dev-only-secret";
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface TokenPayload {
  attachmentId: string;
  exp: number;
}

function sign(payloadB64: string): string {
  return createHmac("sha256", SECRET).update(payloadB64).digest("base64url");
}

export function createDownloadToken(attachmentId: string, ttlMs = DEFAULT_TTL_MS): string {
  const payload: TokenPayload = { attachmentId, exp: Date.now() + ttlMs };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function verifyDownloadToken(token: string, attachmentId: string): boolean {
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return false;

  const expected = sign(payloadB64);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  try {
    const payload: TokenPayload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    return payload.attachmentId === attachmentId && payload.exp > Date.now();
  } catch {
    return false;
  }
}
