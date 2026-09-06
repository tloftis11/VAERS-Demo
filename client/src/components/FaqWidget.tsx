import { useEffect, useId, useState } from "react";
import type { StepId } from "../../../shared/src/branchingRules";
import { searchFaq, type FaqEntry } from "../api/client";
import { Mascot } from "./Mascot";
import { useLanguage } from "../i18n/LanguageContext";

interface FaqWidgetProps {
  step?: StepId;
}

/**
 * Embedded, searchable FAQ (design doc §4.5): keyword-matched to the
 * current step, plus a general search reachable from anywhere. Deterministic
 * only — no generative-AI free-text assistant, per the AI Compliance and
 * Risk Management Plan (production VAERS FAQs use CDC-approved rules and
 * content, not a model reading reporter-submitted text).
 */
export function FaqWidget({ step }: FaqWidgetProps) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<FaqEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    searchFaq(query, query ? undefined : step, language).then(setEntries);
  }, [open, query, step, language]);

  const quickReplies = entries.slice(0, 4);
  const selectedEntry = entries.find((e) => e.id === selectedId) ?? null;

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
        {open ? t("faqWidget.closeHelp") : t("faqWidget.needHelp")}
      </button>
      {open && (
        <div id={panelId} className="faq-widget__panel" role="region" aria-label={t("faqWidget.panelAriaLabel")}>
          <label htmlFor="faq-search" className="field__label">
            {t("faqWidget.searchLabel")}
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
            placeholder={t("faqWidget.searchPlaceholder")}
          />

          {quickReplies.length > 0 && (
            <div className="faq-widget__chip-list" role="group" aria-label={t("faqWidget.suggestedQuestionsAriaLabel")}>
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
                {entries.length === 0 && <li className="faq-widget__empty">{t("faqWidget.noMatches")}</li>}
                {entries.map((entry) => (
                  <li key={entry.id} className="faq-widget__entry">
                    <p className="faq-widget__question">{entry.question}</p>
                    <p className="faq-widget__answer">{entry.answer}</p>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      )}
    </div>
  );
}
