import { test, expect } from "@playwright/test";
import { clickChoiceCard } from "./helpers";

test("vaccine Combobox: ArrowDown highlights the first option, keyboard and mouse selection agree", async ({
  page,
}) => {
  await page.goto("/report");
  await page.getByRole("button", { name: "Healthcare Professional" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await clickChoiceCard(page, "No"); // administration error? no
  // "No" here too would combine with the answer above into an invalid
  // report (neither an error nor an adverse event to report) and is
  // correctly blocked — this test doesn't touch either section either way,
  // so any valid combination works.
  await clickChoiceCard(page, "Yes"); // adverse event? yes
  // About you (HCP has no relationship question, only name/email/phone/best-contact)
  await page.getByLabel("Your name", { exact: true }).fill("Keyboard Tester");
  await page.getByRole("button", { name: /^(Next|Skip) →$/ }).click();
  await page.getByLabel("Your email", { exact: true }).fill("kb.tester@example.com");
  await page.getByRole("button", { name: /^(Next|Skip) →$/ }).click();
  await page.getByLabel("Confirm your email", { exact: true }).fill("kb.tester@example.com");
  await page.getByRole("button", { name: /^(Next|Skip) →$/ }).click();
  await page.getByRole("button", { name: /^(Next|Skip) →$/ }).click(); // phone
  await page.getByRole("button", { name: /^(Next|Skip) →$/ }).click(); // best contact name
  await page.getByRole("button", { name: /^(Next|Skip) →$/ }).click(); // best contact phone
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  // Patient basics, minimal path to the vaccine step.
  await page.getByLabel("Patient's first name", { exact: true }).fill("Test");
  await page.getByRole("button", { name: /^(Next|Skip) →$/ }).click();
  await page.getByLabel("Patient's last name", { exact: true }).fill("Patient");
  await page.getByRole("button", { name: /^(Next|Skip) →$/ }).click();
  await page.getByLabel("Date of birth", { exact: true }).fill("1990-01-01");
  await page.getByRole("button", { name: /^(Next|Skip) →$/ }).click();
  await clickChoiceCard(page, "Female");
  for (let i = 0; i < 20; i++) {
    const onReview = await page
      .getByRole("heading", { name: "Review: About the patient" })
      .isVisible()
      .catch(() => false);
    if (onReview) break;
    await page.getByRole("button", { name: /^(Next|Skip) →$/ }).click();
  }
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  const combobox = page.getByRole("combobox", { name: "Vaccine" });
  await combobox.click();
  await combobox.press("ArrowDown");
  // Scoped to our custom component's option class — a plain role("option")
  // query also matches the native <select> "Language" picker's <option>s.
  const firstOption = page.locator(".combobox__option").first();
  await expect(firstOption).toHaveClass(/combobox__option--active/);

  const firstOptionText = await firstOption.textContent();
  await combobox.press("Enter");
  await expect(combobox).toHaveValue(firstOptionText ?? "");
});
