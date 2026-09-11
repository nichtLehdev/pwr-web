"use client";

import { useCallback, useRef } from "react";
import ImageWithFallback from "@/app/_components/ui/image-with-fallback";
import { Button } from "@/app/_components/ui";
import { CrosshairIcon } from "lucide-react";

/**
 * Fokuspunkt eines Bildes setzen: der Punkt, der sichtbar bleibt, wenn das Bild
 * irgendwo als `object-cover` beschnitten wird (Kartenkopf, Karussell, Kachel).
 *
 * Die Spalten gab es schon, nur keinen Weg sie zu setzen — bis hierher blieb
 * als einziges Mittel, das Bild neu zuzuschneiden und damit das Original zu
 * verlieren. Der Fokuspunkt lässt die Datei in Ruhe.
 */
export function FocalPointPicker({
  url,
  alt,
  x,
  y,
  onChange,
}: {
  url: string;
  alt: string;
  x: number | null;
  y: number | null;
  onChange: (next: { x: number | null; y: number | null }) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);

  const setFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const frame = frameRef.current?.getBoundingClientRect();
      if (!frame || frame.width === 0 || frame.height === 0) return;
      const nextX = ((clientX - frame.left) / frame.width) * 100;
      const nextY = ((clientY - frame.top) / frame.height) * 100;
      onChange({
        x: Math.round(Math.min(100, Math.max(0, nextX))),
        y: Math.round(Math.min(100, Math.max(0, nextY))),
      });
    },
    [onChange],
  );

  const hasFocalPoint = x != null && y != null;

  return (
    <div className="space-y-2">
      <div
        ref={frameRef}
        // Kein <button>: der Klick trägt eine Position, keine Ja/Nein-Auswahl.
        // Für die Tastatur stehen darunter die beiden Zahlenfelder.
        onClick={(event) => setFromEvent(event.clientX, event.clientY)}
        className="dark:border-dark-border relative aspect-video w-full cursor-crosshair overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:bg-gray-800"
        title="Klicken, um den Bildmittelpunkt zu setzen"
      >
        <ImageWithFallback
          src={url}
          alt={alt}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 90vw, 420px"
        />
        {hasFocalPoint && (
          <span
            className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black/40 ring-2 ring-black/50"
            style={{ left: `${x}%`, top: `${y}%` }}
            aria-hidden
          />
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          X&nbsp;%
          <input
            type="number"
            min={0}
            max={100}
            value={x ?? ""}
            onChange={(event) =>
              onChange({
                x:
                  event.target.value === "" ? null : Number(event.target.value),
                y: y ?? 50,
              })
            }
            className="dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-16 rounded-md border border-gray-300 px-2 py-1 tabular-nums"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          Y&nbsp;%
          <input
            type="number"
            min={0}
            max={100}
            value={y ?? ""}
            onChange={(event) =>
              onChange({
                x: x ?? 50,
                y:
                  event.target.value === "" ? null : Number(event.target.value),
              })
            }
            className="dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-16 rounded-md border border-gray-300 px-2 py-1 tabular-nums"
          />
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasFocalPoint}
          onClick={() => onChange({ x: null, y: null })}
        >
          <CrosshairIcon className="mr-1.5 h-4 w-4" />
          Zurücksetzen
        </Button>
      </div>
      <p className="dark:text-dark-muted text-xs text-gray-500">
        Bestimmt, welcher Bildausschnitt sichtbar bleibt, wenn das Bild
        beschnitten dargestellt wird. Ohne Fokuspunkt wird die Bildmitte
        verwendet.
      </p>
    </div>
  );
}
