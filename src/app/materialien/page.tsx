"use client";

import { useState } from "react";
import Link from "next/link";
import { capitalizeFirstLetter, getFileIcon } from "@/lib/utils";
import { api } from "@/trpc/react";
import PageHeader from "../_components/general/page-header";
import ParticipationCard from "../_components/general/participation-card";
import { DownloadCategory } from "~/generated/prisma/enums";
import LoadingSpinner from "../_components/general/loading-spinner";
import { Search, X } from "lucide-react";

export default function MaterialienPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | "all">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
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

  return (
    <div>
      <PageHeader title="Materialien" color="district-4" />

      {/* Hero Section */}
      <section className="bg-district-4 py-12 text-white md:py-16 lg:py-20">
        <div className="container">
          <nav className="mb-4 flex items-center gap-2 text-sm opacity-90">
            <Link href="/" className="transition-colors hover:text-white">
              Start
            </Link>
            <span>/</span>
            <span>Materialien</span>
          </nav>
          <div className="max-w-3xl">
            <h1 className="mb-6 text-3xl font-bold md:text-4xl lg:text-5xl">
              Materialien & Downloads
            </h1>
            <p className="text-lg leading-relaxed opacity-95 md:text-xl">
              Hier finden Sie alle wichtigen Materialien für die
              Posaunenchorarbeit: vom Rheinischen Blechblatt über Noten und
              Übungen bis hin zu Formularen und Vorlagen.
            </p>
          </div>
        </div>
      </section>

      {/* Unterseiten-Navigation */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-dark dark:text-dark-text mb-8 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
              Unsere Material-Bereiche
            </h2>

            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
              <ParticipationCard
                title="Rheinisches Blechblatt"
                description="Unser Magazin mit Artikeln, Terminen und Neuigkeiten aus der Posaunenchorarbeit"
                icon="document"
                href="/materialien/blechblatt"
                color="primary"
              />
              <ParticipationCard
                title="Literatur & CDs"
                description="Notenmaterial, Choräle und Aufnahmen für Ihren Posaunenchor"
                icon="music"
                href="/materialien/literatur"
                color="district-2"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Downloads-Bereich */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-dark dark:text-dark-text mb-4 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
              Downloads
            </h2>
            <p className="mb-8 text-center text-lg text-gray-600 dark:text-gray-400">
              Alle verfügbaren Materialien zum Download
            </p>

            {/* Filter & Suche */}
            <div className="dark:bg-dark-surface dark:shadow-dark-border mb-8 rounded-lg bg-white p-6 shadow-md">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Suche */}
                <div>
                  <label
                    htmlFor="search"
                    className="text-dark dark:text-dark-text mb-2 block text-sm font-semibold"
                  >
                    Suche
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="search"
                      placeholder="Titel, Beschreibung oder Tags durchsuchen..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="focus:ring-district-4 dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white py-2 pr-4 pl-10 outline-none placeholder:text-gray-400 focus:border-transparent focus:ring-2 dark:placeholder:text-gray-500"
                    />
                    <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Kategorie-Filter */}
                <div>
                  <label
                    htmlFor="category"
                    className="text-dark dark:text-dark-text mb-2 block text-sm font-semibold"
                  >
                    Kategorie
                  </label>
                  <select
                    id="category"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="focus:ring-district-4 dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 outline-none focus:border-transparent focus:ring-2"
                  >
                    <option value="all">Alle Kategorien</option>
                    {Object.entries(DownloadCategory).map(([key, category]) => (
                      <option key={key} value={key}>
                        {capitalizeFirstLetter(category)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Filters */}
              {(selectedCategory !== "all" || searchQuery) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedCategory !== "all" && (
                    <span className="bg-district-4/10 text-district-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm">
                      {capitalizeFirstLetter(
                        DownloadCategory[
                          selectedCategory as keyof typeof DownloadCategory
                        ],
                      )}
                      <button
                        onClick={() => setSelectedCategory("all")}
                        className="hover:text-district-4"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </span>
                  )}
                  {searchQuery && (
                    <span className="dark:bg-dark-background-secondary inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                      Suche: &quot;{searchQuery}&quot;
                      <button
                        onClick={() => setSearchQuery("")}
                        className="hover:text-gray-900"
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
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setSelectedCategory("all");
                      setSearchQuery("");
                    }}
                    className="text-sm text-gray-600 underline hover:text-gray-900"
                  >
                    Alle Filter zurücksetzen
                  </button>
                </div>
              )}
            </div>

            {!filteredDownloads && (
              <LoadingSpinner text="Downloads werden geladen..." />
            )}

            {filteredDownloads && (
              <>
                {/* Ergebnisse */}
                <div className="mb-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {filteredDownloads.length}{" "}
                    {filteredDownloads.length === 1 ? "Datei" : "Dateien"}{" "}
                    gefunden
                  </p>
                </div>

                {/* Downloads Grid */}
                {filteredDownloads.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {filteredDownloads.map((download) => (
                      <div
                        key={download.id}
                        className="dark:border-dark-border dark:bg-dark-surface dark:shadow-dark-border rounded-lg border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-start gap-4">
                          {/* File Icon */}
                          <div className="bg-district-4/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-2xl">
                            {getFileIcon(download.fileType)}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <h3 className="text-dark dark:text-dark-text mb-1 line-clamp-2 font-bold">
                              {download.title}
                            </h3>
                            {download.description && (
                              <p className="mb-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                                {download.description}
                              </p>
                            )}

                            {/* Meta */}
                            <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                              <span className="inline-flex items-center gap-1">
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
                                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                  />
                                </svg>
                                {download.fileType.toUpperCase()}
                              </span>
                              {download.fileSize && (
                                <>
                                  {download.fileSize < 1024 ? (
                                    <span>{download.fileSize} B</span>
                                  ) : null}

                                  {download.fileSize >= 1024 &&
                                  download.fileSize < 1048576 ? (
                                    <span>
                                      {(download.fileSize / 1024).toFixed(1)} KB
                                    </span>
                                  ) : null}
                                  {download.fileSize >= 1048576 ? (
                                    <span>
                                      {(download.fileSize / 1048576).toFixed(1)}{" "}
                                      MB
                                    </span>
                                  ) : null}
                                </>
                              )}
                              <span>
                                {download.createdAt.toLocaleDateString()}
                              </span>
                            </div>

                            {/* Tags */}
                            {download.tags && download.tags.length > 0 && (
                              <div className="mb-3 flex flex-wrap gap-1">
                                {download.tags.map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="dark:bg-dark-background-secondary rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:text-gray-400"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Download Button */}
                            <Link
                              href={download.fileUrl}
                              download
                              className="bg-district-4 hover:bg-district-4/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
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
                              Download
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <svg
                      className="mx-auto mb-4 h-16 w-16 text-gray-400 dark:text-gray-500"
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
                    <h3 className="text-dark dark:text-dark-text mb-2 text-xl font-bold">
                      Keine Downloads gefunden
                    </h3>
                    <p className="mb-4 text-gray-600 dark:text-gray-400">
                      Versuchen Sie es mit anderen Suchbegriffen oder Filtern.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedCategory("all");
                        setSearchQuery("");
                      }}
                      className="text-district-4 font-semibold hover:underline"
                    >
                      Filter zurücksetzen
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-district-4 py-12 text-white md:py-16">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">
              Material nicht gefunden?
            </h2>
            <p className="mb-8 text-lg opacity-95">
              Kontaktieren Sie uns, wenn Sie bestimmte Materialien benötigen
              oder eigene Beiträge für andere zur Verfügung stellen möchten.
            </p>
            <Link
              href="/kontakt"
              className="text-district-4 inline-flex items-center rounded-lg bg-white px-8 py-4 font-bold shadow-lg transition-colors hover:bg-gray-100"
            >
              Kontakt aufnehmen
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
