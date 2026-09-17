import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Point = { title: ReactNode; text?: ReactNode };

/**
 * Merkpunkte statt Icon-Kacheln: Titel in der Titelstimme, Text darunter,
 * Spalten mit 1px-Haarlinien getrennt, über allem ein 2px-Tintenstrich.
 * Zwei Spalten ab 48rem (Gründe, Aufgaben) oder drei ab 40rem (kurze Fakten).
 */
export function PointList({
  items,
  columns = 2,
  titleAs: Title = "h3",
  className,
}: {
  items: Point[];
  columns?: 2 | 3;
  titleAs?: "h3" | "h4" | "p";
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "border-ink dark:border-night-text grid border-t-2",
        columns === 2 ? "md:grid-cols-2" : "sm:grid-cols-3",
        className,
      )}
    >
      {items.map((item, index) => (
        <li
          key={index}
          className={cn(
            "border-rule dark:border-night-rule border-b py-5",
            columns === 2
              ? index % 2 === 0
                ? "md:pr-8"
                : "md:border-l md:pl-8"
              : cn(
                  index % 3 !== 0 && "sm:border-l sm:pl-6",
                  index % 3 !== 2 && "sm:pr-6",
                ),
          )}
        >
          <Title className="condensed text-ink dark:text-night-text text-[1.5rem] leading-tight font-bold">
            {item.title}
          </Title>
          {item.text ? (
            <p className="text-dark dark:text-night-muted mt-2 text-base leading-relaxed">
              {item.text}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
