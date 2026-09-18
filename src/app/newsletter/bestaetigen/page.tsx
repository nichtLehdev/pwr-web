"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PublicPage from "../../_components/general/public-page";
import { PageSection } from "../../_components/programmheft/page-section";
import { Note } from "../../_components/programmheft/note";
import { ArrowLink } from "../../_components/programmheft/section-head";

/**
 * Double opt-in, step two. Confirmed by a click here, not by the mail's GET link:
 * link scanners and mail-security prefetchers follow those on their own.
 */
function ConfirmContent() {
  const searchParams = useSearchParams();

  const email = useMemo(() => {
    const emailParam = searchParams.get("email");
    return emailParam ? decodeURIComponent(emailParam) : "";
  }, [searchParams]);

  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const handleConfirm = async () => {
    setStatus("loading");
    setMessage("");

    if (!email || !token) {
      setStatus("error");
      setMessage(
        "Ungültiger Bestätigungslink. Bitte nutze den Link aus der E-Mail.",
      );
      return;
    }

    try {
      const response = await fetch("/api/newsletter/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message ?? "Deine Anmeldung ist bestätigt.");
      } else {
        setStatus("error");
        setMessage(data.message ?? "Ein Fehler ist aufgetreten.");
      }
    } catch {
      setStatus("error");
      setMessage("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
    }
  };

  return (
    <PublicPage
      title="Newsletter-Anmeldung bestätigen"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Newsletter", href: "/newsletter" },
        { label: "Bestätigen" },
      ]}
    >
      <PageSection>
        <div className="max-w-[38rem]">
          {status === "success" ? (
            <Note tone="info">
              <p>{message}</p>
              <p className="mt-3">
                Du kannst dich jederzeit über den Link am Ende jedes Newsletters
                wieder abmelden.
              </p>
              <ArrowLink href="/" className="mt-4 -ml-1">
                Zur Startseite
              </ArrowLink>
            </Note>
          ) : (
            <>
              <p className="text-ink dark:text-night-text text-lg leading-relaxed">
                {email ? (
                  <>
                    Bitte bestätige, dass du den Newsletter des Posaunenwerks
                    Rheinland an{" "}
                    <strong className="font-semibold">{email}</strong> erhalten
                    möchtest.
                  </>
                ) : (
                  "Dieser Link ist unvollständig. Bitte öffne den Bestätigungslink aus der E-Mail erneut."
                )}
              </p>

              {status === "error" && (
                <Note tone="error" className="mt-6">
                  <p>{message}</p>
                  <ArrowLink href="/newsletter" className="mt-3 -ml-1">
                    Erneut anmelden
                  </ArrowLink>
                </Note>
              )}

              <button
                type="button"
                onClick={handleConfirm}
                disabled={status === "loading" || !email || !token}
                className="semi-condensed bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper mt-8 inline-flex min-h-12 w-full items-center justify-center px-6 text-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "loading"
                  ? "Wird bestätigt…"
                  : "Anmeldung bestätigen"}
              </button>
            </>
          )}

          <div className="border-rule dark:border-night-rule mt-10 border-t pt-6">
            <p className="text-dark dark:text-night-muted text-sm leading-relaxed">
              Du hast dich nicht angemeldet? Dann schließe diese Seite einfach —
              ohne Bestätigung versenden wir nichts an diese Adresse.
            </p>
            <p className="mt-2 text-sm">
              <Link href="/datenschutz" className="link-ink">
                Datenschutzerklärung
              </Link>
            </p>
          </div>
        </div>
      </PageSection>
    </PublicPage>
  );
}

export default function NewsletterConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmContent />
    </Suspense>
  );
}
