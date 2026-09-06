import { Router } from "express";
import { searchFaq, type StepId, type FaqLanguage } from "../rules.js";

export const faqRouter = Router();

faqRouter.get("/", (req, res) => {
  const query = typeof req.query.query === "string" ? req.query.query : "";
  const step = typeof req.query.step === "string" ? (req.query.step as StepId) : undefined;
  const lang: FaqLanguage = req.query.lang === "es" ? "es" : "en";
  res.json(searchFaq(query, step, lang));
});
