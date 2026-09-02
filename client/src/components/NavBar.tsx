import { Link } from "react-router-dom";
import { Mascot } from "./Mascot";
import { VaersLogo } from "./VaersLogo";
import { useLanguage } from "../i18n/LanguageContext";

/** Redesigned primary navigation (design doc §4.2). */
export function NavBar() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="nav-bar">
      <div className="nav-bar__admin-row">
        <div className="nav-bar__admin-row-inner">
          <Link to="/admin" className="nav-bar__admin-link">
            Staff Portal
          </Link>
        </div>
      </div>
      <div className="nav-bar__inner">
        <Link to="/" className="nav-bar__brand" aria-label="VAERS home">
          <Mascot size={30} />
          <VaersLogo height={22} />
        </Link>
        <nav aria-label="Primary" className="nav-bar__links">
          <Link to="/faq">{t("nav.faq")}</Link>
          <Link to="/about">{t("nav.about")}</Link>
          <Link to="/accessibility">{t("nav.accessibility")}</Link>
          {/* A plain text link, not a button — reporting a new event is the
              one action this nav bar should read as a call to action;
              follow-up is a real but secondary path, and giving it equal
              pill-button weight made the header look like two co-equal
              CTAs instead of one primary action plus ordinary wayfinding. */}
          <Link to="/follow-up">{t("nav.followUp")}</Link>
          <Link to="/report" className="button button--primary nav-bar__cta">
            {t("nav.reportEvent")}
          </Link>
          <label className="nav-bar__language">
            <span className="sr-only">{t("nav.languageSelectLabel")}</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "en" | "es")}
            >
              <option value="en">{t("nav.languageEnglish")}</option>
              <option value="es">{t("nav.languageSpanish")}</option>
            </select>
          </label>
        </nav>
      </div>
    </header>
  );
}
