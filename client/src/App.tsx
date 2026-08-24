import { Route, Routes, useLocation } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import { NavigationSurveyPrompt } from "./components/NavigationSurveyPrompt";
import { Landing } from "./pages/Landing";
import { Faq } from "./pages/Faq";
import { About } from "./pages/About";
import { Accessibility } from "./pages/Accessibility";
import { ReportEntry } from "./pages/report/ReportEntry";
import { ReportWizard } from "./pages/report/ReportWizard";
import { Confirmation } from "./pages/report/Confirmation";

export function App() {
  const location = useLocation();
  const isWizard = location.pathname.startsWith("/report/") && !location.pathname.endsWith("/confirmation");
  const isReportFlow = location.pathname === "/report" || location.pathname.startsWith("/report/");

  return (
    <>
      <NavBar variant={isReportFlow ? "flow" : "marketing"} />
      <main id="main-content">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/about" element={<About />} />
          <Route path="/accessibility" element={<Accessibility />} />
          <Route path="/report" element={<ReportEntry />} />
          <Route path="/report/:reportId/confirmation" element={<Confirmation />} />
          <Route path="/report/:reportId/:step" element={<ReportWizard />} />
        </Routes>
      </main>
      {/* Kept off the wizard so the survey prompt doesn't compete with the ≤10-minute completion target. */}
      {!isWizard && <NavigationSurveyPrompt />}
    </>
  );
}
