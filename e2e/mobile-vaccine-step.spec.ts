import { test, expect } from "@playwright/test";
import { fillAndAdvance, skipQuestion, clickChoiceCard, selectFromCombobox, clickContinueOnReview } from "./helpers";

// A plain mobile-sized viewport on the chromium engine already installed for
// this suite — the built-in "iPhone" device presets default to WebKit,
// which isn't installed here and isn't the point of this check anyway
// (mobile Chrome/Android is the more common real-world case for this app).
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test("HCP vaccine section is usable on a mobile viewport — no horizontal scroll, controls reachable", async ({
  page,
}) => {
  await page.goto("/report");
  await page.getByRole("button", { name: "Healthcare Professional" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await clickChoiceCard(page, "No"); // administration error? no
  // "No" here too would combine with the answer above into an invalid
  // report and is correctly blocked — this test doesn't touch that
  // section either way, so any valid combination works.
  await clickChoiceCard(page, "Yes"); // adverse event? yes

  await fillAndAdvance(page, "Your name", "Mobile Tester");
  await fillAndAdvance(page, "Your email", "mobile.tester@example.com");
  await fillAndAdvance(page, "Confirm your email", "mobile.tester@example.com");
  await skipQuestion(page); // phone
  await skipQuestion(page); // best contact name
  await skipQuestion(page); // best contact phone
  await clickContinueOnReview(page);

  await fillAndAdvance(page, "Patient's first name", "Test");
  await fillAndAdvance(page, "Patient's last name", "Patient");
  await fillAndAdvance(page, "Date of birth", "1990-01-01");
  await clickChoiceCard(page, "Female");
  for (let i = 0; i < 20; i++) {
    const onReview = await page
      .getByRole("heading", { name: "Review: About the patient" })
      .isVisible()
      .catch(() => false);
    if (onReview) break;
    await skipQuestion(page);
  }
  await clickContinueOnReview(page);

  // No horizontal scroll on the vaccine step's very first question.
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // +1 for sub-pixel rounding

  await selectFromCombobox(page, "Vaccine", "Fluzone", "Influenza (Seasonal) (Fluzone)");
  await fillAndAdvance(page, "Date administered", "2026-06-01");

  const scrollWidthAfter = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidthAfter).toBeLessThanOrEqual(clientWidth + 1);

  // The fixed "Need help?" widget must not cover the Next/Back controls.
  const nextButton = page.getByRole("button", { name: /^(Next|Skip) →$/ });
  await expect(nextButton).toBeInViewport();
  await expect(nextButton).toBeEnabled();
});
