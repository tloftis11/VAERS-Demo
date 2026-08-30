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
          <Link to="/report" className="button button--primary nav-bar__cta">
            {t("nav.reportEvent")}
          </Link>
          <Link to="/follow-up" className="button button--secondary nav-bar__cta">
            {t("nav.followUp")}
          </Link>
          <button
            type="button"
            className="nav-bar__language"
            onClick={() => setLanguage(language === "en" ? "es" : "en")}
            aria-label={language === "en" ? "Switch to Spanish" : "Cambiar a inglés"}
          >
            {t("nav.languageToggle")}
          </button>
        </nav>
      </div>
    </header>
  );
}
