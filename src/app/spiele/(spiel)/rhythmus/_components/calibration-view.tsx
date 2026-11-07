"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/app/_components/ui/button";
import { GameDock } from "../../../_components/game-shell-context";
import type { RhythmAudio } from "../../../_lib/rhythm/audio";
import { estimateLatency, saveLatencyMs } from "../_lib/latency";
import { PlayPad } from "./play-pad";

const CLICKS = 14;
const CLICK_SEC = 0.75;

type Status = "idle" | "running" | "scattered" | "too-few" | "done";

/** Mitklopfen zum Klick: misst den ganzen Weg von Lautsprecher bis Taste, auch Bluetooth. */
export function CalibrationView({
  audio,
  latencyMs,
  onChange,
  onClose,
}: {
  audio: RhythmAudio;
  latencyMs: number | null;
  onChange: (value: number | null) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const tapsRef = useRef<number[]>([]);
  const clicksRef = useRef<number[]>([]);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    timerRef.current = null;
    rafRef.current = null;
  }, []);

  useEffect(
    () => () => {
      cleanup();
      audio.cancelScheduled();
    },
    [audio, cleanup],
  );

  const start = async () => {
    await audio.ensure();
    tapsRef.current = [];
    const first = audio.now() + 0.4;
    clicksRef.current = Array.from(
      { length: CLICKS },
      (_, i) => first + i * CLICK_SEC,
    );
    clicksRef.current.forEach((at, i) => audio.scheduleClick(at, i % 4 === 0));
    setStatus("running");
    const frame = () => {
      audio.syncClock();
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    timerRef.current = window.setTimeout(
      () => {
        cleanup();
        const estimate = estimateLatency(tapsRef.current, clicksRef.current);
        if (estimate.ok) {
          saveLatencyMs(estimate.latencyMs);
          onChange(estimate.latencyMs);
          setStatus("done");
        } else {
          setStatus(estimate.reason);
        }
      },
      (0.4 + CLICKS * CLICK_SEC) * 1000,
    );
  };

  const reset = () => {
    saveLatencyMs(null);
    onChange(null);
  };

  const message = {
    idle: "Du hörst gleich gleichmäßige Klicks. Tippe genau dann, wenn du sie hörst, am besten mit dem Kopfhörer oder Lautsprecher, mit dem du auch spielst.",
    running: "Tippe mit, so genau du kannst …",
    scattered:
      "Die Tipps lagen zu weit auseinander. Versuch es noch einmal in Ruhe.",
    "too-few": "Das waren zu wenige Tipps. Tippe bei jedem Klick mit.",
    done: "Fertig, dein Gerät ist eingestellt. Bei anderen Kopfhörern einfach neu messen.",
  }[status];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="condensed text-ink dark:text-night-text text-[clamp(1.5rem,4svh,2.5rem)] leading-tight font-extrabold">
        Timing einstellen
      </h2>
      <p className="text-dark dark:text-night-muted max-w-[60ch]" role="status">
        {message}
      </p>
      <p className="text-dark dark:text-night-muted text-sm">
        {latencyMs === null
          ? "Zurzeit gilt der Wert, den dein Browser meldet."
          : "Dein gemessener Wert ist aktiv."}
      </p>

      <GameDock>
        {status === "running" ? (
          <PlayPad
            label="Mit dem Klick tippen"
            emphasized
            hint="Oder mit der"
            onPress={(timeStamp) =>
              tapsRef.current.push(audio.wallToAudio(timeStamp))
            }
            onRelease={() => undefined}
          />
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={onClose}
            >
              Zurück
            </Button>
            {latencyMs !== null && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={reset}
              >
                Zurücksetzen
              </Button>
            )}
            <Button
              type="button"
              size="lg"
              className="flex-1"
              onClick={() => void start()}
            >
              {status === "idle" ? "Messung starten" : "Neu messen"}
            </Button>
          </div>
        )}
      </GameDock>
    </div>
  );
}
