import { useEffect, useId, useState } from "react";
import type { StepId } from "../../../shared/src/branchingRules";
import { askFaqAssistant, searchFaq, type FaqEntry } from "../api/client";

interface FaqWidgetProps {
  step?: StepId;
}

/**
 * Embedded, searchable FAQ (design doc §4.5): keyword-matched to the
 * current step, plus a general search reachable from anywhere. Also offers
 * a natural-language "ask in your own words" option backed by Claude,
 * grounded in this same FAQ dataset, for questions the keyword match misses.
 */
export function FaqWidget({ step }: FaqWidgetProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<FaqEntry[]>([]);
  const [askText, setAskText] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    searchFaq(query, query ? undefined : step).then(setEntries);
  }, [open, query, step]);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!askText.trim()) return;
    setAsking(true);
    setAskError(null);
    setAiAnswer(null);
    try {
      const { answer } = await askFaqAssistant(askText.trim(), step);
      setAiAnswer(answer);
    } catch {
      setAskError("Couldn't reach the assistant right now — try the FAQ list above instead.");
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="faq-widget">
      <button
        type="button"
        className="faq-widget__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Close help" : "Help / FAQ"}
      </button>
      {open && (
        <div id={panelId} className="faq-widget__panel" role="region" aria-label="Frequently asked questions">
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

          <form className="faq-widget__ask" onSubmit={handleAsk}>
            <label htmlFor="faq-ask" className="field__label">
              Or ask in your own words
            </label>
            <textarea
              id="faq-ask"
              className="field__textarea"
              rows={2}
              value={askText}
              onChange={(e) => setAskText(e.target.value)}
              placeholder="e.g. do I have to know exactly when symptoms started?"
            />
            <button type="submit" className="button button--secondary" disabled={asking || !askText.trim()}>
              {asking ? "Asking…" : "Ask"}
            </button>
            {askError && (
              <p role="alert" className="field__error">
                {askError}
              </p>
            )}
            {aiAnswer && (
              <div className="faq-widget__ai-answer" role="status">
                <p>{aiAnswer}</p>
                <p className="faq-widget__ai-disclaimer">
                  AI-generated answer — not a substitute for medical advice.
                </p>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
