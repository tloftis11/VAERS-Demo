import { Router } from "express";
import { searchFaq, type StepId } from "../rules.js";

export const faqRouter = Router();

faqRouter.get("/", (req, res) => {
  const query = typeof req.query.query === "string" ? req.query.query : "";
  const step = typeof req.query.step === "string" ? (req.query.step as StepId) : undefined;
  res.json(searchFaq(query, step));
});
