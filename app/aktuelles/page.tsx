"use client";

import { useState } from "react";
import NewsCard from "@/components/NewsCard";
import { mockPosts } from "@/lib/mockData";
import PageHeader from "@/components/PageHeader";

type FilterCategory =
  | "all"
  | "Magazine"
  | "Event"
  | "Education"
  | "Districts"
  | "Other";

export default function AktuellesPage() {
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] =
    useState<FilterCategory>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Nur veröffentlichte und genehmigte Posts
  const publishedPosts = mockPosts.filter(
    (post) => post.publishedAt && post.approved
  );

  // Separiere angepinnte und normale Posts
  const pinnedPosts = publishedPosts.filter((post) => post.pinned);
  const regularPosts = publishedPosts.filter((post) => !post.pinned);

  // Filter anwenden
  const applyFilters = (posts: typeof publishedPosts) => {
    return posts.filter((post) => {
      // District Filter
      if (
        selectedDistrict !== "all" &&
        post.districtInfo.name !== selectedDistrict
      )
        return false;

      // Category Filter
      if (selectedCategory !== "all" && post.category !== selectedCategory)
        return false;

      return true;
    });
  };

  const filteredPinned = applyFilters(pinnedPosts);
  const filteredRegular = applyFilters(regularPosts);

  // Nach Datum sortieren (neueste zuerst)
  const sortedRegular = filteredRegular.sort((a, b) => {
    const dateA = new Date(a.publishedAt || a.createdAt);
    const dateB = new Date(b.publishedAt || b.createdAt);
    return dateB.getTime() - dateA.getTime();
  });

  const districts = [
    "all",
    "All Districts",
    "District 1",
    "District 2",
    "District 3",
    "District 4",
    "District 5",
    "District 6",
    "District 7",
    "District 8",
    "District 9",
    "District 10",
    "District 11",
    "District 12",
    "District 13",
  ];

  const categories: FilterCategory[] = [
    "all",
    "Magazine",
    "Event",
    "Education",
    "Districts",
    "Other",
  ];

  const categoryLabels: Record<FilterCategory, string> = {
    all: "Alle",
    Magazine: "Magazin",
    Event: "Veranstaltung",
    Education: "Bildung",
    Districts: "Bezirke",
    Other: "Sonstiges",
  };

  const totalFiltered = filteredPinned.length + sortedRegular.length;
  const hasActiveFilters =
    selectedDistrict !== "all" || selectedCategory !== "all";

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Aktuelles" color="primary" />
      {/* Header */}
      <section className="bg-primary text-white py-6 md:py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-4">
            Aktuelles
          </h1>
          <p className="text-sm md:text-lg lg:text-xl max-w-2xl">
            News, Berichte und Ankündigungen aus dem Posaunenwerk
          </p>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="bg-white border-b sticky top-28 md:top-36 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          {/* Mobile: Compact Row */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: Results Count */}
            <div className="flex-1">
              <span className="text-sm text-gray-600">
                {totalFiltered} {totalFiltered === 1 ? "Beitrag" : "Beiträge"}
                {hasActiveFilters && (
                  <span className="ml-1 text-primary font-semibold">
                    (gefiltert)
                  </span>
                )}
              </span>
            </div>

            {/* Right: Filter Toggle Button */}
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`p-2 rounded-lg cursor-pointer transition-colors relative ${
                filtersOpen
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-dark hover:bg-gray-200"
              }`}
              aria-label="Filter öffnen"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              {/* Active Filter Badge */}
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
          </div>

          {/* Collapsible Filter Panel */}
          {filtersOpen && (
            <div className="pt-4 mt-3 border-t space-y-3 animate-in slide-in-from-top-2">
              {/* Category Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Kategorie
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        selectedCategory === cat
                          ? "bg-dark text-white"
                          : "bg-gray-100 text-dark hover:bg-gray-200"
                      }`}
                    >
                      {categoryLabels[cat]}
                    </button>
                  ))}
                </div>
              </div>

              {/* District Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Bezirk
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">Alle Bezirke</option>
                  {districts.slice(1).map((district) => (
                    <option key={district} value={district}>
                      {district.replace("District ", "Bez. ")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset Button */}
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setSelectedCategory("all");
                    setSelectedDistrict("all");
                  }}
                  className="w-full px-3 py-2 text-sm text-primary hover:text-primary-dark font-semibold transition-colors"
                >
                  Filter zurücksetzen
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="py-6 md:py-12">
        <div className="container mx-auto px-4">
          {/* Angepinnte Beiträge */}
          {filteredPinned.length > 0 && (
            <div className="mb-12">
              <h2 className="text-lg md:text-2xl font-bold text-dark mb-4 md:mb-6 pb-2 border-b-2 border-primary flex items-center gap-2">
                <svg
                  className="w-5 h-5 md:w-6 md:h-6 text-primary"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M16 12V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v8l-2 2v2h5v5l1 1 1-1v-5h5v-2l-2-2zm-6 0V4h4v8.13l1.07 1.07.6.6H8.34l.6-.6L10 12.13z" />
                </svg>
                Angepinnte Beiträge
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                {filteredPinned.map((post) => (
                  <NewsCard
                    key={post.id}
                    id={post.id}
                    title={post.title}
                    excerpt={post.excerpt || ""}
                    date={post.publishedAt || post.createdAt}
                    category={post.category}
                    image={post.coverImage?.url}
                    pinned={post.pinned}
                    district={post.districtInfo?.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Normale Beiträge */}
          {sortedRegular.length > 0 && (
            <div>
              {filteredPinned.length > 0 && (
                <h2 className="text-lg md:text-2xl font-bold text-dark mb-4 md:mb-6 pb-2 border-b-2 border-gray-200">
                  Alle Beiträge
                </h2>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                {sortedRegular.map((post) => (
                  <NewsCard
                    key={post.id}
                    id={post.id}
                    title={post.title}
                    excerpt={post.excerpt || ""}
                    date={post.publishedAt || post.createdAt}
                    category={post.category}
                    image={post.coverImage?.url}
                    pinned={false}
                    district={post.districtInfo?.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Keine Ergebnisse */}
          {totalFiltered === 0 && (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 mx-auto text-gray-300 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-gray-600 text-base md:text-lg mb-4">
                Keine Beiträge gefunden.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setSelectedCategory("all");
                    setSelectedDistrict("all");
                  }}
                  className="text-primary hover:text-primary-dark font-semibold"
                >
                  Filter zurücksetzen
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
