"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Search, X } from "lucide-react";
import { capitalizeFirstLetter } from "@/lib/utils";
import { api } from "@/trpc/react";
import PublicPage from "../_components/general/public-page";
import { ClosingCall } from "../_components/programmheft/closing-call";
import { PageSection, Split } from "../_components/programmheft/page-section";
import { Heading, SectionHead } from "../_components/programmheft/section-head";
import { WayList, WayRow } from "../_components/programmheft/way-list";
import LoadingSpinner from "../_components/general/loading-spinner";
import { DownloadCategory } from "~/generated/prisma/enums";
import { DownloadRow } from "./_components/download-row";

function MaterialienContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";
  const [selectedCategory, setSelectedCategory] = useState<string | "all">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [showBlechblattArchive, setShowBlechblattArchive] = useState(false);
  const downloads = api.materials.getDownloads.useQuery(
    {
      page: 1,
      limit: 100,
    },
    {
      staleTime: Infinity,
    },
  );

  const filteredDownloads = downloads.data?.downloads?.filter((download) => {
    const matchesCategory =
      selectedCategory === "all" || download.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      download.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      download.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      download.tags?.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    return matchesCategory && matchesSearch;
  });

  // In the unfiltered default view the Blechblatt back-issues (the bulk of
  // all files) are collapsed into an archive so forms and work materials
  // stay findable. Search or a category filter shows everything flat.
  const isDefaultView = selectedCategory === "all" && searchQuery === "";
  const blechblattArchive = isDefaultView
    ? (filteredDownloads?.filter(
        (d) => d.category === DownloadCategory.BLECHBLATT,
      ) ?? [])
    : [];
  const visibleDownloads = isDefaultView
    ? [
        ...(filteredDownloads?.filter(
          (d) => d.category !== DownloadCategory.BLECHBLATT,
        ) ?? []),
        ...(showBlechblattArchive ? blechblattArchive : []),
      ]
    : (filteredDownloads ?? []);

  const resetFilters = () => {
    setSelectedCategory("all");
    setSearchQuery("");
  };

  return (
    <PublicPage
      title="Materialien"
      heroTitle="Materialien & Downloads"
      breadcrumbs={[{ label: "Start", href: "/" }, { label: "Materialien" }]}
      description={
        <p>
          Hier finden Sie alle wichtigen Materialien für die Posaunenchorarbeit:
          vom Rheinischen Blechblatt über Noten und Übungen bis hin zu
          Formularen und Vorlagen.
        </p>
      }
    >
      <PageSection labelledBy="bereiche-heading">
        <Split
          head={
            <Heading id="bereiche-heading">Unsere Material-Bereiche</Heading>
          }
          bodyClassName="mt-8"
        >
          <WayList labelledBy="bereiche-heading" columns={2}>
            <WayRow
              href="/materialien/blechblatt"
              title="Rheinisches Blechblatt"
              description="Unser Magazin mit Artikeln, Terminen und Neuigkeiten aus der Posaunenchorarbeit"
            />
            <WayRow
              href="/materialien/literatur"
              title="Literatur & CDs"
              description="Notenmaterial, Choräle und Aufnahmen für Ihren Posaunenchor"
            />
          </WayList>
        </Split>
      </PageSection>

      <PageSection labelledBy="downloads-heading">
        <Split
          head={
            <SectionHead
              id="downloads-heading"
              title="Downloads"
              intro="Alle verfügbaren Materialien zum Download"
            />
          }
          bodyClassName="mt-8"
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="search"
                className="semi-condensed text-ink dark:text-night-text text-sm font-semibold"
              >
                Suche
              </label>
              <div className="border-ink dark:border-night-text dark:bg-night bg-paper mt-2 flex h-12 items-center gap-2 border-2 px-4">
                <Search
                  aria-hidden
                  className="text-dark dark:text-night-muted h-5 w-5 shrink-0"
                />
                <input
                  type="text"
                  id="search"
                  placeholder="Titel, Beschreibung oder Tags durchsuchen…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-ink dark:text-night-text placeholder:text-dark dark:placeholder:text-night-muted w-full bg-transparent text-base outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="category"
                className="semi-condensed text-ink dark:text-night-text text-sm font-semibold"
              >
                Kategorie
              </label>
              <div className="relative mt-2">
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="border-ink dark:border-night-text text-ink dark:bg-night dark:text-night-text bg-paper h-12 w-full appearance-none border-2 px-4 pr-10 text-base outline-none"
                >
                  <option value="all">Alle Kategorien</option>
                  {Object.entries(DownloadCategory).map(([key, category]) => (
                    <option key={key} value={key}>
                      {capitalizeFirstLetter(category)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden
                  className="text-dark dark:text-night-muted pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2"
                />
              </div>
            </div>
          </div>

          {selectedCategory !== "all" || searchQuery ? (
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              {selectedCategory !== "all" ? (
                <span className="text-dark dark:text-night-muted inline-flex items-center gap-1.5">
                  Kategorie:{" "}
                  {capitalizeFirstLetter(
                    DownloadCategory[
                      selectedCategory as keyof typeof DownloadCategory
                    ],
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className="link-ink inline-flex min-h-11 items-center"
                  >
                    <X className="h-4 w-4" aria-hidden />
                    <span className="sr-only">Kategorie-Filter entfernen</span>
                  </button>
                </span>
              ) : null}
              {searchQuery ? (
                <span className="text-dark dark:text-night-muted inline-flex items-center gap-1.5">
                  Suche: &quot;{searchQuery}&quot;
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="link-ink inline-flex min-h-11 items-center"
                  >
                    <X className="h-4 w-4" aria-hidden />
                    <span className="sr-only">Suche zurücksetzen</span>
                  </button>
                </span>
              ) : null}
              <button
                type="button"
                onClick={resetFilters}
                className="link-ink inline-flex min-h-11 items-center"
              >
                Alle Filter zurücksetzen
              </button>
            </div>
          ) : null}

          {!filteredDownloads ? (
            <LoadingSpinner text="Downloads werden geladen..." />
          ) : (
            <>
              <p className="text-dark dark:text-night-muted mt-8 text-sm">
                {filteredDownloads.length}{" "}
                {filteredDownloads.length === 1 ? "Datei" : "Dateien"} gefunden
              </p>

              {visibleDownloads.length > 0 ? (
                <ul className="border-ink dark:border-night-text mt-4 border-t-2">
                  {visibleDownloads.map((download) => (
                    <DownloadRow key={download.id} download={download} />
                  ))}
                </ul>
              ) : (
                <div className="border-ink dark:border-night-text mt-4 border-t-2 py-12 text-center">
                  <p className="condensed text-ink dark:text-night-text text-[1.5rem] font-bold">
                    Keine Downloads gefunden
                  </p>
                  <p className="text-dark dark:text-night-muted mx-auto mt-3 max-w-md">
                    Versuchen Sie es mit anderen Suchbegriffen oder Filtern.
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="link-ink mt-4 inline-flex min-h-11 items-center"
                  >
                    Filter zurücksetzen
                  </button>
                </div>
              )}

              {blechblattArchive.length > 0 ? (
                <div className="mt-10 text-center">
                  <button
                    type="button"
                    onClick={() => setShowBlechblattArchive((v) => !v)}
                    className="border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night semi-condensed inline-flex min-h-12 items-center gap-2 border-2 px-6 text-lg font-semibold transition-colors"
                  >
                    {showBlechblattArchive
                      ? "Blechblatt-Archiv ausblenden"
                      : `Blechblatt-Archiv anzeigen (${blechblattArchive.length} Ausgaben)`}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </Split>
      </PageSection>

      <ClosingCall
        id="material-cta-heading"
        title="Material nicht gefunden?"
        text="Kontaktieren Sie uns, wenn Sie bestimmte Materialien benötigen oder eigene Beiträge für andere zur Verfügung stellen möchten."
        actions={[{ href: "/kontakt", label: "Kontakt aufnehmen" }]}
      />
    </PublicPage>
  );
}

export default function MaterialienPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Laden..." />}>
      <MaterialienContent />
    </Suspense>
  );
}
