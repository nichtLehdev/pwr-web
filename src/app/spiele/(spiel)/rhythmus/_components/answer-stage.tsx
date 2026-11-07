"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { spawnBurst } from "../../../_components/confetti";
import { RhythmFigureLoader } from "../../../_components/rhythm-figure-loader";
import { describeFigure } from "../../../_lib/rhythm/describe";
import { barScale, type BarHandle } from "../../../_lib/rhythm/draw-bar";
import { barTicks, pulseOf, secPerTick } from "../../../_lib/rhythm/ticks";
import type { Conductor, Press, Segment } from "../_lib/conductor";
import type { JudgeEvent } from "../_lib/judge";
import { ballHop, CountOverlay, StageHud, useCountIn } from "./stage-parts";

const ANNOUNCEMENT = {
  again: "Noch einmal!",
  faster: "Schneller!",
  slower: "Etwas ruhiger",
} as const;

/** Vorspielen, Nachspielen: Der Ball zeigt beides, gewertet wird nur die Antwort. */
export function AnswerStage({ conductor }: { conductor: Conductor }) {
  const [segment, setSegment] = useState<Segment | null>(null);
  const [figure, setFigure] = useState<Segment | null>(null);
  const countNumber = useCountIn(conductor);
  const handlesRef = useRef<BarHandle[]>([]);
  const hostsRef = useRef<HTMLElement[]>([]);
  const sheetRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const current = useRef<Segment | null>(null);

  const placeCursor = useCallback((songSec: number) => {
    const active = current.current;
    const cursor = cursorRef.current;
    const parent = sheetRef.current;
    if (!cursor || !parent) return;
    const hide = () => {
      cursor.style.opacity = "0";
    };
    if (!active || active.kind === "count") return hide();
    const ticksPerBar = barTicks(active.timeSignature);
    const elapsed = (songSec - active.startSec) / secPerTick(active.bpm);
    const barIndex = Math.floor(elapsed / ticksPerBar);
    const handle = handlesRef.current[barIndex];
    const host = hostsRef.current[barIndex];
    if (!handle || !host || elapsed < 0) return hide();
    const hostBox = host.getBoundingClientRect();
    const parentBox = parent.getBoundingClientRect();
    const scale = barScale(handle, hostBox);
    const x =
      hostBox.left -
      parentBox.left +
      handle.xForTick(elapsed - barIndex * ticksPerBar) * scale;
    cursor.style.opacity = "1";
    cursor.style.transform = `translateX(${x}px)`;
    cursor.style.top = `${hostBox.top - parentBox.top}px`;
    cursor.style.height = `${hostBox.height}px`;
    if (ballRef.current) {
      const { pulseTicks } = pulseOf(active.timeSignature);
      ballRef.current.style.transform = `translate(-50%, ${ballHop(elapsed / pulseTicks, 16)}px)`;
    }
  }, []);

  useEffect(
    () =>
      conductor.subscribe({
        onSegment: (next) => {
          current.current = next;
          setSegment(next);
          if (next.kind !== "count") setFigure(next);
          // Bei einer Wiederholung bleibt das Bild stehen, nur die Farben gehen.
          if (next.kind === "answer") {
            for (const handle of handlesRef.current) handle.clear();
          }
        },
        onFrame: placeCursor,
        onJudge: (event: JudgeEvent) => {
          if (event.type === "extra") return;
          const { note } = event;
          const handle = handlesRef.current[note.barIndex];
          const host = hostsRef.current[note.barIndex];
          handle?.mark(
            note.eventIndex,
            note.verdict ?? "missed",
            note.length === "short" || note.length === "long",
          );
          if (
            event.type === "note" &&
            (note.verdict === "exact" || note.verdict === "close") &&
            handle &&
            host &&
            sheetRef.current
          ) {
            const hostBox = host.getBoundingClientRect();
            const sheetBox = sheetRef.current.getBoundingClientRect();
            spawnBurst(
              sheetRef.current,
              hostBox.left -
                sheetBox.left +
                handle.xForTick(note.tick) * barScale(handle, hostBox),
              hostBox.top - sheetBox.top + hostBox.height * 0.55,
              note.verdict === "exact" ? 7 : 3,
            );
          }
        },
        onRelease: (press: Press, owner: Segment | null) => {
          if (!owner) return;
          const tickSec = secPerTick(owner.bpm);
          const ticksPerBar = barTicks(owner.timeSignature);
          const from = (press.atMs / 1000 - owner.startSec) / tickSec;
          const to = from + (press.durationMs ?? 0) / 1000 / tickSec;
          const barIndex = Math.max(0, Math.floor(from / ticksPerBar));
          handlesRef.current[barIndex]?.addTake(
            from - barIndex * ticksPerBar,
            to - barIndex * ticksPerBar,
            false,
          );
        },
      }),
    [conductor, placeCursor],
  );

  const onDrawn = useCallback((handles: BarHandle[], hosts: HTMLElement[]) => {
    handlesRef.current = handles;
    hostsRef.current = hosts;
  }, []);

  const isAnswer = segment?.kind === "answer";
  const baseText =
    segment?.kind === "call"
      ? segment.announcement
        ? ANNOUNCEMENT[segment.announcement]
        : "Hör zu …"
      : isAnswer
        ? "Jetzt du!"
        : "Mitzählen!";
  const figureIndex = segment?.index ?? 0;
  const total = segment?.total ?? 1;

  return (
    <div className="spiel-buehne flex flex-col gap-2 rounded-3xl p-3 sm:p-4">
      <StageHud
        conductor={conductor}
        baseText={baseText}
        baseMood={
          isAnswer ? "play" : segment?.kind === "call" ? "listen" : "idle"
        }
        progressText={
          segment && segment.kind !== "count"
            ? `Figur ${figureIndex + 1} von ${total} · ${segment.bpm} BPM`
            : ""
        }
        progress={segment?.kind === "count" ? 0 : figureIndex / total}
      />
      <div
        ref={sheetRef}
        className="bg-paper dark:bg-night relative h-[clamp(7.5rem,22svh,12rem)] rounded-2xl px-2 md:h-[clamp(11rem,34svh,20rem)]"
      >
        {figure && (
          <RhythmFigureLoader
            bars={figure.bars}
            timeSignature={figure.timeSignature}
            onDrawn={onDrawn}
          />
        )}
        <div
          ref={cursorRef}
          className="bg-primary/60 pointer-events-none absolute top-0 left-0 z-10 w-0.5 opacity-0"
          aria-hidden
        >
          <div
            ref={ballRef}
            className={
              isAnswer
                ? "bg-primary border-ink absolute top-2 left-1/2 h-5 w-5 rounded-full border-2"
                : "border-ink absolute top-2 left-1/2 h-5 w-5 rounded-full border-2 bg-[#78a8da]"
            }
          />
        </div>
        <CountOverlay number={countNumber} />
        {figure && (
          <p className="sr-only">
            {describeFigure({
              timeSignature: figure.timeSignature,
              bars: figure.bars,
            })}
          </p>
        )}
      </div>
    </div>
  );
}
