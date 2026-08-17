"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { getErrorMessage } from "@/lib/utils";
import { MailCheck, MailIcon } from "lucide-react";

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
    <main className="bg-background-secondary dark:bg-dark-background-secondary min-h-[calc(100vh-4rem)] px-4 py-16">
      <div className="container mx-auto max-w-2xl">
        <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-dark dark:text-dark-text mb-4 text-3xl font-bold">
            Anmeldung verwalten
          </h1>

          {sent ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20">
              <MailCheck className="mb-3 h-8 w-8 text-green-600 dark:text-green-400" />
              <p className="mb-2 font-semibold text-green-800 dark:text-green-300">
                E-Mail unterwegs
              </p>
              <p className="text-sm text-green-800 dark:text-green-300">
                Falls es zu dieser Adresse Anmeldungen gibt, haben wir dir
                gerade einen Zugangslink geschickt. Schau bitte auch im
                Spam-Ordner nach.
              </p>
            </div>
          ) : (
            <>
              <p className="mb-8 text-gray-600 dark:text-gray-400">
                Du hast dich ohne Benutzerkonto für einen Kurs angemeldet? Gib
                hier die E-Mail-Adresse ein, mit der du dich angemeldet hast.
                Wir schicken dir einen Link, über den du deine Anmeldung
                ansehen, ändern oder stornieren kannst.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className="text-dark dark:text-dark-text mb-2 block text-sm font-medium"
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
                    className="dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text focus:border-primary focus:ring-primary block w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-1 focus:outline-none"
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                    <p className="text-sm text-red-800 dark:text-red-300">
                      {error}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={requestMutation.isPending}
                  className="bg-primary hover:bg-primary-dark inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold text-white transition-colors disabled:opacity-50"
                >
                  <MailIcon className="h-5 w-5" />
                  {requestMutation.isPending
                    ? "Wird gesendet..."
                    : "Zugangslink anfordern"}
                </button>
              </form>
            </>
          )}

          <p className="mt-8 border-t border-gray-200 pt-6 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
            Du hast ein Benutzerkonto?{" "}
            <Link
              href="/login?redirect=%2Fregistrations"
              className="text-primary font-medium hover:underline"
            >
              Melde dich an
            </Link>{" "}
            — dort findest du alle deine Anmeldungen auf einen Blick.
          </p>
        </div>
      </div>
    </main>
  );
}
