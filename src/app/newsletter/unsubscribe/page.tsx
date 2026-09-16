"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PublicPage from "../../_components/general/public-page";
import { PageSection } from "../../_components/programmheft/page-section";
import { Note } from "../../_components/programmheft/note";
import { ArrowLink } from "../../_components/programmheft/section-head";

const FIELD =
  "border-ink dark:border-night-text text-ink dark:text-night-text bg-paper dark:bg-night w-full border-2 px-4 py-3 text-base";
const FIELD_LABEL =
  "semi-condensed text-ink dark:text-night-text mb-2 block text-sm font-semibold";

const BREADCRUMBS = [
  { label: "Start", href: "/" },
  { label: "Newsletter", href: "/newsletter" },
  { label: "Abmelden" },
];

function UnsubscribeContent() {
  const searchParams = useSearchParams();

  const initialEmail = useMemo(() => {
    const emailParam = searchParams.get("email");
    return emailParam ? decodeURIComponent(emailParam) : "";
  }, [searchParams]);

  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    if (!email || !token) {
      setStatus("error");
      setMessage(
        "Ungültiger Abmeldelink. Bitte nutze den Link aus der Newsletter-E-Mail.",
      );
      return;
    }

    try {
      const response = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, token }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage("Du hast dich erfolgreich vom Newsletter abgemeldet.");
      } else {
        setStatus("error");
        setMessage(data.message || "Ein Fehler ist aufgetreten.");
      }
    } catch {
      setStatus("error");
      setMessage("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
    }
  };

  return (
    <PublicPage
      title="Newsletter abmelden"
      breadcrumbs={BREADCRUMBS}
      description={
        <p>
          Wir bedauern, dass du dich abmelden möchtest. Du kannst dich jederzeit
          wieder anmelden.
        </p>
      }
    >
      <PageSection>
        <div className="max-w-[38rem]">
          {status === "success" ? (
            <Note tone="info">
              <p>{message}</p>
              <ArrowLink href="/newsletter" className="mt-4 -ml-1">
                Wieder anmelden
              </ArrowLink>
            </Note>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className={FIELD_LABEL}>
                  E-Mail-Adresse
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={FIELD}
                  placeholder="deine@email.de"
                />
              </div>

              {status === "error" && message && (
                <Note tone="error">
                  <p>{message}</p>
                </Note>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="semi-condensed hover:text-paper dark:hover:text-night inline-flex min-h-12 w-full items-center justify-center border-2 border-red-700 px-6 text-lg font-semibold text-red-700 transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-400"
              >
                {status === "loading" ? "Wird abgemeldet…" : "Abmelden"}
              </button>
            </form>
          )}

          <div className="border-rule dark:border-night-rule mt-10 border-t pt-6">
            <ArrowLink href="/newsletter" className="-ml-1">
              Zurück zur Anmeldung
            </ArrowLink>
          </div>
        </div>
      </PageSection>
    </PublicPage>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <PublicPage title="Newsletter abmelden" breadcrumbs={BREADCRUMBS}>
          <PageSection>
            <div
              aria-busy="true"
              aria-label="Lädt"
              className="max-w-[38rem] space-y-3"
            >
              <span className="bg-rule dark:bg-night-rule block h-5 w-3/4" />
              <span className="bg-rule dark:bg-night-rule block h-12 w-full" />
            </div>
          </PageSection>
        </PublicPage>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
