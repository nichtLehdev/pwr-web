"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { spawnBurst } from "../../../_components/note-burst";
import { NOTE_VALUES, type NoteValueId } from "../_lib/types";

export type PanEntry = {
  /** Stabiler Schlüssel: bleibt beim Entfernen anderer Einträge erhalten. */
  uid: string | number;
  id: NoteValueId;
};

const BRASS = "#faa619";
const BRASS_DARK = "#e08a00";
const BRASS_DEEP = "#a55800";
const BRASS_LIGHT = "#ffd27a";

const PIVOT = { x: 300, y: 120 };
const ARM = 150;
/** Immer gleich weit: Der Ausschlag sagt schwerer oder leichter, aber nicht um wie viel. */
const TILT_DEG = 9;
const TOKEN_R = 34;
const TOKEN_STEP = 72;
const ROW_STEP = 68;
const PER_ROW = 3;
const REST_Y = 150;

const SWING =
  "motion-safe:[transition:transform_550ms_cubic-bezier(0.34,1.45,0.64,1)]";

/** SMuFL-Zeichen aus Bravura, das VexFlow ohnehin lädt. */
const GLYPHS: Record<NoteValueId, { code: string; dot?: boolean; y: number }> =
  {
    whole: { code: "", y: 5 },
    dottedWhole: { code: "", dot: true, y: 5 },
    half: { code: "", y: 19 },
    dottedHalf: { code: "", dot: true, y: 19 },
    quarter: { code: "", y: 19 },
    dottedQuarter: { code: "", dot: true, y: 19 },
    eighth: { code: "", y: 19 },
    dottedEighth: { code: "", dot: true, y: 19 },
    sixteenth: { code: "", y: 19 },
    dottedSixteenth: { code: "", dot: true, y: 19 },
    thirtySecond: { code: "", y: 21 },
    restQuarter: { code: "", y: 2 },
    restEighth: { code: "", y: 2 },
    restSixteenth: { code: "", y: 2 },
  };

/** Ein Gewicht mit Note: rund wie alles in der Spielwelt und groß genug zum Antippen. */
export function NoteWeight({
  id,
  x,
  y,
}: {
  id: NoteValueId;
  x: number;
  y: number;
}) {
  const glyph = GLYPHS[id];
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle
        cy="4"
        r={TOKEN_R}
        fill={BRASS_DEEP}
        stroke="currentColor"
        strokeWidth="3"
      />
      <circle
        r={TOKEN_R}
        className="fill-paper dark:fill-night-raised"
        stroke="currentColor"
        strokeWidth="3"
      />
      <text
        x={glyph.dot ? -5 : 0}
        y={glyph.y}
        textAnchor="middle"
        fontFamily="Bravura"
        fontSize="42"
        fill="currentColor"
      >
        {glyph.code}
      </text>
      {glyph.dot && <circle cx="15" cy="9" r="3.6" fill="currentColor" />}
    </g>
  );
}

function tokenSpot(index: number, count: number) {
  const row = Math.floor(index / PER_ROW);
  const inRow = Math.min(PER_ROW, count - row * PER_ROW);
  const column = index - row * PER_ROW;
  return {
    x: (column - (inRow - 1) / 2) * TOKEN_STEP,
    y: REST_Y - row * ROW_STEP,
  };
}

function Pan({
  side,
  tilt,
  label,
  notes,
  slotCount,
  onRemoveAt,
}: {
  side: "left" | "right";
  tilt: -1 | 0 | 1;
  label: string;
  notes: PanEntry[];
  slotCount: number;
  onRemoveAt?: (index: number) => void;
}) {
  const radians = (tilt * TILT_DEG * Math.PI) / 180;
  const direction = side === "left" ? -1 : 1;
  const x = PIVOT.x + direction * ARM * Math.cos(radians);
  const y = PIVOT.y + direction * ARM * Math.sin(radians);
  const cells = Math.max(slotCount, notes.length);

  const onKey = (event: KeyboardEvent, index: number) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onRemoveAt?.(index);
  };

  return (
    <g style={{ transform: `translate(${x}px, ${y}px)` }} className={SWING}>
      {/* Drei Ketten bis zum Haken am Balken. */}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="1 7"
      >
        <path d="M0 10L-112 182" />
        <path d="M0 10L112 182" />
        <path d="M0 10L0 170" opacity="0.45" />
      </g>
      <circle r="7" fill={BRASS_DARK} stroke="currentColor" strokeWidth="3" />

      {/* Schale: Rand, Wanne, Lichtkante. */}
      <path
        d="M-118 184Q0 252 118 184Z"
        fill={BRASS}
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path
        d="M-92 203Q0 240 92 203"
        fill="none"
        stroke={BRASS_DEEP}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.55"
      />
      <ellipse
        cy="184"
        rx="118"
        ry="13"
        fill={BRASS_LIGHT}
        stroke="currentColor"
        strokeWidth="3.5"
      />

      {Array.from({ length: cells }, (_, index) => {
        const spot = tokenSpot(index, cells);
        const note = notes[index];
        if (!note) {
          return (
            <circle
              key={`frei-${index}`}
              cx={spot.x}
              cy={spot.y}
              r={TOKEN_R - 4}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeDasharray="5 7"
              strokeLinecap="round"
              opacity="0.6"
            />
          );
        }
        const name = NOTE_VALUES[note.id].label;
        return onRemoveAt ? (
          <g
            key={note.uid}
            role="button"
            tabIndex={0}
            aria-label={`${name} wieder wegnehmen`}
            onClick={() => onRemoveAt(index)}
            onKeyDown={(event) => onKey(event, index)}
            className="spiel-weight cursor-pointer"
          >
            <NoteWeight id={note.id} x={spot.x} y={spot.y} />
          </g>
        ) : (
          <g key={note.uid} role="img" aria-label={name}>
            <NoteWeight id={note.id} x={spot.x} y={spot.y} />
          </g>
        );
      })}

      <text
        x={direction * 118}
        y="262"
        textAnchor={side === "left" ? "start" : "end"}
        fontSize="20"
        fontWeight="800"
        fill="currentColor"
      >
        {label}
      </text>
    </g>
  );
}

/** Die Waage: Messing wie Toni, die Noten liegen wirklich in den Schalen. */
export function BalanceScale({
  left,
  right,
  slotCount,
  tilt,
  celebrate,
  status,
  onRemoveAt,
}: {
  left: PanEntry[];
  right: PanEntry[];
  slotCount: number;
  /** -1: links schwerer, 1: rechts schwerer. */
  tilt: -1 | 0 | 1;
  celebrate: boolean;
  status: string;
  onRemoveAt?: (index: number) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!celebrate || !host) return;
    spawnBurst(host, host.offsetWidth / 2, host.offsetHeight * 0.28, 6);
  }, [celebrate]);

  return (
    <div
      ref={hostRef}
      className="text-ink dark:text-night-text relative h-[clamp(14rem,38dvh,28rem)] w-full shrink-0"
    >
      <svg
        viewBox="0 0 600 430"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full overflow-visible"
      >
        {/* Sockel und Säule stehen still. */}
        <g stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round">
          <rect
            x="224"
            y="402"
            width="152"
            height="22"
            rx="9"
            fill={BRASS_DEEP}
          />
          <rect
            x="250"
            y="382"
            width="100"
            height="22"
            rx="8"
            fill={BRASS_DARK}
          />
          <path d="M284 382L291 150H309L316 382Z" fill={BRASS} />
          <rect
            x="278"
            y="356"
            width="44"
            height="14"
            rx="6"
            fill={BRASS_DARK}
          />
          <rect
            x="283"
            y="160"
            width="34"
            height="12"
            rx="5"
            fill={BRASS_DARK}
          />
        </g>
        <path
          d="M296 352L299 176"
          stroke={BRASS_LIGHT}
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Skala: Die Mitte heißt Gleichgewicht. */}
        <path
          d="M250 76A72 72 0 0 1 350 76L322 104A34 34 0 0 0 278 104Z"
          fill={BRASS_LIGHT}
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <g stroke="currentColor" strokeLinecap="round">
          {[-16, -8, 8, 16].map((degrees) => (
            <line
              key={degrees}
              x1="300"
              y1="52"
              x2="300"
              y2="60"
              strokeWidth="2.5"
              transform={`rotate(${degrees} ${PIVOT.x} ${PIVOT.y})`}
            />
          ))}
          <line x1="300" y1="50" x2="300" y2="66" strokeWidth="4.5" />
        </g>

        <Pan
          side="left"
          tilt={tilt}
          label="Vorgegeben"
          notes={left}
          slotCount={left.length}
        />
        <Pan
          side="right"
          tilt={tilt}
          label="Deine Seite"
          notes={right}
          slotCount={slotCount}
          onRemoveAt={onRemoveAt}
        />

        {/* Balken mit Zeiger: kippt um den Drehpunkt. */}
        <g
          style={{
            transform: `rotate(${tilt * TILT_DEG}deg)`,
            transformOrigin: `${PIVOT.x}px ${PIVOT.y}px`,
          }}
          className={SWING}
        >
          <path
            d={`M${PIVOT.x} ${PIVOT.y}L${PIVOT.x - 4} 70L${PIVOT.x} 56L${PIVOT.x + 4} 70Z`}
            fill={BRASS_DEEP}
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M150 113Q300 98 450 113V127Q300 142 150 127Z"
            fill={BRASS}
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path
            d="M172 114Q300 103 428 114"
            fill="none"
            stroke={BRASS_LIGHT}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle
            cx="150"
            cy="120"
            r="11"
            fill={BRASS_DARK}
            stroke="currentColor"
            strokeWidth="3.5"
          />
          <circle
            cx="450"
            cy="120"
            r="11"
            fill={BRASS_DARK}
            stroke="currentColor"
            strokeWidth="3.5"
          />
        </g>
        <circle
          cx="300"
          cy="120"
          r="14"
          fill={BRASS_DARK}
          stroke="currentColor"
          strokeWidth="3.5"
        />
        <circle cx="300" cy="120" r="4.5" fill="currentColor" />
      </svg>
      <span role="status" aria-live="polite" className="sr-only">
        {status}
      </span>
    </div>
  );
}
