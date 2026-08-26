import { useEffect, useRef, useState } from "react";

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  id: string;
  options: readonly ComboboxOption[];
  value: string;
  onSelect: (value: string) => void;
  labelledBy: string;
  placeholder?: string;
}

/**
 * Type-to-filter combobox (WAI-ARIA combobox pattern) for long single-select
 * lists — e.g. state, vaccine type, body site. Long option sets read poorly
 * as a wall of tappable chips; typing to narrow the list is the standard
 * desktop-and-mobile-friendly pattern for this.
 */
export function Combobox({ id, options, value, onSelect, labelledBy, placeholder }: ComboboxProps) {
  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";
  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = `${id}-listbox`;

  useEffect(() => {
    setQuery(selectedLabel);
  }, [selectedLabel]);

  const filtered =
    query.trim() === ""
      ? options
      : options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()));
  const safeActiveIndex = Math.min(activeIndex, Math.max(filtered.length - 1, 0));

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(selectedLabel);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [selectedLabel]);

  function selectOption(opt: ComboboxOption) {
    onSelect(opt.value);
    setQuery(opt.label);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && filtered[safeActiveIndex]) {
        e.preventDefault();
        selectOption(filtered[safeActiveIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery(selectedLabel);
    }
  }

  return (
    <div className="combobox" ref={containerRef}>
      <input
        id={id}
        type="text"
        className="convo-input combobox__input"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-labelledby={labelledBy}
        aria-activedescendant={open && filtered.length > 0 ? `${id}-opt-${safeActiveIndex}` : undefined}
        value={query}
        placeholder={placeholder ?? "Type to search…"}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open && (
        <ul className="combobox__listbox" role="listbox" id={listboxId}>
          {filtered.length === 0 && <li className="combobox__empty">No matches</li>}
          {filtered.map((opt, i) => (
            <li
              key={opt.value}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={opt.value === value}
              className={`combobox__option${i === safeActiveIndex ? " combobox__option--active" : ""}${
                opt.value === value ? " combobox__option--selected" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption(opt);
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
