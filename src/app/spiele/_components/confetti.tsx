"use client";

import { useState } from "react";

const COLORS = ["#faa619", "#ffd27a", "#a55800"];

/** Einmaliger Konfetti-Regen. Bei reduzierter Bewegung blendet ihn das CSS aus. */
export function Confetti({ pieces = 60 }: { pieces?: number }) {
  const [items] = useState(() =>
    Array.from({ length: pieces }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.7,
      duration: 1.8 + Math.random() * 1.4,
      color: COLORS[i % COLORS.length]!,
      size: 7 + Math.random() * 7,
      drift: (Math.random() - 0.5) * 120,
      note: false,
    })),
  );

  return (
    <div
      className="spiel-confetti pointer-events-none fixed inset-0 z-50 overflow-hidden"
      aria-hidden
    >
      {items.map((item) => (
        <span
          key={item.id}
          className="spiel-confetti-piece"
          style={{
            left: `${item.left}%`,
            width: item.note ? undefined : item.size,
            height: item.note ? undefined : item.size * 0.6,
            backgroundColor: item.note ? undefined : item.color,
            color: item.color,
            animationDelay: `${item.delay}s`,
            animationDuration: `${item.duration}s`,
            ["--drift" as string]: `${item.drift}px`,
          }}
        >
          {item.note ? "♪" : null}
        </span>
      ))}
    </div>
  );
}
