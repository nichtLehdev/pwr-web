export function DashboardFormZoneHeader({
  step,
  title,
  description,
  stepLabelPrefix = "Abschnitt",
}: {
  step: number;
  title: string;
  description: string;
  /** e.g. "Abschnitt" → "Abschnitt 03" */
  stepLabelPrefix?: string;
}) {
  const n = String(step).padStart(2, "0");
  return (
    <header className="mb-10 max-w-2xl">
      {/* Orange als Textfarbe fällt auf hellem Grund unter AA — Messing-Tinte
          trägt denselben Akzent mit ausreichendem Kontrast (5,26:1). */}
      <p className="text-primary-ink dark:text-primary semi-condensed text-[11px] font-semibold tracking-[0.22em] uppercase">
        {stepLabelPrefix} {n}
      </p>
      <h2 className="condensed text-ink dark:text-night-text mt-2 text-2xl font-bold tracking-tight">
        {title}
      </h2>
      <p className="text-dark dark:text-night-muted mt-2 text-sm leading-relaxed">
        {description}
      </p>
    </header>
  );
}
