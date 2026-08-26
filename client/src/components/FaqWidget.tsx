import { useEffect, useId, useState } from "react";
import type { StepId } from "../../../shared/src/branchingRules";
import { askFaqAssistant, searchFaq, type FaqEntry } from "../api/client";
import { Mascot } from "./Mascot";

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [askText, setAskText] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    searchFaq(query, query ? undefined : step).then(setEntries);
  }, [open, query, step]);

  const quickReplies = entries.slice(0, 4);
  const selectedEntry = entries.find((e) => e.id === selectedId) ?? null;

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
        <span className="faq-widget__toggle-avatar">
          <Mascot size={22} />
        </span>
        {open ? "Close help" : "Need help? Ask me!"}
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
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedId(null);
            }}
            placeholder="e.g. lot number, privacy, how long"
          />

          {quickReplies.length > 0 && (
            <div className="faq-widget__chip-list" role="group" aria-label="Suggested questions">
              {quickReplies.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="faq-widget__chip"
                  onClick={() => setSelectedId(entry.id)}
                >
                  {entry.question}
                </button>
              ))}
            </div>
          )}

          {selectedEntry ? (
            <ul className="faq-widget__list">
              <li className="faq-widget__entry">
                <p className="faq-widget__question">{selectedEntry.question}</p>
                <p className="faq-widget__answer">{selectedEntry.answer}</p>
              </li>
            </ul>
          ) : (
            query && (
              <ul className="faq-widget__list">
                {entries.length === 0 && <li className="faq-widget__empty">No matching questions found.</li>}
                {entries.map((entry) => (
                  <li key={entry.id} className="faq-widget__entry">
                    <p className="faq-widget__question">{entry.question}</p>
                    <p className="faq-widget__answer">{entry.answer}</p>
                  </li>
                ))}
              </ul>
            )
          )}

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
