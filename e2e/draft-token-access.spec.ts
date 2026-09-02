import { test, expect } from "@playwright/test";

// Matches playwright.config.ts's SERVER_PORT — the e2e client is configured
// with VITE_API_URL pointed here, so a same-page fetch already targets the
// right origin without needing vite's dev-proxy.
const API_ORIGIN = "http://localhost:4100";

test("a draft can't be read via its id alone, with no stored token", async ({ page }) => {
  await page.goto("/report");
  await page.getByRole("button", { name: "Patient" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  const reportId = await page.evaluate(() => localStorage.getItem("vaers_draft_report_id"));
  expect(reportId).toBeTruthy();

  // Confirm the legitimate, same-browser request (with its real stored
  // token) succeeds — a sanity check that the 401 below is actually about
  // the missing token, not some unrelated failure.
  const authorizedStatus = await page.evaluate(
    async ({ origin, id }) => {
      const token = localStorage.getItem(`vaers_draft_token_${id}`);
      const r = await fetch(`${origin}/api/reports/${id}`, { headers: { "X-Draft-Token": token ?? "" } });
      return r.status;
    },
    { origin: API_ORIGIN, id: reportId }
  );
  expect(authorizedStatus).toBe(200);

  // The same request with no token at all — simulating a stranger who only
  // knows/guessed the id — must be rejected.
  const unauthorizedStatus = await page.evaluate(
    async ({ origin, id }) => {
      const r = await fetch(`${origin}/api/reports/${id}`);
      return r.status;
    },
    { origin: API_ORIGIN, id: reportId }
  );
  expect(unauthorizedStatus).toBe(401);
});
