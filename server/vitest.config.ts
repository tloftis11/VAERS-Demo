import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    globalSetup: ["./vitest.global-setup.ts"],
    // Server tests share one on-disk SQLite file across the whole run —
    // parallel workers would race on it (migrate/reset, concurrent writes).
    fileParallelism: false,
  },
});
