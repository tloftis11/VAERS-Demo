import { Router, type Response } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { answerFaqQuestion, flagDescriptionInconsistencies } from "../services/claudeClient.js";

export const assistantRouter = Router();

const faqBodySchema = z.object({
  question: z.string().trim().min(1).max(500),
  step: z.string().optional(),
});

assistantRouter.post("/faq", async (req, res) => {
  const parsed = faqBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });

  try {
    const answer = await answerFaqQuestion(parsed.data.question, parsed.data.step);
    res.json({ answer });
  } catch (err) {
    handleClaudeError(err, res);
  }
});

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
