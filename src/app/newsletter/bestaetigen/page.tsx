"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * Step two of the double opt-in. The click happens here rather than straight
 * from the mail: link scanners and mail-security prefetchers follow GET links
 * on their own, and a subscription confirmed by a robot is no confirmation.
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
    <main className="dark:bg-dark-background min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700">
          <h1 className="dark:text-dark-text mb-4 text-3xl font-bold text-gray-900">
            Newsletter-Anmeldung bestätigen
          </h1>

          {status === "success" ? (
            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
              <p className="text-green-800 dark:text-green-400">{message}</p>
              <p className="mt-2 text-sm text-green-800 dark:text-green-400">
                Du kannst dich jederzeit über den Link am Ende jedes Newsletters
                wieder abmelden.
              </p>
              <Link
                href="/"
                className="text-primary mt-4 inline-block hover:underline"
              >
                Zur Startseite →
              </Link>
            </div>
          ) : (
            <>
              <p className="dark:text-dark-muted mb-8 text-gray-600">
                {email ? (
                  <>
                    Bitte bestätige, dass du den Newsletter des Posaunenwerks
                    Rheinland an <strong>{email}</strong> erhalten möchtest.
                  </>
                ) : (
                  "Dieser Link ist unvollständig. Bitte öffne den Bestätigungslink aus der E-Mail erneut."
                )}
              </p>

              {status === "error" && (
                <div className="mb-6 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                  <p className="text-red-800 dark:text-red-400">{message}</p>
                  <Link
                    href="/newsletter"
                    className="text-primary mt-2 inline-block text-sm hover:underline"
                  >
                    Erneut anmelden →
                  </Link>
                </div>
              )}

              <button
                type="button"
                onClick={handleConfirm}
                disabled={status === "loading" || !email || !token}
                className="bg-primary hover:bg-primary/90 w-full rounded-lg px-6 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "loading"
                  ? "Wird bestätigt..."
                  : "Anmeldung bestätigen"}
              </button>
            </>
          )}

          <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700">
            <p className="dark:text-dark-muted text-sm text-gray-600">
              Du hast dich nicht angemeldet? Dann schließe diese Seite einfach —
              ohne Bestätigung versenden wir nichts an diese Adresse.
            </p>
            <p className="dark:text-dark-muted mt-2 text-sm text-gray-600">
              <Link
                href="/datenschutz"
                className="text-primary hover:underline"
              >
                Datenschutzerklärung
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function NewsletterConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmContent />
    </Suspense>
  );
}
