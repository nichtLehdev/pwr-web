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
      <p className="text-primary text-[11px] font-semibold tracking-[0.22em] uppercase">
        {stepLabelPrefix} {n}
      </p>
      <h2 className="text-dark dark:text-dark-text mt-2 text-2xl font-bold tracking-tight">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </header>
  );
}
