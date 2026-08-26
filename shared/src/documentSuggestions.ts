/**
 * Deterministic, rule-based document-suggestion tool (design doc §4.6 /
 * Task 2.3). The doc's §6.8 explicitly calls for a non-AI MVP for this kind
 * of "intelligent" assistance, since generative/ML approaches would trigger
 * a Government AI-use approval gate (CDCH.10) — so this is plain heuristic
 * logic over the report's already-collected characteristics, not a model.
 */
export interface DocumentSuggestionInput {
  submitterType: "public" | "hcp";
  administrationError: boolean | null;
  adverseEventOccurred: boolean | null;
  errorType?: string;
  outcomes?: string[];
}

export interface DocumentSuggestion {
  documentType: string;
  reason: string;
}

export function suggestDocuments(input: DocumentSuggestionInput): DocumentSuggestion[] {
  const suggestions: DocumentSuggestion[] = [];

  if (input.submitterType !== "hcp") {
    // Doc §4.6: suggestion tool is HCP-only; public reporters just get the
    // general upload control and free-text box.
    return suggestions;
  }

  suggestions.push({
    documentType: "Vaccination record / immunization card",
    reason: "Confirms vaccine, lot number, and administration date.",
  });

  // Independent booleans (PROV-002/003): a report can have an administration
  // error, an adverse event, or both, so these suggestion sets are additive
  // rather than either/or.
  if (input.administrationError) {
    suggestions.push({
      documentType: "Medication administration record (MAR)",
      reason: "Documents what was actually administered and by whom.",
    });
    suggestions.push({
      documentType: "Vaccine order / prescription",
      reason: "Establishes what should have been administered.",
    });
    if (input.errorType === "storage_handling_error") {
      suggestions.push({
        documentType: "Cold-chain / storage temperature log",
        reason: "Supports a storage or handling error report.",
      });
    }
  }

  if (input.adverseEventOccurred) {
    suggestions.push({
      documentType: "Clinical progress notes",
      reason: "Supports the reported clinical course of the adverse event.",
    });

    const outcomes = input.outcomes ?? [];
    if (
      outcomes.includes("hospitalization") ||
      outcomes.includes("hospitalization_prolonged") ||
      outcomes.includes("life_threatening")
    ) {
      suggestions.push({
        documentType: "Hospital discharge summary",
        reason: "Selected outcome indicates hospitalization.",
      });
      suggestions.push({
        documentType: "Emergency department report",
        reason: "Selected outcome indicates a serious/urgent event.",
      });
    }
    if (outcomes.includes("death")) {
      suggestions.push({
        documentType: "Death certificate (if available)",
        reason: "Selected outcome indicates death.",
      });
      suggestions.push({
        documentType: "Autopsy report (if available)",
        reason: "Selected outcome indicates death.",
      });
    }
  }

  return suggestions;
}
