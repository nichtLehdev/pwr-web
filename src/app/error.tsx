"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import PublicPage from "@/app/_components/general/public-page";
import { PageSection } from "@/app/_components/programmheft/page-section";

/** Für den „Zur Startseite"-Link, damit er wie der Button danebensteht. */
const OUTLINE_LINK =
  "semi-condensed border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night inline-flex h-12 items-center justify-center border-2 bg-transparent px-6 text-lg font-semibold transition-colors";

/**
 * Fängt Render-Fehler unterhalb von `app/` ab; das Root-Layout bleibt stehen.
 * Fehler im Root-Layout selbst fängt `global-error.tsx`.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unbehandelter Fehler:", error);
  }, [error]);

  return (
    <PublicPage
      title="Da ist etwas schiefgelaufen"
      heroSize="compact"
      breadcrumbs={[{ label: "Start", href: "/" }, { label: "Fehler" }]}
    >
      <PageSection flush="top" className="text-center">
        <div className="mx-auto max-w-xl">
          <p className="text-ink dark:text-night-text text-lg leading-relaxed">
            Diese Seite konnte nicht geladen werden. Meist hilft es schon, es
            noch einmal zu versuchen.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Button type="button" onClick={reset} size="lg">
              <RefreshCw className="mr-2 h-5 w-5" aria-hidden />
              Erneut versuchen
            </Button>
            <Link href="/" className={OUTLINE_LINK}>
              <ArrowLeft className="mr-2 h-5 w-5" aria-hidden />
              Zur Startseite
            </Link>
          </div>

          <div className="border-rule dark:border-night-rule mt-12 border-t pt-8">
            <p className="text-dark dark:text-night-muted mb-4 text-sm">
              Bleibt der Fehler bestehen, melden Sie sich gerne bei uns:
            </p>
            <Link href="/kontakt" className="link-ink text-sm">
              Zum Kontaktformular
            </Link>
            {error.digest && (
              <p className="text-dark dark:text-night-muted mt-4 font-mono text-xs">
                Fehlerkennung: {error.digest}
              </p>
            )}
          </div>
        </div>
      </PageSection>
    </PublicPage>
  );
}
