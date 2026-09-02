import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  getApplicableSteps,
  isStepUnlocked,
  nextStep,
  prevStep,
  STEP_IDS,
  STEP_LABELS,
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
  furthestCompletedStep,
  mergeServerUpdate,
} from "../../reportProgress";
import { getDraftToken } from "../../draftAuth";
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
  // Set when the reporter jumps to an already-completed step via the step
  // indicator (rather than clicking "← Back" through everything in
  // between) — the next successful save from there returns here instead of
  // just advancing one step forward, so editing an earlier answer doesn't
  // force re-clicking through every step back to where they actually were.
  const [returnToStep, setReturnToStep] = useState<StepId | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!reportId) return;
    setLoading(true);
    getReport(reportId, getDraftToken(reportId))
      .then((r) => {
        setReport(r);
        setLoading(false);
      })
      .catch((err) => {
        // Wrong/missing token for someone else's still-in-progress draft —
        // this browser never had (or has lost) legitimate access to it.
        if ((err as { status?: number }).status === 401) {
          setAccessDenied(true);
        }
        setLoading(false);
      });
  }, [reportId]);

  useEffect(() => {
    if (saveStatus !== "saved") return;
    const timer = setTimeout(() => setSaveStatus("idle"), 2500);
    return () => clearTimeout(timer);
  }, [saveStatus]);

  if (!reportId) return <Navigate to="/report" replace />;
  if (accessDenied) {
    return (
      <div className="page">
        <p>
          This report can't be accessed from this browser/device. If it's yours, use the link in your
          confirmation email or the follow-up lookup instead.
        </p>
      </div>
    );
  }
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

  // Draft saving is authoritative: the PATCH must actually succeed before
  // the route changes, so a failed save never leaves the reporter thinking
  // their answer was recorded when it wasn't. `onNext` callers (via
  // ConversationalStep's handleReviewContinue) already await this and
  // disable their own "Continue" control while it's pending, show the
  // thrown error, and leave the entered data in place for a retry — this
  // just has to actually reject on failure instead of resolving instantly
  // and navigating on optimistic data regardless of what the server says.
  async function handleNext(data: Record<string, unknown>) {
    setSaveError(false);
    setSaveStatus("saving");
    try {
      const server = await patchReport(reportId!, currentStep, data, getDraftToken(reportId!));
      const optimisticReport = applyOptimisticUpdate(report!, currentStep, data);
      const merged = mergeServerUpdate(optimisticReport, currentStep, server);
      setReport(merged);
      setSaveStatus("saved");
      const nextState = branchingStateFromReport(merged);
      setSkipNotice(currentStep === "vaccine" ? skipNoticeForVaccineExit(nextState) : null);
      if (returnToStep) {
        const target = returnToStep;
        setReturnToStep(null);
        goTo(target);
      } else {
        goTo(nextStep(currentStep, nextState));
      }
    } catch (err) {
      console.error("Failed to save step", currentStep, err);
      setSaveError(true);
      setSaveStatus("idle");
      throw err;
    }
  }

  async function handleSelectAndAdvance(data: Record<string, unknown>) {
    await handleNext(data);
  }

  // Jump straight to an already-completed step (from the step indicator)
  // instead of clicking "← Back"/"Next" through every step in between.
  // Direction changes what happens after: jumping *back* to review/fix an
  // earlier answer is a detour — the next successful save from there
  // returns here. Jumping *forward* to a step already completed (e.g.
  // after going back a few steps and now wanting to skip ahead again)
  // isn't a detour at all — it's resuming the normal forward flow, so
  // continuing from there should keep going forward as usual, not snap
  // back to the step being left now.
  function handleStepClick(target: StepId) {
    if (target === currentStep) return;
    setSkipNotice(null);
    const isBackward = steps.indexOf(target) < steps.indexOf(currentStep);
    setReturnToStep(isBackward ? currentStep : null);
    goTo(target);
  }

  function handleBack() {
    setSkipNotice(null);
    // A plain Back click is normal forward/backward navigation, not a
    // detour — don't let a stale returnToStep redirect a later save
    // somewhere the reporter no longer expects.
    setReturnToStep(null);
    goTo(prevStep(currentStep, state));
  }

  async function handleSubmitReport() {
    try {
      await submitReport(reportId!, getDraftToken(reportId!));
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
          isSelfReport={report.aboutYou?.relationship === "self"}
          initialData={report.adverseEvent}
          vaccineAdministrationDate={report.vaccine?.administrationDate}
          onNext={handleNext}
          onBack={handleBack}
          onSwitchSubmitterType={() => goTo("submitter-type")}
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
          onGoToStep={handleStepClick}
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
        <StepIndicator
          steps={steps}
          currentStep={currentStep}
          furthestCompletedStep={furthestCompletedStep(report)}
          onStepClick={handleStepClick}
        />
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
      {returnToStep && (
        <p role="status" className="notice notice--info">
          Editing "{STEP_LABELS[currentStep]}" — you'll return to "{STEP_LABELS[returnToStep]}" once you continue.
        </p>
      )}
      {stepContent}
      <FaqWidget step={currentStep} />
    </div>
  );
}
