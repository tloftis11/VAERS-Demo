import { useEffect, useState } from "react";
import { searchFaq, type FaqEntry } from "../api/client";

export function Faq() {
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<FaqEntry[]>([]);

  useEffect(() => {
    searchFaq(query).then(setEntries);
  }, [query]);

  return (
    <div className="page page--prose">
      <h1>Frequently Asked Questions</h1>
      <label htmlFor="faq-search-page" className="field__label">
        Search
      </label>
      <input
        id="faq-search-page"
        type="search"
        className="field__input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="e.g. privacy, lot number, how long"
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
