import type { Metadata } from "next";
import { headers } from "next/headers";
import { Wrench } from "lucide-react";
import { resolveMaintenance } from "@/server/maintenance";
import { MAINTENANCE_DEFAULT_MESSAGE } from "@/lib/maintenance";

/**
 * Wartungsseite. Wird von der Middleware per Rewrite ausgeliefert, die
 * angefragte Adresse bleibt dabei stehen.
 *
 * Bewusst ohne Navigation und ohne Datenbank-Inhalte: Sie soll auch dann noch
 * stehen, wenn an der Seite gerade geschraubt wird.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wartungsarbeiten",
  description: "Diese Seite wird gerade gewartet.",
  robots: { index: false, follow: false },
};

function formatUntil(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export default async function WartungPage() {
  const verdict = await resolveMaintenance(await headers());
  const until = formatUntil(verdict.until);

  return (
    <div className="bg-background dark:bg-dark-background flex min-h-[80vh] items-center py-12 md:py-16 lg:py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-8">
            <div className="bg-primary/10 dark:bg-primary/20 mx-auto inline-flex h-24 w-24 items-center justify-center rounded-full">
              <Wrench className="text-primary h-12 w-12" />
            </div>
          </div>

          <h1 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl lg:text-4xl">
            Wartungsarbeiten
          </h1>

          <p className="text-dark-light dark:text-dark-text-secondary mb-8 text-lg">
            {verdict.message || MAINTENANCE_DEFAULT_MESSAGE}
          </p>

          {until && (
            <p className="text-dark-light dark:text-dark-text-secondary mb-8 text-sm">
              Voraussichtlich bis <strong>{until}</strong>.
            </p>
          )}

          <div className="dark:border-dark-border mt-12 border-t border-gray-200 pt-8">
            <p className="text-dark-light dark:text-dark-text-secondary text-sm">
              In dringenden Fällen erreichen Sie uns unter{" "}
              <a
                href="mailto:info@posaunenwerk-rheinland.de"
                className="text-primary hover:text-primary-dark dark:text-primary-light font-medium transition-colors"
              >
                info@posaunenwerk-rheinland.de
              </a>{" "}
              oder telefonisch unter{" "}
              <a
                href="tel:02613000011"
                className="text-primary hover:text-primary-dark dark:text-primary-light font-medium transition-colors"
              >
                0261 3000011
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
