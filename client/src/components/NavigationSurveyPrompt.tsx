import { useEffect, useState } from "react";
import { postNavigationSurvey } from "../api/client";
import { SurveyForm } from "./SurveyForm";

const SESSION_KEY = "vaers_nav_survey_shown";
const DELAY_MS = 20_000;

/** Site-navigation CSAT survey (design doc §4.7): light-touch, dismissible, shown once per session. */
export function NavigationSurveyPrompt() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    const timer = setTimeout(() => setVisible(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  function markShown() {
    sessionStorage.setItem(SESSION_KEY, "1");
  }

  if (!visible || dismissed) return null;

  return (
    <div className="nav-survey" role="complementary">
      <SurveyForm
        title="Quick feedback"
        prompt="Did you find what you were looking for on this site?"
        onSubmit={async (rating, comment) => {
          await postNavigationSurvey(rating, comment);
          markShown();
        }}
        onDismiss={() => {
          markShown();
          setDismissed(true);
        }}
      />
    </div>
  );
}
