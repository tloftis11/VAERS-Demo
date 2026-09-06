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
  invalid?: boolean;
  describedBy?: string;
}

/**
 * Type-to-filter combobox (WAI-ARIA combobox pattern) for long single-select
 * lists — e.g. state, vaccine type, body site. Long option sets read poorly
 * as a wall of tappable chips; typing to narrow the list is the standard
 * desktop-and-mobile-friendly pattern for this.
 */
export function Combobox({
  id,
  options,
  value,
  onSelect,
  labelledBy,
  placeholder,
  invalid,
  describedBy,
}: ComboboxProps) {
  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";
  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  // -1 means "nothing highlighted yet" — the WAI-ARIA combobox pattern
  // doesn't pre-highlight an option on open; the first ArrowDown press
  // should land on the first option, not skip past it to the second.
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = `${id}-listbox`;
  // Set right before we call onSelect("") ourselves (typing away from the
  // stored selection, below) — the resulting `selectedLabel` change would
  // otherwise run straight into the sync effect just below and stomp
  // whatever the user is mid-typing back to "". Consumed (reset to false)
  // the next time that effect runs, so it only ever skips that one sync.
  const skipNextSyncRef = useRef(false);

  useEffect(() => {
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    setQuery(selectedLabel);
  }, [selectedLabel]);

  const filtered =
    query.trim() === ""
      ? options
      : options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()));
  const safeActiveIndex =
    activeIndex < 0 ? -1 : Math.min(activeIndex, Math.max(filtered.length - 1, 0));

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

  // Typing something that no longer matches the stored selection, then
  // leaving the field without picking a new option (e.g. Tab, not just a
  // click elsewhere), must not leave the displayed text and the stored
  // value permanently disagreeing — revert the display back to the last
  // real selection. Options themselves select via onMouseDown+preventDefault
  // (below), so a real selection never reaches this handler.
  function handleBlur() {
    setOpen(false);
    setQuery(selectedLabel);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i < 0 ? 0 : Math.min(i + 1, filtered.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      if (open) {
        e.preventDefault();
        setActiveIndex(0);
      }
    } else if (e.key === "End") {
      if (open) {
        e.preventDefault();
        setActiveIndex(filtered.length - 1);
      }
    } else if (e.key === "Enter") {
      if (open && safeActiveIndex >= 0 && filtered[safeActiveIndex]) {
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
        aria-activedescendant={
          open && safeActiveIndex >= 0 && filtered.length > 0 ? `${id}-opt-${safeActiveIndex}` : undefined
        }
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        value={query}
        placeholder={placeholder ?? "Type to search…"}
        autoComplete="off"
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setOpen(true);
          // -1, not 0: matches onFocus below and the WAI-ARIA convention
          // documented on the initial state — nothing should be
          // pre-highlighted just because the list was filtered, or the
          // first ArrowDown press skips straight past the first result.
          setActiveIndex(-1);
          // The stored selection and the displayed text have diverged —
          // typing a replacement without picking a new option must not
          // leave the old value silently committed underneath it.
          if (value && next !== selectedLabel) {
            skipNextSyncRef.current = true;
            onSelect("");
          }
        }}
        onFocus={() => {
          setOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
      {open && (
        <ul className="combobox__listbox" role="listbox" id={listboxId}>
          {filtered.length === 0 && (
            <li className="combobox__empty" role="option" aria-disabled="true">
              No matches
            </li>
          )}
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
