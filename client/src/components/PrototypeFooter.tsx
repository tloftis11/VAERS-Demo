import { useLanguage } from "../i18n/LanguageContext";

/** Persistent, every-page disclaimer that this is a demonstration prototype
 * — not the real CDC VAERS system — and that nothing submitted here is
 * transmitted anywhere real. Rendered once in App.tsx below <main>, so it
 * shows up at the bottom of every route without needing to be added
 * per-page. See the matching header banner in NavBar.tsx for the shorter,
 * higher-visibility version of the same notice. */
export function PrototypeFooter() {
  const { t } = useLanguage();

  return (
    <footer className="prototype-footer">
      <p>{t("prototype.footerNotice")}</p>
    </footer>
  );
}
