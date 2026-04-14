"use client";

import { useTheme } from "@/app/_components/general/theme-provider";
import { cn } from "@/lib/utils";
import VexFlow, { Renderer, RendererBackends, Stave, StaveNote, TickContext } from "vexflow";
import { useCallback, useEffect, useRef } from "react";
import type { NoteValueId } from "../_lib/types";

type Props = { id: NoteValueId; className?: string };

let fontsReady: Promise<void> | null = null;
function ensureFonts(): Promise<void> {
  if (!fontsReady) fontsReady = VexFlow.loadFonts("Bravura", "Academico");
  return fontsReady;
}

export function NoteGlyph({ id, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const draw = useCallback(async () => {
    const el = ref.current;
    if (!el) return;
    try {
      await ensureFonts();
      el.innerHTML = "";
      const w = 64;
      const h = 64;
      const renderer = new Renderer(el, RendererBackends.SVG);
      renderer.resize(w, h);
      const ctx = renderer.getContext();
      const color = dark ? "#e4e6eb" : "#171717";

      const stave = new Stave(4, 8, w - 8);
      stave.setContext(ctx);
      // Keep stave hidden; we only use it for symbol positioning.
      stave.setStyle({ strokeStyle: "transparent", fillStyle: "transparent" });
      stave.setConfigForLines([
        { visible: false },
        { visible: false },
        { visible: false },
        { visible: false },
        { visible: false },
      ]);
      // Do not draw stave at all; it is only used for note positioning math.

      // VexFlow rests sit lower for the same key; give rests a higher anchor.
      const keyFor = (duration: string) => (duration.includes("r") ? "g/5" : "d/5");
      const mk = (duration: string) =>
        new StaveNote({ keys: [keyFor(duration)], duration, clef: "treble" }).setStyle({
          fillStyle: color,
          strokeStyle: color,
        });

      let note: StaveNote;
      let dotY: number | null = null;
      if (id === "whole") {
        note = mk("w");
      } else if (id === "dottedWhole") {
        note = mk("w");
        dotY = 52;
      } else if (id === "half") {
        note = mk("h");
      } else if (id === "dottedHalf") {
        note = mk("h");
        dotY = 58;
      } else if (id === "quarter") {
        note = mk("q");
      } else if (id === "eighth") {
        note = mk("8");
      } else if (id === "dottedEighth") {
        note = mk("8");
        dotY = 58;
      } else if (id === "dottedQuarter") {
        note = mk("q");
        dotY = 58;
      } else if (id === "sixteenth") {
        note = mk("16");
      } else if (id === "dottedSixteenth") {
        note = mk("16");
        dotY = 58;
      } else if (id === "thirtySecond") {
        note = mk("32");
      } else if (id === "restQuarter") {
        note = mk("qr");
      } else if (id === "restSixteenth") {
        note = mk("16r");
      } else {
        note = mk("8r");
      }

      note.setStave(stave);
      const tick = new TickContext();
      tick.addTickable(note).preFormat();
      note.setTickContext(tick);
      note.setContext(ctx);
      note.setX(Math.round(w / 2));
      note.draw();

      if (dotY != null) {
        // Robust dot placement for tiny icon rendering.
        ctx.save();
        ctx.setFillStyle(color);
        ctx.beginPath();
        ctx.arc(Math.round(w / 2) + 8, dotY, 2.2, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.restore();
      }

      const svg = el.querySelector("svg");
      if (svg) {
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
        svg.setAttribute("preserveAspectRatio", "xMidYMin meet");
        (svg as SVGSVGElement).style.display = "block";
        (svg as SVGSVGElement).style.position = "relative";
        (svg as SVGSVGElement).style.left = "50%";
        (svg as SVGSVGElement).style.overflow = "visible";
        (svg as SVGSVGElement).style.transform = "translate(-50%, -22px)";
        svg.querySelectorAll(".vf-stave path, .vf-stave line, .vf-stave rect").forEach((n) => {
          n.remove();
        });
      }
    } catch {
      // Fail-soft fallback: never leave empty cells.
      el.innerHTML =
        '<svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true"><circle cx="22" cy="28" r="8" fill="currentColor"/></svg>';
    }
  }, [dark, id]);

  useEffect(() => {
    void draw();
  }, [draw]);

  return <div ref={ref} className={cn("relative z-20 overflow-visible", className)} aria-hidden />;
}
