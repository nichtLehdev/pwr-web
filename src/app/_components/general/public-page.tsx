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
  breadcrumbs: PublicPageBreadcrumb[];
  /** Leitsatz oder Vorspann neben dem Titel. */
  description?: ReactNode;
  /** `compact`: kleinerer Titel; weicht `heroTitle` ab, steht `title` als Zusatz unter dem `<h1>`. */
  heroSize?: "default" | "compact";
  /** `false` für Seiten mit eigener klebender Titelleiste (Termine, Aktuelles). */
  stickyTitle?: boolean;
  children: ReactNode;
}

/** Hülle der öffentlichen Innenseiten: Seitenkopf mit genau einem `<h1>`, darunter die Abschnitte. */
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
      // Höhe des Kolumnentitels; `.sticky-below-nav` rechnet sie ein.
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
