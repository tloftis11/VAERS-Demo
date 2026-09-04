import { Link } from "react-router-dom";
import { HeroGraphic, FieldIcon } from "../components/illustrations";
import { useLanguage } from "../i18n/LanguageContext";

/** Redesigned landing page (design doc §4.2). */
export function Landing() {
  const { t } = useLanguage();

  return (
    <div className="page page--landing">
      <section className="hero">
        <div>
          <h1>{t("landing.heading")}</h1>
          <p>{t("landing.lead")}</p>
          <div className="hero__actions">
            <Link to="/report" className="button button--primary button--large">
              {t("landing.reportEvent")}
            </Link>
            <Link to="/about" className="button button--secondary button--large">
              {t("landing.learnMore")}
            </Link>
            {/* A plain text link, not a button — this is a real path (someone
                who already filed a report and has an update) but a distant
                third next to the primary "Report an Event" CTA, so it stays
                a lightweight text action rather than a third co-equal button. */}
            <Link to="/follow-up" className="hero__tertiary-action">
              {t("landing.followUp")}
            </Link>
          </div>
          <dl className="hero__stats">
            <div>
              <dt>{t("landing.stat.time")}</dt>
              <dd>{t("landing.stat.timeLabel")}</dd>
            </div>
            <div>
              <dt>{t("landing.stat.mobile")}</dt>
              <dd>{t("landing.stat.mobileLabel")}</dd>
            </div>
            <div>
              <dt>{t("landing.stat.agencies")}</dt>
              <dd>{t("landing.stat.agenciesLabel")}</dd>
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
          <h2>{t("landing.tile.faq.title")}</h2>
          <p>{t("landing.tile.faq.body")}</p>
        </Link>
        <Link to="/about" className="tile card-surface">
          <span className="icon-chip">
            <FieldIcon name="shield" size={22} />
          </span>
          <h2>{t("landing.tile.about.title")}</h2>
          <p>{t("landing.tile.about.body")}</p>
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
          <h2>{t("landing.tile.data.title")}</h2>
          <p>{t("landing.tile.data.body")}</p>
        </a>
      </section>
    </div>
  );
}
