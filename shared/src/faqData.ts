/**
 * Static, keyword-matched FAQ dataset (design doc §4.5): "an embedded,
 * searchable FAQ — keyword/topic-matched to the user's current step, plus a
 * general FAQ popup reachable from anywhere." Deterministic by design, per
 * the doc's non-AI MVP decision (§6.8).
 */
import type { StepId } from "./branchingRules";

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  /** Steps where this entry should surface contextually; omit/empty for "general" entries shown everywhere in global search. */
  steps: StepId[];
}

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: "what-is-vaers",
    question: "What is VAERS?",
    answer:
      "VAERS (Vaccine Adverse Event Reporting System) is the national early-warning system used to monitor the safety of vaccines. Anyone — patients, parents, or healthcare providers — can submit a report.",
    keywords: ["vaers", "what is", "purpose", "about"],
    steps: [],
  },
  {
    id: "who-should-report",
    question: "Who should submit a report?",
    answer:
      "Anyone who experiences or witnesses a possible adverse event after vaccination can report — patients, parents/guardians, caregivers, and healthcare providers.",
    keywords: ["who", "should", "report", "eligible"],
    steps: ["submitter-type"],
  },
  {
    id: "adverse-event-vs-error",
    question: "What's the difference between an adverse event and an administration error?",
    answer:
      "An adverse event is an unexpected health problem after vaccination. An administration error means the vaccine itself was given incorrectly (wrong dose, wrong vaccine, wrong route) but the patient had no resulting health problem.",
    keywords: ["adverse event", "error", "difference", "no ae"],
    steps: ["report-characteristic"],
  },
  {
    id: "dont-know-lot-number",
    question: "What if I don't know the lot number?",
    answer:
      "That's okay — public reporters can leave the lot number blank or mark it unknown. Check your vaccination card or ask your provider's office if you're able to.",
    keywords: ["lot number", "don't know", "unknown"],
    steps: ["vaccine"],
  },
  {
    id: "how-long-does-it-take",
    question: "How long does a report take to complete?",
    answer:
      "Most reports take about 10 minutes. You can save your progress and come back later if you need to gather more information.",
    keywords: ["how long", "time", "minutes"],
    steps: [],
  },
  {
    id: "save-and-resume",
    question: "Can I save my progress and finish later?",
    answer:
      "Yes. Your draft is saved automatically as you move between steps. Use the link provided to return to your draft.",
    keywords: ["save", "resume", "later", "draft"],
    steps: ["review"],
  },
  {
    id: "upload-later",
    question: "Can I add documents after I submit?",
    answer:
      "Yes. This form lets you attach documents now, but you can also use the existing follow-up information tool to add records after submission.",
    keywords: ["upload", "later", "after submit", "follow-up", "documents"],
    steps: ["documents"],
  },
  {
    id: "privacy",
    question: "Is my information kept private?",
    answer:
      "Your information is protected and used only for vaccine-safety monitoring. Only the minimum information needed to evaluate the report is collected.",
    keywords: ["privacy", "private", "confidential", "phi", "pii"],
    steps: ["about-you", "patient"],
  },
  {
    id: "what-happens-after-submit",
    question: "What happens after I submit?",
    answer:
      "Your report is reviewed as part of ongoing vaccine safety monitoring. You generally won't receive an individual response, but the data contributes to national safety surveillance.",
    keywords: ["after", "submit", "next", "what happens"],
    steps: ["review"],
  },
  {
    id: "hcp-medical-record-number",
    question: "Is the medical record number required?",
    answer:
      "For healthcare-provider reports, yes — it helps link the report back to the source record if follow-up is needed.",
    keywords: ["medical record number", "mrn", "required"],
    steps: ["patient"],
  },
];

export function searchFaq(query: string, step?: StepId): FaqEntry[] {
  const q = query.trim().toLowerCase();
  const pool = step
    ? FAQ_ENTRIES.filter((e) => e.steps.length === 0 || e.steps.includes(step))
    : FAQ_ENTRIES;

  if (!q) return pool;

  return pool.filter((entry) => {
    const haystack = [entry.question, entry.answer, ...entry.keywords].join(" ").toLowerCase();
    return q.split(/\s+/).some((term) => term.length > 1 && haystack.includes(term));
  });
}

export function faqForStep(step: StepId): FaqEntry[] {
  return FAQ_ENTRIES.filter((e) => e.steps.includes(step));
}
