"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import PublicPage from "../../_components/general/public-page";
import LoadingSpinner from "../../_components/general/loading-spinner";
import { ArrowLeftIcon, CheckIcon, DownloadIcon, FileIcon } from "lucide-react";
import { ArrowRightIcon } from "lucide-react";

export default function BlechblattPage() {
  const { data: editions, isLoading } =
    api.materials.getBlechblattEditions.useQuery();

  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(
    null,
  );
  const [pdfKey, setPdfKey] = useState(0);

  const selectedEdition = useMemo(() => {
    if (!editions || editions.length === 0) return null;
    if (selectedEditionId) {
      return editions.find((e) => e.id === selectedEditionId) ?? editions[0]!;
    }
    return editions[0]!;
  }, [editions, selectedEditionId]);

  const pdfUrl = selectedEdition?.fileUrl ?? null;

  const pdfUrlWithCacheBust = pdfUrl
    ? `${pdfUrl}${pdfUrl.includes("?") ? "&" : "?"}t=${pdfKey}`
    : null;

  const handleEditionChange = (editionId: string) => {
    setSelectedEditionId(editionId);

    setPdfKey((prev) => prev + 1);
  };

  return (
    <PublicPage
      title="Rheinisches Blechblatt"
      color="primary"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Materialien", href: "/materialien" },
        { label: "Rheinisches Blechblatt" },
      ]}
      description={
        <p>
          Das Rheinische Blechblatt ist unser Magazin für die
          Posaunenchorarbeit. Es erscheint vierteljährlich und enthält
          Berichte, Termine, Neuigkeiten und Impulse aus dem gesamten
          Posaunenwerk Rheinland.
        </p>
      }
    >
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
                        <DownloadIcon className="h-4 w-4" />
                        Herunterladen
                      </Link>
                    </div>
                  </div>
                  <div className="relative w-full" style={{ height: "80vh" }}>
                    <embed
                      key={`pdf-${pdfKey}-${selectedEdition?.id}`}
                      src={`${pdfUrlWithCacheBust}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                      type="application/pdf"
                      className="h-full w-full"
                    />
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
                          <CheckIcon className="text-primary h-5 w-5" />
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
                <FileIcon className="text-primary h-10 w-10" />
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
                <ArrowLeftIcon className="h-5 w-5" />
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
                  <FileIcon className="text-primary h-6 w-6" />
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
                  <FileIcon className="text-primary h-6 w-6" />
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
                  <ArrowRightIcon className="h-4 w-4" />
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
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
