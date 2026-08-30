import { Router } from "express";
import { prisma } from "../db.js";

/** Public, unauthenticated: the reporting flow's live vaccine dropdown. Only
 * ever returns active options — inactive ones stay in the table (a past
 * report may still reference them) but drop out of new-report choices. */
export const vaccineOptionsRouter = Router();

vaccineOptionsRouter.get("/", async (req, res) => {
  const audience = typeof req.query.audience === "string" ? req.query.audience : undefined;
  if (audience !== "public" && audience !== "hcp") {
    res.status(400).json({ error: "audience must be 'public' or 'hcp'" });
    return;
  }
  const options = await prisma.vaccineOption.findMany({
    where: { audience, active: true },
    orderBy: { sortOrder: "asc" },
  });
  res.json(options.map((o) => ({ value: o.value, label: o.label })));
});
