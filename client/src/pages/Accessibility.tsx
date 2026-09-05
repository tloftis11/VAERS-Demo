import { useLanguage } from "../i18n/LanguageContext";

export function Accessibility() {
  const { t } = useLanguage();

  return (
    <div className="page page--prose">
      <h1>{t("accessibility.heading")}</h1>
      <p>{t("accessibility.para1")}</p>
      <p>{t("accessibility.para2")}</p>
    </div>
  );
}
