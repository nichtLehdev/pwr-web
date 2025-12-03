"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import PageHeader from "../../_components/general/page-header";
import LoadingSpinner from "../../_components/general/loading-spinner";

export default function BlechblattPage() {
  const { data: editions, isLoading } =
    api.materials.getBlechblattEditions.useQuery();

  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(
    null,
  );

  // Compute selected edition - use first edition as default if none selected
  const selectedEdition = useMemo(() => {
    if (!editions || editions.length === 0) return null;
    if (selectedEditionId) {
      return editions.find((e) => e.id === selectedEditionId) ?? editions[0]!;
    }
    return editions[0]!;
  }, [editions, selectedEditionId]);

  const pdfUrl = selectedEdition?.fileUrl ?? null;

  const handleEditionChange = (editionId: string) => {
    setSelectedEditionId(editionId);
  };

  return (
    <div>
      <PageHeader title="Rheinisches Blechblatt" color="primary" />

      {/* Hero Section */}
      <section className="bg-primary py-12 text-white md:py-16 lg:py-20">
        <div className="container">
          <nav className="mb-4 flex items-center gap-2 text-sm opacity-90">
            <Link href="/" className="transition-colors hover:text-white">
              Start
            </Link>
            <span>/</span>
            <Link
              href="/materialien"
              className="transition-colors hover:text-white"
            >
              Materialien
            </Link>
            <span>/</span>
            <span>Rheinisches Blechblatt</span>
          </nav>
          <div className="max-w-3xl">
            <h1 className="mb-6 text-3xl font-bold md:text-4xl lg:text-5xl">
              Rheinisches Blechblatt
            </h1>
            <p className="text-lg leading-relaxed opacity-95 md:text-xl">
              Das Rheinische Blechblatt ist unser Magazin für die
              Posaunenchorarbeit. Es erscheint vierteljährlich und enthält
              Berichte, Termine, Neuigkeiten und Impulse aus dem gesamten
              Posaunenwerk Rheinland.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          {isLoading ? (
            <LoadingSpinner text="Blechblatt-Ausgaben werden geladen..." />
          ) : editions && editions.length > 0 ? (
            <div className="mx-auto max-w-7xl">
              {/* Edition Selector */}
              <div className="mb-8">
                <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <label
                        htmlFor="edition-select"
                        className="text-dark dark:text-dark-text mb-2 block text-sm font-semibold"
                      >
                        Ausgabe wählen
                      </label>
                      <select
                        id="edition-select"
                        value={selectedEdition?.id ?? ""}
                        onChange={(e) => handleEditionChange(e.target.value)}
                        className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-transparent focus:ring-2 lg:w-96"
                      >
                        {editions.map((edition) => (
                          <option key={edition.id} value={edition.id}>
                            {edition.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Edition Info */}
                    {selectedEdition && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedEdition.description && (
                          <p className="max-w-md">
                            {selectedEdition.description}
                          </p>
                        )}
                        {selectedEdition.fileSize && (
                          <p className="mt-1 text-xs">
                            PDF •{" "}
                            {selectedEdition.fileSize >= 1048576
                              ? `${(selectedEdition.fileSize / 1048576).toFixed(1)} MB`
                              : `${(selectedEdition.fileSize / 1024).toFixed(1)} KB`}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* PDF Viewer */}
              {pdfUrl && (
                <div className="dark:bg-dark-surface dark:border-dark-border overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div className="dark:bg-dark-background-secondary flex items-center justify-between border-b border-gray-200 bg-gray-100 px-4 py-3 dark:border-gray-700">
                    <h2 className="text-dark dark:text-dark-text font-semibold">
                      {selectedEdition?.title ?? "PDF-Vorschau"}
                    </h2>
                    <div className="flex items-center gap-2">
                      <Link
                        href={selectedEdition?.fileUrl ?? "#"}
                        download
                        className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        Herunterladen
                      </Link>
                    </div>
                  </div>
                  <div className="relative w-full" style={{ height: "80vh" }}>
                    <object
                      data={pdfUrl}
                      type="application/pdf"
                      className="h-full w-full"
                    >
                      {/* Fallback for browsers that don't support object/embed */}
                      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                        <svg
                          className="text-primary mb-4 h-16 w-16"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <p className="text-dark dark:text-dark-text mb-4 text-lg font-semibold">
                          PDF-Vorschau nicht verfügbar
                        </p>
                        <p className="mb-6 text-gray-600 dark:text-gray-400">
                          Ihr Browser unterstützt die PDF-Vorschau nicht direkt.
                        </p>
                        <Link
                          href={pdfUrl}
                          download
                          className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold text-white transition-colors"
                        >
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                          PDF herunterladen
                        </Link>
                      </div>
                    </object>
                  </div>
                </div>
              )}

              {/* All Editions Grid */}
              <div className="mt-12">
                <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold">
                  Alle Ausgaben
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {editions.map((edition) => (
                    <button
                      key={edition.id}
                      onClick={() => handleEditionChange(edition.id)}
                      className={`dark:border-dark-border rounded-lg border p-4 text-left transition-all ${
                        selectedEdition?.id === edition.id
                          ? "border-primary bg-primary/5 dark:bg-primary/10 ring-primary ring-2"
                          : "dark:bg-dark-surface border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm dark:hover:border-gray-600"
                      }`}
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <div className="bg-primary/10 text-primary rounded px-2 py-1 text-xs font-semibold">
                          PDF
                        </div>
                        {selectedEdition?.id === edition.id && (
                          <svg
                            className="text-primary h-5 w-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                      <h3 className="text-dark dark:text-dark-text line-clamp-2 font-semibold">
                        {edition.title}
                      </h3>
                      {edition.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                          {edition.description}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                        {new Date(edition.createdAt).toLocaleDateString(
                          "de-DE",
                          {
                            year: "numeric",
                            month: "long",
                          },
                        )}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="py-16 text-center">
              <div className="bg-primary/10 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full">
                <svg
                  className="text-primary h-10 w-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h2 className="text-dark dark:text-dark-text mb-4 text-2xl font-bold">
                Keine Ausgaben verfügbar
              </h2>
              <p className="mx-auto mb-8 max-w-md text-gray-600 dark:text-gray-400">
                Aktuell sind keine Blechblatt-Ausgaben online verfügbar. Bitte
                schauen Sie später noch einmal vorbei.
              </p>
              <Link
                href="/materialien"
                className="text-primary hover:text-primary/80 inline-flex items-center gap-2 font-semibold transition-colors"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Zurück zu Materialien
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Info Section */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-8 md:grid-cols-2">
              {/* About Blechblatt */}
              <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                  <svg
                    className="text-primary h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                    />
                  </svg>
                </div>
                <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-bold">
                  Über das Blechblatt
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Das Rheinische Blechblatt erscheint viermal im Jahr und
                  informiert über alle wichtigen Ereignisse, Termine und
                  Neuigkeiten aus dem Posaunenwerk Rheinland. Es ist das
                  zentrale Kommunikationsmedium für unsere Mitglieder.
                </p>
              </div>

              {/* Subscription Info */}
              <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                  <svg
                    className="text-primary h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-bold">
                  Beiträge einreichen
                </h3>
                <p className="mb-4 text-gray-600 dark:text-gray-400">
                  Sie haben eine Nachricht aus Ihrem Chor, möchten einen Bericht
                  verfassen oder haben Anregungen für das Blechblatt? Wir freuen
                  uns über Ihre Beiträge!
                </p>
                <Link
                  href="/kontakt"
                  className="text-primary hover:text-primary/80 inline-flex items-center gap-2 font-semibold transition-colors"
                >
                  Kontakt aufnehmen
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-12 text-white md:py-16">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">
              Weitere Materialien entdecken
            </h2>
            <p className="mb-8 text-lg opacity-95">
              Entdecken Sie weitere Materialien wie Bläserhefte, Noten und
              Übungen für Ihre Posaunenchorarbeit.
            </p>
            <Link
              href="/materialien"
              className="text-primary inline-flex items-center rounded-lg bg-white px-8 py-4 font-bold shadow-lg transition-colors hover:bg-gray-100"
            >
              Alle Materialien ansehen
              <svg
                className="ml-2 h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
