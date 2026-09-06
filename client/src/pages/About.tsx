import { useLanguage } from "../i18n/LanguageContext";

export function About() {
  const { t } = useLanguage();

  return (
    <div className="page page--prose">
      <h1>{t("about.heading")}</h1>
      <div className="notice notice--warning" role="note">
        <p>{t("prototype.aboutPageNotice")}</p>
      </div>
      <p>{t("about.intro")}</p>

      <h2>{t("about.howItWorksHeading")}</h2>
      <p>
        {t("about.howItWorks.pre")}
        <strong>{t("about.howItWorks.strong")}</strong>
        {t("about.howItWorks.mid")}
        <em>{t("about.howItWorks.em")}</em>
        {t("about.howItWorks.post")}
      </p>
      <p>{t("about.howItWorks.para2")}</p>

      <h2>{t("about.whoShouldReportHeading")}</h2>
      <p>
        {t("about.whoShouldReport.pre")}
        <span className="page--prose__cite">42 U.S.C. § 300aa-25</span>
        {t("about.whoShouldReport.post")}
      </p>

      <h2>{t("about.whatCountsHeading")}</h2>
      <p>
        {t("about.whatCounts.pre")}
        <strong>{t("about.whatCounts.strong1")}</strong>
        {t("about.whatCounts.mid")}
        <strong>{t("about.whatCounts.strong2")}</strong>
        {t("about.whatCounts.post")}
      </p>

      <h2>{t("about.privacyHeading")}</h2>
      <p>
        {t("about.privacy.pre")}
        <span className="page--prose__cite">45 C.F.R. § 164.512(b)</span>
        {t("about.privacy.post")}
      </p>

      <h2>{t("about.notCompensationHeading")}</h2>
      <p>
        {t("about.notCompensation.pre")}
        <strong>{t("about.notCompensation.strong")}</strong>
        {t("about.notCompensation.post")}
      </p>

      <h2>{t("about.afterSubmitHeading")}</h2>
      <p>{t("about.afterSubmit.para")}</p>
    </div>
  );
}
