import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

// Deliberately separate ports from the normal dev servers (4000/5173) and a
// separate VITE_API_URL (bypassing vite.config.ts's hardcoded proxy target
// of :4000) so this suite can run at the same time as a manually-running
// `npm run dev`, against its own isolated database (see global-setup.ts) —
// never the real dev.db, and never interfering with a session already using
// the normal ports.
const SERVER_PORT = 4100;
const CLIENT_PORT = 5175;
const E2E_DB_PATH = path.resolve(__dirname, "server/e2e-test.db");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // shared SQLite file across the run; serial avoids cross-test write contention
  workers: 1,
  retries: 0,
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${CLIENT_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run dev --workspace=server",
      port: SERVER_PORT,
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        DATABASE_URL: `file:${E2E_DB_PATH}`,
        PORT: String(SERVER_PORT),
        CLIENT_ORIGIN: `http://localhost:${CLIENT_PORT}`,
        ADMIN_TOKEN: "e2e-test-admin-token",
        DOWNLOAD_TOKEN_SECRET: "e2e-test-secret",
        FOLLOWUP_TOKEN_SECRET: "e2e-test-secret",
        UPLOAD_DIR: "./e2e-uploads",
        ANTHROPIC_API_KEY: "",
      },
    },
    {
      command: `npm run dev --workspace=client -- --port ${CLIENT_PORT} --strictPort`,
      port: CLIENT_PORT,
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        VITE_API_URL: `http://localhost:${SERVER_PORT}`,
      },
    },
  ],
});
