"use client";

import { useState } from "react";
import Link from "next/link";
import PublicPage from "../_components/general/public-page";
import { PageSection } from "../_components/programmheft/page-section";
import { Note } from "../_components/programmheft/note";

const FIELD =
  "border-ink dark:border-night-text text-ink dark:text-night-text bg-paper dark:bg-night w-full border-2 px-4 py-3 text-base";
const FIELD_LABEL =
  "semi-condensed text-ink dark:text-night-text mb-2 block text-sm font-semibold";

export default function NewsletterPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, name: name || undefined }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(
          data.message ??
            "Fast geschafft: Bitte bestätige deine Anmeldung über den Link in der E-Mail.",
        );
        setEmail("");
        setName("");
        setConsent(false);
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
      title="Newsletter abonnieren"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Newsletter abonnieren" },
      ]}
      description={
        <p>
          Bleibe auf dem Laufenden über neue Beiträge, kommende Termine und
          wichtige Informationen vom Posaunenwerk Rheinland.
        </p>
      }
    >
      {/* Formular links, die Zusicherungen als Randnotiz rechts daneben —
          sonst steht die halbe Seite leer. */}
      <PageSection flush="top">
        <div className="lg:grid lg:grid-cols-12 lg:gap-10">
          <div className="max-w-[38rem] lg:col-span-7">
            <p className="text-ink dark:text-night-text text-lg leading-relaxed">
              Nach dem Absenden erhältst du eine E-Mail mit einem
              Bestätigungslink. Erst wenn du ihn öffnest, ist die Anmeldung
              aktiv (Double-Opt-In).
            </p>

            {status === "success" ? (
              <Note
                tone="info"
                title="Bitte bestätige deine Anmeldung"
                className="mt-8"
              >
                <p>{message}</p>
                <p className="mt-3">
                  Ohne diese Bestätigung schicken wir dir nichts. Schau bitte
                  auch im Spam-Ordner nach — der Link ist 7 Tage gültig.
                </p>
              </Note>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div>
                  <label htmlFor="email" className={FIELD_LABEL}>
                    E-Mail-Adresse *
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

                <div>
                  <label htmlFor="name" className={FIELD_LABEL}>
                    Name (optional)
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={FIELD}
                    placeholder="Dein Name"
                  />
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="consent"
                    name="consent"
                    required
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="accent-ink dark:accent-primary mt-1 h-5 w-5 shrink-0"
                  />
                  <label
                    htmlFor="consent"
                    className="text-ink dark:text-night-text text-sm leading-relaxed"
                  >
                    Ich möchte den Newsletter des Posaunenwerks Rheinland per
                    E-Mail erhalten und habe die{" "}
                    <Link href="/datenschutz" className="link-ink">
                      Datenschutzerklärung
                    </Link>{" "}
                    zur Kenntnis genommen. Diese Einwilligung kann ich jederzeit
                    über den Abmeldelink in jedem Newsletter widerrufen. *
                  </label>
                </div>

                {status === "error" && message && (
                  <Note tone="error">
                    <p>{message}</p>
                  </Note>
                )}

                {/* Nicht deaktiviert, solange die Einwilligung fehlt: ein von
                    Anfang an grauer Knopf sieht kaputt aus und sagt nicht,
                    was fehlt. Das `required` am Kästchen bringt den Browser
                    dazu, genau dort hinzuspringen. */}
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="semi-condensed bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper inline-flex min-h-12 w-full items-center justify-center px-6 text-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === "loading" ? "Wird abonniert…" : "Abonnieren"}
                </button>
              </form>
            )}
          </div>

          <aside className="border-rule dark:border-night-rule mt-10 border-t pt-6 lg:col-span-4 lg:col-start-9 lg:mt-0">
            <p className="text-dark dark:text-night-muted text-sm leading-relaxed">
              Du kannst dich jederzeit wieder abmelden. Der Newsletter enthält
              keine Werbung und wird nur bei wichtigen Neuigkeiten versendet.
            </p>
            <p className="mt-2 text-sm">
              <Link href="/datenschutz" className="link-ink">
                Datenschutzerklärung
              </Link>
            </p>
          </aside>
        </div>
      </PageSection>
    </PublicPage>
  );
}
