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
import { branchingStateFromReport, firstIncompleteStep } from "../../reportProgress";
import { StepIndicator } from "../../components/StepIndicator";
import { FaqWidget } from "../../components/FaqWidget";
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

export function ReportWizard() {
  const { reportId, step: stepParam } = useParams<{ reportId: string; step: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ClientReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reportId) return;
    setLoading(true);
    getReport(reportId).then((r) => {
      setReport(r);
      setLoading(false);
    });
  }, [reportId]);

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

  async function handleNext(data: Record<string, unknown>) {
    const updated = await patchReport(reportId!, currentStep, data);
    setReport(updated);
    const updatedState = branchingStateFromReport(updated);
    goTo(nextStep(currentStep, updatedState));
  }

  async function handleSelectAndAdvance(data: Record<string, unknown>) {
    await handleNext(data);
  }

  function handleBack() {
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
          onSelect={(v) => handleSelectAndAdvance({ submitterType: v })}
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
          onNext={handleNext}
          onBack={handleBack}
        />
      );
      break;
    case "patient":
      stepContent = (
        <PatientStep
          submitterType={report.submitterType!}
          initialData={report.patient}
          onNext={handleNext}
          onBack={handleBack}
        />
      );
      break;
    case "vaccine":
      stepContent = (
        <VaccineStep
          submitterType={report.submitterType!}
          initialData={report.vaccine}
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
          onNext={handleNext}
          onBack={handleBack}
        />
      );
      break;
    case "error-detail":
      stepContent = (
        <ErrorDetailStep initialData={report.errorDetail} onNext={handleNext} onBack={handleBack} />
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

  return (
    <div className="page page--wizard">
      <StepIndicator steps={steps} currentStep={currentStep} />
      {stepContent}
      <FaqWidget step={currentStep} />
    </div>
  );
}
