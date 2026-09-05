import { useMemo, useRef, useState } from "react";
import { STEP_LABELS, type StepId } from "../../../../shared/src/branchingRules";
import { checkCrossFieldRules, type ValidationFinding } from "../../../../shared/src/validationRules";
import { missingRequiredSteps } from "../../reportProgress";
import type { ClientReport } from "../../api/client";
import { ReportSummarySection } from "../../components/ReportSummary";
import { aboutYouFieldSpecs } from "./AboutYouStep";
import { patientFieldSpecs } from "./PatientStep";
import { vaccineFieldSpecs } from "./VaccineStep";
import { adverseEventFieldSpecs } from "./AdverseEventStep";
import { ERROR_DETAIL_FIELD_SPECS } from "./ErrorDetailStep";
import { useLanguage } from "../../i18n/LanguageContext";

interface ReviewStepProps {
  report: ClientReport;
  onSubmit: () => Promise<{ incompleteSteps?: StepId[]; findings?: ValidationFinding[] } | void>;
  onBack: () => void;
  onGoToStep: (step: StepId) => void;
}

export function ReviewStep({ report, onSubmit, onBack, onGoToStep }: ReviewStepProps) {
  const { t } = useLanguage();
  const [incompleteSteps, setIncompleteSteps] = useState<StepId[]>([]);
  const [findings, setFindings] = useState<ValidationFinding[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [certified, setCertified] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const isHcp = report.submitterType === "hcp";
  const isSelfReport = report.aboutYou?.relationship === "self";

  // VAL-001/003: computed on every render so the checklist below is
  // proactive — it reflects what a submit attempt *would* find, before the
  // user ever clicks "Submit report".
  const proactiveMissingSteps = useMemo(() => missingRequiredSteps(report), [report]);
  const proactiveFindings = useMemo(
    () =>
      checkCrossFieldRules({
        submitterType: report.submitterType,
        administrationError: report.administrationError,
        adverseEventOccurred: report.adverseEventOccurred,
        vaccine: report.vaccine ? { administrationDate: report.vaccine.administrationDate } : null,
        patient: report.patient ? { dateOfBirth: report.patient.patientDateOfBirth } : null,
        adverseEvent: report.adverseEvent
          ? {
              onsetDate: report.adverseEvent.onsetDate,
              dateOfDeath: report.adverseEvent.dateOfDeath,
              outcomes: report.adverseEvent.outcomes,
              hospitalizationDays: report.adverseEvent.hospitalizationDays,
            }
          : null,
        errorDetail: report.errorDetail
          ? { errorDiscoveredDate: report.errorDetail.errorDiscoveredDate }
          : null,
        aboutYou: report.aboutYou ? { relationship: report.aboutYou.relationship } : null,
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
              <div className="review-findings">
                {displayedFindings.map((finding, i) => (
                  <div className="review-finding" key={i}>
                    <p className="review-finding__message">{finding.message}</p>
                    <button
                      type="button"
                      className="button button--secondary"
                      onClick={() => onGoToStep(finding.step)}
                    >
                      {finding.actionLabel ?? "Go fix this"} →
                    </button>
                  </div>
                ))}
              </div>
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
        fields={aboutYouFieldSpecs(report.submitterType ?? "public", null, true, {
          city: report.aboutYou?.mailingCity ?? "",
          state: report.aboutYou?.mailingState ?? "",
          zip: report.aboutYou?.mailingZip ?? "",
        })}
        values={report.aboutYou}
      />
      <ReportSummarySection
        title="About the patient"
        fields={patientFieldSpecs(
          undefined,
          undefined,
          report.patient?.patientRaceOther,
          {
            city: report.patient?.patientCity ?? "",
            state: report.patient?.patientState ?? "",
            county: report.patient?.patientCounty ?? "",
            zip: report.patient?.patientZip ?? "",
          },
          isSelfReport
        )}
        values={report.patient}
      />
      <ReportSummarySection
        title="Vaccine information"
        fields={vaccineFieldSpecs(
          isHcp,
          undefined,
          report.vaccine?.vaccineType,
          report.vaccine?.route,
          report.vaccine?.bodySiteOther,
          {
            city: report.vaccine?.facilityCity ?? "",
            state: report.vaccine?.facilityState ?? "",
            zip: report.vaccine?.facilityZip ?? "",
          }
        )}
        values={report.vaccine}
      />
      {/* Mirrors getApplicableSteps' own gating exactly (branchingRules.ts):
          a public report is always adverse-event-shaped; an HCP report
          only shows each section while its controlling question is
          answered accordingly. `values` being non-null is *not* enough on
          its own to gate this — the server clears each record the moment
          its answer flips to "No", but this is a second, independent guard
          against a stale record (e.g. from before that fix existed)
          surfacing under a branch that's no longer selected. */}
      {(!isHcp || report.adverseEventOccurred !== false) && (
        <ReportSummarySection
          title="What happened"
          fields={adverseEventFieldSpecs(isHcp, isSelfReport, report.adverseEvent?.symptomsOther)}
          values={report.adverseEvent}
        />
      )}
      {isHcp && report.administrationError === true && (
        <ReportSummarySection
          title="Administration error details"
          fields={ERROR_DETAIL_FIELD_SPECS}
          values={report.errorDetail}
        />
      )}

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
        <span>{t("legal.certify")}</span>
      </label>
      <p className="review-certify__warning">{t("legal.falseReportWarning")}</p>

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
