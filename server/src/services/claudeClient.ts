/**
 * Server-side only — the Anthropic API key never reaches the browser.
 * Powers assist features on top of the deterministic rules engine
 * (shared/src/*): a structured consistency check on the free-text
 * adverse-event description, semantic duplicate detection, and narrative
 * document suggestions. FAQ help is deterministic/keyword-only (HELP-002) —
 * there is no free-text AI assistant here. None of this replaces the
 * branching/validation logic in shared/src — those stay the source of
 * truth for what's required to submit.
 */
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// Defaults to Claude Opus 5. This workload (short-context Q&A and structured
// extraction) is a reasonable fit for a cheaper/faster model — set
// CLAUDE_MODEL=claude-haiku-4-5 in .env to try that tradeoff.
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5";

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

export interface SemanticDuplicateResult {
  isDuplicate: boolean;
  matchedReportId: string | null;
  reasoning: string;
}

/**
 * Upgrades the exact-match duplicate heuristic (services/duplicateHeuristic.ts)
 * with a semantic check: same patient/vaccine but a differently-worded
 * narrative describing the same real-world event (e.g. a parent and a clinic
 * both reporting the same visit). Only called when the exact-match check
 * already found candidates with the same patient/vaccine but no exact date
 * match, so this is a narrow, bounded comparison, not a general search.
 */
export async function checkSemanticDuplicate(
  newReport: { description: string; vaccineType: string; administrationDate: string },
  candidates: { id: string; description: string; vaccineType: string; administrationDate: string }[]
): Promise<SemanticDuplicateResult> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    output_config: { effort: "low" },
    system:
      "You compare VAERS adverse-event report narratives to detect likely duplicate " +
      "submissions describing the same real-world event (e.g. the same person reporting twice, " +
      "or a parent and a clinic both reporting the same visit). Only flag a duplicate when the " +
      "narrative details plausibly describe the same incident — the same vaccine and a similar " +
      "timeframe is not enough on its own if the described symptoms or circumstances clearly " +
      "differ. Be conservative; when unsure, say it is not a duplicate.",
    messages: [
      {
        role: "user",
        content:
          `New report:\nVaccine: ${newReport.vaccineType}, given ${newReport.administrationDate}\n` +
          `Description: "${newReport.description}"\n\n` +
          `Candidate reports already on file for the same patient and vaccine type:\n\n` +
          candidates
            .map(
              (c) =>
                `id=${c.id}\nVaccine: ${c.vaccineType}, given ${c.administrationDate}\nDescription: "${c.description}"`
            )
            .join("\n\n"),
      },
    ],
    tools: [
      {
        name: "report_duplicate_check",
        description:
          "Report whether the new submission is a likely duplicate of one of the candidate reports.",
        strict: true,
        input_schema: {
          type: "object",
          properties: {
            isDuplicate: { type: "boolean" },
            matchedReportId: { anyOf: [{ type: "string" }, { type: "null" }] },
            reasoning: { type: "string" },
          },
          required: ["isDuplicate", "matchedReportId", "reasoning"],
          additionalProperties: false,
        },
      },
    ],
    tool_choice: { type: "tool", name: "report_duplicate_check" },
  });

  if (response.stop_reason === "refusal") {
    return { isDuplicate: false, matchedReportId: null, reasoning: "Check declined." };
  }

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUse) return { isDuplicate: false, matchedReportId: null, reasoning: "No result." };

  return toolUse.input as SemanticDuplicateResult;
}

export interface AiDocumentSuggestion {
  documentType: string;
  reason: string;
}

/**
 * Narrative-aware companion to the static heuristic in
 * shared/src/documentSuggestions.ts — reads the actual free-text description
 * to suggest documents the fixed category-based rules can't anticipate
 * (e.g. a specific ER visit or specialist referral mentioned in the text).
 */
export async function suggestDocumentsFromNarrative(input: {
  description: string;
  vaccineType: string;
  administrationError: boolean;
  adverseEventOccurred: boolean;
}): Promise<AiDocumentSuggestion[]> {
  const reportType = [
    input.administrationError && "administration error",
    input.adverseEventOccurred && "adverse event",
  ]
    .filter(Boolean)
    .join(" + ");
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    output_config: { effort: "low" },
    system:
      "You suggest supporting documents a healthcare provider could attach to a VAERS report, " +
      "based specifically on what they wrote in the narrative — not generic categories. Suggest " +
      "at most 3 documents, and only when the narrative gives a concrete reason to request one " +
      "(e.g. it mentions an ER visit, a specific test, a specialist referral, a hospital stay). " +
      "Never suggest a document that isn't clearly motivated by something stated in the text. If " +
      "nothing specific stands out, return an empty list.",
    messages: [
      {
        role: "user",
        content:
          `Vaccine: ${input.vaccineType}\nReport type: ${reportType}\n\n` +
          `Description:\n"""\n${input.description}\n"""`,
      },
    ],
    tools: [
      {
        name: "suggest_documents",
        description: "Suggest supporting documents tailored to this specific narrative.",
        strict: true,
        input_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  documentType: { type: "string" },
                  reason: { type: "string" },
                },
                required: ["documentType", "reason"],
                additionalProperties: false,
              },
            },
          },
          required: ["suggestions"],
          additionalProperties: false,
        },
      },
    ],
    tool_choice: { type: "tool", name: "suggest_documents" },
  });

  if (response.stop_reason === "refusal") return [];

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUse) return [];

  const parsed = toolUse.input as { suggestions: AiDocumentSuggestion[] };
  return parsed.suggestions ?? [];
}
