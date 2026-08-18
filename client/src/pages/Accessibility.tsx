export function Accessibility() {
  return (
    <div className="page page--prose">
      <h1>Accessibility Statement</h1>
      <p>
        This prototype targets WCAG 2.0 Level A and AA success criteria (design doc §6.6):
        semantic form structure, labeled fields, visible focus states, keyboard-only operability,
        and error messages that are programmatically associated with their fields.
      </p>
      <p>
        In a real deployment, this page would also include a contact path for reporting
        accessibility issues and a link to the current Accessibility Conformance Report
        (ACR/VPAT).
      </p>
    </div>
  );
}
