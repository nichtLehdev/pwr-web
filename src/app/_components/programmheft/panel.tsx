import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Kasten (öffentliche Variante von `ui/card`): ein Block, der sich vom
 * umgebenden Satz abheben muss, etwa ein Ablauf oder ein Formular. Er trennt
 * sich mit einem 2px-Tintenrahmen, nie mit Schatten oder Rundung (Printed
 * Depth Rule), im Nachtdruck gleich gebaut (Nachtschrift-Rahmen auf
 * Nachtgrund). Höchstens ein Kasten pro Seite; Aufzählungen sind Zeilen.
 */
export function Panel({
  as: Tag = "div",
  labelledBy,
  className,
  children,
}: {
  as?: "div" | "section" | "aside";
  labelledBy?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      aria-labelledby={labelledBy}
      className={cn(
        "border-ink bg-paper dark:border-night-text dark:bg-night border-2 p-6 md:p-8",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
