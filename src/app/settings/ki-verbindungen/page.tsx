import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import PublicPage from "@/app/_components/general/public-page";
import { PageSection } from "@/app/_components/programmheft/page-section";
import { Heading } from "@/app/_components/programmheft/section-head";
import { getSession } from "@/server/better-auth/server";
import { MCP_RESOURCE } from "@/server/better-auth/urls";
import { ConnectionList } from "./connection-list";
import { CopyField } from "./copy-field";

export const metadata: Metadata = {
  title: "KI-Verbindungen",
  robots: { index: false, follow: false },
};

export default async function AiConnectionsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login?redirect=%2Fsettings%2Fki-verbindungen");

  return (
    <PublicPage
      title="KI-Verbindungen"
      heroSize="compact"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Einstellungen", href: "/settings" },
        { label: "KI-Verbindungen" },
      ]}
      description={
        <p>
          Beiträge, Termine, Kurse und Ensembles mit einem KI-Assistenten wie
          Claude pflegen
        </p>
      }
    >
      <PageSection flush="top">
        <Link
          href="/settings"
          className="semi-condensed text-primary-ink dark:text-primary inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Zurück zu Einstellungen
        </Link>

        <div className="mt-6 max-w-2xl space-y-10">
          <section className="space-y-4">
            <Heading as="h2" size="list" rule>
              Verbinden
            </Heading>
            <p className="text-ink dark:text-night-text">
              Trage diese Adresse in deinem KI-Assistenten als MCP-Server ein.
              Beim ersten Verbinden meldest du dich hier an und erlaubst den
              Zugriff. Der Assistent kann danach nur, was du selbst auf der
              Seite darfst.
            </p>
            <CopyField value={MCP_RESOURCE} label="MCP-Server-Adresse" />
            <ul className="text-dark dark:text-night-muted list-disc space-y-2 pl-5 text-sm">
              <li>
                <strong className="font-semibold">
                  Claude (Web, Desktop, App):
                </strong>{" "}
                Einstellungen → Konnektoren → Benutzerdefinierten Konnektor
                hinzufügen, Adresse einfügen.
              </li>
              <li>
                <strong className="font-semibold">Claude Code:</strong>{" "}
                <code className="font-mono break-all">
                  claude mcp add --transport http posaunenwerk {MCP_RESOURCE}
                </code>
                , danach in Claude Code <code className="font-mono">/mcp</code>{" "}
                aufrufen und anmelden.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <Heading as="h2" size="list" rule>
              Verbundene Anwendungen
            </Heading>
            <ConnectionList />
          </section>
        </div>
      </PageSection>
    </PublicPage>
  );
}
