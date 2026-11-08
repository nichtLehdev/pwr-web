"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  CalendarDays,
  Heart,
  HelpCircle,
  Volume2,
  Wifi,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/app/_components/ui/button";
import { GAME_FOCUS_RING } from "../_lib/focus-ring";
import { CHALLENGE_PASS_PERCENT } from "../_lib/learning-path";
import {
  markTutorialsSeen,
  TUTORIALS,
  unseenTutorials,
  type NoteDemo,
  type TutorialDemo,
  type TutorialId,
  type TutorialStep,
} from "../_lib/tutorials";
import { Toni } from "./toni";
import { RhythmFigureLoader } from "./rhythm-figure-loader";
import { parseCell } from "../_lib/rhythm/generator";
import { barTicks, pulseOf } from "../_lib/rhythm/ticks";
import type { RhythmEvent, TimeSignature } from "../_lib/rhythm/types";

type Open = {
  ids: TutorialId[];
  /** Beim ersten Mal „Neu für dich“, beim Nachschlagen „So geht's“. */
  fresh: boolean;
  then: (() => void) | null;
};

type TutorialApi = {
  /** Zeigt, was noch neu ist, und macht danach weiter; Gesehenes überspringt sofort. */
  gate: (
    ids: readonly (TutorialId | null | undefined)[],
    then: () => void,
  ) => void;
  /** Zum Nachschlagen über das Fragezeichen, auch wenn es schon gesehen wurde. */
  show: (ids: readonly TutorialId[]) => void;
};

const TutorialContext = createContext<TutorialApi>({
  gate: (_, then) => then(),
  show: () => {},
});

export function useTutorial(): TutorialApi {
  return useContext(TutorialContext);
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null);

  const api = useMemo<TutorialApi>(
    () => ({
      gate: (ids, then) => {
        const fresh = unseenTutorials(ids);
        if (fresh.length === 0) then();
        else setOpen({ ids: fresh, fresh: true, then });
      },
      show: (ids) => {
        if (ids.length > 0)
          setOpen({ ids: [...ids], fresh: false, then: null });
      },
    }),
    [],
  );

  const finish = useCallback(() => {
    if (!open) return;
    markTutorialsSeen(open.ids);
    setOpen(null);
    open.then?.();
  }, [open]);

  return (
    <TutorialContext.Provider value={api}>
      {children}
      {open && (
        <TutorialSheet
          key={open.ids.join()}
          steps={open.ids.flatMap((id): TutorialStep[] => [...TUTORIALS[id]])}
          fresh={open.fresh}
          onDone={finish}
        />
      )}
    </TutorialContext.Provider>
  );
}

/** Kleines Fragezeichen neben dem Hinweis, um die Erklärung noch einmal zu sehen. */
export function TutorialHelpButton({ ids }: { ids: readonly TutorialId[] }) {
  const { show } = useTutorial();
  if (ids.length === 0) return null;
  return (
    <button
      type="button"
      onClick={() => show(ids)}
      aria-label="Erklärung ansehen"
      title="Erklärung ansehen"
      className={cn(
        "text-primary-ink dark:text-primary -my-1 ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full align-middle",
        GAME_FOCUS_RING,
      )}
    >
      <HelpCircle className="h-5 w-5 stroke-[2.5]" aria-hidden />
    </button>
  );
}

/** Ab so viel Zug nach unten gilt das Blatt als weggewischt. */
const SWIPE_CLOSE_PX = 80;

function TutorialSheet({
  steps,
  fresh,
  onDone,
}: {
  steps: TutorialStep[];
  fresh: boolean;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<number | null>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const step = steps[index]!;
  const last = index === steps.length - 1;

  useEffect(() => {
    primaryRef.current?.focus({ preventScroll: true });
  }, [index]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="spiel-tut-backdrop bg-ink/45 absolute inset-0"
        onClick={onDone}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="spiel-tut-title"
        className="spiel-tut-sheet bg-paper dark:bg-night relative flex w-full max-w-xl flex-col gap-4 rounded-t-[28px] px-5 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
        style={{
          transform: drag ? `translateY(${drag}px)` : undefined,
          transition: dragging ? "none" : undefined,
        }}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          dragStart.current = event.clientY;
          setDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (dragStart.current === null) return;
          setDrag(Math.max(0, event.clientY - dragStart.current));
        }}
        onPointerUp={() => {
          const swiped = drag > SWIPE_CLOSE_PX;
          dragStart.current = null;
          setDragging(false);
          setDrag(0);
          if (swiped) onDone();
        }}
        onPointerCancel={() => {
          dragStart.current = null;
          setDragging(false);
          setDrag(0);
        }}
      >
        <div
          className="bg-rule dark:bg-night-rule mx-auto h-1.5 w-10 rounded-full"
          aria-hidden
        />
        <div className="flex items-center justify-between">
          <span className="text-primary-ink dark:text-primary text-xs font-extrabold tracking-wider uppercase">
            {fresh ? "Neu für dich" : "So geht's"}
          </span>
          <button
            type="button"
            onClick={onDone}
            className={cn(
              "text-dark hover:text-ink dark:text-night-muted dark:hover:text-night-text -mr-2 min-h-11 px-2 text-sm font-extrabold",
              GAME_FOCUS_RING,
            )}
          >
            {fresh ? "Überspringen" : "Schließen"}
          </button>
        </div>
        <div className="flex items-start gap-3">
          <Toni mood={step.mood} className="h-[76px] w-[76px]" />
          <div className="border-rule dark:border-night-rule flex-1 rounded-[18px] border-[3px] px-3.5 py-3">
            <h2
              id="spiel-tut-title"
              className="text-ink dark:text-night-text mb-1 text-lg leading-tight font-extrabold"
            >
              {step.title}
            </h2>
            <p className="text-dark dark:text-night-muted text-[15px] leading-snug">
              {step.text}
            </p>
          </div>
        </div>
        <div className="px-1" aria-hidden key={index}>
          <Demo kind={step.demo} />
        </div>
        {steps.length > 1 && (
          <div className="flex justify-center gap-1.5" aria-hidden>
            {steps.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === index
                    ? "bg-primary w-[22px]"
                    : "bg-rule dark:bg-night-rule w-2",
                )}
              />
            ))}
          </div>
        )}
        <Button
          ref={primaryRef}
          type="button"
          size="lg"
          className="spiel-action w-full"
          onClick={() => (last ? onDone() : setIndex(index + 1))}
        >
          {!last ? "Weiter" : fresh ? "Los geht's" : "Alles klar"}
        </Button>
      </div>
    </div>
  );
}

const delay = (seconds: number): CSSProperties => ({
  animationDelay: `${seconds}s`,
});

function Cell({
  at,
  wide,
  label,
}: {
  at: number;
  wide?: boolean;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "spiel-tut-cell text-ink flex h-[34px] items-center justify-center rounded-xl text-[13px] font-extrabold",
        wide ? "flex-[2]" : "flex-1",
      )}
      style={delay(at)}
    >
      {label}
    </span>
  );
}

function Row({ who, children }: { who: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-dark dark:text-night-muted w-12 text-xs font-extrabold">
        {who}
      </span>
      <div className="flex flex-1 gap-1.5">{children}</div>
    </div>
  );
}

function Seesaw({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 90" className="mx-auto h-[86px] w-full max-w-[260px]">
      <path d="M120 84 104 56h32z" className="fill-rule dark:fill-night-rule" />
      <g className={className} style={{ transformOrigin: "120px 52px" }}>
        <rect
          x="20"
          y="48"
          width="200"
          height="8"
          rx="4"
          className="fill-ink dark:fill-night-text"
        />
        <rect
          x="34"
          y="20"
          width="40"
          height="28"
          rx="8"
          className="fill-primary"
        />
        <rect
          x="150"
          y="26"
          width="22"
          height="22"
          rx="6"
          className="fill-primary"
        />
        <rect
          x="176"
          y="26"
          width="22"
          height="22"
          rx="6"
          className="fill-primary"
        />
      </g>
    </svg>
  );
}

function Demo({ kind }: { kind: TutorialDemo | NoteDemo }) {
  if (typeof kind === "object") return <NoteDemoView demo={kind} />;
  switch (kind) {
    case "call-response":
      return (
        <div className="flex flex-col gap-2">
          <Row who="Toni">
            <Cell at={0} />
            <Cell at={0.5} />
            <Cell at={1} wide label="ta-a" />
          </Row>
          <Row who="Du">
            <Cell at={2.2} />
            <Cell at={2.7} />
            <Cell at={3.2} wide label="ta-a" />
          </Row>
        </div>
      );
    case "no-gap":
      return (
        <div className="flex gap-1.5">
          {[
            { who: "Toni", from: 0 },
            { who: "Du", from: 1.6 },
          ].map(({ who, from }) => (
            <div key={who} className="flex flex-1 flex-col gap-1">
              <span className="text-dark dark:text-night-muted text-xs font-extrabold">
                {who}
              </span>
              <div className="flex gap-1">
                <Cell at={from} />
                <Cell at={from + 0.4} />
                <Cell at={from + 0.8} wide />
              </div>
            </div>
          ))}
        </div>
      );
    case "band":
      return (
        <div className="border-rule dark:border-night-rule relative h-[70px] overflow-hidden rounded-2xl border-[3px]">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="bg-rule dark:bg-night-rule absolute inset-x-0 h-0.5"
              style={{ top: 14 + i * 10 }}
            />
          ))}
          <span className="bg-primary absolute inset-y-0 left-[18%] w-1" />
          <svg
            viewBox="0 0 320 64"
            className="spiel-tut-scroll text-ink dark:text-night-text absolute inset-y-0 left-0 h-full w-[200%]"
          >
            {[80, 150, 220, 330, 400, 470].map((x, i) => (
              <g key={x} fill="currentColor" stroke="currentColor">
                <ellipse
                  cx={x / 2}
                  cy="44"
                  rx="5.5"
                  ry="4"
                  transform={`rotate(-20 ${x / 2} 44)`}
                  fill={i % 3 === 2 ? "none" : "currentColor"}
                  strokeWidth="1.6"
                />
                <path d={`M${x / 2 + 4.6} 42V18`} strokeWidth="1.4" />
              </g>
            ))}
          </svg>
        </div>
      );
    case "challenge":
      return (
        <div className="flex flex-col gap-2.5">
          <div className="flex justify-center gap-2 text-[#e05a47]">
            {[0, 1, 2].map((i) => (
              <Heart key={i} className="h-7 w-7 fill-current" />
            ))}
          </div>
          <div className="bg-rule dark:bg-night-rule relative h-[14px] rounded-full">
            <div className="spiel-tut-fill-70 bg-primary h-full rounded-full" />
            <span
              className="bg-ink dark:bg-night-text absolute -inset-y-1 w-1 rounded-full"
              style={{ left: `${CHALLENGE_PASS_PERCENT}%` }}
            />
          </div>
          <span className="text-dark dark:text-night-muted text-center text-xs font-extrabold">
            {CHALLENGE_PASS_PERCENT} % zum Bestehen
          </span>
        </div>
      );
    case "daily":
      return (
        <div className="flex items-center justify-center gap-5">
          <span className="spiel-tut-pulse bg-primary text-ink flex h-[64px] w-[64px] items-center justify-center rounded-full">
            <CalendarDays className="h-8 w-8 stroke-[2.25]" />
          </span>
          <span className="text-ink dark:text-night-text flex items-center gap-1 text-2xl font-extrabold">
            <Zap className="text-primary h-7 w-7 fill-current" />
            ×2 XP
          </span>
        </div>
      );
    case "endless":
      return (
        <div className="flex items-center justify-center gap-6">
          <div className="flex gap-1.5 text-[#e05a47]">
            {[0, 1, 2].map((i) => (
              <Heart
                key={i}
                className="spiel-tut-fade h-7 w-7 fill-current"
                style={delay(2 - i)}
              />
            ))}
          </div>
          <span className="text-dark dark:text-night-muted flex items-center gap-1.5 text-sm font-extrabold">
            <Wifi className="h-6 w-6" />
            zählt online
          </span>
        </div>
      );
    case "note-name":
      return (
        <div className="flex flex-col items-center gap-2.5">
          <svg
            viewBox="0 0 200 54"
            className="text-ink dark:text-night-text h-[54px] w-full max-w-[240px]"
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <path
                key={i}
                d={`M10 ${7 + i * 10}H190`}
                stroke="currentColor"
                strokeWidth="1.4"
              />
            ))}
            <ellipse
              cx="100"
              cy="37"
              rx="7"
              ry="5"
              transform="rotate(-20 100 37)"
              fill="currentColor"
            />
            <path d="M106 35V8" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          <div className="flex gap-1.5">
            {["C", "D", "E", "F", "G", "A", "H"].map((name) => (
              <span
                key={name}
                className={cn(
                  "border-rule text-ink dark:border-night-rule dark:text-night-text flex h-9 w-9 items-center justify-center rounded-lg border-[3px] text-sm font-extrabold",
                  name === "G" && "spiel-tut-key",
                )}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      );
    case "valves":
      return (
        <div className="flex justify-center gap-4">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={cn(
                "border-rule text-ink dark:border-night-rule dark:text-night-text flex h-[60px] w-[60px] items-center justify-center rounded-full border-[3px] text-lg font-extrabold",
                n !== 2 && "spiel-tut-valve",
              )}
              style={delay(n === 3 ? 0.3 : 0)}
            >
              {n}
            </span>
          ))}
        </div>
      );
    case "scale":
      return <Seesaw className="spiel-tut-balance" />;
    case "weigh":
      return (
        <div className="flex flex-col items-center gap-1">
          <Seesaw className="spiel-tut-weigh" />
          <span className="spiel-tut-pulse bg-primary text-ink rounded-full px-4 py-1 text-sm font-extrabold">
            Wiegen
          </span>
        </div>
      );
    case "dictation":
      return (
        <div className="flex items-center justify-center gap-4">
          <span className="spiel-tut-pulse bg-primary text-ink flex h-[56px] w-[56px] items-center justify-center rounded-full">
            <Volume2 className="h-7 w-7 stroke-[2.25]" />
          </span>
          <div className="flex gap-1.5">
            {["♩ ♩", "♫ ♩", "♩ –"].map((label, i) => (
              <span
                key={i}
                className={cn(
                  "border-rule text-ink dark:border-night-rule dark:text-night-text flex h-[48px] w-[52px] items-center justify-center rounded-xl border-[3px] text-lg",
                  i === 1 && "spiel-tut-key",
                )}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      );
  }
}

const METERS: Record<NonNullable<NoteDemo["meter"]> | "4/4", TimeSignature> = {
  "4/4": { numerator: 4, denominator: 4 },
  "3/4": { numerator: 3, denominator: 4 },
  "6/8": { numerator: 6, denominator: 8 },
};

/** Gesprochene Silbe je Notenwert; zu kurze Werte bleiben ohne, sonst wird es eng. */
function syllable(event: RhythmEvent): string {
  if (event.isRest) return event.ticks >= 48 ? "Pause" : "";
  if (event.tupletId) return "";
  return (
    {
      w: "ta-a-a-a",
      hd: "ta-a-a",
      h: "ta-a",
      qd: "ta-a",
      q: "ta",
      "8d": "ti",
      "8": "ti",
      "16": "",
    } as const
  )[event.value];
}

/** Sekunden je Schlag in der Vorführung: ruhig, damit man mitzählen kann. */
const DEMO_BEAT_SEC = 0.9;

function NoteDemoView({ demo }: { demo: NoteDemo }) {
  const ts = METERS[demo.meter ?? "4/4"];
  const bars = useMemo(() => {
    // Je drei Triolen-Achtel bilden eine eigene Triole, wie im Spiel.
    let triplet = 0;
    return [
      parseCell(demo.notes).map((event) =>
        event.tupletId
          ? { ...event, tupletId: 1 + Math.floor(triplet++ / 3) }
          : event,
      ),
    ];
  }, [demo.notes]);
  const events = bars[0]!;
  const { pulseTicks, pulsesPerBar } = pulseOf(ts);
  const total = barTicks(ts);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-[84px]">
        <RhythmFigureLoader bars={bars} noteKey="d/4" timeSignature={ts} />
      </div>
      <div className="relative flex gap-1">
        {events.map((event, i) => (
          <span
            key={i}
            className={cn(
              "flex h-8 min-w-0 items-center justify-center overflow-hidden rounded-lg text-xs font-extrabold",
              event.isRest
                ? "border-rule text-dark dark:border-night-rule dark:text-night-muted border-2 border-dashed"
                : "bg-primary text-ink",
            )}
            style={{ flex: `${event.ticks} 1 0` }}
          >
            {syllable(event)}
          </span>
        ))}
        <span
          className="spiel-tut-playhead bg-ink dark:bg-night-text absolute -inset-y-1 w-1 rounded-full"
          style={{
            animationDuration: `${(total / pulseTicks) * DEMO_BEAT_SEC}s`,
          }}
        />
      </div>
      <div className="text-dark dark:text-night-muted flex text-xs font-extrabold">
        {Array.from({ length: pulsesPerBar }, (_, i) => (
          <span key={i} className="flex-1">
            {i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}
