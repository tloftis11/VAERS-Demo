import { test, expect } from "@playwright/test";
import { fillAndAdvance, skipQuestion } from "./helpers";

test.describe("About You — email confirmation and phone validation", () => {
  test("a mismatched email confirmation blocks with a visible inline error", async ({ page }) => {
    await page.goto("/report");
    await page.getByRole("button", { name: "Patient" }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await fillAndAdvance(page, "Your name", "Mismatch Tester");
    await fillAndAdvance(page, "Your email", "real@example.com");
    await page.getByLabel("Confirm your email", { exact: true }).fill("typo@example.com");
    await page.getByRole("button", { name: /^(Next|Skip) →$/ }).click();

    await expect(page.getByRole("alert")).toHaveText("This doesn't match the email address above");
  });

  test("an impossible phone number blocks with specific guidance; a valid formatted number passes", async ({
    page,
  }) => {
    await page.goto("/report");
    await page.getByRole("button", { name: "Patient" }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await fillAndAdvance(page, "Your name", "Phone Tester");
    await fillAndAdvance(page, "Your email", "phone.tester@example.com");
    await fillAndAdvance(page, "Confirm your email", "phone.tester@example.com");

    await page.getByLabel("Your phone (optional)", { exact: true }).fill("555-1212");
    await page.getByRole("button", { name: /^(Next|Skip) →$/ }).click();
    await expect(page.getByRole("alert")).toContainText("valid phone number");

    await page.getByLabel("Your phone (optional)", { exact: true }).fill("(404) 555-1212");
    await page.getByRole("button", { name: /^(Next|Skip) →$/ }).click();
    await skipQuestion(page); // best contact info

    await expect(page.getByRole("heading", { name: "Review: About you" })).toBeVisible();
    await expect(page.getByText("(404) 555-1212")).toBeVisible();
  });
});
