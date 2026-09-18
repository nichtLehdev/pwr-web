import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Hinweis (öffentliche Variante von `ui/alert`); `important` z. B. für Fristen. */
export type NoteTone = "info" | "important" | "error";

const FRAME: Record<NoteTone, string> = {
  info: "border-ink dark:border-night-text border-2",
  important: "on-orange bg-primary text-ink",
  error: "border-2 border-red-700 dark:border-red-400",
};

const TITLE: Record<NoteTone, string> = {
  info: "text-ink dark:text-night-text",
  important: "text-ink",
  error: "text-red-700 dark:text-red-400",
};

interface NoteProps {
  tone?: NoteTone;
  title?: ReactNode;
  /** `h2`, wenn der Hinweis ein eigener Abschnitt der Seite ist. */
  titleAs?: "p" | "h2" | "h3" | "h4";
  as?: "div" | "aside";
  className?: string;
  children: ReactNode;
}

export function Note({
  tone = "info",
  title,
  titleAs: Title = "p",
  as: Tag = "div",
  className,
  children,
}: NoteProps) {
  return (
    <Tag
      role={tone === "error" ? "alert" : undefined}
      className={cn("p-5 md:p-6", FRAME[tone], className)}
    >
      {title ? (
        <Title
          className={cn(
            "condensed text-[1.375rem] leading-tight font-bold",
            TITLE[tone],
          )}
        >
          {title}
        </Title>
      ) : null}
      <div
        className={cn(
          "text-base leading-relaxed [&_p+p]:mt-3",
          title ? "mt-2" : undefined,
          tone === "important" ? "text-ink" : "text-ink dark:text-night-text",
        )}
      >
        {children}
      </div>
    </Tag>
  );
}
