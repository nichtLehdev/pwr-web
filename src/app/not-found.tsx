import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PublicPage from "@/app/_components/general/public-page";
import { PageSection } from "@/app/_components/programmheft/page-section";

/** Primär- und Sekundäraktion, klassengleich mit `ui/button` (Nav-Links, kein Submit). */
const PRIMARY_LINK =
  "semi-condensed bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted inline-flex h-12 items-center justify-center px-6 text-lg font-semibold transition-colors";
const OUTLINE_LINK =
  "semi-condensed border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night inline-flex h-12 items-center justify-center border-2 bg-transparent px-6 text-lg font-semibold transition-colors";

export default function NotFound() {
  return (
    <PublicPage
      title="Seite nicht gefunden"
      heroSize="compact"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Seite nicht gefunden" },
      ]}
    >
      <PageSection flush="top" className="text-center">
        <div className="mx-auto max-w-xl">
          <p
            aria-hidden
            className="condensed text-primary-ink dark:text-primary text-[clamp(4rem,12vw,7rem)] leading-none font-extrabold"
          >
            404
          </p>
          <p className="text-ink dark:text-night-text mt-4 text-lg leading-relaxed">
            Die von Ihnen gesuchte Seite existiert leider nicht oder wurde
            verschoben.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/" className={PRIMARY_LINK}>
              <ArrowLeft className="mr-2 h-5 w-5" aria-hidden />
              Zur Startseite
            </Link>
            <Link href="/termine" className={OUTLINE_LINK}>
              Termine ansehen
            </Link>
          </div>

          <div className="border-rule dark:border-night-rule mt-12 border-t pt-8">
            <p className="text-dark dark:text-night-muted mb-4 text-sm">
              Vielleicht finden Sie hier, was Sie suchen:
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
              <Link href="/aktuelles" className="link-ink">
                Aktuelles
              </Link>
              <Link href="/termine" className="link-ink">
                Termine
              </Link>
              <Link href="/mitmachen" className="link-ink">
                Mitmachen
              </Link>
              <Link href="/ueber-uns" className="link-ink">
                Über uns
              </Link>
            </div>
          </div>
        </div>
      </PageSection>
    </PublicPage>
  );
}
