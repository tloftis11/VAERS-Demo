import { Router, type Response } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../db.js";
import { flagDescriptionInconsistencies, suggestDocumentsFromNarrative } from "../services/claudeClient.js";

export const assistantRouter = Router();

const consistencyBodySchema = z.object({
  description: z.string().trim().min(1).max(5000),
  outcomes: z.array(z.string()).default([]),
  hospitalizationDates: z.string().optional(),
  submitterType: z.enum(["public", "hcp"]),
});

assistantRouter.post("/check-description", async (req, res) => {
  const parsed = consistencyBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });

  try {
    const issues = await flagDescriptionInconsistencies(parsed.data);
    res.json({ issues });
  } catch (err) {
    handleClaudeError(err, res);
  }
});

const suggestDocsBodySchema = z.object({
  reportId: z.string().min(1),
});

assistantRouter.post("/suggest-documents", async (req, res) => {
  const parsed = suggestDocsBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });

  try {
    const report = await prisma.report.findUnique({
      where: { id: parsed.data.reportId },
      include: { vaccine: true, adverseEvent: true, errorDetail: true },
    });
    if (!report) return res.status(404).json({ error: "Report not found" });

    const description = report.adverseEvent?.description || report.errorDetail?.errorDescription;
    const vaccineType = report.vaccine?.vaccineType;

    if (!description || !vaccineType) {
      return res.json({ suggestions: [] });
    }

    const suggestions = await suggestDocumentsFromNarrative({
      description,
      vaccineType,
      administrationError: report.administrationError === true,
      adverseEventOccurred: report.adverseEventOccurred === true,
    });
    res.json({ suggestions });
  } catch (err) {
    handleClaudeError(err, res);
  }
});

function handleClaudeError(err: unknown, res: Response) {
  if (err instanceof Anthropic.RateLimitError) {
    return res.status(429).json({ error: "Assistant is busy right now — please try again shortly." });
  }
  if (err instanceof Anthropic.AuthenticationError) {
    console.error("Anthropic authentication failed — check ANTHROPIC_API_KEY in server/.env");
    return res.status(503).json({ error: "Assistant is not configured on this server." });
  }
  if (err instanceof Anthropic.APIError) {
    console.error("Anthropic API error:", err.status, err.message);
    return res.status(502).json({ error: "Assistant is temporarily unavailable." });
  }
  console.error("Unexpected assistant error:", err);
  res.status(500).json({ error: "Something went wrong." });
}
