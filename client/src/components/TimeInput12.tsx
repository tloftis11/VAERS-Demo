interface TimeInput12Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
  labelledBy: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function parseTime(v: string): { hour: string; minute: string; period: "AM" | "PM" | "" } {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(v.trim());
  if (!m) return { hour: "", minute: "", period: "" };
  return { hour: String(Number(m[1])), minute: m[2], period: m[3].toUpperCase() as "AM" | "PM" };
}

/**
 * Structurally enforces a valid 12-hour time (hour 1-12, minute 00-59, an
 * explicit AM/PM) instead of a free-text field where "15:00" or "13 PM" can
 * be typed. Stores the same "H:MM AM/PM" string shape the rest of the app
 * already expects (see the pre-existing "e.g. 3:00 PM" hints).
 */
export function TimeInput12({ id, value, onChange, labelledBy }: TimeInput12Props) {
  const { hour, minute, period } = parseTime(value);

  function emit(nextHour: string, nextMinute: string, nextPeriod: string) {
    if (!nextHour || !nextPeriod) {
      onChange("");
      return;
    }
    onChange(`${nextHour}:${(nextMinute || "00").padStart(2, "0")} ${nextPeriod}`);
  }

  return (
    <div className="time12" role="group" aria-labelledby={labelledBy}>
      <select
        id={id}
        className="convo-input convo-input--select time12__hour"
        value={hour}
        onChange={(e) => emit(e.target.value, minute, period || "AM")}
        aria-label="Hour"
      >
        <option value="">HH</option>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="time12__colon" aria-hidden="true">
        :
      </span>
      <select
        className="convo-input convo-input--select time12__minute"
        value={minute}
        onChange={(e) => emit(hour || "12", e.target.value, period || "AM")}
        aria-label="Minute"
      >
        <option value="">MM</option>
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <div className="time12__period" role="group" aria-label="AM or PM">
        <button
          type="button"
          className={`time12__period-btn${period === "AM" ? " time12__period-btn--selected" : ""}`}
          aria-pressed={period === "AM"}
          onClick={() => emit(hour || "12", minute || "00", "AM")}
        >
          AM
        </button>
        <button
          type="button"
          className={`time12__period-btn${period === "PM" ? " time12__period-btn--selected" : ""}`}
          aria-pressed={period === "PM"}
          onClick={() => emit(hour || "12", minute || "00", "PM")}
        >
          PM
        </button>
      </div>
    </div>
  );
}
