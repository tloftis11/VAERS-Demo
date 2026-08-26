import { Route, Routes } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import { FeedbackButton } from "./components/FeedbackButton";
import { Landing } from "./pages/Landing";
import { Faq } from "./pages/Faq";
import { About } from "./pages/About";
import { Accessibility } from "./pages/Accessibility";
import { FollowUp } from "./pages/FollowUp";
import { ReportEntry } from "./pages/report/ReportEntry";
import { ReportWizard } from "./pages/report/ReportWizard";
import { Confirmation } from "./pages/report/Confirmation";

export function App() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/about" element={<About />} />
          <Route path="/accessibility" element={<Accessibility />} />
          <Route path="/follow-up" element={<FollowUp />} />
          <Route path="/report" element={<ReportEntry />} />
          <Route path="/report/:reportId/confirmation" element={<Confirmation />} />
          <Route path="/report/:reportId/:step" element={<ReportWizard />} />
        </Routes>
      </main>
      {/* Persistent on every page, including mid-wizard — a small button doesn't
          compete for attention the way the old timed auto-popup did. */}
      <FeedbackButton />
    </>
  );
}
