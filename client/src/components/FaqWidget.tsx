import { useEffect, useId, useState } from "react";
import type { StepId } from "../../../shared/src/branchingRules";
import { faqForStep } from "../../../shared/src/faqData";
import { searchFaq, type FaqEntry } from "../api/client";

interface FaqWidgetProps {
  step?: StepId;
}

function HelpIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M9.5 9.3a2.5 2.5 0 0 1 4.83-.9c.4 1.05-.3 1.6-1 2.1-.6.45-1.1.85-1.2 1.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.3" r="0.9" fill="currentColor" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Embedded, keyword-matched FAQ (design doc §4.5, HELP-002/003): topics for
 * the current step plus a general search reachable from anywhere. No
 * free-text AI assistant here — "Suggested topics" are a fixed, deterministic
 * list drawn from the same FAQ dataset, filtered entirely client-side.
 */
export function FaqWidget({ step }: FaqWidgetProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<FaqEntry[]>([]);
  const panelId = useId();
  const suggestedTopics = step ? faqForStep(step) : [];

  useEffect(() => {
    if (!open) return;
    searchFaq(query, query ? undefined : step).then(setEntries);
  }, [open, query, step]);

  return (
    <div className="faq-widget">
      {!open && <span className="faq-widget__caption">VAERS Help</span>}
      <button
        type="button"
        className="faq-widget__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close help" : "Open VAERS help"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <CloseIcon /> : <HelpIcon />}
      </button>
      {open && (
        <div id={panelId} className="faq-widget__panel" role="region" aria-label="VAERS help">
          <h2 className="faq-widget__title">VAERS Help</h2>

          {suggestedTopics.length > 0 && !query && (
            <>
              <p className="field__label">Suggested topics for this step</p>
              <div className="faq-widget__topics">
                {suggestedTopics.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="faq-widget__topic-button"
                    onClick={() => setQuery(entry.question)}
                  >
                    {entry.question}
                  </button>
                ))}
              </div>
            </>
          )}

          <label htmlFor="faq-search" className="field__label">
            Search the FAQ
          </label>
          <input
            id="faq-search"
            type="search"
            className="field__input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. lot number, privacy, how long"
          />
          <ul className="faq-widget__list">
            {entries.length === 0 && <li className="faq-widget__empty">No matching questions found.</li>}
            {entries.map((entry) => (
              <li key={entry.id} className="faq-widget__entry">
                <p className="faq-widget__question">{entry.question}</p>
                <p className="faq-widget__answer">{entry.answer}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
