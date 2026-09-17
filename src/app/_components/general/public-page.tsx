import { type CSSProperties, type ReactNode } from "react";
import {
  PageHead,
  type Breadcrumb,
} from "@/app/_components/programmheft/page-head";
import { PageTitleBar } from "@/app/_components/programmheft/page-title-bar";

export type PublicPageBreadcrumb = Breadcrumb;

export interface PublicPageProps {
  /** Seitentitel; zugleich der `<h1>`, wenn `heroTitle` fehlt. */
  title: string;
  /** Ausführlicherer `<h1>`, z. B. „Unsere Posaunenwarte“ statt „Posaunenwarte“. */
  heroTitle?: string;
  /** Förderverein-Seiten sprechen mit blauem Satzstrich. */
  tone?: "default" | "foerderverein";
  /** Brotkrumen, z. B. Start, Über uns, aktuelle Seite. */
  breadcrumbs: PublicPageBreadcrumb[];
  /** Leitsatz oder Vorspann neben dem Titel. */
  description?: ReactNode;
  /**
   * `compact`: kleinerer Titel und weniger Luft (Detail- und Formularseiten).
   * Weicht `heroTitle` vom `title` ab, steht `title` als Zusatz unter dem
   * `<h1>` (z. B. „Anmeldung“ unter dem Kurstitel).
   */
  heroSize?: "default" | "compact";
  /**
   * `false` für Seiten, die selbst eine klebende Leiste mit dem Seitentitel
   * mitbringen (Termine, Aktuelles) — sonst stünden zwei Streifen übereinander.
   */
  stickyTitle?: boolean;
  children: ReactNode;
}

/**
 * Hülle der öffentlichen Innenseiten im Programmheft: Seitenkopf auf Papier
 * mit genau einem `<h1>`, darunter die Abschnitte der Seite. Setzt Archivo,
 * Markierung und Fokusring für die ganze Seite — auch für Abschnitte, die
 * noch nicht ins Programmheft übertragen sind.
 */
export default function PublicPage({
  title,
  heroTitle,
  tone = "default",
  breadcrumbs,
  description,
  heroSize = "default",
  stickyTitle = true,
  children,
}: PublicPageProps) {
  const heading = heroTitle ?? title;
  const meta =
    heroSize === "compact" && heroTitle != null && heroTitle !== title
      ? title
      : undefined;

  return (
    <div
      className="programm font-programm bg-paper text-ink dark:bg-night dark:text-night-text flex min-h-screen flex-col"
      // Höhe des Kolumnentitels (h-11 plus Haarlinie). Alles Klebende
      // (`.sticky-below-nav`) rechnet sie ein — sonst klebt es unter dem
      // Streifen und die erste Zeile ist verdeckt.
      style={
        stickyTitle
          ? ({
              "--kolumnentitel-hoehe": "calc(2.75rem + 1px)",
            } as CSSProperties)
          : undefined
      }
    >
      <PageHead
        title={heading}
        meta={meta}
        breadcrumbs={breadcrumbs}
        description={description}
        size={heroSize}
        tone={tone}
      />
      {stickyTitle ? <PageTitleBar title={heading} /> : null}
      {children}
    </div>
  );
}
