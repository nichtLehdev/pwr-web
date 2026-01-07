"use client";

import { useState } from "react";
import Link from "next/link";

export default function NewsletterPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
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
        setMessage("Erfolgreich zum Newsletter angemeldet!");
        setEmail("");
        setName("");
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
            Newsletter abonnieren
          </h1>
          <p className="dark:text-dark-muted mb-8 text-gray-600">
            Bleibe auf dem Laufenden über neue Beiträge, kommende Termine und
            wichtige Informationen vom Posaunenwerk Rheinland.
          </p>

          {status === "success" ? (
            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
              <p className="text-green-800 dark:text-green-400">{message}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                >
                  E-Mail-Adresse *
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

              <div>
                <label
                  htmlFor="name"
                  className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                >
                  Name (optional)
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:outline-none"
                  placeholder="Dein Name"
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
                className="bg-primary hover:bg-primary/90 w-full rounded-lg px-6 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "loading" ? "Wird abonniert..." : "Abonnieren"}
              </button>
            </form>
          )}

          <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700">
            <p className="dark:text-dark-muted text-sm text-gray-600">
              Du kannst dich jederzeit wieder abmelden. Der Newsletter enthält
              keine Werbung und wird nur bei wichtigen Neuigkeiten versendet.
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
