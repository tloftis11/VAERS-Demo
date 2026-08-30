import { useEffect, useState } from "react";

interface MonthYearInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  labelledBy: string;
  /** ISO "YYYY-MM-DD" or "YYYY-MM" — months/years after this aren't offered. */
  max?: string;
}

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

function parseMonthYear(v: string): { month: string; year: string } {
  const m = /^(\d{4})-(\d{2})$/.exec(v.trim());
  if (!m) return { month: "", year: "" };
  return { year: m[1], month: m[2] };
}

/**
 * A month+year-only date entry — matches the real VAERS eSubmitter system's
 * own "mm/yyyy" partial-date option (used when the exact day isn't known).
 * Stores the same "YYYY-MM" shape the schema's date parsing already accepts
 * (Date.parse handles a partial ISO string fine), so no schema change is
 * needed to support this alongside the full "YYYY-MM-DD" case.
 */
export function MonthYearInput({ id, value, onChange, labelledBy, max }: MonthYearInputProps) {
  // Held locally rather than derived straight from `value` on every render:
  // picking the month before the year (or vice versa) is the normal order of
  // operations, and a fully-controlled derive-from-value approach would
  // discard whichever one was picked first every time, since neither half
  // alone parses back out of an empty external value.
  const [month, setMonth] = useState(() => parseMonthYear(value).month);
  const [year, setYear] = useState(() => parseMonthYear(value).year);

  useEffect(() => {
    const parsed = parseMonthYear(value);
    setMonth(parsed.month);
    setYear(parsed.year);
  }, [value]);

  const { year: maxYear, month: maxMonth } = parseMonthYear((max ?? "").slice(0, 7));

  function emit(nextMonth: string, nextYear: string) {
    setMonth(nextMonth);
    setYear(nextYear);
    if (nextMonth && nextYear && nextYear.length === 4) {
      onChange(`${nextYear}-${nextMonth}`);
    } else if (!nextMonth && !nextYear) {
      onChange("");
    }
    // Only one of the two filled in so far: hold it locally without
    // propagating anything upward yet (an incomplete date isn't a real value).
  }

  const monthOptions = MONTHS.filter((m) => {
    if (!maxYear || !maxMonth) return true;
    if (year && year !== maxYear) return true;
    return m.value <= maxMonth;
  });

  return (
    <div className="month-year" role="group" aria-labelledby={labelledBy}>
      <select
        id={id}
        className="convo-input convo-input--select month-year__month"
        value={month}
        onChange={(e) => emit(e.target.value, year)}
        aria-label="Month"
      >
        <option value="">Month</option>
        {monthOptions.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      <input
        type="number"
        className="convo-input month-year__year"
        placeholder="Year"
        value={year}
        aria-label="Year"
        min={1900}
        max={maxYear ? Number(maxYear) : undefined}
        onChange={(e) => emit(month, e.target.value)}
      />
    </div>
  );
}
