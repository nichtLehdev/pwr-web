/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import EventCard from "@/components/EventCard";
import CourseCard from "@/components/CourseCard";
import CalendarView from "@/components/CalendarView";
import DesktopCalendarView from "@/components/DesktopCalendarView";
import { mockEvents, mockCourses } from "@/lib/mockData";
import PageHeader from "@/components/PageHeader";
import { useSearchParams } from "next/navigation";

type ViewMode = "list" | "calendar";
type FilterType = "all" | "events" | "courses";

export default function TermineClient() {
  // Read type, district and category from params or default to 'all'
  const params = useSearchParams();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filterType, setFilterType] = useState<FilterType>(
    (params.get("type") as FilterType) || "all"
  );
  const [selectedDistrict, setSelectedDistrict] = useState<string>(
    params.get("district") || "all"
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    params.get("category") || "all"
  );
  const [filtersOpen, setFiltersOpen] = useState(false);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Kombiniere Events und Courses
  const allItems = [
    ...mockEvents.map((e) => ({ ...e, type: "event" as const })),
    ...mockCourses.map((c) => ({ ...c, type: "course" as const })),
  ];

  const futureItems = allItems.filter((item) => {
    const isEvent = item.type === "event";
    const itemDate = new Date(
      isEvent ? (item as any).eventDate : (item as any).endDate
    );
    itemDate.setHours(0, 0, 0, 0);
    return itemDate >= now;
  });

  // Filter anwenden
  const filteredItems = futureItems.filter((item) => {
    // Type Filter
    if (filterType === "events" && item.type !== "event") return false;
    if (filterType === "courses" && item.type !== "course") return false;

    // District Filter
    if (
      selectedDistrict !== "all" &&
      item.districtInfo.name !== selectedDistrict
    )
      return false;

    // Category Filter
    if (selectedCategory !== "all") {
      if (item.type === "event" && item.category !== selectedCategory)
        return false;
      if (
        item.type === "course" &&
        item.courseType !== selectedCategory &&
        item.targetAudience !== selectedCategory
      )
        return false;
    }

    return true;
  });

  // Nach Datum sortieren
  const sortedItems = filteredItems.sort((a, b) => {
    const dateA = new Date(a.type === "event" ? a.eventDate : a.startDate);
    const dateB = new Date(b.type === "event" ? b.eventDate : b.startDate);
    return dateA.getTime() - dateB.getTime();
  });

  // Gruppiere nach Monat
  const groupedByMonth = sortedItems.reduce((acc, item) => {
    const date = new Date(
      item.type === "event" ? item.eventDate : item.startDate
    );
    const monthKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;
    const monthLabel = date.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "long",
    });

    if (!acc[monthKey]) {
      acc[monthKey] = { label: monthLabel, items: [] };
    }
    acc[monthKey].items.push(item);
    return acc;
  }, {} as Record<string, { label: string; items: typeof sortedItems }>);

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
  const eventCategories = ["Konzert", "Gottesdienst", "Probe", "Andere"];
  const courseCategories = [
    "Lehrgang",
    "Freizeit",
    "Workshop",
    "Komponistenportrait",
    "Andere",
  ];
  const courseTargetAudiences = [
    "Alle",
    "Anfänger",
    "Fortgeschrittene",
    "Dirigenten",
    "Jugend",
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Termine" color="primary" />
      {/* Header */}
      <section className="bg-primary text-white py-6 md:py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-4">
            Termine
          </h1>
          <p className="text-sm md:text-lg lg:text-xl max-w-2xl">
            Alle Konzerte, Gottesdienste und Lehrgänge
          </p>
        </div>
      </section>

      {/* Filter & View Toggle */}
      <section className="bg-white border-b sticky top-28 md:top-36 z-20 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          {/* Mobile: Compact Row */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: View Toggle */}
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg cursor-pointer transition-colors ${
                  viewMode === "list"
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-dark hover:bg-gray-200"
                }`}
                aria-label="Listenansicht"
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
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`p-2 rounded-lg cursor-pointer transition-colors ${
                  viewMode === "calendar"
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-dark hover:bg-gray-200"
                }`}
                aria-label="Kalenderansicht"
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>

            {/* Center: Active Filters Count */}
            <div className="flex-1 text-center">
              <span className="text-sm text-gray-600">
                {sortedItems.length}{" "}
                {sortedItems.length === 1 ? "Termin" : "Termine"}
                {(filterType !== "all" ||
                  selectedDistrict !== "all" ||
                  selectedCategory !== "all") && (
                  <span className="ml-1 text-primary font-semibold">
                    (gefiltert)
                  </span>
                )}
              </span>
            </div>

            {/* Right: Filter Toggle Button */}
            <div className="flex gap-1">
              {!filtersOpen &&
                (filterType !== "all" ||
                  selectedDistrict !== "all" ||
                  selectedCategory !== "all") && (
                  <button
                    onClick={() => {
                      setFilterType("all");
                      setSelectedDistrict("all");
                      setSelectedCategory("all");
                    }}
                  >
                    <svg
                      className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors"
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
                )}
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
                {(filterType !== "all" ||
                  selectedDistrict !== "all" ||
                  selectedCategory !== "all") && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>
            </div>
          </div>

          {/* Collapsible Filter Panel */}
          {filtersOpen && (
            <div className="pt-4 mt-3 border-t space-y-3 animate-in slide-in-from-top-2">
              {/* Type Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Typ
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilterType("all")}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      filterType === "all"
                        ? "bg-dark text-white"
                        : "bg-gray-100 text-dark hover:bg-gray-200"
                    }`}
                  >
                    Alle
                  </button>
                  <button
                    onClick={() => setFilterType("events")}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      filterType === "events"
                        ? "bg-dark text-white"
                        : "bg-gray-100 text-dark hover:bg-gray-200"
                    }`}
                  >
                    Termine
                  </button>
                  <button
                    onClick={() => setFilterType("courses")}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      filterType === "courses"
                        ? "bg-dark text-white"
                        : "bg-gray-100 text-dark hover:bg-gray-200"
                    }`}
                  >
                    Lehrgänge
                  </button>
                </div>
              </div>

              {/* District & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Bezirk
                  </label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="all">Alle</option>
                    {districts.slice(1).map((district) => (
                      <option key={district} value={district}>
                        {district.replace("District ", "Bez. ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Kategorie
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="all">Alle</option>
                    {filterType !== "courses" && (
                      <optgroup label="Events">
                        {eventCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {filterType !== "events" && (
                      <>
                        <optgroup label="Lehrgänge">
                          {courseCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Für wen?">
                          {courseTargetAudiences.map((audience) => (
                            <option key={audience} value={audience}>
                              {audience}
                            </option>
                          ))}
                        </optgroup>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Reset Button */}
              {(filterType !== "all" ||
                selectedDistrict !== "all" ||
                selectedCategory !== "all") && (
                <button
                  onClick={() => {
                    setFilterType("all");
                    setSelectedDistrict("all");
                    setSelectedCategory("all");
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
          {viewMode === "list" ? (
            /* List View - Gruppiert nach Monat */
            <div className="space-y-8 md:space-y-12">
              {Object.entries(groupedByMonth).map(
                ([monthKey, { label, items }]) => (
                  <div key={monthKey}>
                    <h2 className="text-lg md:text-2xl font-bold text-dark mb-4 md:mb-6 pb-2 border-b-2 border-gray-200">
                      {label}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                      {items.map((item) =>
                        item.type === "event" ? (
                          <EventCard
                            key={`event-${item.id}`}
                            id={item.id}
                            title={item.title}
                            date={item.eventDate}
                            location={item.location.city}
                            category={item.category}
                            district={item.districtInfo.name}
                            openToParticipants={item.openToParticipants}
                          />
                        ) : (
                          <CourseCard
                            key={`course-${item.id}`}
                            id={item.id}
                            title={item.title}
                            startDate={item.startDate}
                            endDate={item.endDate}
                            location={item.location.city}
                            courseType={item.courseType}
                            districtName={item.districtInfo.name}
                          />
                        )
                      )}
                    </div>
                  </div>
                )
              )}

              {sortedItems.length === 0 && (
                <div className="text-center py-8 md:py-12">
                  <p className="text-gray-600 text-base md:text-lg">
                    Keine Termine gefunden.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Calendar View */
            <>
              {/* Mobile Kalender */}
              <div className="lg:hidden">
                <CalendarView items={sortedItems} />
              </div>

              {/* Desktop Kalender */}
              <div className="hidden lg:block">
                <DesktopCalendarView items={sortedItems} />
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
