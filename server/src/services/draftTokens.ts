/**
 * Access control for an in-progress (not yet submitted) report. Before this,
 * any request that knew or guessed a report's cuid `id` could read or write
 * its PHI — the id itself was the only "credential." This issues a
 * cryptographically random opaque token at creation time, stores only its
 * hash (never the raw token) on the Report row, and requires the raw token
 * on every subsequent draft read/write.
 *
 * Deliberately a stored-hash design rather than this codebase's other
 * self-verifying HMAC-signed tokens (see followUpAccess.ts, downloadTokens.ts)
 * — those need no server state and expire on their own, which fits a
 * short-lived, narrowly-scoped grant; a draft token instead needs to remain
 * valid for the entire (potentially days-long) life of a draft, so a
 * revocable, DB-backed credential is the better fit here, at the cost of one
 * extra lookup per request.
 *
 * Prototype-only: see README for what a real deployment would use instead.
 */
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

export function generateDraftToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashDraftToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time: hashing first makes both sides fixed-length, so comparing
 * the digests (rather than raw tokens of possibly-differing length) avoids
 * a length-based short-circuit before timingSafeEqual ever runs. */
export function verifyDraftToken(token: unknown, storedHash: string | null | undefined): boolean {
  if (typeof token !== "string" || !token || !storedHash) return false;
  const candidate = Buffer.from(hashDraftToken(token), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

/** A submitted report is immutable and safe to read via its id alone (the
 * confirmation page and follow-up flow both depend on that) — the draft
 * token only ever gates a report that's still status "draft". Returns
 * false (and has already written the 401 response) when the check fails,
 * so callers can `if (!requireDraftToken(...)) return;`. */
export function requireDraftToken(
  req: Request,
  res: Response,
  report: { status: string; draftTokenHash: string | null }
): boolean {
  if (report.status !== "draft") return true;
  const token = req.get("X-Draft-Token");
  if (!verifyDraftToken(token, report.draftTokenHash)) {
    res.status(401).json({ error: "Missing or invalid draft token" });
    return false;
  }
  return true;
}
