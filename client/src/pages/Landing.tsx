import { Link } from "react-router-dom";
import { HeroGraphic, FieldIcon } from "../components/illustrations";

/** Redesigned landing page (design doc §4.2). */
export function Landing() {
  return (
    <div className="page page--landing">
      <section className="hero">
        <div>
          <h1>Report a possible vaccine adverse event or administration error</h1>
          <p>
            VAERS (Vaccine Adverse Event Reporting System) is the national early-warning system
            for vaccine safety. Reporting takes about 10 minutes, and the form adapts to who you
            are and what happened so you're only asked what's relevant.
          </p>
          <div className="hero__actions">
            <Link to="/report" className="button button--primary button--large">
              Report an Event
            </Link>
            <Link to="/about" className="button button--secondary button--large">
              Learn More
            </Link>
          </div>
          <dl className="hero__stats">
            <div>
              <dt>~10 min</dt>
              <dd>Typical time to complete</dd>
            </div>
            <div>
              <dt>Mobile-friendly</dt>
              <dd>Works on any device</dd>
            </div>
            <div>
              <dt>CDC &amp; FDA</dt>
              <dd>Reviewed by both agencies</dd>
            </div>
          </dl>
        </div>
        <HeroGraphic className="hero__graphic" />
      </section>

      <section className="tile-grid" aria-label="Other ways to get help">
        <Link to="/faq" className="tile card-surface">
          <span className="icon-chip">
            <FieldIcon name="chat" size={22} />
          </span>
          <h2>Frequently Asked Questions</h2>
          <p>Answers to common questions about reporting, privacy, and what happens next.</p>
        </Link>
        <Link to="/about" className="tile card-surface">
          <span className="icon-chip">
            <FieldIcon name="shield" size={22} />
          </span>
          <h2>About VAERS</h2>
          <p>Background on the program, its purpose, and who should report.</p>
        </Link>
        <a
          href="https://vaers.hhs.gov/data.html"
          target="_blank"
          rel="noopener noreferrer"
          className="tile card-surface"
        >
          <span className="icon-chip">
            <FieldIcon name="clipboard" size={22} />
          </span>
          <h2>Look Up Data / Downloads</h2>
          <p>Opens the live VAERS data and download tools on vaers.hhs.gov in a new tab.</p>
        </a>
        <Link to="/follow-up" className="tile card-surface">
          <span className="icon-chip">
            <FieldIcon name="document" size={22} />
          </span>
          <h2>Provide Follow-up Information</h2>
          <p>Add documents or updates to a report you've already submitted, using your reference number.</p>
        </Link>
      </section>
    </div>
  );
}
