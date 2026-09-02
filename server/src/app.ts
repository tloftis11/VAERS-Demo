import "dotenv/config";
import cors from "cors";
import express from "express";
import { reportsRouter } from "./routes/reports.js";
import { attachmentsRouter } from "./routes/attachments.js";
import { surveysRouter } from "./routes/surveys.js";
import { faqRouter } from "./routes/faq.js";
import { assistantRouter } from "./routes/assistant.js";
import { vaccineOptionsRouter } from "./routes/vaccineOptions.js";
import { adminRouter } from "./routes/admin.js";

/** Exported separately from index.ts's app.listen(...) so tests (supertest)
 * can exercise the app without binding a real port. */
export const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
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
app.use("/api/assistant", assistantRouter);
app.use("/api/vaccine-options", vaccineOptionsRouter);
app.use("/api/admin", adminRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
