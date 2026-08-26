import { useEffect, useState } from "react";
import { Mascot } from "./Mascot";

const SESSION_KEY = "vaers_milestone_shown";

/**
 * One-time affirming banner shown once a report crosses the halfway point
 * (design doc §4.2 engagement pattern). Purely presentational — computed
 * from the step index ReportWizard already has, no new route or persisted
 * state.
 */
export function MilestoneBanner() {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");

  useEffect(() => {
    if (!dismissed) sessionStorage.setItem(SESSION_KEY, "1");
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <div className="milestone-banner" role="status">
      <Mascot size={28} />
      <p>
        You're over halfway there — <strong>every report helps.</strong>
      </p>
      <button
        type="button"
        className="milestone-banner__dismiss"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
