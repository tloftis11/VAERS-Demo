/**
 * Server-side only — the Anthropic API key never reaches the browser.
 * Powers two assist features on top of the deterministic rules engine
 * (shared/src/*): a natural-language FAQ assistant, and a structured
 * consistency check on the free-text adverse-event description. Neither
 * replaces the branching/validation logic in shared/src — those stay the
 * source of truth for what's required to submit.
 */
import Anthropic from "@anthropic-ai/sdk";
import { FAQ_ENTRIES } from "../../../shared/src/faqData.js";

const client = new Anthropic();

// Defaults to Claude Opus 5. This workload (short-context Q&A and structured
// extraction) is a reasonable fit for a cheaper/faster model — set
// CLAUDE_MODEL=claude-haiku-4-5 in .env to try that tradeoff.
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5";

export async function answerFaqQuestion(question: string, step?: string): Promise<string> {
  const groundingFaq = FAQ_ENTRIES.map((e) => `Q: ${e.question}\nA: ${e.answer}`).join("\n\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    output_config: { effort: "low" },
    system:
      "You are a help assistant embedded in the VAERS (Vaccine Adverse Event Reporting System) " +
      "public reporting form. Answer questions about how to use the form, what information is " +
      "needed, privacy, and the reporting process. Keep answers short (2-4 sentences) and in " +
      "plain language. If the question asks for medical advice, a diagnosis, or whether a " +
      "specific symptom was caused by a vaccine, decline and suggest they contact a healthcare " +
      "provider or the VAERS support line instead — you are not a clinician. If you don't know " +
      "the answer from the reference FAQ, say so plainly rather than guessing.",
    messages: [
      {
        role: "user",
        content:
          `Reference FAQ (for grounding — not necessarily exhaustive):\n${groundingFaq}\n\n` +
          `Current form step: ${step ?? "unknown"}\n\n` +
          `User question: ${question}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    return "I'm not able to help with that question. Please check the FAQ page or contact support.";
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  return textBlock?.text ?? "Sorry, I couldn't come up with an answer. Please check the FAQ page.";
}

export interface ConsistencyIssue {
  field: "description" | "outcomes" | "hospitalizationDates";
  issue: string;
  suggestion: string;
}

export async function flagDescriptionInconsistencies(input: {
  description: string;
  outcomes: string[];
  hospitalizationDates?: string;
  submitterType: "public" | "hcp";
}): Promise<ConsistencyIssue[]> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    output_config: { effort: "low" },
    system:
      "You review VAERS adverse-event report drafts before submission. Compare the free-text " +
      "description against the outcome checkboxes the reporter selected, and flag ONLY genuine " +
      "inconsistencies or clearly missing information that would materially affect how the " +
      "report is reviewed — for example, the description mentions hospitalization but " +
      "'hospitalized' isn't selected, it mentions death but 'death' isn't selected, or it says " +
      "the patient fully recovered but 'not_recovered' is selected. Be conservative: if nothing " +
      "is inconsistent, return an empty issues array. Never invent issues, and never provide a " +
      "medical diagnosis, treatment advice, or an opinion on whether the vaccine caused the event.",
    messages: [
      {
        role: "user",
        content:
          `Submitter type: ${input.submitterType}\n` +
          `Selected outcomes: ${input.outcomes.join(", ") || "(none selected)"}\n` +
          `Hospitalization dates given: ${input.hospitalizationDates || "(none given)"}\n\n` +
          `Free-text description:\n"""\n${input.description}\n"""`,
      },
    ],
    tools: [
      {
        name: "flag_inconsistencies",
        description:
          "Report inconsistencies found between the free-text description and the structured outcome fields.",
        strict: true,
        input_schema: {
          type: "object",
          properties: {
            issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: {
                    type: "string",
                    enum: ["description", "outcomes", "hospitalizationDates"],
                  },
                  issue: { type: "string" },
                  suggestion: { type: "string" },
                },
                required: ["field", "issue", "suggestion"],
                additionalProperties: false,
              },
            },
          },
          required: ["issues"],
          additionalProperties: false,
        },
      },
    ],
    tool_choice: { type: "tool", name: "flag_inconsistencies" },
  });

  if (response.stop_reason === "refusal") return [];

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUse) return [];

  const parsed = toolUse.input as { issues: ConsistencyIssue[] };
  return parsed.issues ?? [];
}
