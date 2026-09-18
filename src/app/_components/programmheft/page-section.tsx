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
  /** `foerderverein`: Fläche in Fördervereinsblau, nur wo der Förderverein spricht. */
  surface?: "paper" | "foerderverein";
  className?: string;
  /** Klassen für das Blatt, z. B. ein 12-Spalten-Raster. */
  sheetClassName?: string;
  children: ReactNode;
}

/**
 * Zweispaltiger Abschnitt ab 64rem, Kopf (4/12) neben Inhalt (8/12).
 * `side="right"` setzt den Kopf rechts; im DOM steht er immer zuerst.
 */
export function Split({
  head,
  side = "left",
  stickyHead = false,
  bodyClassName,
  children,
}: {
  head: ReactNode;
  side?: "left" | "right";
  /**
   * Kopf läuft bei langen Inhalten mit; nur setzen, wo der Inhalt höher als
   * das Fenster ist. `lg:self-start` ist nötig, eine gestreckte Zelle klebt nicht.
   */
  stickyHead?: boolean;
  /** Abstand und Rhythmus des Inhalts, z. B. `mt-8` für die mobile Stapelung. */
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-10">
      <div
        // Ein `grid-column`-Wert statt `col-span-4 col-start-9`: `col-span`
        // setzt den Start zurück, das Ergebnis hinge an der Klassenreihenfolge.
        className={cn(
          side === "left"
            ? "lg:col-span-4"
            : "lg:col-[9/span_4] lg:row-start-1",
          stickyHead && "sticky-below-nav lg:sticky lg:self-start",
        )}
      >
        {head}
      </div>
      <div
        className={cn(
          side === "left"
            ? "lg:col-span-8"
            : "lg:col-[1/span_8] lg:row-start-1",
          bodyClassName,
          "lg:mt-0",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Abschnitt auf Papier (Nacht: Nachtgrund) mit dem Satzspiegel `sheet`. */
export function PageSection({
  id,
  labelledBy,
  rule = false,
  spacing = "default",
  flush,
  surface = "paper",
  className,
  sheetClassName,
  children,
}: PageSectionProps) {
  const printField = surface === "foerderverein";
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
        printField
          ? "print-field bg-foerderverein text-ink"
          : "bg-paper dark:bg-night",
        rule && !printField && "border-ink dark:border-night-rule border-t-2",
        padding,
        className,
      )}
    >
      <div className={cn("sheet", sheetClassName)}>{children}</div>
    </section>
  );
}
