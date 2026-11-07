"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Flame, Heart, Plus, Star, Volume2, VolumeX, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { GAME_FOCUS_RING } from "../_lib/focus-ring";
import { GAMES } from "../_lib/games";
import { dailyStreak } from "../_lib/stats/daily-streak";
import { xpForPercent, xpToday } from "../_lib/stats/xp";
import { loadGameState } from "../_lib/stats/storage";
import { resultHeadline, starsFor, type Stars } from "../_lib/rewards";
import { JINGLE_NOTES, RhythmAudio } from "../_lib/rhythm/audio";
import { Confetti } from "./confetti";
import { useSkipGesture } from "./use-skip-gesture";
import { Toni, type ToniMood } from "./toni";

const SOUND_KEY = "pwr.spiele.v1.sound";
const STAR_STEP_SEC = 0.28;
const WRONG_NOTES = [185, 155.56] as const;

function readSoundOn(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

/** Belohnungsklänge für die stillen Spiele; abschaltbar, etwa für die Probe oder den Bus. */
export function useGameSounds() {
  const [audio] = useState(() => new RhythmAudio());
  useEffect(() => () => audio.close(), [audio]);

  const play = useCallback(
    (notes: readonly number[], step: number, delay = 0) => {
      if (!readSoundOn()) return;
      void audio
        .ensure()
        .then(() => audio.jingle(notes, step, delay))
        .catch(() => undefined);
    },
    [audio],
  );

  const correct = useCallback(
    (streak: number) => {
      const top = Math.min(JINGLE_NOTES.length, 2 + Math.floor(streak / 3));
      play(JINGLE_NOTES.slice(top - 2, top), 0.08);
    },
    [play],
  );
  const wrong = useCallback(() => play(WRONG_NOTES, 0.11), [play]);
  const fanfare = useCallback(
    (stars: Stars) => {
      if (stars === 0) return;
      const count = stars === 3 ? JINGLE_NOTES.length : stars + 1;
      play(JINGLE_NOTES.slice(0, count), STAR_STEP_SEC / 2, 0.25);
    },
    [play],
  );

  return { correct, wrong, fanfare };
}

export function SoundToggle() {
  const [on, setOn] = useState(true);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Serverbild kennt den Speicher nicht
  useEffect(() => setOn(readSoundOn()), []);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label="Spielklänge"
      onClick={() => {
        const next = !on;
        setOn(next);
        try {
          localStorage.setItem(SOUND_KEY, next ? "on" : "off");
        } catch {
          /* Privatmodus: Es bleibt bei dieser Sitzung. */
        }
      }}
      className={cn(
        "text-ink dark:text-night-text hover:bg-ink hover:text-paper dark:hover:bg-night-text dark:hover:text-night flex h-11 w-11 shrink-0 items-center justify-center",
        GAME_FOCUS_RING,
      )}
    >
      {on ? (
        <Volume2 className="h-5 w-5" aria-hidden />
      ) : (
        <VolumeX className="h-5 w-5 opacity-50" aria-hidden />
      )}
    </button>
  );
}

/** Lob darf laut sein. */
function cheerful(text: string): string {
  return text.replace(/\.?$/, "!");
}

/** Tagesserie und XP über alle Spiele, aus den echten Runden berechnet. */
export function DailyStats() {
  const [stats, setStats] = useState({ days: 0, xp: 0 });
  useEffect(() => {
    const events = GAMES.flatMap(
      (game) => loadGameState(game.slug).recentEvents,
    );
    const now = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Serverbild kennt den Speicher nicht
    setStats({
      days: dailyStreak(
        events.map((event) => event.playedAt),
        now,
      ),
      xp: xpToday(events, now),
    });
  }, []);
  return (
    <p className="text-ink dark:text-night-text mt-1.5 flex flex-wrap gap-x-4 font-extrabold tabular-nums">
      <span className="flex items-center gap-1">
        <Flame
          className="text-primary-ink dark:text-primary h-5 w-5"
          aria-hidden
        />
        {stats.days === 1 ? "1 Tag" : `${stats.days} Tage`} in Folge
      </span>
      <span className="flex items-center gap-1">
        <Zap
          className="text-primary-ink dark:text-primary h-5 w-5"
          aria-hidden
        />
        {stats.xp} XP heute
      </span>
    </p>
  );
}

const MAX_HEARTS = 3;

/**
 * Herzen einer Lektion. Über Refs erreichbar, damit die Spiele sie
 * aus ihren bestehenden Antwort-Handlern aufrufen können, ohne ihre Logik umzubauen.
 */
export function useLessonHearts(onEmpty: () => void) {
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const left = useRef(MAX_HEARTS);
  const onEmptyRef = useRef(onEmpty);
  useEffect(() => {
    onEmptyRef.current = onEmpty;
  });
  const lose = useRef(() => {
    if (left.current <= 0) return;
    left.current -= 1;
    setHearts(left.current);
    if (left.current === 0) onEmptyRef.current();
  });
  const reset = useRef(() => {
    left.current = MAX_HEARTS;
    setHearts(MAX_HEARTS);
  });
  return { hearts, lose, reset };
}

export function HeartRow({ hearts }: { hearts: number }) {
  return (
    <span className="flex items-center gap-0.5" role="status">
      <span className="sr-only">
        Noch {hearts} {hearts === 1 ? "Herz" : "Herzen"}
      </span>
      {Array.from({ length: MAX_HEARTS }, (_, i) => (
        <Heart
          key={i}
          aria-hidden
          className={cn(
            "h-6 w-6",
            i < hearts
              ? "fill-red-600 text-red-600"
              : "text-rule dark:text-night-rule",
          )}
        />
      ))}
    </span>
  );
}

/** Kopf der Auswahlseite mit Toni. */
export function GameHead({
  title,
  text,
  aside = <SoundToggle />,
  weltTitle,
  weltText,
  children,
}: {
  title: string;
  text: string;
  aside?: ReactNode;
  /** Eigene Begrüßung statt `title` bzw. `text`. */
  weltTitle?: string;
  weltText?: string;
  children?: ReactNode;
}) {
  return (
    <header>
      <div className="flex items-center gap-3">
        <Toni mood="idle" className="h-20 w-20 sm:h-24 sm:w-24" />
        <div className="min-w-0 flex-1">
          <h2 className="text-ink dark:text-night-text text-2xl leading-tight font-extrabold md:text-3xl">
            {weltTitle ?? title}
          </h2>
          <p className="text-ink dark:text-night-text mt-1 leading-snug">
            {weltText ?? text}
          </p>
          {children}
          <DailyStats />
        </div>
        {aside}
      </div>
    </header>
  );
}

/** Serie als Etikett: gefülltes Rechteck wie die Zustände der Website. */
export function StreakTag({ streak }: { streak: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        "spiel-tag semi-condensed on-orange bg-primary text-ink px-2 py-0.5 text-sm font-semibold whitespace-nowrap tabular-nums",
        streak >= 2 ? "visible" : "invisible",
      )}
    >
      Serie {streak}
    </span>
  );
}

/** Stand des Spiels: fester Platz, damit der Inhalt darunter nicht springt. */
export function GameStatus({
  mood,
  message,
  note,
  streak = 0,
  progress = null,
  question,
  hearts,
  aside,
}: {
  mood: ToniMood;
  message: string;
  /** Bleibt stehen; das Urteil steht im Band am unteren Rand. */
  question?: string;
  hearts?: number;
  /** Zusätzliche Bedienung neben der Ansage, etwa Einstellungen. */
  aside?: ReactNode;
  note?: string;
  streak?: number;
  /** Anteil 0–1; `null` blendet den Balken aus (Lernen, Endlos). */
  progress?: number | null;
}) {
  const shown = question ?? message;
  return (
    <div className="spiel-status border-ink dark:border-night-text border-b-2">
      <div className="flex items-center gap-3 pb-2">
        <Toni
          mood={mood}
          className="h-[clamp(2.75rem,7dvh,3.75rem)] w-[clamp(2.75rem,7dvh,3.75rem)]"
        />
        <div className="min-w-0 flex-1">
          <p
            key={shown}
            className={cn(
              "spiel-status-text condensed text-ink dark:text-night-text origin-left text-[clamp(1.375rem,3.4svh,2.25rem)] leading-none font-extrabold",
              mood === "happy" && "spiel-stamp",
              mood === "oops" && "spiel-shake",
            )}
          >
            {mood === "happy" ? cheerful(shown) : shown}
          </p>
          {note && (
            <p className="text-dark dark:text-night-muted mt-1 text-sm leading-tight">
              {note}
            </p>
          )}
        </div>
        <StreakTag streak={streak} />
        {hearts !== undefined && <HeartRow hearts={hearts} />}
        {aside}
      </div>
      {progress !== null && (
        <div aria-hidden className="spiel-bar h-1.5">
          <div
            className="bg-primary h-full transition-[width] duration-300"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

/** Sterne ohne Zierde: Tinte, die in der Fläche steht. */
export function StarMarks({
  stars,
  className,
  stamped = false,
}: {
  stars: number;
  className?: string;
  stamped?: boolean;
}) {
  return (
    <span
      className="flex gap-1"
      role="img"
      aria-label={`${stars} von 3 Sternen`}
    >
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn(
            "stroke-[1.5]",
            className,
            n <= stars ? "spiel-star fill-current" : "opacity-25",
            stamped && n <= stars && "spiel-stamp",
          )}
          style={
            stamped
              ? { animationDelay: `${0.2 + (n - 1) * STAR_STEP_SEC}s` }
              : undefined
          }
        />
      ))}
    </span>
  );
}

/** Die eine volle Druckfläche des Spiels: die große Zahl am Ende einer Runde. */
export function ResultField({
  value,
  valueLabel,
  headline,
  stars,
  badge,
  celebrate = (stars ?? 0) >= 2,
  percent,
}: {
  value: string;
  valueLabel: string;
  headline: string;
  stars: Stars | null;
  badge?: string | null;
  /** Standard: ab zwei Sternen. */
  celebrate?: boolean;
  /** Daraus berechnen sich die verdienten XP. */
  percent?: number;
}) {
  const [skipped, setSkipped] = useState(false);
  useSkipGesture(!skipped, () => setSkipped(true));

  return (
    <section className="flex flex-col items-center gap-2 py-2 text-center">
      {celebrate && !skipped && <Confetti pieces={40} />}
      <Toni
        mood={(stars ?? 0) >= 1 || celebrate ? "happy" : "idle"}
        className="h-[clamp(5rem,16dvh,8rem)] w-[clamp(5rem,16dvh,8rem)]"
      />
      <p className="text-ink dark:text-night-text text-3xl leading-tight font-extrabold">
        {cheerful(headline)}
      </p>
      {stars !== null && (
        <StarMarks
          stars={stars}
          stamped={!skipped}
          className="text-ink dark:text-night-text h-[clamp(2.75rem,8svh,4rem)] w-[clamp(2.75rem,8svh,4rem)]"
        />
      )}
      <p className="text-ink dark:text-night-text">
        <span className="text-4xl font-extrabold tabular-nums">{value}</span>{" "}
        <span className="font-bold">{valueLabel}</span>
      </p>
      {percent !== undefined && (
        <p className="text-primary-ink dark:text-primary flex items-center gap-1 text-xl font-extrabold">
          <Zap className="h-5 w-5" aria-hidden />+{xpForPercent(percent)} XP
        </p>
      )}
      {badge && (
        <p className="spiel-tag on-orange bg-primary text-ink spiel-stamp px-3 py-1 font-bold">
          {badge}
        </p>
      )}
    </section>
  );
}

/** Urteil einer Lektion am unteren Rand. */
export function LessonFeedback({
  tone,
  title,
  text,
  overlay = false,
}: {
  tone: "right" | "wrong";
  title: string;
  text?: string | null;
  /** Über dem Dock statt darin: für Runden ohne eigene Aktionsleiste. */
  overlay?: boolean;
}) {
  return (
    <div
      role="status"
      data-tone={tone}
      className={cn(
        "spiel-feedback px-4 py-3",
        overlay && "spiel-feedback-overlay",
      )}
    >
      <p className="text-xl font-extrabold">{title}</p>
      {text && <p className="mt-0.5 leading-snug">{text}</p>}
    </div>
  );
}

/** Kennzahlen im Tabellensatz unter der Fläche. */
export function FactRows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="border-ink dark:border-night-text border-t-2">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="border-rule dark:border-night-rule flex items-baseline justify-between gap-3 border-b py-2"
        >
          <dt className="text-dark dark:text-night-muted">{label}</dt>
          <dd className="condensed text-ink dark:text-night-text text-xl font-extrabold tabular-nums">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Aufklappzeile in der Machart der Wegzeilen. */
export function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <details className="border-rule dark:border-night-rule border-b">
      <summary
        className={cn(
          "text-ink dark:text-night-text hover:bg-primary hover:text-ink flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-1 font-bold [&::-webkit-details-marker]:hidden",
          GAME_FOCUS_RING,
        )}
      >
        {label}
        <Plus className="h-5 w-5 shrink-0" aria-hidden />
      </summary>
      <div className="px-1 pb-4">{children}</div>
    </details>
  );
}

/** Rundenende der Lernspiele: Fläche, Kennzahlen, Einzelheiten hinter einem Klick. */
export function GameResult({
  percent,
  value,
  valueLabel,
  rows,
  badge,
  detailsLabel,
  headline,
  celebrate,
  note,
  children,
}: {
  percent: number;
  value: string;
  valueLabel: string;
  rows?: [string, string][];
  badge?: string | null;
  detailsLabel?: string;
  /** Standard: nach Sternen. */
  headline?: string;
  celebrate?: boolean;
  note?: string | null;
  children?: ReactNode;
}) {
  const stars = starsFor(percent);
  const { fanfare } = useGameSounds();
  useEffect(() => fanfare(stars), [fanfare, stars]);

  return (
    <div className="flex flex-col gap-4">
      <ResultField
        value={value}
        valueLabel={valueLabel}
        headline={headline ?? resultHeadline(stars)}
        stars={stars}
        badge={badge}
        percent={percent}
        celebrate={celebrate}
      />
      {note && (
        <p className="text-ink dark:text-night-text text-center text-lg leading-snug font-bold">
          {note}
        </p>
      )}
      {rows && <FactRows rows={rows} />}
      {children && (
        <DetailRow label={detailsLabel ?? "Genauer ansehen"}>
          {children}
        </DetailRow>
      )}
    </div>
  );
}
