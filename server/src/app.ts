import "dotenv/config";
import cors from "cors";
import express from "express";
import { reportsRouter } from "./routes/reports.js";
import { attachmentsRouter } from "./routes/attachments.js";
import { surveysRouter } from "./routes/surveys.js";
import { faqRouter } from "./routes/faq.js";
import { vaccineOptionsRouter } from "./routes/vaccineOptions.js";
import { adminRouter } from "./routes/admin.js";

/** Exported separately from index.ts's app.listen(...) so tests (supertest)
 * can exercise the app without binding a real port. */
export const app = express();

// CLIENT_ORIGIN is a comma-separated allowlist rather than a single value,
// so the client's onrender.com URL and a custom domain can both work at
// once during a DNS cutover instead of the older one breaking the moment
// the newer one is added.
const allowedOrigins = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header (health checks, curl, server-to-server) isn't a
      // browser CORS request at all, so there's nothing to allowlist.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} is not allowed`));
      }
    },
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/reports", reportsRouter);
app.use("/api", attachmentsRouter);
app.use("/api/surveys", surveysRouter);
app.use("/api/faq", faqRouter);
app.use("/api/vaccine-options", vaccineOptionsRouter);
app.use("/api/admin", adminRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
