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
  /**
   * `foerderverein`: volle Druckfläche in Fördervereinsblau, nur wo der
   * Förderverein spricht. Darauf steht alles in Tinte, auch im Nachtdruck
   * (`.print-field`); ein Strich darüber entfällt.
   */
  surface?: "paper" | "foerderverein";
  className?: string;
  /** Klassen für das Blatt, z. B. ein 12-Spalten-Raster. */
  sheetClassName?: string;
  children: ReactNode;
}

/**
 * Zweispaltiger Abschnitt ab 64rem: Kopf und Einleitung (4/12) neben dem
 * Inhalt (8/12). Mit `side="right"` wechselt der Kopf die Seite, so dass
 * aufeinanderfolgende Abschnitte wie linke und rechte Heftseiten alternieren.
 * Im DOM steht der Kopf immer zuerst; mobil steht er über dem Inhalt.
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
   * Lässt den Kopf mitlaufen, während der Inhalt daneben vorbeizieht — damit
   * bei langen Listen nicht verlorengeht, worunter man gerade liest.
   *
   * Ausdrücklich pro Abschnitt zu setzen und kein Grundverhalten: Sticky
   * greift erst, wenn die Inhaltsspalte höher ist als das Fenster. Von 36
   * Abschnitten im Heft trifft das auf drei zu; überall sonst bewegt sich
   * nichts und die Regel liefe wirkungslos mit.
   *
   * Gegen den Leerraum in der Kopfspalte hilft das übrigens nicht — die Lücke
   * bleibt gleich groß, der Kopf wandert nur darin. Dagegen hilft nur, die
   * Spalte zu füllen (siehe Auswahlchöre und Regionalposaunenwarte).
   *
   * `lg:self-start` ist die eigentliche Bedingung: Rasterzellen werden sonst
   * auf die Zeilenhöhe gestreckt, und eine gestreckte Zelle kann nicht kleben
   * — sie füllt die Zeile ja bereits aus.
   */
  stickyHead?: boolean;
  /** Abstand und Rhythmus des Inhalts, z. B. `mt-8` für die mobile Stapelung. */
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-10">
      <div
        className={cn(
          side === "left"
            ? "lg:col-span-4"
            : "lg:col-span-4 lg:col-start-9 lg:row-start-1",
          stickyHead && "sticky-below-nav lg:sticky lg:self-start",
        )}
      >
        {head}
      </div>
      <div
        className={cn(
          side === "left"
            ? "lg:col-span-8"
            : "lg:col-span-8 lg:col-start-1 lg:row-start-1",
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
