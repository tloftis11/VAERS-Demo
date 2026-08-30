import { Router, type Request, type Response, type NextFunction } from "express";
import { prisma } from "../db.js";

/** Prototype-level auth: a single shared token, checked on every admin route.
 * Real production access would go through federal identity (PIV/CAC or SSO),
 * not a shared secret — called out explicitly in the technical volume. */
function requireAdminToken(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.ADMIN_TOKEN;
  const provided = req.get("X-Admin-Token");
  if (!expected || provided !== expected) {
    res.status(401).json({ error: "Invalid or missing admin token" });
    return;
  }
  next();
}

export const adminRouter = Router();

adminRouter.use(requireAdminToken);

adminRouter.get("/vaccine-options", async (_req, res) => {
  const options = await prisma.vaccineOption.findMany({
    orderBy: [{ audience: "asc" }, { sortOrder: "asc" }],
  });
  res.json(options);
});

adminRouter.post("/vaccine-options", async (req, res) => {
  const { value, label, audience } = req.body ?? {};
  if (typeof value !== "string" || !value.trim() || typeof label !== "string" || !label.trim()) {
    res.status(400).json({ error: "value and label are required" });
    return;
  }
  if (audience !== "public" && audience !== "hcp") {
    res.status(400).json({ error: "audience must be 'public' or 'hcp'" });
    return;
  }
  const count = await prisma.vaccineOption.count({ where: { audience } });
  try {
    const created = await prisma.vaccineOption.create({
      data: { value: value.trim(), label: label.trim(), audience, sortOrder: count },
    });
    res.status(201).json(created);
  } catch {
    res.status(409).json({ error: "A vaccine option with this value already exists for this audience" });
  }
});

adminRouter.patch("/vaccine-options/:id", async (req, res) => {
  const { label, active } = req.body ?? {};
  const data: { label?: string; active?: boolean } = {};
  if (typeof label === "string" && label.trim()) data.label = label.trim();
  if (typeof active === "boolean") data.active = active;
  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }
  try {
    const updated = await prisma.vaccineOption.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch {
    res.status(404).json({ error: "Vaccine option not found" });
  }
});
