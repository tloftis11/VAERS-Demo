import { formatValue, type ConversationalFieldSpec } from "./ConversationalStep";

interface ReportSummarySectionProps {
  title: string;
  fields: ConversationalFieldSpec[];
  values: object | null;
}

/**
 * Read-only dt/dd rendering of a step's answers, reusing each step's own
 * field specs (label, options) so values show the same human-readable text
 * as the live wizard instead of raw camelCase keys and enum values.
 */
export function ReportSummarySection({ title, fields, values }: ReportSummarySectionProps) {
  if (!values) return null;
  const record = values as Record<string, unknown>;
  const rows = fields
    .map((field) => ({ field, display: formatValue(field, record[field.id]) }))
    .filter((row) => row.display !== "");
  if (rows.length === 0) return null;
  return (
    <div className="review-section">
      <h2>{title}</h2>
      <dl>
        {rows.map(({ field, display }) => (
          <div key={field.id} className="review-section__row">
            <dt>{field.label}</dt>
            <dd>{display}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
