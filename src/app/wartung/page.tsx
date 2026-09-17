import type { Metadata } from "next";
import { headers } from "next/headers";
import { Wrench } from "lucide-react";
import { resolveMaintenance } from "@/server/maintenance";
import { MAINTENANCE_DEFAULT_MESSAGE } from "@/lib/maintenance";

/** Wird vom Proxy per Rewrite ausgeliefert; bewusst ohne Navigation. */
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
    <div className="programm font-programm bg-paper text-ink dark:bg-night dark:text-night-text flex min-h-screen items-center">
      <div className="sheet py-16 text-center md:py-24">
        <div className="mx-auto max-w-2xl">
          <Wrench
            className="text-primary-ink dark:text-primary mx-auto h-12 w-12"
            aria-hidden
          />

          <h1 className="condensed mt-6 text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[0.95] font-extrabold">
            Wartungsarbeiten
          </h1>

          <p className="mt-6 text-lg leading-relaxed">
            {verdict.message || MAINTENANCE_DEFAULT_MESSAGE}
          </p>

          {until && (
            <p className="text-dark dark:text-night-muted mt-4 text-sm">
              Voraussichtlich bis{" "}
              <strong className="font-semibold">{until}</strong>.
            </p>
          )}

          <p className="border-ink dark:border-night-rule text-dark dark:text-night-muted mt-12 border-t-2 pt-8 text-sm">
            In dringenden Fällen erreichen Sie uns unter{" "}
            <a
              href="mailto:info@posaunenwerk-rheinland.de"
              className="link-ink"
            >
              info@posaunenwerk-rheinland.de
            </a>{" "}
            oder telefonisch unter{" "}
            <a href="tel:02613000011" className="link-ink">
              0261 3000011
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
