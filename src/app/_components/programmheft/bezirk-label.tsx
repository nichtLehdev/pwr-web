import { getDistrictColor } from "@/lib/district-color";

export type BezirkRef = { number: number; shortName?: string | null } | null;

/**
 * Bezirksmarke. `full`: „Bezirk 02 · Name“ bzw. „Bezirksübergreifend“;
 * `short`: nur „Bezirk 2“, entfällt ohne Bezirk.
 */
export function BezirkLabel({
  bezirk,
  variant = "full",
}: {
  bezirk: BezirkRef;
  variant?: "full" | "short";
}) {
  if (!bezirk) {
    return variant === "full" ? <span>Bezirksübergreifend</span> : null;
  }

  const marker = (
    <span
      aria-hidden
      className="h-2.5 w-2.5 shrink-0"
      style={{ backgroundColor: getDistrictColor(bezirk.number) }}
    />
  );

  if (variant === "short") {
    return (
      <span className="inline-flex items-center gap-1.5">
        {marker}
        Bezirk {bezirk.number}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {marker}
      <span>
        Bezirk {String(bezirk.number).padStart(2, "0")}
        {bezirk.shortName ? ` · ${bezirk.shortName}` : ""}
      </span>
    </span>
  );
}
