"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function UnsubscribePage() {
  const searchParams = useSearchParams();

  // Initialize email from URL params without using useEffect
  const initialEmail = useMemo(() => {
    const emailParam = searchParams.get("email");
    return emailParam ? decodeURIComponent(emailParam) : "";
  }, [searchParams]);

  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    if (!email) {
      setStatus("error");
      setMessage("Bitte gib eine E-Mail-Adresse ein.");
      return;
    }

    try {
      const response = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
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
    <main className="dark:bg-dark-background min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700">
          <h1 className="dark:text-dark-text mb-4 text-3xl font-bold text-gray-900">
            Newsletter abmelden
          </h1>
          <p className="dark:text-dark-muted mb-8 text-gray-600">
            Wir bedauern, dass du dich abmelden möchtest. Du kannst dich
            jederzeit wieder anmelden.
          </p>

          {status === "success" ? (
            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
              <p className="text-green-800 dark:text-green-400">{message}</p>
              <Link
                href="/newsletter"
                className="text-primary mt-4 inline-block hover:underline"
              >
                Wieder anmelden →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                >
                  E-Mail-Adresse
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:outline-none"
                  placeholder="deine@email.de"
                />
              </div>

              {status === "error" && message && (
                <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                  <p className="text-red-800 dark:text-red-400">{message}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full rounded-lg bg-red-600 px-6 py-3 font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "loading" ? "Wird abgemeldet..." : "Abmelden"}
              </button>
            </form>
          )}

          <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700">
            <p className="dark:text-dark-muted text-sm text-gray-600">
              <Link href="/newsletter" className="text-primary hover:underline">
                Zurück zur Anmeldung
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
