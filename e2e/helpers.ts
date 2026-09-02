import type { Page } from "@playwright/test";

/** Fills a single-question text/email/tel field and advances — the
 * ConversationalStep pattern used throughout the wizard: one input, then a
 * "Next →" (required) or "Skip →" (optional, left blank) button. */
export async function fillAndAdvance(page: Page, label: string, value: string) {
  await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole("button", { name: /^(Next|Skip) →$/ }).click();
}

/** Leaves an optional field blank and advances past it. */
export async function skipQuestion(page: Page) {
  await page.getByRole("button", { name: /^(Next|Skip) →$/ }).click();
}

/** A "choice" kind field (SEX_OPTIONS, YES_NO_UNKNOWN_OPTIONS, etc.) renders
 * as a set of cards that auto-advance on click — no separate Next needed. */
export async function clickChoiceCard(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
}

/** The searchable Combobox used for long option lists (vaccine type, state,
 * facility type, error type) — type to filter, click the matching option.
 * Unlike a button-card "choice" field, selecting a Combobox option does NOT
 * auto-advance — it still needs an explicit Next click afterward. */
export async function selectFromCombobox(page: Page, comboboxLabel: string, query: string, optionName: string) {
  await page.getByLabel(comboboxLabel, { exact: true }).click();
  await page.getByLabel(comboboxLabel, { exact: true }).fill(query);
  await page.getByRole("option", { name: optionName }).click();
  await page.getByRole("button", { name: /^(Next|Skip) →$/ }).click();
}

export async function clickContinueOnReview(page: Page) {
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}
