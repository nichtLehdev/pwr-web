"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { getErrorMessage } from "@/lib/utils";
import { MailCheck, MailIcon } from "lucide-react";
import PublicPage from "@/app/_components/general/public-page";
import { Note } from "@/app/_components/programmheft/note";

/**
 * Self-service entry point for people who registered for a course without a
 * user account: they enter their e-mail address and receive a magic link per
 * anmeldung. The mail itself carries the same links, so this page exists for
 * the "I deleted the mail" and "the link expired" cases.
 */
export default function ManageRegistrationPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const requestMutation = api.registrations.requestAccessLink.useMutation({
    onSuccess: () => {
      setSent(true);
      setError("");
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    requestMutation.mutate({ email: email.trim() });
  };

  return (
    <PublicPage
      title="Anmeldung verwalten"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Anmeldung verwalten" },
      ]}
      heroSize="compact"
      description={
        <p>Zugangslink für eine Kursanmeldung ohne Benutzerkonto anfordern.</p>
      }
    >
      <div className="sheet max-w-xl py-10 md:py-14">
        {sent ? (
          <Note tone="important" title="E-Mail unterwegs" titleAs="h3">
            <p className="flex items-start gap-2">
              <MailCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              Falls es zu dieser Adresse Anmeldungen gibt, haben wir dir gerade
              einen Zugangslink geschickt. Schau bitte auch im Spam-Ordner nach.
            </p>
          </Note>
        ) : (
          <>
            <p className="text-ink dark:text-night-text max-w-[65ch] text-lg leading-relaxed">
              Du hast dich ohne Benutzerkonto für einen Kurs angemeldet? Gib
              hier die E-Mail-Adresse ein, mit der du dich angemeldet hast. Wir
              schicken dir einen Link, über den du deine Anmeldung ansehen,
              ändern oder stornieren kannst.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="text-ink dark:text-night-text mb-1 block text-sm font-semibold"
                >
                  E-Mail-Adresse
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@beispiel.de"
                  className="border-ink dark:border-night-text bg-paper text-ink dark:bg-night dark:text-night-text min-h-11 w-full border-2 px-3 py-2 text-base"
                />
              </div>

              {error && (
                <Note tone="error">
                  <p>{error}</p>
                </Note>
              )}

              <button
                type="submit"
                disabled={requestMutation.isPending}
                className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper semi-condensed inline-flex min-h-12 w-full items-center justify-center gap-3 px-6 text-lg font-semibold transition-colors disabled:opacity-50"
              >
                <MailIcon className="h-5 w-5 shrink-0" aria-hidden />
                {requestMutation.isPending
                  ? "Wird gesendet..."
                  : "Zugangslink anfordern"}
              </button>
            </form>
          </>
        )}

        <p className="border-rule dark:border-night-rule text-dark dark:text-night-muted mt-8 border-t pt-6 text-sm">
          Du hast ein Benutzerkonto?{" "}
          <Link href="/login?redirect=%2Fregistrations" className="link-ink">
            Melde dich an
          </Link>{" "}
          — dort findest du alle deine Anmeldungen auf einen Blick.
        </p>
      </div>
    </PublicPage>
  );
}
