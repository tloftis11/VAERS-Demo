import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import { FeedbackButton } from "./components/FeedbackButton";
import { PrototypeFooter } from "./components/PrototypeFooter";
import { Landing } from "./pages/Landing";
import { LanguageProvider } from "./i18n/LanguageContext";
import { ReportEntry } from "./pages/report/ReportEntry";
import { ReportWizard } from "./pages/report/ReportWizard";

// Route-level code splitting: Landing and the report flow (Landing's most
// common next click, by far) stay eager; everything else loads on demand.
// ReportEntry/ReportWizard used to be lazy too, but that meant clicking
// "Start a Report" fetched their chunks only after the click, stacked in
// front of the create-report API call instead of already being loaded —
// extra latency on exactly the path most visitors take, for a page that
// makes up a small fraction of the total bundle anyway.
const Faq = lazy(() => import("./pages/Faq").then((m) => ({ default: m.Faq })));
const About = lazy(() => import("./pages/About").then((m) => ({ default: m.About })));
const Accessibility = lazy(() =>
  import("./pages/Accessibility").then((m) => ({ default: m.Accessibility }))
);
const FollowUp = lazy(() => import("./pages/FollowUp").then((m) => ({ default: m.FollowUp })));
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
      <PrototypeFooter />
      {/* Persistent on every page, including mid-wizard — a small button doesn't
          compete for attention the way the old timed auto-popup did. */}
      <FeedbackButton />
    </LanguageProvider>
  );
}
