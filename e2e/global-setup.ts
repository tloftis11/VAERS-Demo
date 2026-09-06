import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";

// A dedicated SQLite file, separate from both the real dev.db and the
// Vitest suite's test.db, so an e2e run can never pollute (or be polluted
// by) local dev data or a concurrently-running unit test run.
const SERVER_DIR = path.resolve(__dirname, "../server");
const E2E_DB_PATH = path.resolve(SERVER_DIR, "e2e-test.db");

export default async function globalSetup() {
  if (existsSync(E2E_DB_PATH)) unlinkSync(E2E_DB_PATH);
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: SERVER_DIR,
    env: { ...process.env, DATABASE_URL: `file:${E2E_DB_PATH}` },
    stdio: "inherit",
  });
  return async () => {
    // Windows sometimes still holds a handle open briefly after the server
    // process exits — same benign race the Vitest server suite's teardown
    // hits (see server/vitest.global-setup.ts). Not worth failing the run
    // over; the file gets overwritten on the next run's setup regardless.
    try {
      if (existsSync(E2E_DB_PATH)) unlinkSync(E2E_DB_PATH);
    } catch {
      // ignore
    }
  };
}
