"use client";

import { BOT_TRAP_FIELD } from "@/lib/bot-trap";

/**
 * Unsichtbares Feld, das leer bleiben muss. Aus dem Fluss geschoben statt
 * `display: none` — das überspringen manche Bots gezielt. `aria-hidden` und
 * `tabIndex` halten es aus Screenreader und Tab-Reihenfolge heraus.
 *
 * Gehört ans Ende des Formulars: In einem Container mit `space-y-*` bekäme
 * sonst das erste echte Feld einen Abstand, den es vorher nicht hatte.
 */
export function BotTrapField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden"
    >
      <label htmlFor={BOT_TRAP_FIELD}>Website</label>
      <input
        type="text"
        id={BOT_TRAP_FIELD}
        name={BOT_TRAP_FIELD}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  );
}
