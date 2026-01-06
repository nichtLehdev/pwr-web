"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type {
  EventWithRelations,
  CourseWithRelations,
  CalendarItem,
  CalendarEventItem,
  CalendarCourseItem,
} from "@/lib/types/calendar";
import type { Bezirk } from "~/generated/prisma/client";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import PageHeader from "../general/page-header";
import EventCard from "./event-card";
import CourseCard from "./course-card";
import CalendarView from "./calendar/calendar-view";
import DesktopCalendarView from "./calendar/desktop-calendar-view";
import {
  CalendarIcon,
  ChevronDown,
  ChevronRight,
  XCircleIcon,
  XIcon,
} from "lucide-react";
import { ListIcon } from "lucide-react";

// Inline chevron icons
function ChevronDownIcon({ className }: { className?: string }) {
  return <ChevronDown className={className} />;
}

function ChevronRightIcon({ className }: { className?: string }) {
  return <ChevronRight className={className} />;
}

type ViewMode = "list" | "calendar";
type FilterType = "all" | "events" | "courses";

// Category mapping constants
const EVENT_CATEGORY_MAP: Record<string, string> = {
  Konzert: "KONZERT",
  Gottesdienst: "GOTTESDIENST",
  Probe: "PROBE",
  Andere: "ANDERE",
};

const COURSE_TYPE_MAP: Record<string, string> = {
  Lehrgang: "LEHRGANG",
  Freizeit: "FREIZEIT",
  Workshop: "WORKSHOP",
  Komponistenportrait: "KOMPONISTENPORTRAIT",
  Andere: "ANDERE",
};

const TARGET_AUDIENCE_MAP: Record<string, string> = {
  Alle: "ALLE",
  Anfänger: "ANFAENGER",
  Fortgeschrittene: "FORTGESCHRITTENE",
  Dirigenten: "DIRIGENTEN",
  Jugend: "JUGEND",
};

interface EventsClientProps {
  initialEvents: EventWithRelations[];
  initialCourses: CourseWithRelations[];
  bezirke: Bezirk[];
}

export default function EventsClient({
  initialEvents,
  initialCourses,
  bezirke,
}: EventsClientProps) {
  const { data: session } = useSession();

  const { data: profile } = api.users.getMyProfile.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const userDefaultView = useMemo((): ViewMode => {
    if (profile?.preferences) {
      try {
        const prefs =
          typeof profile.preferences === "string"
            ? JSON.parse(profile.preferences)
            : profile.preferences;
        if (
          prefs.termineDefaultView === "calendar" ||
          prefs.termineDefaultView === "list"
        ) {
          return prefs.termineDefaultView;
        }
      } catch {}
    }
    return "list";
  }, [profile?.preferences]);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    const timer = setTimeout(() => {
      document.body.style.overflow = "unset";
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  const params = useSearchParams();

  const [userHasChangedView, setUserHasChangedView] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const prevUserDefaultView = useMemo(() => userDefaultView, [userDefaultView]);
  if (!userHasChangedView && viewMode !== prevUserDefaultView && profile) {
    setViewMode(prevUserDefaultView);
  }

  const handleSetViewMode = (mode: ViewMode) => {
    setUserHasChangedView(true);
    setViewMode(mode);
  };

  const [filterType, setFilterType] = useState<FilterType>(
    (params.get("type") as FilterType) || "all",
  );
  const [selectedDistrict, setSelectedDistrict] = useState<string>(
    params.get("district") || "all",
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    params.get("category") || "all",
  );
  const [filtersOpen, setFiltersOpen] = useState(false);

  const now = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const allItems = useMemo<CalendarItem[]>(
    () => [
      ...initialEvents.map((e): CalendarEventItem => ({ ...e, type: "event" })),
      ...initialCourses.map(
        (c): CalendarCourseItem => ({ ...c, type: "course" }),
      ),
    ],
    [initialEvents, initialCourses],
  );

  // Shared filtering logic for items
  const applyFilters = useCallback(
    (items: CalendarItem[]) => {
      return items.filter((item) => {
        if (filterType === "events" && item.type !== "event") return false;
        if (filterType === "courses" && item.type !== "course") return false;

        if (selectedDistrict !== "all") {
          if (selectedDistrict === "Bezirksübergreifend") {
            if (item.bezirk !== null) return false;
          } else {
            const match = selectedDistrict.match(/Bezirk (\d+)/);
            if (match) {
              const districtNumber = parseInt(match[1] ?? "", 10);
              if (item.bezirk?.number !== districtNumber) return false;
            }
          }
        }

        if (selectedCategory !== "all") {
          if (item.type === "event") {
            const enumValue = EVENT_CATEGORY_MAP[selectedCategory];
            if (enumValue && item.category !== enumValue) return false;
          } else {
            const courseTypeEnum = COURSE_TYPE_MAP[selectedCategory];
            const targetAudienceEnum = TARGET_AUDIENCE_MAP[selectedCategory];

            // Check if category matches courseType or targetAudience
            if (courseTypeEnum || targetAudienceEnum) {
              const matchesCourseType =
                courseTypeEnum && item.courseType === courseTypeEnum;
              const matchesTargetAudience =
                targetAudienceEnum &&
                item.targetAudience === targetAudienceEnum;

              // Include the course if it matches either courseType or targetAudience
              if (!matchesCourseType && !matchesTargetAudience) {
                return false;
              }
            }
          }
        }

        return true;
      });
    },
    [filterType, selectedDistrict, selectedCategory],
  );

  const futureItems = useMemo(() => {
    return allItems.filter((item) => {
      const itemDate = new Date(
        item.type === "event" ? item.eventDate : item.endDate,
      );
      itemDate.setHours(0, 0, 0, 0);
      return itemDate >= now;
    });
  }, [allItems, now]);

  const filteredItems = useMemo(() => {
    return applyFilters(futureItems);
  }, [futureItems, applyFilters]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const dateA = new Date(a.type === "event" ? a.eventDate : a.startDate);
      const dateB = new Date(b.type === "event" ? b.eventDate : b.startDate);
      return dateA.getTime() - dateB.getTime();
    });
  }, [filteredItems]);

  const groupedByMonth = useMemo(() => {
    return sortedItems.reduce(
      (acc, item) => {
        const date = new Date(
          item.type === "event" ? item.eventDate : item.startDate,
        );
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1,
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
      },
      {} as Record<string, { label: string; items: typeof sortedItems }>,
    );
  }, [sortedItems]);

  const pastItems = useMemo(() => {
    const past = allItems.filter((item) => {
      const itemDate = new Date(
        item.type === "event" ? item.eventDate : item.endDate,
      );
      itemDate.setHours(0, 0, 0, 0);
      return itemDate < now;
    });

    return applyFilters(past).sort((a, b) => {
      const dateA = new Date(a.type === "event" ? a.eventDate : a.startDate);
      const dateB = new Date(b.type === "event" ? b.eventDate : b.startDate);
      return dateB.getTime() - dateA.getTime();
    });
  }, [allItems, now, applyFilters]);

  const pastGroupedByMonth = useMemo(() => {
    return pastItems.reduce(
      (acc, item) => {
        const date = new Date(
          item.type === "event" ? item.eventDate : item.startDate,
        );
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1,
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
      },
      {} as Record<string, { label: string; items: typeof pastItems }>,
    );
  }, [pastItems]);

  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(
    new Set(),
  );

  const toggleMonth = (monthKey: string) => {
    setCollapsedMonths((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey);
      } else {
        newSet.add(monthKey);
      }
      return newSet;
    });
  };

  const isMonthExpanded = (monthKey: string) => !collapsedMonths.has(monthKey);

  const [pastEventsExpanded, setPastEventsExpanded] = useState(false);

  const [expandedPastMonths, setExpandedPastMonths] = useState<Set<string>>(
    new Set(),
  );

  const togglePastMonth = (monthKey: string) => {
    setExpandedPastMonths((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey);
      } else {
        newSet.add(monthKey);
      }
      return newSet;
    });
  };

  const isPastMonthExpanded = (monthKey: string) =>
    expandedPastMonths.has(monthKey);

  const districtSelectOptions = [
    "all",
    "Bezirksübergreifend",
    ...bezirke
      .sort((a, b) => a.number - b.number)
      .map((b) => `Bezirk ${b.number} (${b.name})`),
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
    <div className="bg-background dark:bg-dark-background min-h-screen">
      <PageHeader title="Termine" color="primary" />

      {/* Header */}
      <section className="bg-primary dark:bg-primary-dark py-6 text-white md:py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <nav className="mb-4 flex items-center gap-2 text-sm opacity-90">
            <Link href="/" className="transition-colors hover:text-white">
              Start
            </Link>
            <span>/</span>
            <span>Termine</span>
          </nav>
          <h1 className="mb-2 text-2xl font-bold md:mb-4 md:text-4xl lg:text-5xl">
            Termine
          </h1>
          <p className="max-w-2xl text-sm md:text-lg lg:text-xl">
            Alle Konzerte, Gottesdienste und Lehrgänge
          </p>
        </div>
      </section>

      {/* Filter & View Toggle */}
      <section className="dark:border-dark-border dark:bg-dark-surface sticky top-28 z-20 border-b border-gray-200 bg-white shadow-sm md:top-36">
        <div className="container mx-auto px-4 py-3">
          {/* Mobile: Compact Row */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: View Toggle */}
            <div className="flex gap-1">
              <button
                onClick={() => handleSetViewMode("list")}
                className={`cursor-pointer rounded-lg p-2 transition-colors ${
                  viewMode === "list"
                    ? "bg-primary text-white"
                    : "text-dark dark:text-dark-text dark:bg-dark-background-secondary dark:hover:bg-dark-background bg-gray-100 hover:bg-gray-200"
                }`}
                aria-label="Listenansicht"
              >
                <ListIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleSetViewMode("calendar")}
                className={`cursor-pointer rounded-lg p-2 transition-colors ${
                  viewMode === "calendar"
                    ? "bg-primary text-white"
                    : "text-dark dark:text-dark-text dark:bg-dark-background-secondary dark:hover:bg-dark-background bg-gray-100 hover:bg-gray-200"
                }`}
                aria-label="Kalenderansicht"
              >
                <CalendarIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Center: Active Filters Count */}
            <div className="flex-1 text-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {sortedItems.length}{" "}
                {sortedItems.length === 1 ? "Termin" : "Termine"}
                {(filterType !== "all" ||
                  selectedDistrict !== "all" ||
                  selectedCategory !== "all") && (
                  <span className="text-primary ml-1 font-semibold">
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
                    aria-label="Filter zurücksetzen"
                  >
                    <XIcon className="h-5 w-5 text-gray-400 transition-colors hover:text-gray-600" />
                  </button>
                )}
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={`relative cursor-pointer rounded-lg p-2 transition-colors ${
                  filtersOpen
                    ? "bg-primary text-white"
                    : "text-dark dark:text-dark-text dark:bg-dark-background-secondary dark:hover:bg-dark-background bg-gray-100 hover:bg-gray-200"
                }`}
                aria-label="Filter öffnen"
              >
                <XCircleIcon className="h-5 w-5" />
                {/* Active Filter Badge */}
                {(filterType !== "all" ||
                  selectedDistrict !== "all" ||
                  selectedCategory !== "all") && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-red-500"></span>
                )}
              </button>
            </div>
          </div>

          {/* Collapsible Filter Panel */}
          {filtersOpen && (
            <div className="animate-in slide-in-from-top-2 dark:border-dark-border mt-3 space-y-3 border-t border-gray-200 pt-4">
              {/* Type Filter */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Typ
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilterType("all")}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      filterType === "all"
                        ? "bg-dark dark:bg-dark-text dark:text-dark-background text-white"
                        : "text-dark dark:text-dark-text dark:bg-dark-background-secondary dark:hover:bg-dark-background bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    Alle
                  </button>
                  <button
                    onClick={() => setFilterType("events")}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      filterType === "events"
                        ? "bg-dark dark:bg-dark-text dark:text-dark-background text-white"
                        : "text-dark dark:text-dark-text dark:bg-dark-background-secondary dark:hover:bg-dark-background bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    Termine
                  </button>
                  <button
                    onClick={() => setFilterType("courses")}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      filterType === "courses"
                        ? "bg-dark dark:bg-dark-text dark:text-dark-background text-white"
                        : "text-dark dark:text-dark-text dark:bg-dark-background-secondary dark:hover:bg-dark-background bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    Lehrgänge
                  </button>
                </div>
              </div>

              {/* District & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Bezirk
                  </label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2"
                  >
                    <option value="all">Alle Termine</option>
                    {districtSelectOptions.slice(1).map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Kategorie
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2"
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
                  className="text-primary hover:text-primary-dark w-full px-3 py-2 text-sm font-semibold transition-colors"
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
            /* List View - Grouped by month */
            <div className="space-y-4 md:space-y-6">
              {/* Upcoming Events */}
              {Object.entries(groupedByMonth).map(
                ([monthKey, { label, items }]) => (
                  <div
                    key={monthKey}
                    className="dark:border-dark-border overflow-hidden rounded-lg border border-gray-200"
                  >
                    <button
                      onClick={() => toggleMonth(monthKey)}
                      aria-expanded={isMonthExpanded(monthKey)}
                      aria-label={`${label} - ${items.length} ${items.length === 1 ? "Termin" : "Termine"}`}
                      className="dark:bg-dark-surface dark:hover:bg-dark-background-secondary flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-100"
                    >
                      <h2 className="text-dark dark:text-dark-text text-lg font-bold md:text-2xl">
                        {label}
                        <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                          ({items.length}{" "}
                          {items.length === 1 ? "Termin" : "Termine"})
                        </span>
                      </h2>
                      {isMonthExpanded(monthKey) ? (
                        <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      ) : (
                        <ChevronRightIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      )}
                    </button>
                    {isMonthExpanded(monthKey) && (
                      <div className="p-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                          {items.map((item) =>
                            item.type === "event" ? (
                              <EventCard
                                key={`event-${item.id}`}
                                id={item.id}
                                title={item.title}
                                date={item.eventDate}
                                location={item.location?.city || ""}
                                category={item.category}
                                district={item.bezirk?.number}
                                openToParticipants={item.openToParticipants}
                                cancelled={item.cancelled}
                                coverImageUrl={item.coverImage?.url}
                              />
                            ) : (
                              <CourseCard
                                key={`course-${item.id}`}
                                id={item.id}
                                title={item.title}
                                startDate={item.startDate}
                                endDate={item.endDate}
                                location={item.location?.city || ""}
                                courseType={item.courseType}
                                district={item.bezirk?.number}
                                imageUrl={item.image?.url}
                              />
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ),
              )}

              {sortedItems.length === 0 && (
                <div className="py-8 text-center md:py-12">
                  <p className="text-base text-gray-600 md:text-lg dark:text-gray-400">
                    Keine kommenden Termine gefunden.
                  </p>
                </div>
              )}

              {/* Past Events Section */}
              {pastItems.length > 0 && (
                <div className="mt-8 md:mt-12">
                  <div className="dark:border-dark-border overflow-hidden rounded-lg border border-gray-300">
                    <button
                      onClick={() => setPastEventsExpanded(!pastEventsExpanded)}
                      aria-expanded={pastEventsExpanded}
                      aria-label={`Vergangene Termine - ${pastItems.length} ${pastItems.length === 1 ? "Termin" : "Termine"}`}
                      className="dark:bg-dark-background-secondary dark:hover:bg-dark-surface flex w-full items-center justify-between bg-gray-100 px-4 py-4 text-left transition-colors hover:bg-gray-200"
                    >
                      <h2 className="text-dark dark:text-dark-text text-xl font-bold md:text-2xl">
                        Vergangene Termine
                        <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                          ({pastItems.length}{" "}
                          {pastItems.length === 1 ? "Termin" : "Termine"})
                        </span>
                      </h2>
                      {pastEventsExpanded ? (
                        <ChevronDownIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                      ) : (
                        <ChevronRightIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                      )}
                    </button>
                    {pastEventsExpanded && (
                      <div className="space-y-4 p-4 md:space-y-6">
                        {Object.entries(pastGroupedByMonth)
                          .sort(([a], [b]) => b.localeCompare(a)) // Sort months descending (most recent first)
                          .map(([monthKey, { label, items }]) => (
                            <div
                              key={monthKey}
                              className="dark:border-dark-border overflow-hidden rounded-lg border border-gray-200"
                            >
                              <button
                                onClick={() => togglePastMonth(monthKey)}
                                aria-expanded={isPastMonthExpanded(monthKey)}
                                aria-label={`${label} - ${items.length} ${items.length === 1 ? "Termin" : "Termine"}`}
                                className="dark:bg-dark-surface dark:hover:bg-dark-background-secondary flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-100"
                              >
                                <h3 className="text-dark dark:text-dark-text text-base font-semibold md:text-lg">
                                  {label}
                                  <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                                    ({items.length}{" "}
                                    {items.length === 1 ? "Termin" : "Termine"})
                                  </span>
                                </h3>
                                {isPastMonthExpanded(monthKey) ? (
                                  <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                                ) : (
                                  <ChevronRightIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                                )}
                              </button>
                              {isPastMonthExpanded(monthKey) && (
                                <div className="p-4">
                                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                                    {items.map((item) =>
                                      item.type === "event" ? (
                                        <EventCard
                                          key={`past-event-${item.id}`}
                                          id={item.id}
                                          title={item.title}
                                          date={item.eventDate}
                                          location={item.location?.city || ""}
                                          category={item.category}
                                          district={item.bezirk?.number}
                                          openToParticipants={
                                            item.openToParticipants
                                          }
                                          cancelled={item.cancelled}
                                          coverImageUrl={item.coverImage?.url}
                                        />
                                      ) : (
                                        <CourseCard
                                          key={`past-course-${item.id}`}
                                          id={item.id}
                                          title={item.title}
                                          startDate={item.startDate}
                                          endDate={item.endDate}
                                          location={item.location?.city || ""}
                                          courseType={item.courseType}
                                          district={item.bezirk?.number}
                                          imageUrl={item.image?.url}
                                        />
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Calendar View */
            <>
              {/* Mobile Calendar */}
              <div className="lg:hidden">
                <CalendarView items={allItems} />
              </div>

              {/* Desktop Calendar */}
              <div className="hidden lg:block">
                <DesktopCalendarView items={allItems} />
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
