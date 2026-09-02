import { test, expect } from "@playwright/test";
import { fillAndAdvance, skipQuestion, clickChoiceCard, selectFromCombobox, clickContinueOnReview } from "./helpers";

/**
 * Section 1's critical bug: an HCP report with an added-but-blank
 * "additional vaccine" row silently blocked Continue with no visible error.
 * These scenarios drive the real wizard through a browser exactly the way a
 * reporter would, covering what the Vitest component tests (which mock
 * onChange/errors directly) can't: the actual schema validation, error
 * display, and focus behavior wired together end to end.
 */

async function startHcpReportToVaccineStep(page: import("@playwright/test").Page) {
  await page.goto("/report");
  await page.getByRole("button", { name: "Healthcare Professional" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click(); // Before you start
  await clickChoiceCard(page, "No"); // Administration error? No
  await clickChoiceCard(page, "Yes"); // Adverse event? Yes

  // About you
  await fillAndAdvance(page, "Your name", "Dr. E2E Tester");
  await fillAndAdvance(page, "Your email", "e2e.tester@example.com");
  await fillAndAdvance(page, "Confirm your email", "e2e.tester@example.com");
  await skipQuestion(page); // phone
  await skipQuestion(page); // best contact info
  await clickContinueOnReview(page);

  // About the patient
  await fillAndAdvance(page, "Patient's first name", "Test");
  await fillAndAdvance(page, "Patient's last name", "Patient");
  await fillAndAdvance(page, "Date of birth", "1990-01-01");
  await clickChoiceCard(page, "Female");
  for (let i = 0; i < 20; i++) {
    // Remaining patient questions (street, city, state, county, zip, phone,
    // email, email confirm, pregnancy, meds, allergies, illnesses, chronic,
    // race, ethnicity) are all optional — skip straight through to review.
    const reviewVisible = await page.getByRole("heading", { name: "Review: About the patient" }).isVisible().catch(() => false);
    if (reviewVisible) break;
    await skipQuestion(page);
  }
  await clickContinueOnReview(page);

  // Vaccine information
  await selectFromCombobox(page, "Vaccine", "Fluzone", "Influenza (Seasonal) (Fluzone)");
  await fillAndAdvance(page, "Date administered", "2026-06-01");
}

test("a completely blank additional-vaccine row does not block Continue", async ({ page }) => {
  await startHcpReportToVaccineStep(page);

  // Skip through to the additionalVaccines question (time, dose, manufacturer,
  // lot, route, bodySite, facility name, facility street/city/state/zip/phone/fax,
  // facility type).
  for (let i = 0; i < 20; i++) {
    const onAdditional = await page
      .getByRole("heading", { name: "Additional vaccines given at this same visit (optional)" })
      .isVisible()
      .catch(() => false);
    if (onAdditional) break;
    await skipQuestion(page);
  }

  await page.getByRole("button", { name: "+ Add another vaccine" }).click();
  await expect(page.getByText("Vaccine 2")).toBeVisible();

  // REGRESSION: this used to silently do nothing.
  await page.getByRole("button", { name: /^(Next|Skip) →$/ }).click();
  await expect(page.getByRole("alert")).not.toBeVisible();
  await expect(page.getByText("Vaccine 2")).not.toBeVisible(); // moved on to the next question
});

test("a partially-filled additional-vaccine row blocks Continue with a visible, row-specific error", async ({
  page,
}) => {
  await startHcpReportToVaccineStep(page);

  for (let i = 0; i < 20; i++) {
    const onAdditional = await page
      .getByRole("heading", { name: "Additional vaccines given at this same visit (optional)" })
      .isVisible()
      .catch(() => false);
    if (onAdditional) break;
    await skipQuestion(page);
  }

  await page.getByRole("button", { name: "+ Add another vaccine" }).click();
  await page.getByLabel("Lot number", { exact: true }).nth(0).fill("ABC123");

  await page.getByRole("button", { name: /^(Next|Skip) →$/ }).click();

  // Both the per-row inline error and the active-question error banner show
  // the same message — confirm at least one is visible.
  await expect(page.getByRole("alert").filter({ hasText: "Select the vaccine" }).first()).toBeVisible();
  await expect(page.getByText("Vaccine 2")).toBeVisible(); // still on the same question

  // Correcting the row permits progression.
  await selectFromCombobox(page, "Vaccine", "Pfizer", "COVID19 (Pfizer-BioNTech Comirnaty)");
  await page.getByRole("button", { name: /^(Next|Skip) →$/ }).click();
  await expect(page.getByText("Vaccine 2")).not.toBeVisible();
});
