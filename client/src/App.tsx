import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import { FeedbackButton } from "./components/FeedbackButton";
import { Landing } from "./pages/Landing";
import { LanguageProvider } from "./i18n/LanguageContext";

// Route-level code splitting: Landing (the most common first paint) stays
// eager, everything else loads on demand. Without this, every route's full
// dependency graph — all 8 wizard step components, their shared schemas,
// the FAQ/survey/mascot components — was being pulled into one eager import
// chain in this file, so even landing on "/" made the dev server transform
// (and a production load fetch) code for pages the visitor hadn't asked for
// yet.
const Faq = lazy(() => import("./pages/Faq").then((m) => ({ default: m.Faq })));
const About = lazy(() => import("./pages/About").then((m) => ({ default: m.About })));
const Accessibility = lazy(() =>
  import("./pages/Accessibility").then((m) => ({ default: m.Accessibility }))
);
const FollowUp = lazy(() => import("./pages/FollowUp").then((m) => ({ default: m.FollowUp })));
const ReportEntry = lazy(() =>
  import("./pages/report/ReportEntry").then((m) => ({ default: m.ReportEntry }))
);
const ReportWizard = lazy(() =>
  import("./pages/report/ReportWizard").then((m) => ({ default: m.ReportWizard }))
);
const Confirmation = lazy(() =>
  import("./pages/report/Confirmation").then((m) => ({ default: m.Confirmation }))
);
const AdminPage = lazy(() =>
  import("./pages/admin/AdminPage").then((m) => ({ default: m.AdminPage }))
);

export function App() {
  return (
    <LanguageProvider>
      <NavBar />
      <main id="main-content">
        <Suspense fallback={<div className="page">Loading…</div>}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/about" element={<About />} />
            <Route path="/accessibility" element={<Accessibility />} />
            <Route path="/follow-up" element={<FollowUp />} />
            <Route path="/report" element={<ReportEntry />} />
            <Route path="/report/:reportId/confirmation" element={<Confirmation />} />
            <Route path="/report/:reportId/:step" element={<ReportWizard />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </Suspense>
      </main>
      {/* Persistent on every page, including mid-wizard — a small button doesn't
          compete for attention the way the old timed auto-popup did. */}
      <FeedbackButton />
    </LanguageProvider>
  );
}
