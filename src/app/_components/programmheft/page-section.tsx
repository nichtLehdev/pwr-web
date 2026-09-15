import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageSectionProps {
  id?: string;
  labelledBy?: string;
  /** 2px-Tintenstrich über dem Abschnitt, vollbreit. */
  rule?: boolean;
  /** `close`: etwas knapper für den Schlussabschnitt. */
  spacing?: "default" | "close";
  /** `top`: ohne Luft oben, z. B. eine Wegliste direkt unter dem Seitenkopf. */
  flush?: "top";
  className?: string;
  /** Klassen für das Blatt, z. B. ein 12-Spalten-Raster. */
  sheetClassName?: string;
  children: ReactNode;
}

/** Abschnitt auf Papier (Nacht: Nachtgrund) mit dem Satzspiegel `sheet`. */
export function PageSection({
  id,
  labelledBy,
  rule = false,
  spacing = "default",
  flush,
  className,
  sheetClassName,
  children,
}: PageSectionProps) {
  const padding =
    flush === "top"
      ? spacing === "close"
        ? "pb-16 md:pb-20"
        : "pb-16 md:pb-24"
      : spacing === "close"
        ? "py-16 md:py-20"
        : "py-16 md:py-24";

  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        "bg-paper dark:bg-night",
        rule && "border-ink dark:border-night-rule border-t-2",
        padding,
        className,
      )}
    >
      <div className={cn("sheet", sheetClassName)}>{children}</div>
    </section>
  );
}
