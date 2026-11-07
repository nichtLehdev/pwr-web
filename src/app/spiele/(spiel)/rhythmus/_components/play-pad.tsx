"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { GAME_FOCUS_RING } from "../../../_lib/focus-ring";
import { hapticsTap } from "../_lib/haptics";

type PlayPadProps = {
  label: string;
  /** Hebt die Fläche hervor, wenn der Spieler dran ist. */
  emphasized: boolean;
  hint: string;
  onPress: (timeStampMs: number) => void;
  onRelease: (timeStampMs: number) => void;
};

/**
 * Druck und Loslassen getrennt, mit dem Zeitstempel des Ereignisses: Der stimmt auch dann,
 * wenn der Haupt-Thread gerade kurz mit dem Zeichnen beschäftigt ist.
 */
export function PlayPad({
  label,
  emphasized,
  hint,
  onPress,
  onRelease,
}: PlayPadProps) {
  const [pressed, setPressed] = useState(false);
  const isDown = useRef(false);
  const handlers = useRef({ onPress, onRelease });
  useEffect(() => {
    handlers.current = { onPress, onRelease };
  });

  useEffect(() => {
    const down = (timeStamp: number) => {
      if (isDown.current) return;
      isDown.current = true;
      setPressed(true);
      handlers.current.onPress(timeStamp);
      hapticsTap();
    };
    const up = (timeStamp: number) => {
      if (!isDown.current) return;
      isDown.current = false;
      setPressed(false);
      handlers.current.onRelease(timeStamp);
    };
    downRef.current = down;
    upRef.current = up;

    const isPlayKey = (event: KeyboardEvent) =>
      event.key === " " || event.key === "Enter";
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPlayKey(event)) return;
      event.preventDefault();
      if (!event.repeat) down(event.timeStamp);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (!isPlayKey(event)) return;
      event.preventDefault();
      up(event.timeStamp);
    };
    // Sonst bliebe nach einem Fensterwechsel die Taste für immer gedrückt.
    const onBlur = () => up(performance.now());

    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("keyup", onKeyUp, { capture: true });
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      window.removeEventListener("keyup", onKeyUp, { capture: true });
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const downRef = useRef<(t: number) => void>(() => undefined);
  const upRef = useRef<(t: number) => void>(() => undefined);

  return (
    <div className="flex w-full flex-col gap-1.5">
      <button
        type="button"
        data-pressed={pressed}
        className={cn(
          "spiel-pad condensed border-ink mb-2 flex min-h-[clamp(5rem,18dvh,9rem)] w-full touch-none items-center justify-center rounded-3xl border-[3px] text-[clamp(1.5rem,4svh,2.5rem)] font-extrabold select-none [-webkit-touch-callout:none]",
          GAME_FOCUS_RING,
          pressed || emphasized
            ? "bg-primary text-ink"
            : "bg-paper text-dark dark:bg-night-raised dark:text-night-muted",
        )}
        aria-label={`${label}. Auf dem Desktop: Leertaste oder Eingabetaste.`}
        aria-keyshortcuts="Space Enter"
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          downRef.current(event.timeStamp);
        }}
        onPointerUp={(event) => upRef.current(event.timeStamp)}
        onPointerCancel={(event) => upRef.current(event.timeStamp)}
      >
        {label}
      </button>
      <p className="text-dark dark:text-night-muted hidden shrink-0 text-center text-sm md:block">
        {hint}{" "}
        <kbd className="border-rule bg-rule/25 dark:border-night-rule dark:bg-night-raised border px-1.5 py-0.5 font-mono text-xs">
          Leertaste
        </kbd>
      </p>
    </div>
  );
}
