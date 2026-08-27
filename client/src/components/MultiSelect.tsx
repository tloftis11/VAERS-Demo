import { useEffect, useRef, useState } from "react";

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  id: string;
  options: readonly MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  labelledBy: string;
  placeholder?: string;
}

/**
 * Dropdown multi-select for longer option sets (race, symptoms) — replaces
 * a wall of always-visible toggle pills with a single closed control that
 * expands into a checklist, matching how a select field reads at rest while
 * still allowing multiple choices.
 */
export function MultiSelect({ id, options, value, onChange, labelledBy, placeholder }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = `${id}-panel`;

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  }

  const selectedLabels = options.filter((o) => value.includes(o.value)).map((o) => o.label);
  const summary =
    selectedLabels.length === 0
      ? placeholder ?? "Select…"
      : selectedLabels.length <= 2
        ? selectedLabels.join(", ")
        : `${selectedLabels.length} selected`;

  return (
    <div className="multiselect" ref={containerRef}>
      <button
        type="button"
        id={id}
        className="convo-input multiselect__trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        aria-labelledby={`${labelledBy} ${id}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          else if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className={selectedLabels.length === 0 ? "multiselect__placeholder" : undefined}>{summary}</span>
        <span className="multiselect__chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="multiselect__panel" id={panelId} role="group" aria-labelledby={labelledBy}>
          {options.map((opt) => {
            const checked = value.includes(opt.value);
            const optId = `${id}-opt-${opt.value}`;
            return (
              <label key={opt.value} htmlFor={optId} className="multiselect__option">
                <input id={optId} type="checkbox" checked={checked} onChange={() => toggle(opt.value)} />
                {opt.label}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
