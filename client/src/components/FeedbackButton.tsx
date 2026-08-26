import { useState } from "react";
import { postNavigationSurvey } from "../api/client";
import { Modal } from "./Modal";
import { SurveyForm } from "./SurveyForm";

/**
 * Persistent, always-available feedback entry point (design doc §4.7) —
 * replaces the earlier timed auto-popup, which was easy to miss and could
 * only be answered once. This is reachable at any time, on any page
 * (including mid-wizard), and opens a modal rather than competing for
 * attention on its own.
 */
export function FeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="feedback-button" onClick={() => setOpen(true)}>
        Feedback
      </button>
      {open && (
        <Modal title="Give feedback" onClose={() => setOpen(false)}>
          <SurveyForm
            title="Give feedback"
            prompt="How's your experience with VAERS reporting so far?"
            hideHeader
            onSubmit={(rating, comment) => postNavigationSurvey(rating, comment).then(() => {})}
          />
        </Modal>
      )}
    </>
  );
}
