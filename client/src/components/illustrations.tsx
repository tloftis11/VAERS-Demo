/**
 * Reusable inline-SVG decoration (design doc §4.2/§4.3). All vector, all
 * themeable via CSS variables — deliberately no photography/binary assets
 * so there's nothing to license, host, or have go missing.
 */

interface PlusFieldProps {
  className?: string;
}

/** The scattered plus/cross motif used as background texture (echoes the research deck's persona pages). */
export function PlusField({ className }: PlusFieldProps) {
  const marks = [
    { x: 20, y: 30, s: 14, o: 0.5, c: "var(--color-accent)" },
    { x: 70, y: 60, s: 20, o: 0.4, c: "var(--color-primary)" },
    { x: 140, y: 25, s: 12, o: 0.5, c: "var(--color-accent)" },
    { x: 200, y: 70, s: 16, o: 0.35, c: "var(--color-primary)" },
    { x: 250, y: 20, s: 10, o: 0.5, c: "var(--color-accent)" },
    { x: 40, y: 100, s: 10, o: 0.4, c: "var(--color-primary)" },
    { x: 170, y: 110, s: 14, o: 0.4, c: "var(--color-accent)" },
    { x: 230, y: 95, s: 18, o: 0.3, c: "var(--color-primary)" },
  ];
  return (
    <svg
      className={className}
      viewBox="0 0 280 130"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      {marks.map((m, i) => (
        <path
          key={i}
          d={`M${m.x - m.s / 2} ${m.y} h${m.s} M${m.x} ${m.y - m.s / 2} v${m.s}`}
          stroke={m.c}
          strokeWidth={m.s / 4}
          strokeLinecap="round"
          opacity={m.o}
        />
      ))}
    </svg>
  );
}

/** Abstract hero graphic (vaccine vial + shield) standing in for a photo. */
export function HeroGraphic({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 320 320"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="160" cy="160" r="150" fill="var(--color-surface)" />
      <PlusField className="hero-graphic__plus-field" />
      <g transform="translate(110 70)">
        <rect x="0" y="40" width="70" height="120" rx="14" fill="var(--color-primary)" />
        <rect x="14" y="10" width="42" height="34" rx="6" fill="var(--color-primary-dark)" />
        <rect x="10" y="80" width="50" height="10" rx="5" fill="var(--color-bg)" opacity="0.85" />
        <rect x="10" y="100" width="50" height="10" rx="5" fill="var(--color-bg)" opacity="0.6" />
        <circle cx="100" cy="150" r="34" fill="var(--color-warm)" opacity="0.9" />
        <path
          d="M85 150l10 10 20-22"
          stroke="var(--color-primary-dark)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

/** Checkmark badge used on the confirmation screen. */
export function CheckBadge({ size = 72, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 72 72"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="36" cy="36" r="36" fill="var(--color-warm)" />
      <path
        d="M22 37l10 10 18-22"
        stroke="#ffffff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Small checkmark used to mark a selected card (design doc §4.4 choice cards). */
export function CheckIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.15" />
      <path
        d="M7 12.5l3 3 7-7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

const FIELD_ICON_PATHS: Record<string, string> = {
  person: "M16 16a5 5 0 100-10 5 5 0 000 10zm0 3c-5 0-10 2.5-10 6v2h20v-2c0-3.5-5-6-10-6z",
  calendar:
    "M7 4h2v3h14V4h2v4h1a1 1 0 011 1v18a1 1 0 01-1 1H6a1 1 0 01-1-1V9a1 1 0 011-1h1V4zm-1 8v14h20V12H6zm3 4h4v4H9v-4z",
  vaccine:
    "M20 6l4 4-2 2-1-1-8 8 1 1-2 2-1-1-2 2-2-2 2-2-1-1 8-8-1-1 2-2 1 1 2-2z",
  mail: "M4 6h20a1 1 0 011 1v18a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1zm0 2v.5l10 6.5 10-6.5V8H4zm20 3.2l-9.4 6.1a1 1 0 01-1.2 0L4 11.2V25h20V11.2z",
  phone:
    "M9 4h4l2 6-3 2c1.2 3 3.8 5.6 6.8 6.8l2-3 6 2v4a2 2 0 01-2 2C15 23.8 4.2 13 4.2 4a2 2 0 012-2z",
  shield:
    "M14 2l11 4v9c0 7-5 11-11 13C8 26 3 22 3 15V6l11-4z",
  clipboard:
    "M11 2h6a2 2 0 012 2h3a1 1 0 011 1v20a1 1 0 01-1 1H6a1 1 0 01-1-1V5a1 1 0 011-1h3a2 2 0 012-2zm-1 4H8v18h16V6h-2v2H10V6zm1-2v2h6V4h-6z",
  document:
    "M8 2h10l6 6v18a1 1 0 01-1 1H8a1 1 0 01-1-1V3a1 1 0 011-1zm9 1.5V8h4.5L17 3.5z",
  chat: "M4 4h20a2 2 0 012 2v14a2 2 0 01-2 2H14l-6 5v-5H4a2 2 0 01-2-2V6a2 2 0 012-2z",
  upload:
    "M14 2l7 7h-5v9h-4v-9H7l7-7zM4 22h20v4H4v-4z",
};

export type FieldIconName = keyof typeof FIELD_ICON_PATHS;

export function FieldIcon({
  name,
  size = 20,
  className,
}: {
  name: FieldIconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d={FIELD_ICON_PATHS[name]} fill="currentColor" />
    </svg>
  );
}
