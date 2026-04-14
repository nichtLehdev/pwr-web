"use client";

import { useTheme } from "@/app/_components/general/theme-provider";
import { cn } from "@/lib/utils";
import VexFlow, { Dot, Renderer, RendererBackends, Stave, StaveNote, TickContext } from "vexflow";
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

      // Keep noteheads centered in tiny icon viewport.
      const keyFor = (duration: string) => (duration.includes("r") ? "b/4" : "d/5");
      const mk = (duration: string) =>
        new StaveNote({ keys: [keyFor(duration)], duration, clef: "treble" }).setStyle({
          fillStyle: color,
          strokeStyle: color,
        });

      let note: StaveNote;
      if (id === "tripletEighth") {
        // Icon-sized simplification: show one eighth + small "3".
        note = mk("8");
      } else if (id === "whole") {
        note = mk("w");
      } else if (id === "half") {
        note = mk("h");
      } else if (id === "quarter") {
        note = mk("q");
      } else if (id === "eighth") {
        note = mk("8");
      } else if (id === "dottedQuarter") {
        note = mk("q");
        Dot.buildAndAttach([note], { all: true });
      } else if (id === "sixteenth") {
        note = mk("16");
      } else if (id === "restQuarter") {
        note = mk("qr");
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

      if (id === "tripletEighth") {
        const x = Math.round(w * 0.75);
        ctx.save();
        ctx.setFont("12px sans-serif");
        ctx.setFillStyle(color);
        ctx.fillText("3", x, 14);
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
        (svg as SVGSVGElement).style.transform = "translate(-45%, -22px)";
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

  return <div ref={ref} className={cn("relative z-20 h-12 w-12 overflow-visible", className)} aria-hidden />;
}
