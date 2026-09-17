"use client";

import Image from "@tiptap/extension-image";
// `mergeAttributes` stammt aus @tiptap/core, das hier aber keine direkte
// Abhängigkeit ist — unter pnpm sind transitive Pakete nicht auflösbar.
// @tiptap/react reicht den Kern vollständig durch (`export * from
// "@tiptap/core"`), deshalb kommt alles aus einer Quelle.
import {
  mergeAttributes,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Bild im Artikel: Breite und Ausrichtung als Klassen.
 *
 * Warum Klassen und nicht `style`: Der HTML-Filter (lib/sanitize.ts) verwirft
 * Inline-CSS — `class`, `width` und `height` überleben, alles andere nicht.
 * Frei skalieren wie in Word wäre also gar nicht speicherbar. Ein festes
 * Vokabular passt ohnehin besser zum Heft: vier Breiten, drei Ausrichtungen,
 * keine krummen Zwischenwerte.
 *
 * Die Ziehgriffe fühlen sich trotzdem frei an — sie rasten beim Ziehen auf die
 * nächste Stufe ein. Gestaltet wird das Ergebnis ausschließlich in
 * `styles/article-content.css`; diese Datei erzeugt nur die Klassen.
 */

export const BILD_GROESSEN = [
  "standard",
  "schmal",
  "halb",
  "breit",
  "randlos",
] as const;
export type BildGroesse = (typeof BILD_GROESSEN)[number];

export const BILD_AUSRICHTUNGEN = ["mittig", "links", "rechts"] as const;
export type BildAusrichtung = (typeof BILD_AUSRICHTUNGEN)[number];

export const GROESSEN_BESCHRIFTUNG: Record<BildGroesse, string> = {
  standard: "Satzbreite",
  schmal: "Schmal",
  halb: "Halb",
  breit: "Breit",
  randlos: "Randlos",
};

/**
 * Anteil an der Satzbreite — dieselben Werte wie in article-content.css.
 * Sie dienen nur dem Einrasten beim Ziehen; die tatsächliche Darstellung
 * bestimmt das Stylesheet.
 */
const ANTEIL: Record<BildGroesse, number> = {
  schmal: 0.45,
  halb: 0.6,
  standard: 1,
  breit: 1.56,
  randlos: 2.28,
};

function naechsteGroesse(anteil: number): BildGroesse {
  let beste: BildGroesse = "standard";
  let abstand = Infinity;
  for (const g of BILD_GROESSEN) {
    const d = Math.abs(ANTEIL[g] - anteil);
    if (d < abstand) {
      abstand = d;
      beste = g;
    }
  }
  return beste;
}

function ausKlassen<T extends string>(
  klassen: string | null,
  erlaubt: readonly T[],
  vorgabe: T,
): T {
  if (!klassen) return vorgabe;
  const gefunden = erlaubt.find((w) =>
    klassen.split(/\s+/).includes(`bild-${w}`),
  );
  return gefunden ?? vorgabe;
}

function BildAnsicht({
  node,
  updateAttributes,
  selected,
  editor,
}: NodeViewProps) {
  const groesse = (node.attrs.groesse as BildGroesse) ?? "standard";
  const ausrichtung = (node.attrs.ausrichtung as BildAusrichtung) ?? "mittig";
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [ziehend, setZiehend] = useState(false);
  const [vorschau, setVorschau] = useState<BildGroesse | null>(null);

  const bearbeitbar = editor.isEditable;

  const ziehen = useCallback(
    (start: React.PointerEvent, seite: "links" | "rechts") => {
      if (!bearbeitbar) return;
      start.preventDefault();
      start.stopPropagation();

      // Die Satzbreite ist der Bezug fürs Einrasten, nicht das Fenster.
      const spalte =
        wrapperRef.current?.closest(".article-content")?.clientWidth ??
        wrapperRef.current?.parentElement?.clientWidth ??
        600;
      const startX = start.clientX;
      const startBreite =
        wrapperRef.current?.querySelector("img")?.clientWidth ?? spalte;

      setZiehend(true);

      const bewegen = (e: PointerEvent) => {
        const delta = (e.clientX - startX) * (seite === "rechts" ? 2 : -2);
        setVorschau(naechsteGroesse((startBreite + delta) / spalte));
      };
      const loslassen = (e: PointerEvent) => {
        const delta = (e.clientX - startX) * (seite === "rechts" ? 2 : -2);
        updateAttributes({
          groesse: naechsteGroesse((startBreite + delta) / spalte),
        });
        setZiehend(false);
        setVorschau(null);
        window.removeEventListener("pointermove", bewegen);
        window.removeEventListener("pointerup", loslassen);
      };
      window.addEventListener("pointermove", bewegen);
      window.addEventListener("pointerup", loslassen);
    },
    [bearbeitbar, updateAttributes],
  );

  const angezeigt = vorschau ?? groesse;

  const AUSRICHTUNG_TEXT: Record<BildAusrichtung, string> = {
    links: "Links",
    mittig: "Mittig",
    rechts: "Rechts",
  };

  const griff = (seite: "links" | "rechts") => (
    <span
      role="presentation"
      onPointerDown={(e) => ziehen(e, seite)}
      className={cn(
        "border-ink bg-paper dark:border-night-text dark:bg-night absolute top-1/2 h-10 w-3 -translate-y-1/2 cursor-ew-resize border-2",
        seite === "links"
          ? "left-0 -translate-x-1/2"
          : "right-0 translate-x-1/2",
      )}
    />
  );

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      as="div"
      data-groesse={angezeigt}
      data-ausrichtung={ausrichtung}
      className="relative my-6"
    >
      {/* Die Klassen stehen am <img>, damit das gespeicherte HTML genau das
          trägt, was article-content.css gestaltet — die Hülle hier ist nur
          Werkzeug im Editor und landet nie im Beitrag. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- next/image
          passt hier nicht: Die Knotenansicht muss genau das <img> zeigen, das
          später gespeichert wird, und die Maße des Bildes sind unbekannt. */}
      <img
        src={node.attrs.src as string}
        alt={(node.attrs.alt as string) ?? ""}
        className={cn(
          angezeigt !== "standard" && `bild-${angezeigt}`,
          ausrichtung !== "mittig" && `bild-${ausrichtung}`,
          selected && "outline-primary outline-2 outline-offset-2",
        )}
      />
      {bearbeitbar && (selected || ziehend) ? (
        <>
          {griff("links")}
          {griff("rechts")}
          <div
            role="group"
            aria-label="Bild: Größe und Ausrichtung"
            className="absolute top-2 left-1/2 flex -translate-x-1/2 items-stretch gap-px"
          >
            <span className="bg-ink text-paper dark:bg-night-text dark:text-night inline-flex min-h-11 items-center px-3 text-xs font-semibold">
              {GROESSEN_BESCHRIFTUNG[angezeigt]}
            </span>
            {/* Die Ausrichtung gab es bisher nur im Datenmodell und im
                Stylesheet, aber unerreichbar: Die Ziehgriffe ändern allein die
                Größe. Ohne Bedienung war der Textumfluss eine Fähigkeit, die
                niemand auslösen konnte. */}
            {BILD_AUSRICHTUNGEN.map((wahl) => (
              <button
                key={wahl}
                type="button"
                // Ohne preventDefault nimmt der Klick dem Editor den Fokus,
                // ProseMirror hebt die Knotenauswahl auf, und die Leiste
                // verschwindet, bevor onClick greift.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => updateAttributes({ ausrichtung: wahl })}
                aria-pressed={ausrichtung === wahl}
                title={`Bild ${AUSRICHTUNG_TEXT[wahl].toLowerCase()} ausrichten`}
                className={cn(
                  "inline-flex min-h-11 items-center px-3 text-xs font-semibold transition-colors",
                  ausrichtung === wahl
                    ? "on-orange bg-primary text-ink"
                    : "bg-ink text-paper dark:bg-night-text dark:text-night",
                )}
              >
                {AUSRICHTUNG_TEXT[wahl]}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </NodeViewWrapper>
  );
}

export const ArtikelBild = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      groesse: {
        default: "standard" as BildGroesse,
        parseHTML: (el: HTMLElement) =>
          ausKlassen(el.getAttribute("class"), BILD_GROESSEN, "standard"),
        // Die Klasse wird unten aus beiden Attributen zusammengesetzt; ohne
        // dieses leere renderHTML schriebe TipTap zusätzlich `groesse="…"`
        // ins Markup, was der Filter ohnehin verwürfe.
        renderHTML: () => ({}),
      },
      ausrichtung: {
        default: "mittig" as BildAusrichtung,
        parseHTML: (el: HTMLElement) =>
          ausKlassen(el.getAttribute("class"), BILD_AUSRICHTUNGEN, "mittig"),
        renderHTML: () => ({}),
      },
    };
  },

  renderHTML({ HTMLAttributes, node }) {
    const klassen = [
      node.attrs.groesse !== "standard" ? `bild-${node.attrs.groesse}` : null,
      node.attrs.ausrichtung !== "mittig"
        ? `bild-${node.attrs.ausrichtung}`
        : null,
    ].filter(Boolean);

    return [
      "img",
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        klassen.length ? { class: klassen.join(" ") } : {},
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BildAnsicht);
  },
});

export default ArtikelBild;
