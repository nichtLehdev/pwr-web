"use client";
import { Select } from "@/app/_components/ui";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStoredPreference } from "@/lib/use-stored-preference";
import { useRouter, useSearchParams } from "next/navigation";
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
import PublicPage from "../general/public-page";
import { useBanner } from "../ui/banner-context";
import EventCard from "./event-card";
import CourseCard from "./course-card";
import { COURSE_TYPE_MAP, EVENT_CATEGORY_MAP } from "@/lib/termine-labels";
import CalendarView from "./calendar/calendar-view";
import DesktopCalendarView from "./calendar/desktop-calendar-view";
import {
  CalendarIcon,
  CalendarRangeIcon,
  ChevronDownIcon,
  FunnelIcon,
  FunnelXIcon,
} from "lucide-react";
import { ListIcon, Calendar } from "lucide-react";
import FeedConfigModal from "../feeds/feed-config-modal";

type ViewMode = "list" | "calendar";

const VIEW_MODES: ViewMode[] = ["list", "calendar"];

/**
 * Monatsüberschriften an oder aus. Ohne sie fließt das Kartenraster
 * durchgehend, statt nach jedem Monat umzubrechen — bei wenigen Terminen je
 * Monat steht sonst mehr Überschrift als Inhalt auf der Seite.
 */
type MonthGrouping = "on" | "off";

function isMonthGrouping(value: string): value is MonthGrouping {
  return value === "on" || value === "off";
}

function isViewMode(value: string | null): value is ViewMode {
  return value !== null && (VIEW_MODES as string[]).includes(value);
}
type FilterType = "all" | "events" | "courses";

/**
 * Monatsüberschrift zum Auf- und Zuklappen.
 *
 * Bewusst nur Typografie und eine Haarlinie statt einer Kachel mit grauer
 * Kopfzeile: die Termine darunter sind in beiden Ansichten selbst schon Karten
 * oder Zeilen, und eine Box um Boxen legt eine Verschachtelung nahe, die es
 * inhaltlich nicht gibt.
 */
function MonthHeading({
  label,
  count,
  expanded,
  onToggle,
}: {
  label: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="group dark:border-dark-border flex w-full items-baseline gap-3 border-b border-gray-200 py-2 text-left transition-colors"
    >
      <h2 className="text-dark dark:text-dark-text group-hover:text-primary text-lg font-bold transition-colors md:text-xl">
        {label}
      </h2>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {count} {count === 1 ? "Termin" : "Termine"}
      </span>
      <ChevronDownIcon
        className={`ml-auto h-5 w-5 shrink-0 self-center text-gray-400 transition-transform dark:text-gray-500 ${
          expanded ? "" : "-rotate-90"
        }`}
        aria-hidden
      />
    </button>
  );
}

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
  const { bannerHeight } = useBanner();
  const [filterBarTop, setFilterBarTop] = useState(112);

  const { data: profile } = api.users.getMyProfile.useQuery(undefined, {
    enabled: !!session?.user,
  });

  useEffect(() => {
    const updateFilterBarTop = () => {
      // Original values were top-28 (112px) mobile and md:top-36 (144px) desktop
      // We add bannerHeight to these original values
      const baseTop = window.innerWidth >= 768 ? 144 : 112;
      setFilterBarTop(baseTop);
    };

    updateFilterBarTop();
    window.addEventListener("resize", updateFilterBarTop);
    return () => window.removeEventListener("resize", updateFilterBarTop);
  }, []);

  const userDefaultView = useMemo((): ViewMode => {
    if (profile?.preferences) {
      try {
        const prefs =
          typeof profile.preferences === "string"
            ? JSON.parse(profile.preferences)
            : profile.preferences;
        if (isViewMode(prefs.termineDefaultView)) {
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

  const router = useRouter();
  const params = useSearchParams();
  const viewParam = params.get("view");

  const [userHasChangedView, setUserHasChangedView] = useState(false);
  /** Used when `view` is absent from the URL after the user changed view without a param. */
  const [viewWhenNoUrl, setViewWhenNoUrl] = useState<ViewMode>("list");

  const effectiveViewMode = useMemo((): ViewMode => {
    if (isViewMode(viewParam)) {
      return viewParam;
    }
    if (userHasChangedView) {
      return viewWhenNoUrl;
    }
    if (profile) {
      return userDefaultView;
    }
    return "list";
  }, [viewParam, userHasChangedView, viewWhenNoUrl, profile, userDefaultView]);

  const handleSetViewMode = (mode: ViewMode) => {
    setUserHasChangedView(true);
    setViewWhenNoUrl(mode);
    const next = new URLSearchParams(params.toString());
    next.set("view", mode);
    const qs = next.toString();
    const href = `/termine?${qs}`;
    const currentQs = params.toString();
    const current = currentQs === "" ? "/termine" : `/termine?${currentQs}`;
    if (href !== current) {
      router.replace(href, { scroll: false });
    }
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
  const [monthGrouping, setMonthGrouping] = useStoredPreference<MonthGrouping>(
    "termineMonthGrouping",
    "on",
    isMonthGrouping,
  );
  const groupByMonth = monthGrouping === "on";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [icalModalOpen, setIcalModalOpen] = useState(false);

  const now = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const allItems = useMemo<CalendarItem[]>(
    () => [
      ...initialEvents.map((e): CalendarEventItem => ({ ...e, type: "event" })),
      ...initialCourses.map((c): CalendarCourseItem => ({
        ...c,
        type: "course",
      })),
    ],
    [initialEvents, initialCourses],
  );

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

            if (courseTypeEnum && item.courseType !== courseTypeEnum) {
              return false;
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

  // The calendar honors the active filters too, but keeps past items so
  // earlier months don't render empty when browsing back.
  const calendarItems = useMemo(() => {
    return applyFilters(allItems);
  }, [allItems, applyFilters]);

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

  /** Ein Kartenraster — mit oder ohne Monatsüberschrift darüber. */
  const renderItemGroup = (items: CalendarItem[], keyPrefix: string) => {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {items.map((item) =>
          item.type === "event" ? (
            <EventCard
              key={`${keyPrefix}-event-${item.id}`}
              id={item.id}
              slug={item.slug}
              title={item.title}
              date={item.eventDate}
              duration={item.duration}
              location={item.location?.city || ""}
              category={item.category}
              district={item.bezirk?.number}
              openToParticipants={item.openToParticipants}
              cancelled={item.cancelled}
            />
          ) : (
            <CourseCard
              key={`${keyPrefix}-course-${item.id}`}
              id={item.id}
              title={item.title}
              startDate={item.startDate}
              endDate={item.endDate}
              location={item.location?.city || ""}
              courseType={item.courseType}
              district={item.bezirk?.number}
            />
          ),
        )}
      </div>
    );
  };

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
    "Veranstaltung",
    "Andere",
  ];

  return (
    <PublicPage
      title="Termine"
      color="primary"
      breadcrumbs={[{ label: "Start", href: "/" }, { label: "Termine" }]}
      description={<p>Alle Konzerte, Gottesdienste und Lehrgänge</p>}
    >
      <div className="bg-background dark:bg-dark-background min-h-screen">
        {/* Filter & View Toggle */}
        <section
          className="dark:border-dark-border dark:bg-dark-surface sticky z-20 border-b border-gray-200 bg-white shadow-sm"
          style={{
            top: `${bannerHeight + filterBarTop}px`,
          }}
        >
          <div className="container mx-auto px-4 py-3">
            {/* Mobile: Compact Row */}
            <div className="flex items-center justify-between gap-2">
              {/* Left: View Toggle */}
              <div className="flex gap-1">
                <button
                  onClick={() => handleSetViewMode("list")}
                  className={`cursor-pointer rounded-lg p-2 transition-colors ${
                    effectiveViewMode === "list"
                      ? "bg-primary text-white"
                      : "text-dark dark:text-dark-text dark:bg-dark-background-secondary dark:hover:bg-dark-background bg-gray-100 hover:bg-gray-200"
                  }`}
                  aria-label="Kartenansicht"
                  title="Kartenansicht"
                >
                  <ListIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleSetViewMode("calendar")}
                  className={`cursor-pointer rounded-lg p-2 transition-colors ${
                    effectiveViewMode === "calendar"
                      ? "bg-primary text-white"
                      : "text-dark dark:text-dark-text dark:bg-dark-background-secondary dark:hover:bg-dark-background bg-gray-100 hover:bg-gray-200"
                  }`}
                  aria-label="Kalenderansicht"
                  title="Kalenderansicht"
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

              {/* Right: iCal Feed & Filter Toggle Button */}
              <div className="flex gap-1">
                <button
                  onClick={() => setIcalModalOpen(true)}
                  className="text-dark dark:text-dark-text dark:bg-dark-background-secondary dark:hover:bg-dark-background flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold transition-colors hover:bg-gray-200"
                  aria-label="iCal Feed"
                  title="Kalender-Feed abonnieren"
                >
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">iCal</span>
                </button>
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
                      <FunnelXIcon className="h-5 w-5 text-gray-400 transition-colors hover:text-gray-600" />
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
                  <FunnelIcon className="h-4 w-4" />
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
                    <Select
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
                    </Select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Kategorie
                    </label>
                    <Select
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
                        </>
                      )}
                    </Select>
                  </div>
                </div>

                {/* Darstellung */}
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Darstellung
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setMonthGrouping(groupByMonth ? "off" : "on")
                    }
                    aria-pressed={groupByMonth}
                    className="text-dark dark:text-dark-text dark:bg-dark-background-secondary dark:hover:bg-dark-background flex w-full items-center justify-between gap-3 rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold transition-colors hover:bg-gray-200"
                  >
                    <span className="flex items-center gap-2">
                      <CalendarRangeIcon className="h-4 w-4 text-gray-400" />
                      Nach Monaten gruppieren
                    </span>
                    <span
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
                        groupByMonth
                          ? "bg-primary"
                          : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    >
                      {/* `left-0.5` plus ganze Schritte: eine halbe
                          Abstandseinheit gibt es in der Skala nicht, und die
                          Klasse fiele wirkungslos aus — der Knopf bliebe
                          stehen. */}
                      <span
                        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                          groupByMonth ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </span>
                  </button>
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
            {effectiveViewMode === "list" ? (
              /* Kartenraster, wahlweise nach Monaten gruppiert */
              <div className="space-y-6 md:space-y-8">
                {/* Upcoming Events — ohne Monatsgruppierung fließen alle
                    Termine durch dasselbe Raster, statt nach jedem Monat
                    umzubrechen. */}
                {groupByMonth
                  ? Object.entries(groupedByMonth).map(
                      ([monthKey, { label, items }]) => (
                        <div key={monthKey}>
                          <MonthHeading
                            label={label}
                            count={items.length}
                            expanded={isMonthExpanded(monthKey)}
                            onToggle={() => toggleMonth(monthKey)}
                          />
                          {isMonthExpanded(monthKey) && (
                            <div className="pt-4">
                              {renderItemGroup(items, monthKey)}
                            </div>
                          )}
                        </div>
                      ),
                    )
                  : sortedItems.length > 0
                    ? renderItemGroup(sortedItems, "upcoming")
                    : null}

                {sortedItems.length === 0 && (
                  <div className="py-8 text-center md:py-12">
                    <p className="text-base text-gray-600 md:text-lg dark:text-gray-400">
                      Keine kommenden Termine gefunden.
                    </p>
                  </div>
                )}

                {/* Past Events Section — ohne Monatsgruppierung: die
                    Vergangenheit ist ein Nachschlagewerk, keine Planung. Wer
                    hier aufklappt, sucht einen bestimmten Termin und liest die
                    Liste von neu nach alt durch. */}
                {pastItems.length > 0 && (
                  <div className="mt-10 md:mt-14">
                    <MonthHeading
                      label="Vergangene Termine"
                      count={pastItems.length}
                      expanded={pastEventsExpanded}
                      onToggle={() =>
                        setPastEventsExpanded(!pastEventsExpanded)
                      }
                    />
                    {pastEventsExpanded && (
                      <div className="pt-4">
                        {renderItemGroup(pastItems, "past")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Calendar View */
              <>
                {/* Mobile Calendar */}
                <div className="lg:hidden">
                  <CalendarView items={calendarItems} />
                </div>

                {/* Desktop Calendar */}
                <div className="hidden lg:block">
                  <DesktopCalendarView items={calendarItems} />
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {/* iCal Feed Modal */}
      <FeedConfigModal
        isOpen={icalModalOpen}
        onClose={() => setIcalModalOpen(false)}
        feedType="ical"
      />
    </PublicPage>
  );
}
