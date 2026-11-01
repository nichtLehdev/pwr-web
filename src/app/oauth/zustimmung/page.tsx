import type { Metadata } from "next";
import { redirect } from "next/navigation";

import PublicPage from "@/app/_components/general/public-page";
import { PageSection } from "@/app/_components/programmheft/page-section";
import { Note } from "@/app/_components/programmheft/note";
import { OAUTH_SCOPE_LABELS } from "@/lib/mcp-scopes";
import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";
import { ConsentForm } from "./consent-form";

export const metadata: Metadata = {
  title: "Zugriff erlauben",
  robots: { index: false, follow: false },
};

function single(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function hostOf(uri: string | null): string | null {
  if (!uri) return null;
  try {
    return new URL(uri).host;
  } catch {
    return null;
  }
}

/**
 * Hierher schickt better-auth, wenn ein KI-Client (über OAuth) Zugriff auf das
 * Konto möchte. Angezeigte Werte kommen aus der Datenbank bzw. der Anfrage;
 * die Entscheidung selbst prüft better-auth über die signierte Anfrage.
 */
export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const clientId = single(params.client_id);
  const client = clientId
    ? await db.oauthClient.findUnique({
        where: { clientId },
        select: { name: true, disabled: true },
      })
    : null;

  const scopes = (single(params.scope) ?? "").split(" ").filter(Boolean);
  const redirectHost = hostOf(single(params.redirect_uri));

  return (
    <PublicPage
      title="Zugriff erlauben"
      heroSize="compact"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Zugriff erlauben" },
      ]}
    >
      <PageSection flush="top">
        <div className="mx-auto max-w-md space-y-6">
          {!client || client.disabled ? (
            <Note tone="error">
              <p>
                Diese Anfrage ist ungültig oder abgelaufen. Starte die
                Verbindung in deiner KI-Anwendung bitte neu.
              </p>
            </Note>
          ) : (
            <>
              <p className="text-ink dark:text-night-text text-lg leading-relaxed">
                <strong className="font-semibold">
                  {client.name ?? "Eine unbekannte Anwendung"}
                </strong>{" "}
                möchte in deinem Namen auf die Seite des Posaunenwerks
                zugreifen.
              </p>

              <dl className="text-dark dark:text-night-muted space-y-1 text-sm">
                <div>
                  <dt className="inline font-semibold">Angemeldet als: </dt>
                  <dd className="inline">
                    {session.user.name || session.user.email}
                  </dd>
                </div>
                {redirectHost && (
                  <div>
                    <dt className="inline font-semibold">Leitet zurück zu: </dt>
                    <dd className="inline font-mono">{redirectHost}</dd>
                  </div>
                )}
              </dl>

              {scopes.length > 0 && (
                <div>
                  <p className="text-ink dark:text-night-text mb-2 font-semibold">
                    Die Anwendung darf dann:
                  </p>
                  <ul className="text-ink dark:text-night-text list-disc space-y-1 pl-5">
                    {scopes.map((scope) => (
                      <li key={scope}>{OAUTH_SCOPE_LABELS[scope] ?? scope}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Note>
                <p>
                  Die Anwendung kann nur, was du selbst auf der Seite darfst.
                  Erlaube den Zugriff nur, wenn du die Verbindung gerade selbst
                  gestartet hast. Unter Einstellungen kannst du sie jederzeit
                  wieder trennen.
                </p>
              </Note>

              <ConsentForm />
            </>
          )}
        </div>
      </PageSection>
    </PublicPage>
  );
}
