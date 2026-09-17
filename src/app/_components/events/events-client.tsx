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
import { cn } from "@/lib/utils";
import PublicPage from "../general/public-page";
import { useBanner } from "../ui/banner-context";
import {
  courseEntry,
  eventEntry,
  type ProgrammeEntry,
} from "@/app/_components/programmheft/programme-data";
import { ProgrammeList } from "@/app/_components/programmheft/programme";
import { isRegistrationOpen } from "@/app/_components/programmheft/programme-data";
import { useStickyTop } from "@/lib/use-sticky-top";
import { useTitelVorbei } from "@/lib/use-titel-vorbei";
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
 * Monatsüberschriften an oder aus. Ohne sie fließt die Liste durchgehend,
 * statt nach jedem Monat umzubrechen — bei wenigen Terminen je Monat steht
 * sonst mehr Überschrift als Inhalt auf der Seite.
 */
type MonthGrouping = "on" | "off";

function isMonthGrouping(value: string): value is MonthGrouping {
  return value === "on" || value === "off";
}

function isViewMode(value: string | null): value is ViewMode {
  return value !== null && (VIEW_MODES as string[]).includes(value);
}
type FilterType = "all" | "events" | "courses";

const TYPE_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "events", label: "Termine" },
  { value: "courses", label: "Lehrgänge" },
];

/** 44px-Quadrat, das sich wie eine Icon-Schaltfläche verhält — ausgewählt bleibt sie dauerhaft in Tinte gefüllt. */
const TOGGLE_BUTTON =
  "flex h-11 w-11 items-center justify-center transition-colors";
const TOGGLE_ACTIVE = "bg-ink text-paper dark:bg-night-text dark:text-night";
const TOGGLE_INACTIVE =
  "text-ink hover:bg-ink hover:text-paper dark:text-night-text dark:hover:bg-night-text dark:hover:text-night";

/**
 * Monatsüberschrift zum Auf- und Zuklappen — Listenkopf-Stimme mit 2px-Strich
 * darunter, bewusst nur Typografie und Haarlinie statt einer Kachel mit
 * grauer Kopfzeile: die Termine darunter sind selbst schon Programmzeilen,
 * und eine Box um Zeilen legt eine Verschachtelung nahe, die es inhaltlich
 * nicht gibt.
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
      className="border-ink dark:border-night-text group flex w-full items-baseline gap-3 border-b-2 py-3 text-left transition-colors"
    >
      <h2 className="condensed text-ink dark:text-night-text text-[1.75rem] leading-none font-extrabold">
        {label}
      </h2>
      <span className="semi-condensed text-dark dark:text-night-muted text-sm font-semibold">
        {count} {count === 1 ? "Termin" : "Termine"}
      </span>
      <ChevronDownIcon
        className={`text-dark dark:text-night-muted ml-auto h-5 w-5 shrink-0 self-center transition-transform ${
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
  const stickyTop = useStickyTop(bannerHeight);
  const { marke, vorbei } = useTitelVorbei(stickyTop);

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
  /**
   * `?anmeldung=offen` — die Startseite zeigt nur einen Lehrgang mit offener
   * Anmeldung und verweist für die übrigen hierher.
   */
  const [nurOffeneAnmeldung, setNurOffeneAnmeldung] = useState(
    params.get("anmeldung") === "offen",
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

        // Termine nehmen keine Anmeldungen entgegen; der Filter lässt also
        // nur Angebote übrig, deren Anmeldung gerade läuft. „Angebote“, weil
        // darunter neben Lehrgängen auch Workshops, Freizeiten und
        // Komponistenporträts stehen.
        if (
          nurOffeneAnmeldung &&
          (item.type !== "course" || !isRegistrationOpen(item, now))
        ) {
          return false;
        }

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

        return true;
      });
    },
    [filterType, selectedDistrict, nurOffeneAnmeldung, now],
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

  /**
   * Termin oder Kurs als Programmzeile. `eventEntry`/`courseEntry` stammen aus
   * dem Programmheft-Baustein; das Mitmachangebot hat dort keinen eigenen
   * Platz, deshalb steht es hier — wo kein Registrierungs- oder
   * Abgesagt-Status im Weg ist — als Statuszeile.
   */
  const toProgrammeEntry = useCallback(
    (item: CalendarItem): ProgrammeEntry => {
      if (item.type === "event") {
        const entry = eventEntry(item);
        if (!item.cancelled && item.openToParticipants) {
          entry.status = { text: "Mitspielen möglich!", tone: "muted" };
        }
        return entry;
      }
      return courseEntry(item, now);
    },
    [now],
  );

  /** Programm als Tabellensatz — wahlweise nach Monaten gruppiert. */
  const renderItemGroup = (items: CalendarItem[]) => (
    <ProgrammeList entries={items.map(toProgrammeEntry)} now={now} />
  );

  const districtSelectOptions = [
    "all",
    "Bezirksübergreifend",
    ...bezirke
      .sort((a, b) => a.number - b.number)
      .map((b) => `Bezirk ${b.number} (${b.name})`),
  ];

  const hasActiveFilters =
    filterType !== "all" || selectedDistrict !== "all" || nurOffeneAnmeldung;

  const resetFilters = () => {
    setFilterType("all");
    setSelectedDistrict("all");
    setNurOffeneAnmeldung(false);
  };

  const selectFieldClass =
    "rounded-none! border-ink! dark:border-night-text! text-ink! dark:text-night-text! bg-paper! dark:bg-night! w-full border-2! px-3 py-2 text-sm";

  return (
    <PublicPage
      title="Termine"
      breadcrumbs={[{ label: "Start", href: "/" }, { label: "Termine" }]}
      description={<p>Alle Konzerte, Gottesdienste und Lehrgänge</p>}
      // Die Filterleiste dieser Seite trägt den Kolumnentitel bereits.
      stickyTitle={false}
    >
      {/* Marke für „Titel vorbei“: steht genau hinter dem Seitenkopf. */}
      <div ref={marke} aria-hidden className="h-px" />
      <div className="bg-paper dark:bg-night">
        {/* Filter & View Toggle */}
        <section
          className="border-rule dark:border-night-rule bg-paper dark:bg-night sticky z-20 border-b"
          style={{ top: `${stickyTop}px` }}
        >
          <div className="sheet py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-4">
                {/* Kolumnentitel: erscheint erst, wenn der große Titel nach
                    oben aus dem Bild gelaufen ist — sonst stünde „Termine“
                    zweimal untereinander. Statt nur die Deckkraft zu ändern,
                    wächst der Titel aus der Breite null auf: Die Schalter
                    stehen zunächst ganz links und rücken beim Einblenden
                    nach rechts. Das negative `-mr-4` schluckt in eingeklapptem
                    Zustand den `gap-4` der Zeile, sonst bliebe eine Lücke. */}
                <p
                  aria-hidden={!vorbei}
                  className={cn(
                    "condensed text-ink dark:text-night-text hidden overflow-hidden text-xl leading-none font-bold whitespace-nowrap transition-[max-width,opacity,margin] duration-200 motion-reduce:transition-none lg:block",
                    vorbei ? "max-w-48 opacity-100" : "-mr-4 max-w-0 opacity-0",
                  )}
                >
                  Termine
                </p>
                {/* Left: View Toggle */}
                <div className="border-ink dark:border-night-text flex border-2">
                  <button
                    onClick={() => handleSetViewMode("list")}
                    className={cn(
                      TOGGLE_BUTTON,
                      effectiveViewMode === "list"
                        ? TOGGLE_ACTIVE
                        : TOGGLE_INACTIVE,
                    )}
                    aria-pressed={effectiveViewMode === "list"}
                    aria-label="Listenansicht"
                    title="Listenansicht"
                  >
                    <ListIcon className="h-5 w-5" aria-hidden />
                  </button>
                  <button
                    onClick={() => handleSetViewMode("calendar")}
                    className={cn(
                      "border-ink dark:border-night-text border-l-2",
                      TOGGLE_BUTTON,
                      effectiveViewMode === "calendar"
                        ? TOGGLE_ACTIVE
                        : TOGGLE_INACTIVE,
                    )}
                    aria-pressed={effectiveViewMode === "calendar"}
                    aria-label="Kalenderansicht"
                    title="Kalenderansicht"
                  >
                    <CalendarIcon className="h-5 w-5" aria-hidden />
                  </button>
                </div>
              </div>

              {/* Center: Active Filters Count */}
              <div className="flex-1 text-center">
                <span className="text-dark dark:text-night-muted text-sm">
                  {sortedItems.length}{" "}
                  {sortedItems.length === 1 ? "Termin" : "Termine"}
                  {hasActiveFilters && (
                    <span className="text-primary-ink dark:text-primary ml-1 font-semibold">
                      (gefiltert)
                    </span>
                  )}
                </span>
              </div>

              {/* Right: iCal Feed & Filter Toggle Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIcalModalOpen(true)}
                  className="semi-condensed border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night inline-flex h-10 items-center gap-2 border-2 px-3 text-sm font-semibold transition-colors"
                  aria-label="iCal Feed"
                  title="Kalender-Feed abonnieren"
                >
                  <Calendar className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">iCal</span>
                </button>
                {!filtersOpen && hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className={cn(TOGGLE_BUTTON, TOGGLE_INACTIVE)}
                    aria-label="Filter zurücksetzen"
                    title="Filter zurücksetzen"
                  >
                    <FunnelXIcon className="h-5 w-5" aria-hidden />
                  </button>
                )}
                <button
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className={cn(
                    TOGGLE_BUTTON,
                    filtersOpen ? TOGGLE_ACTIVE : TOGGLE_INACTIVE,
                  )}
                  aria-expanded={filtersOpen}
                  aria-label="Filter öffnen"
                >
                  <FunnelIcon className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>

            {/* Collapsible Filter Panel */}
            {filtersOpen && (
              <div className="border-rule dark:border-night-rule mt-3 space-y-4 border-t pt-4">
                {/* Type Filter */}
                <div>
                  <label className="semi-condensed text-dark dark:text-night-muted mb-2 block text-sm font-semibold">
                    Typ
                  </label>
                  <div className="border-ink dark:border-night-text flex border-2">
                    {TYPE_OPTIONS.map((option, index) => (
                      <button
                        key={option.value}
                        onClick={() => setFilterType(option.value)}
                        className={cn(
                          "semi-condensed flex-1 px-3 py-2 text-sm font-semibold transition-colors",
                          index > 0 &&
                            "border-ink dark:border-night-text border-l-2",
                          filterType === option.value
                            ? TOGGLE_ACTIVE
                            : TOGGLE_INACTIVE,
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Anmeldung */}
                <label className="flex min-h-11 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={nurOffeneAnmeldung}
                    onChange={(e) => setNurOffeneAnmeldung(e.target.checked)}
                    className="border-ink checked:bg-ink dark:border-night-text dark:checked:bg-night-text bg-paper dark:bg-night h-5 w-5 shrink-0 cursor-pointer appearance-none border-2"
                  />
                  <span className="semi-condensed text-ink dark:text-night-text text-sm font-semibold">
                    Nur Angebote mit offener Anmeldung
                  </span>
                </label>

                {/* Bezirk */}
                <div>
                  <label
                    htmlFor="termine-bezirk"
                    className="semi-condensed text-dark dark:text-night-muted mb-2 block text-sm font-semibold"
                  >
                    Bezirk
                  </label>
                  <Select
                    id="termine-bezirk"
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className={selectFieldClass}
                  >
                    <option value="all">Alle Termine</option>
                    {districtSelectOptions.slice(1).map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Darstellung */}
                <div>
                  <label className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3">
                    <span className="text-ink dark:text-night-text flex items-center gap-2 text-sm font-semibold">
                      <CalendarRangeIcon
                        className="text-dark dark:text-night-muted h-4 w-4"
                        aria-hidden
                      />
                      Nach Monaten gruppieren
                    </span>
                    <input
                      type="checkbox"
                      checked={groupByMonth}
                      onChange={(e) =>
                        setMonthGrouping(e.target.checked ? "on" : "off")
                      }
                      className="border-ink text-ink dark:border-night-text h-5 w-5 shrink-0 rounded-none"
                    />
                  </label>
                </div>

                {/* Reset Button */}
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="link-ink text-left text-sm"
                  >
                    Filter zurücksetzen
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Content */}
        <section className="sheet py-8 md:py-12">
          {effectiveViewMode === "list" ? (
            /* Programm, wahlweise nach Monaten gruppiert */
            <div className="space-y-10 md:space-y-14">
              {/* Upcoming Events — ohne Monatsgruppierung läuft das Programm
                  durch, statt nach jedem Monat umzubrechen. */}
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
                        {isMonthExpanded(monthKey) && renderItemGroup(items)}
                      </div>
                    ),
                  )
                : sortedItems.length > 0
                  ? renderItemGroup(sortedItems)
                  : null}

              {sortedItems.length === 0 && (
                <div className="py-8 text-center md:py-12">
                  <p className="text-dark dark:text-night-muted text-base md:text-lg">
                    Keine kommenden Termine gefunden.
                  </p>
                </div>
              )}

              {/* Past Events Section — ohne Monatsgruppierung: die
                  Vergangenheit ist ein Nachschlagewerk, keine Planung. Wer
                  hier aufklappt, sucht einen bestimmten Termin und liest die
                  Liste von neu nach alt durch. */}
              {pastItems.length > 0 && (
                <div>
                  <MonthHeading
                    label="Vergangene Termine"
                    count={pastItems.length}
                    expanded={pastEventsExpanded}
                    onToggle={() => setPastEventsExpanded(!pastEventsExpanded)}
                  />
                  {pastEventsExpanded && renderItemGroup(pastItems)}
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
