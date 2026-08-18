import { Link } from "react-router-dom";

/** Redesigned landing page (design doc §4.2). */
export function Landing() {
  return (
    <div className="page page--landing">
      <section className="hero">
        <h1>Report a possible vaccine adverse event or administration error</h1>
        <p>
          VAERS (Vaccine Adverse Event Reporting System) is the national early-warning system for
          vaccine safety. Reporting takes about 10 minutes, and the form adapts to who you are and
          what happened so you're only asked what's relevant.
        </p>
        <Link to="/report" className="button button--primary button--large">
          Report an Event
        </Link>
      </section>

      <section className="tile-grid" aria-label="Other ways to get help">
        <Link to="/faq" className="tile">
          <h2>Frequently Asked Questions</h2>
          <p>Answers to common questions about reporting, privacy, and what happens next.</p>
        </Link>
        <Link to="/about" className="tile">
          <h2>About VAERS</h2>
          <p>Background on the program, its purpose, and who should report.</p>
        </Link>
        <div className="tile tile--muted">
          <h2>Look Up Data / Downloads</h2>
          <p>
            Preserves CDC's existing public data-download capability. Not part of this prototype —
            in a real deployment this links to the existing VAERS data tools unchanged.
          </p>
        </div>
        <div className="tile tile--muted">
          <h2>Provide Follow-up Information</h2>
          <p>
            The existing post-submission upload tool stays in place for documents that surface
            after a report is filed. Not part of this prototype — this build focuses on the new
            reporting flow, per the design doc's scope.
          </p>
        </div>
      </section>
    </div>
  );
}
