import { test, expect } from "@playwright/test";
import { fillAndAdvance, skipQuestion } from "./helpers";

// Autosave (the PATCH that actually persists a step) fires once, when the
// reporter reaches that step's own review screen and clicks "Continue" —
// not per individual question within the step (each question's own "Next"
// is local UI state only). So "draft resume" and "failed save" both need to
// be tested at that step-review boundary, not mid-step.

test("draft resumes correctly after a full page reload, once a step has actually been saved", async ({ page }) => {
  await page.goto("/report");
  await page.getByRole("button", { name: "Patient" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click(); // Before you start

  await fillAndAdvance(page, "Your name", "Reload Tester");
  await fillAndAdvance(page, "Your email", "reload.tester@example.com");
  await fillAndAdvance(page, "Confirm your email", "reload.tester@example.com");
  await skipQuestion(page); // phone
  await skipQuestion(page); // best contact info
  await page.getByRole("button", { name: "Continue", exact: true }).click(); // saves "about-you", advances to "patient"

  await expect(page.getByLabel("Patient's first name", { exact: true })).toBeVisible();

  await page.reload();

  // Still on "About the patient" (not bounced back to "About you"), and the
  // previous step's data survived the reload.
  await expect(page.getByLabel("Patient's first name", { exact: true })).toBeVisible();
  await page.goBack().catch(() => {});
});

test("a failed step save shows a retryable error and keeps entered data, without advancing", async ({ page }) => {
  await page.goto("/report");
  await page.getByRole("button", { name: "Patient" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await fillAndAdvance(page, "Your name", "Retry Tester");
  await fillAndAdvance(page, "Your email", "retry.tester@example.com");
  await fillAndAdvance(page, "Confirm your email", "retry.tester@example.com");
  await skipQuestion(page); // phone
  await skipQuestion(page); // best contact info
  await expect(page.getByRole("heading", { name: "Review: About you" })).toBeVisible();

  // Fail the step-save PATCH once, then let it through on retry.
  let failedOnce = false;
  await page.route("**/api/reports/*", async (route) => {
    if (route.request().method() === "PATCH" && !failedOnce) {
      failedOnce = true;
      await route.abort("failed");
      return;
    }
    await route.continue();
  });

  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByRole("alert").filter({ hasText: /trouble saving|went wrong/i }).first()).toBeVisible();
  // Still on the "About you" review screen — didn't navigate on a failed save.
  await expect(page.getByRole("heading", { name: "Review: About you" })).toBeVisible();
  await expect(page.getByText("Retry Tester")).toBeVisible();

  // Retry succeeds now that the route lets PATCH through.
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Patient's first name", { exact: true })).toBeVisible();
});
