/**
 * Deterministic "catch it on the question" checks — the live-UI counterpart
 * to validationRules.ts's submit-time checkCrossFieldRules. Both read from
 * the same underlying facts (e.g. "onset can't be before vaccination"); this
 * module exists so a question can be validated the moment it's answered
 * instead of only at the end-of-section review, without duplicating the
 * date-comparison logic in every step component.
 */

function parsedDate(v: string): number | null {
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
}

/** True if `a` is a calendar day before `b` (date-only strings, e.g. "2026-01-15"). */
export function isDateBefore(a: string, b: string): boolean {
  const da = parsedDate(a);
  const db = parsedDate(b);
  return da !== null && db !== null && da < db;
}

/**
 * A hospitalization can't have lasted longer than the time that has actually
 * elapsed since the symptoms it followed began. Returns an error message if
 * so, else null. `today` is injectable for testability.
 */
export function hospitalizationExceedsElapsed(
  onsetDate: string,
  hospitalizationDays: number,
  today: Date = new Date()
): string | null {
  const onset = parsedDate(onsetDate);
  if (onset === null || !Number.isFinite(hospitalizationDays) || hospitalizationDays <= 0) return null;
  const elapsedDays = Math.floor((today.getTime() - onset) / (24 * 60 * 60 * 1000));
  // +1 because the day symptoms started already counts as a day — onset
  // "today" (elapsedDays=0) should still allow reporting 1 day so far, not
  // reject every same-day report as impossible.
  const maxPlausibleDays = elapsedDays + 1;
  if (hospitalizationDays > maxPlausibleDays) {
    return `Hospitalization days (${hospitalizationDays}) can't exceed the ${maxPlausibleDays} day${maxPlausibleDays === 1 ? "" : "s"} since symptoms began.`;
  }
  return null;
}

/**
 * Route/body-site plausibility — advisory only (PWS calls for "recommend a
 * fix", not blocking submission on it, since either field is optional and a
 * genuine edge case is possible). A route implies a small set of body sites
 * that make physical sense; anything outside that set gets a gentle nudge,
 * not an error.
 */
const PLAUSIBLE_SITES_BY_ROUTE: Record<string, readonly string[]> = {
  injection: ["right_arm", "left_arm", "arm_unknown_side", "right_thigh", "left_thigh", "thigh_unknown_side"],
  oral: ["mouth"],
  intranasal: ["nose"],
};

export function suggestBodySiteMismatch(route: string, bodySite: string): string | null {
  if (!route || !bodySite) return null;
  if (bodySite === "other" || bodySite === "unknown") return null;
  const plausible = PLAUSIBLE_SITES_BY_ROUTE[route];
  if (!plausible) return null; // "other"/"unknown" routes: nothing to compare against
  if (plausible.includes(bodySite)) return null;
  return "That route and site don't usually go together — double-check them if you have a moment. (This won't block your report either way.)";
}
