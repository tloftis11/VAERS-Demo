// The "/min" build trades a little metadata precision (rarely-used number
// ranges within a country) for a much smaller bundle — this ships to every
// client page that touches a phone field, so the full ~360KB metadata build
// would be a real, avoidable bundle-size regression for a validation this
// forgiving in nature (just "is this plausibly dialable").
import { isValidPhoneNumber } from "libphonenumber-js/min";
import { z } from "zod";

/**
 * Centralized phone/email/postal validation — used by both client-side live
 * checks and the server's authoritative Zod schemas, so the two can never
 * disagree about what counts as a valid contact detail.
 */

/**
 * Accepts any format libphonenumber-js recognizes as a real, dialable
 * number: "(404) 555-1212", "404-555-1212", "+1 404 555 1212", with or
 * without an extension. A leading "+" always wins over the US default, so a
 * foreign number entered with its own country code (e.g. "+44 20 7946
 * 0958") validates correctly regardless of whether the associated address
 * is foreign — there's no separate "is this address foreign" branch needed
 * here, unlike postal codes below.
 *
 * Deliberately does NOT reformat the stored value to E.164 — the field
 * keeps exactly what the reporter typed, so re-opening a draft never shows
 * a phone number that looks different from what was entered.
 */
export function isValidPhone(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  return isValidPhoneNumber(trimmed, "US");
}

export function optionalPhone(message = "Enter a valid phone number, e.g. (404) 555-1212 or +1 404 555 1212") {
  return z
    .string()
    .trim()
    .optional()
    .transform((v) => v ?? "")
    .refine(isValidPhone, message);
}

const US_ZIP_RE = /^\d{5}(-\d{4})?$/;

/**
 * US ZIP/ZIP+4 only — "foreign" postal codes are validated by presence
 * alone (see foreignPostalSchema), never held to the 5-digit US pattern.
 * Only meaningful once an address actually has a US state; callers gate
 * this on that (see patientSchema/vaccineSchema's facility fields once
 * added) rather than applying it unconditionally to every ZIP field.
 */
export function isValidUsZip(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  return US_ZIP_RE.test(trimmed);
}

export function usZipSchema(message = "Enter a valid 5-digit ZIP code (or ZIP+4, e.g. 20201-0001)") {
  return z
    .string()
    .trim()
    .optional()
    .transform((v) => v ?? "")
    .refine(isValidUsZip, message);
}

/** A free-text address field (patient/facility ZIP) validated against the
 * US pattern only when the associated state field is an actual US state —
 * "Foreign"/blank leaves it as an unconstrained optional string, since a
 * foreign postal code has no single standard format to check against. */
export function isValidPostalCodeForState(zip: string, state: string): boolean {
  if (!state || state === "foreign") return true;
  return isValidUsZip(zip);
}

export function optionalEmail(message = "Enter a valid email address") {
  return z
    .string()
    .trim()
    .optional()
    .transform((v) => v ?? "")
    .refine((v) => !v || z.string().email().safeParse(v).success, message);
}
