import { useLanguage } from "../i18n/LanguageContext";

export function About() {
  const { t } = useLanguage();

  return (
    <div className="page page--prose">
      <h1>About VAERS</h1>
      <div className="notice notice--warning" role="note">
        <p>{t("prototype.aboutPageNotice")}</p>
      </div>
      <p>
        The Vaccine Adverse Event Reporting System (VAERS) is the national early-warning system
        for vaccine safety in the United States. Established in 1990, it's co-managed by the
        Centers for Disease Control and Prevention (CDC) and the U.S. Food and Drug Administration
        (FDA). VAERS collects reports of adverse events — possible reactions or problems — that
        occur during or after administration of vaccines licensed in the U.S.
      </p>

      <h2>How it works</h2>
      <p>
        VAERS is a <strong>passive reporting system</strong>: it relies on patients, caregivers,
        and healthcare providers to submit reports rather than actively searching for them. That
        makes it especially good at one specific job — spotting unusual or unexpected{" "}
        <em>patterns</em> across many reports that might signal a safety issue worth a closer
        look, even though no single report on its own can establish that a vaccine caused an
        event. CDC and FDA scientists review incoming reports on an ongoing basis as part of the
        broader vaccine-safety surveillance system.
      </p>
      <p>
        Submitting a report is not the same as an admission that a vaccine or a healthcare
        provider caused or contributed to what happened — VAERS accepts every report it receives
        without prejudging the outcome.
      </p>

      <h2>Who should report</h2>
      <p>
        Anyone can submit a report — patients, parents or guardians, other caregivers, and
        healthcare providers — whether or not they're sure the vaccine was the cause. Reporting is
        voluntary for the public, but the law requires it in two cases: healthcare providers must
        report certain specified adverse events (see the VAERS Table of Reportable Events, per{" "}
        <span className="page--prose__cite">42 U.S.C. § 300aa-25</span>), and vaccine
        manufacturers must report all adverse events that come to their attention.
      </p>

      <h2>What counts as a report</h2>
      <p>
        Two kinds of reports are common: an <strong>adverse event</strong> (an unexpected health
        problem after vaccination) and a vaccine <strong>administration error</strong> with no
        resulting health problem (wrong dose, wrong vaccine, wrong route, etc.). This form asks a
        couple of quick questions up front so it only shows the fields relevant to your situation.
      </p>

      <h2>Your privacy</h2>
      <p>
        VAERS protects patient identity and keeps identifying information confidential. The HIPAA
        Privacy Rule specifically permits reporting protected health information to public health
        authorities, including CDC and FDA, for exactly this purpose (
        <span className="page--prose__cite">45 C.F.R. § 164.512(b)</span>).
      </p>

      <h2>VAERS is not a compensation program</h2>
      <p>
        Filing a VAERS report is separate from the{" "}
        <strong>National Vaccine Injury Compensation Program (VICP)</strong>, which is
        administered by the Health Resources and Services Administration (HRSA). Submitting a
        report here does not file a compensation claim — if you're seeking compensation for a
        vaccine injury, that's a separate process through VICP.
      </p>

      <h2>What happens after you submit</h2>
      <p>
        Your report becomes part of ongoing vaccine-safety surveillance. You generally won't get
        an individual response, but reports like yours are what make the early-warning system
        work.
      </p>
    </div>
  );
}
