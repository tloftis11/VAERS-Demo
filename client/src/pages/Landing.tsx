import { Link } from "react-router-dom";

/** Redesigned landing page, styled after the reference prototype (LAND-001). */
export function Landing() {
  return (
    <div className="page page--landing">
      <section className="hero hero--split">
        <div className="hero__copy">
          <h1>
            Report vaccine adverse events with clarity and <span className="hero__highlight">confidence</span>
          </h1>
          <p>Your contribution helps monitor vaccine safety for everyone.</p>
          <div className="hero__actions">
            <Link to="/report" className="button button--primary button--large">
              Start a Report
            </Link>
            <Link to="/about" className="button button--secondary button--large">
              Learn More
            </Link>
          </div>
        </div>
        {/* Placeholder graphic — LAND-002 requires properly licensed/submission-safe
            imagery, which isn't available here, so this is an abstract panel
            rather than a stock photo standing in for one. */}
        <div className="hero__art" aria-hidden="true">
          <ShieldIcon />
        </div>
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

function ShieldIcon() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" role="presentation">
      <rect width="200" height="200" rx="24" fill="var(--color-primary-deep)" />
      <path
        d="M100 40 L150 58 V95 C150 128 128 152 100 162 C72 152 50 128 50 95 V58 Z"
        fill="none"
        stroke="var(--color-primary-contrast)"
        strokeWidth="4"
        opacity="0.9"
      />
      <path
        d="M78 100 L94 116 L124 82"
        fill="none"
        stroke="var(--color-primary-contrast)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
