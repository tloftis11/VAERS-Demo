import path from "node:path";

// Must run before any module that imports ../src/db.ts (which instantiates
// PrismaClient using whatever DATABASE_URL is set at that time) — Vitest
// setupFiles run before test files are imported, so this is early enough.
process.env.DATABASE_URL = `file:${path.resolve(__dirname, "test.db")}`;
process.env.ADMIN_TOKEN = "test-admin-token";
process.env.DOWNLOAD_TOKEN_SECRET = "test-download-token-secret";
process.env.CLIENT_ORIGIN = "http://localhost:5173";
process.env.UPLOAD_DIR = path.resolve(__dirname, ".test-uploads");
