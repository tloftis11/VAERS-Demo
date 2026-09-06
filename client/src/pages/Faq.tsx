import { useEffect, useState } from "react";
import { searchFaq, type FaqEntry } from "../api/client";
import { useLanguage } from "../i18n/LanguageContext";

export function Faq() {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<FaqEntry[]>([]);

  useEffect(() => {
    searchFaq(query, undefined, language).then(setEntries);
  }, [query, language]);

  return (
    <div className="page page--prose">
      <h1>{t("faqPage.heading")}</h1>
      <label htmlFor="faq-search-page" className="field__label">
        {t("faqPage.searchLabel")}
      </label>
      <input
        id="faq-search-page"
        type="search"
        className="field__input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("faqPage.searchPlaceholder")}
      />
      <ul className="faq-page__list">
        {entries.map((entry) => (
          <li key={entry.id} className="faq-page__entry">
            <h2>{entry.question}</h2>
            <p>{entry.answer}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
