"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import ParticipationCard from "@/components/ParticipationCard";
import Link from "next/link";
import { mockDownloads } from "@/lib/mockData";
import { downloadCategories } from "@/lib/generalData";
import { formatDate, getFileIcon } from "@/lib/utils";

export default function MaterialienPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | "all">(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Filter downloads
  const filteredDownloads = mockDownloads.filter((download) => {
    const matchesCategory =
      selectedCategory === "all" || download.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      download.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      download.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      download.tags?.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesCategory && matchesSearch;
  });

  return (
    <div>
      <PageHeader title="Materialien" color="district-4" />

      {/* Hero Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-district-4 text-white">
        <div className="container">
          <nav className="text-sm mb-4 flex items-center gap-2 opacity-90">
            <Link href="/" className="hover:text-white transition-colors">
              Start
            </Link>
            <span>/</span>
            <span>Materialien</span>
          </nav>
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Materialien & Downloads
            </h1>
            <p className="text-lg md:text-xl leading-relaxed opacity-95">
              Hier finden Sie alle wichtigen Materialien für die
              Posaunenchorarbeit: vom Rheinischen Blechblatt über Noten und
              Übungen bis hin zu Formularen und Vorlagen.
            </p>
          </div>
        </div>
      </section>

      {/* Unterseiten-Navigation */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-8 text-center">
              Unsere Material-Bereiche
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
              <ParticipationCard
                title="Übungen & Tipps"
                description="Praktische Übungen und Anleitungen für Bläser und Chorleiter"
                icon="education"
                href="/materialien/uebungen"
                color="district-6"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Downloads-Bereich */}
      <section className="py-12 md:py-16 lg:py-20 bg-background-secondary">
        <div className="container">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-4 text-center">
              Downloads
            </h2>
            <p className="text-lg text-gray-600 mb-8 text-center">
              Alle verfügbaren Materialien zum Download
            </p>

            {/* Filter & Suche */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Suche */}
                <div>
                  <label
                    htmlFor="search"
                    className="block text-sm font-semibold text-dark mb-2"
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
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-district-4 focus:border-transparent outline-none"
                    />
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </div>

                {/* Kategorie-Filter */}
                <div>
                  <label
                    htmlFor="category"
                    className="block text-sm font-semibold text-dark mb-2"
                  >
                    Kategorie
                  </label>
                  <select
                    id="category"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-district-4 focus:border-transparent outline-none"
                  >
                    <option value="all">Alle Kategorien</option>
                    {Object.entries(downloadCategories).map(
                      ([key, category]) => (
                        <option key={key} value={key}>
                          {category.name}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {/* Active Filters */}
              {(selectedCategory !== "all" || searchQuery) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedCategory !== "all" && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-district-4/10 text-district-4 rounded-full text-sm">
                      {
                        downloadCategories[
                          selectedCategory as keyof typeof downloadCategories
                        ].name
                      }
                      <button
                        onClick={() => setSelectedCategory("all")}
                        className="hover:text-district-4"
                      >
                        <svg
                          className="w-4 h-4"
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
                  {searchQuery && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                      Suche: &quot;{searchQuery}&quot;
                      <button
                        onClick={() => setSearchQuery("")}
                        className="hover:text-gray-900"
                      >
                        <svg
                          className="w-4 h-4"
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
                    className="text-sm text-gray-600 hover:text-gray-900 underline"
                  >
                    Alle Filter zurücksetzen
                  </button>
                </div>
              )}
            </div>

            {/* Ergebnisse */}
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                {filteredDownloads.length}{" "}
                {filteredDownloads.length === 1 ? "Datei" : "Dateien"} gefunden
              </p>
            </div>

            {/* Downloads Grid */}
            {filteredDownloads.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDownloads.map((download) => (
                  <div
                    key={download.id}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100"
                  >
                    <div className="flex items-start gap-4">
                      {/* File Icon */}
                      <div className="shrink-0 w-12 h-12 bg-district-4/10 rounded-lg flex items-center justify-center text-2xl">
                        {getFileIcon(download.fileType)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-dark mb-1 line-clamp-2">
                          {download.title}
                        </h3>
                        {download.description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {download.description}
                          </p>
                        )}

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
                          <span className="inline-flex items-center gap-1">
                            <svg
                              className="w-4 h-4"
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
                          <span>{download.fileSize}</span>
                          <span>{formatDate(download.uploadDate)}</span>
                        </div>

                        {/* Tags */}
                        {download.tags && download.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {download.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Download Button */}
                        <a
                          href={download.downloadUrl}
                          download
                          className="inline-flex items-center gap-2 px-4 py-2 bg-district-4 text-white rounded-lg hover:bg-district-4/90 transition-colors text-sm font-semibold"
                        >
                          <svg
                            className="w-4 h-4"
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
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 mx-auto text-gray-400 mb-4"
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
                <h3 className="text-xl font-bold text-dark mb-2">
                  Keine Downloads gefunden
                </h3>
                <p className="text-gray-600 mb-4">
                  Versuchen Sie es mit anderen Suchbegriffen oder Filtern.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory("all");
                    setSearchQuery("");
                  }}
                  className="text-district-4 hover:underline font-semibold"
                >
                  Filter zurücksetzen
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 bg-district-4 text-white">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Material nicht gefunden?
            </h2>
            <p className="text-lg mb-8 opacity-95">
              Kontaktieren Sie uns, wenn Sie bestimmte Materialien benötigen
              oder eigene Beiträge für andere zur Verfügung stellen möchten.
            </p>
            <Link
              href="/kontakt"
              className="inline-flex items-center px-8 py-4 bg-white text-district-4 font-bold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              Kontakt aufnehmen
              <svg
                className="w-5 h-5 ml-2"
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
