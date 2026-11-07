"use client";

import { useState } from "react";

const COLORS = [
  "#faa619",
  "#3b82f6",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

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
      note: i % 5 === 0,
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

/** Kleine Notenwolke an einer Stelle, wenn ein Treffer sitzt. */
export function spawnBurst(
  container: HTMLElement,
  x: number,
  y: number,
  count: number,
): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
    const distance = 26 + Math.random() * 26;
    piece.className = "spiel-burst";
    piece.textContent = i % 3 === 0 ? "★" : "♪";
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
    piece.style.color = COLORS[i % COLORS.length]!;
    piece.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    piece.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    piece.addEventListener("animationend", () => piece.remove());
    container.appendChild(piece);
  }
}
