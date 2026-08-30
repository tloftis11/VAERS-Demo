import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  getApplicableSteps,
  isStepUnlocked,
  nextStep,
  prevStep,
  STEP_IDS,
  type StepId,
} from "../../../../shared/src/branchingRules";
import {
  getReport,
  patchReport,
  submitReport,
  type ClientReport,
  type ValidationFinding,
} from "../../api/client";
import {
  applyOptimisticUpdate,
  branchingStateFromReport,
  firstIncompleteStep,
  mergeServerUpdate,
} from "../../reportProgress";
import { StepIndicator } from "../../components/StepIndicator";
import { FaqWidget } from "../../components/FaqWidget";
import { MilestoneBanner } from "../../components/MilestoneBanner";
import { SubmitterTypeStep } from "./SubmitterTypeStep";
import { BeforeYouStartStep } from "./BeforeYouStartStep";
import { YesNoQuestionStep } from "./YesNoQuestionStep";
import { AboutYouStep } from "./AboutYouStep";
import { PatientStep } from "./PatientStep";
import { VaccineStep } from "./VaccineStep";
import { AdverseEventStep } from "./AdverseEventStep";
import { ErrorDetailStep } from "./ErrorDetailStep";
import { DocumentsStep } from "./DocumentsStep";
import { ReviewStep } from "./ReviewStep";

/** Only administration-error and adverse-event-occurred (both HCP-only)
 * ever cause the wizard to jump past a whole section, and both only take
 * effect right after "vaccine" (see getApplicableSteps) — so that's the one
 * transition worth explaining. */
function skipNoticeForVaccineExit(state: {
  submitterType: "public" | "hcp" | null;
  administrationError: boolean | null;
  adverseEventOccurred: boolean | null;
}): string | null {
  if (state.submitterType !== "hcp") return null;
  const skippedError = state.administrationError !== true;
  const skippedAdverse = state.adverseEventOccurred === false;
  if (skippedError && skippedAdverse) {
    return "Skipping the adverse-event and administration-error sections — you told us neither applied to this report.";
  }
  if (skippedError) {
    return "Skipping administration-error details — you told us this was an adverse event only.";
  }
  if (skippedAdverse) {
    return "Skipping adverse-event details — you told us this was an administration error only, not a health event.";
  }
  return null;
}

export function ReportWizard() {
  const { reportId, step: stepParam } = useParams<{ reportId: string; step: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ClientReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);
  // Which submitter-type card the user clicked (Patient vs. Caregiver vs.
  // HCP) — ephemeral, never sent to the server, just lets the About-You
  // step avoid re-asking a question the card already answered.
  const [submitterCard, setSubmitterCard] = useState<"patient" | "caregiver" | "hcp" | null>(null);
  // Set right when a branching decision causes the very next step to skip
  // over a whole section, so the jump reads as deliberate rather than a
  // glitch — cleared on any other navigation.
  const [skipNotice, setSkipNotice] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    if (!reportId) return;
    setLoading(true);
    getReport(reportId).then((r) => {
      setReport(r);
      setLoading(false);
    });
  }, [reportId]);

  useEffect(() => {
    if (saveStatus !== "saved") return;
    const timer = setTimeout(() => setSaveStatus("idle"), 2500);
    return () => clearTimeout(timer);
  }, [saveStatus]);

  if (!reportId) return <Navigate to="/report" replace />;
  if (loading || !report) {
    return (
      <div className="page">
        <p>Loading…</p>
      </div>
    );
  }
  if (report.status === "submitted") {
    return <Navigate to={`/report/${reportId}/confirmation`} replace />;
  }

  const step = STEP_IDS.includes(stepParam as StepId) ? (stepParam as StepId) : null;
  const state = branchingStateFromReport(report);
  const steps = getApplicableSteps(state);

  if (!step || !steps.includes(step) || !isStepUnlocked(step, state)) {
    return <Navigate to={`/report/${reportId}/${firstIncompleteStep(report)}`} replace />;
  }
  // Narrow once into a stable, non-null binding: closures below can't see the
  // guard above's narrowing of `step`, since TS can't prove they only run
  // after this render's guard has passed.
  const currentStep: StepId = step;

  function goTo(target: StepId | null) {
    if (target) navigate(`/report/${reportId}/${target}`);
  }

  // Navigates on the client-validated data immediately instead of waiting on
  // the PATCH round-trip first — the round-trip still happens, just in the
  // background, reconciling `report` when it resolves. Every field the
  // branching/next-step logic reads (submitterType, administrationError,
  // adverseEventOccurred) is already known here, so there's nothing the
  // server response could tell us that changes where we navigate to.
  async function handleNext(data: Record<string, unknown>) {
    const optimisticReport = applyOptimisticUpdate(report!, currentStep, data);
    setReport(optimisticReport);
    setSaveError(false);
    const nextState = branchingStateFromReport(optimisticReport);
    setSkipNotice(currentStep === "vaccine" ? skipNoticeForVaccineExit(nextState) : null);
    goTo(nextStep(currentStep, nextState));

    setSaveStatus("saving");
    patchReport(reportId!, currentStep, data)
      .then((server) => {
        setReport((prev) => (prev ? mergeServerUpdate(prev, currentStep, server) : server));
        setSaveStatus("saved");
      })
      .catch((err) => {
        console.error("Failed to save step", currentStep, err);
        setSaveError(true);
        setSaveStatus("idle");
      });
  }

  async function handleSelectAndAdvance(data: Record<string, unknown>) {
    await handleNext(data);
  }

  function handleBack() {
    setSkipNotice(null);
    goTo(prevStep(currentStep, state));
  }

  async function handleSubmitReport() {
    try {
      await submitReport(reportId!);
      navigate(`/report/${reportId}/confirmation`);
    } catch (err) {
      const e = err as Error & { incompleteSteps?: StepId[]; findings?: ValidationFinding[] };
      if (e.incompleteSteps || e.findings) {
        return { incompleteSteps: e.incompleteSteps, findings: e.findings };
      }
      throw err;
    }
  }

  let stepContent: React.ReactNode = null;
  switch (currentStep) {
    case "submitter-type":
      stepContent = (
        <SubmitterTypeStep
          value={report.submitterType}
          onSelect={(v, card) => {
            setSubmitterCard(card);
            return handleSelectAndAdvance({ submitterType: v });
          }}
        />
      );
      break;
    case "before-you-start":
      stepContent = <BeforeYouStartStep onNext={() => handleNext({})} onBack={handleBack} />;
      break;
    case "administration-error":
      stepContent = (
        <YesNoQuestionStep
          title="Was there a vaccine administration error?"
          description="For example: wrong dose, wrong vaccine, or wrong route — regardless of whether it caused a health problem. Answer no if the vaccine was given correctly."
          value={report.administrationError}
          onSelect={(v) => handleSelectAndAdvance({ administrationError: v })}
          onBack={handleBack}
        />
      );
      break;
    case "adverse-event-occurred":
      stepContent = (
        <YesNoQuestionStep
          title="Did the patient have an adverse event?"
          description="An unexpected health problem after vaccination. This can be true whether or not there was also an administration error."
          value={report.adverseEventOccurred}
          onSelect={(v) => handleSelectAndAdvance({ adverseEventOccurred: v })}
          onBack={handleBack}
        />
      );
      break;
    case "about-you":
      stepContent = (
        <AboutYouStep
          submitterType={report.submitterType!}
          initialData={report.aboutYou}
          relationshipHint={submitterCard}
          onNext={handleNext}
          onBack={handleBack}
        />
      );
      break;
    case "patient":
      stepContent = (
        <PatientStep
          submitterType={report.submitterType!}
          isSelfReport={report.aboutYou?.relationship === "self"}
          initialData={report.patient}
          onNext={handleNext}
          onBack={handleBack}
          onSwitchSubmitterType={() => goTo("submitter-type")}
        />
      );
      break;
    case "vaccine":
      stepContent = (
        <VaccineStep
          submitterType={report.submitterType!}
          initialData={report.vaccine}
          patientDateOfBirth={report.patient?.patientDateOfBirth || undefined}
          onNext={handleNext}
          onBack={handleBack}
        />
      );
      break;
    case "adverse-event":
      stepContent = (
        <AdverseEventStep
          submitterType={report.submitterType!}
          initialData={report.adverseEvent}
          vaccineAdministrationDate={report.vaccine?.administrationDate}
          onNext={handleNext}
          onBack={handleBack}
        />
      );
      break;
    case "error-detail":
      stepContent = (
        <ErrorDetailStep
          initialData={report.errorDetail}
          vaccineAdministrationDate={report.vaccine?.administrationDate}
          onNext={handleNext}
          onBack={handleBack}
        />
      );
      break;
    case "documents":
      stepContent = (
        <DocumentsStep
          reportId={reportId}
          submitterType={report.submitterType!}
          initialSupplementalNotes={report.documents.supplementalNotes}
          initialAttachments={report.attachments}
          onNext={handleNext}
          onBack={handleBack}
        />
      );
      break;
    case "review":
      stepContent = (
        <ReviewStep
          report={report}
          onSubmit={handleSubmitReport}
          onBack={handleBack}
          onGoToStep={(s) => goTo(s)}
        />
      );
      break;
  }

  const crossedHalfway = steps.indexOf(currentStep) / steps.length >= 0.5;

  return (
    // Keyed by reportId: React Router doesn't remount a component just
    // because a route param changes, so without this, starting a new report
    // via in-app navigation (no full page reload) reuses the same step
    // component instances — and useStepForm's internal values/errors state
    // — from whatever report was previously open, leaking stale data
    // (including old validation errors) into the new one.
    <div className="page page--wizard" key={reportId}>
      <div className="wizard-header">
        <StepIndicator steps={steps} currentStep={currentStep} />
        {saveStatus !== "idle" && (
          <span className={`autosave-indicator${saveStatus === "saved" ? " autosave-indicator--saved" : ""}`} role="status">
            {saveStatus === "saving" ? "Saving…" : "✓ Saved"}
          </span>
        )}
      </div>
      {saveError && (
        <p role="alert" className="notice notice--warning">
          We had trouble saving your last answer — please check your connection. Your progress so far
          will be double-checked before you submit.
        </p>
      )}
      {crossedHalfway && <MilestoneBanner />}
      {skipNotice && (
        <p role="status" className="notice notice--info">
          {skipNotice}
        </p>
      )}
      {stepContent}
      <FaqWidget step={currentStep} />
    </div>
  );
}
