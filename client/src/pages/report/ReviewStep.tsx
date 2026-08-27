import { useMemo, useRef, useState } from "react";
import { STEP_LABELS, type StepId } from "../../../../shared/src/branchingRules";
import { checkCrossFieldRules, type ValidationFinding } from "../../../../shared/src/validationRules";
import { missingRequiredSteps } from "../../reportProgress";
import type { ClientReport } from "../../api/client";
import { ReportSummarySection } from "../../components/ReportSummary";
import { aboutYouFieldSpecs } from "./AboutYouStep";
import { PATIENT_FIELD_SPECS } from "./PatientStep";
import { vaccineFieldSpecs } from "./VaccineStep";
import { adverseEventFieldSpecs } from "./AdverseEventStep";
import { ERROR_DETAIL_FIELD_SPECS } from "./ErrorDetailStep";

interface ReviewStepProps {
  report: ClientReport;
  onSubmit: () => Promise<{ incompleteSteps?: StepId[]; findings?: ValidationFinding[] } | void>;
  onBack: () => void;
  onGoToStep: (step: StepId) => void;
}

export function ReviewStep({ report, onSubmit, onBack, onGoToStep }: ReviewStepProps) {
  const [incompleteSteps, setIncompleteSteps] = useState<StepId[]>([]);
  const [findings, setFindings] = useState<ValidationFinding[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [certified, setCertified] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const isHcp = report.submitterType === "hcp";

  // VAL-001/003: computed on every render so the checklist below is
  // proactive — it reflects what a submit attempt *would* find, before the
  // user ever clicks "Submit report".
  const proactiveMissingSteps = useMemo(() => missingRequiredSteps(report), [report]);
  const proactiveFindings = useMemo(
    () =>
      checkCrossFieldRules({
        vaccine: report.vaccine ? { administrationDate: report.vaccine.administrationDate } : null,
        adverseEvent: report.adverseEvent ? { onsetDate: report.adverseEvent.onsetDate } : null,
        errorDetail: report.errorDetail
          ? { errorDiscoveredDate: report.errorDetail.errorDiscoveredDate }
          : null,
      }),
    [report]
  );

  const displayedMissingSteps = incompleteSteps.length > 0 ? incompleteSteps : proactiveMissingSteps;
  const displayedFindings = findings.length > 0 ? findings : proactiveFindings;
  const hasBlockingIssues = displayedMissingSteps.length > 0 || displayedFindings.length > 0;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await onSubmit();
      if (result?.incompleteSteps?.length || result?.findings?.length) {
        setIncompleteSteps(result.incompleteSteps ?? []);
        setFindings(result.findings ?? []);
        // VAL-002: on a blocked submit, move focus to the checklist so
        // assistive tech announces it immediately rather than leaving
        // focus stranded on the (still-present) Submit button.
        alertRef.current?.focus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong submitting your report.");
      alertRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="step-form">
      <h1>Review & submit</h1>
      <p>Please review your report before submitting. You can go back to fix anything.</p>

      {hasBlockingIssues && (
        <div className="review-error" role="alert" tabIndex={-1} ref={alertRef}>
          {displayedMissingSteps.length > 0 && (
            <>
              <p>Please complete these sections before submitting:</p>
              <ul>
                {displayedMissingSteps.map((step) => (
                  <li key={step}>
                    <button type="button" className="button button--text" onClick={() => onGoToStep(step)}>
                      {STEP_LABELS[step]}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {displayedFindings.length > 0 && (
            <>
              <p>Please fix the following before submitting:</p>
              <ul>
                {displayedFindings.map((finding, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className="button button--text"
                      onClick={() => onGoToStep(finding.step)}
                    >
                      {finding.message}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="field__error">
          {error}
        </p>
      )}

      <ReportSummarySection
        title="About you"
        fields={aboutYouFieldSpecs(report.submitterType ?? "public")}
        values={report.aboutYou}
      />
      <ReportSummarySection title="About the patient" fields={PATIENT_FIELD_SPECS} values={report.patient} />
      <ReportSummarySection
        title="Vaccine information"
        fields={vaccineFieldSpecs(isHcp)}
        values={report.vaccine}
      />
      <ReportSummarySection
        title="What happened"
        fields={adverseEventFieldSpecs(isHcp)}
        values={report.adverseEvent}
      />
      <ReportSummarySection
        title="Administration error details"
        fields={ERROR_DETAIL_FIELD_SPECS}
        values={report.errorDetail}
      />

      <div className="review-section">
        <h2>Supporting documents</h2>
        {report.attachments.length === 0 ? (
          <p>No documents attached.</p>
        ) : (
          <ul>
            {report.attachments.map((a) => (
              <li key={a.id}>{a.originalFilename}</li>
            ))}
          </ul>
        )}
        {report.documents.supplementalNotes && <p>{report.documents.supplementalNotes}</p>}
      </div>

      <label className="review-certify">
        <input type="checkbox" checked={certified} onChange={(e) => setCertified(e.target.checked)} />
        <span>I certify that the information provided is accurate to the best of my knowledge.</span>
      </label>
      <p className="review-certify__warning">
        Knowingly submitting false information is a federal crime under 18 U.S.C. § 1001.
      </p>

      <div className="step-form__actions">
        <button type="button" className="button button--text" onClick={onBack}>
          ← Back
        </button>
        <button
          type="button"
          className="button button--primary"
          onClick={handleSubmit}
          disabled={submitting || !certified}
        >
          {submitting ? "Submitting…" : "Submit report"}
        </button>
      </div>
    </div>
  );
}
