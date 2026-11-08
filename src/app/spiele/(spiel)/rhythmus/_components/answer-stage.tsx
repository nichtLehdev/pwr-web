"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { spawnBurst } from "../../../_components/note-burst";
import { RhythmFigureLoader } from "../../../_components/rhythm-figure-loader";
import { harmonyFor } from "../../../_lib/rhythm/audio";
import { describeFigure } from "../../../_lib/rhythm/describe";
import { barScale, type BarHandle } from "../../../_lib/rhythm/draw-bar";
import { barTicks, pulseOf, secPerTick } from "../../../_lib/rhythm/ticks";
import type { Conductor, Press, Segment } from "../_lib/conductor";
import type { JudgeEvent } from "../_lib/judge";
import {
  ANNOUNCEMENT,
  ballHop,
  CountOverlay,
  HoppingHead,
  ReadyBadge,
  StageHud,
  useCountIn,
} from "./stage-parts";

/** Vorspielen, Nachspielen: Der Ball zeigt beides, gewertet wird nur die Antwort. */
export function AnswerStage({ conductor }: { conductor: Conductor }) {
  const [segment, setSegment] = useState<Segment | null>(null);
  const [figure, setFigure] = useState<Segment | null>(null);
  const countNumber = useCountIn(conductor);
  const readyNumber = useCountIn(conductor, "ready");
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
    if (!active || active.kind === "count" || active.kind === "ready") {
      return hide();
    }
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
          // Beim Einzählen zur Antwort bleibt die Figur stehen, die gleich drankommt.
          if (next.kind !== "count" && next.kind !== "ready") setFigure(next);
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
              note.verdict === "exact" ? 4 : 2,
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
        : "Hör zu"
      : isAnswer
        ? "Jetzt du"
        : segment?.kind === "ready"
          ? "Gleich bist du dran"
          : "Mitzählen";
  const figureIndex = segment?.index ?? 0;
  const total = segment?.total ?? null;

  return (
    <div className="spiel-stage flex flex-col gap-2">
      <StageHud
        conductor={conductor}
        baseText={baseText}
        baseMood={
          isAnswer ? "play" : segment?.kind === "call" ? "listen" : "idle"
        }
        progressText={
          segment && segment.kind !== "count"
            ? `Figur ${figureIndex + 1}${total !== null ? ` von ${total}` : ""} · ${segment.bpm} BPM`
            : ""
        }
        progress={total === null ? null : figureIndex / total}
        lives={segment?.lives}
      />
      <div
        ref={sheetRef}
        className="spiel-sheet relative h-[clamp(8rem,26svh,14rem)] md:h-[clamp(12rem,38svh,22rem)]"
      >
        {figure && (
          <RhythmFigureLoader
            bars={figure.bars}
            noteKey={harmonyFor(figure).melodyKey}
            timeSignature={figure.timeSignature}
            onDrawn={onDrawn}
          />
        )}
        <div
          ref={cursorRef}
          className="bg-primary-ink dark:bg-primary pointer-events-none absolute top-0 left-0 z-10 w-0.5 opacity-0"
          aria-hidden
        >
          <HoppingHead headRef={ballRef} filled={isAnswer} />
        </div>
        <CountOverlay number={countNumber} />
        {segment?.kind === "ready" && (
          <ReadyBadge
            number={readyNumber}
            pulses={pulseOf(segment.timeSignature).pulsesPerBar}
          />
        )}
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
