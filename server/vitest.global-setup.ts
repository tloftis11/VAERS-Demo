import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";

// Tests run against a dedicated SQLite file, never the real dev.db, so a
// test run can never pollute (or be polluted by) local dev data.
const TEST_DB_PATH = path.resolve(__dirname, "test.db");

export default async function globalSetup() {
  if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH);
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: __dirname,
    env: { ...process.env, DATABASE_URL: `file:${TEST_DB_PATH}` },
    stdio: "inherit",
  });
  return async () => {
    if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH);
  };
}
