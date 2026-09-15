import Link from "next/link";
import { Fragment, isValidElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeadProps {
  /** Der einzige `<h1>` der Seite. */
  title: string;
  /** Kurzer Zusatz unter dem Titel, z. B. „Anmeldung“ (nie darüber). */
  meta?: ReactNode;
  breadcrumbs: Breadcrumb[];
  description?: ReactNode;
  /** `compact`: Detail- und Formularseiten mit kleinerem Titel. */
  size?: "default" | "compact";
  /** Förderverein-Seiten setzen den Satzstrich in Fördervereinsblau. */
  tone?: "default" | "foerderverein";
}

/**
 * Bausteine für Meta-Zeilen im kompakten Seitenkopf (Kurs, Termin,
 * Anmeldung, Ensemble): Zeile mit Haarlinie, Icons und Trenner in Schiefer,
 * kleine Outline-Aktionen wie „Bearbeiten“ und „Teilen“.
 */
export const headMeta = {
  line: "border-rule dark:border-night-rule flex flex-col gap-2 border-t pt-3 text-[0.9375rem] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1 sm:gap-y-2",
  icon: "text-dark dark:text-night-muted h-4 w-4 shrink-0",
  separator: "text-dark dark:text-night-muted hidden shrink-0 px-1 sm:inline",
  bezirk:
    "semi-condensed text-dark dark:text-night-muted px-1 text-sm font-semibold",
  action:
    "semi-condensed border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night inline-flex min-h-10 cursor-pointer items-center gap-2 border-2 px-3 text-sm font-semibold transition-colors",
} as const;

/** Ab dieser Länge spricht der Titel in der Headline- statt der Display-Größe. */
const LONG_TITLE = 44;

/**
 * Seitenkopf einer Innenseite: auf Papier gesetzt, mit Brotkrumen, großem
 * schmal-fettem Titel, Satzstrich und Leitsatz, abgeschlossen von einem
 * 2px-Tintenstrich. Ab 64rem steht der Leitsatz rechts neben dem Titel,
 * unten bündig.
 *
 * Besteht die Beschreibung aus genau einem Absatz, spricht sie in der
 * Lead-Stimme; längere Beschreibungen stehen als ruhiger Vorspann.
 */
export function PageHead({
  title,
  meta,
  breadcrumbs,
  description,
  size = "default",
  tone = "default",
}: PageHeadProps) {
  const compact = size === "compact";
  const displayTitle = !compact && title.length <= LONG_TITLE;
  const leadVoice = isValidElement(description) && description.type === "p";

  return (
    <header className="sheet">
      <div
        className={cn(
          "border-ink dark:border-night-text border-b-2",
          compact ? "pt-3 pb-8 md:pb-10" : "pt-4 pb-10 md:pt-6 md:pb-14",
        )}
      >
        <nav aria-label="Brotkrumen">
          <ol className="semi-condensed text-dark dark:text-night-muted -ml-1 flex flex-wrap items-center text-sm font-semibold">
            {breadcrumbs.map((item, index) => {
              const current = index === breadcrumbs.length - 1;
              return (
                <Fragment key={`${index}-${item.label}`}>
                  {index > 0 ? (
                    <li aria-hidden className="px-0.5">
                      /
                    </li>
                  ) : null}
                  <li className="flex min-w-0">
                    {item.href && !current ? (
                      <Link
                        href={item.href}
                        className="hover:text-ink dark:hover:text-night-text inline-flex min-h-11 items-center px-1 underline-offset-4 hover:underline"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span
                        aria-current={current ? "page" : undefined}
                        className="text-ink dark:text-night-text inline-flex min-h-11 items-center px-1"
                      >
                        {item.label}
                      </span>
                    )}
                  </li>
                </Fragment>
              );
            })}
          </ol>
        </nav>

        <div
          className={cn(
            compact ? "mt-3 md:mt-4" : "mt-5 md:mt-8",
            description
              ? cn(
                  "lg:grid lg:grid-cols-12 lg:gap-10",
                  // Ein Leitsatz steht unten bündig neben dem Titel; ein
                  // längerer Vorspann beginnt oben, sonst schwebt der Titel
                  // unter einer leeren Fläche.
                  leadVoice ? "lg:items-end" : "lg:items-start",
                )
              : undefined,
          )}
        >
          <div className="lg:col-span-7">
            <h1
              className={cn(
                "condensed text-ink dark:text-night-text font-extrabold text-balance",
                displayTitle
                  ? "text-[clamp(2.75rem,6vw,5.75rem)] leading-[0.9] tracking-[-0.01em]"
                  : "text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[0.95]",
              )}
            >
              {title}
            </h1>
            {meta ? (
              <p className="semi-condensed text-dark dark:text-night-muted mt-3 text-lg font-semibold">
                {meta}
              </p>
            ) : null}
            <span
              aria-hidden
              className={cn(
                "mt-5 block h-1.5 w-24",
                tone === "foerderverein"
                  ? "bg-foerderverein"
                  : "bg-ink dark:bg-night-text",
              )}
            />
          </div>

          {description ? (
            <div
              className={cn(
                "text-ink dark:text-night-text mt-6 lg:col-span-5 lg:mt-0",
                leadVoice
                  ? "semi-condensed max-w-[34ch] text-[clamp(1.25rem,1.9vw,1.625rem)] leading-snug font-medium text-pretty"
                  : "max-w-[62ch] text-lg leading-relaxed",
              )}
            >
              {description}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
