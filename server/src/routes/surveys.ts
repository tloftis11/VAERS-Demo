import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";

export const surveysRouter = Router();

const surveyBodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
  reportId: z.string().optional(),
});

surveysRouter.post("/navigation", async (req, res) => {
  const parsed = surveyBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });

  const response = await prisma.surveyResponse.create({
    data: { type: "navigation", rating: parsed.data.rating, comment: parsed.data.comment ?? null },
  });
  res.status(201).json({ id: response.id });
});

surveysRouter.post("/post-submission", async (req, res) => {
  const parsed = surveyBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });

  const response = await prisma.surveyResponse.create({
    data: {
      type: "post_submission",
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
      reportId: parsed.data.reportId ?? null,
    },
  });
  res.status(201).json({ id: response.id });
});
