"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RouterOutputs } from "@/trpc/react";
import MediaCredit from "@/app/_components/general/media-credit";
import { getDistrictColor } from "@/lib/district-color";
import {
  capitalizeFirstLetter,
  cn,
  extractPlainTextFromMarkdown,
} from "@/lib/utils";
import {
  CalendarDays,
  ChevronRight,
  Clock,
  GraduationCap,
  MapPin,
  Users,
} from "lucide-react";

type CourseListItem = RouterOutputs["courses"]["getAll"]["courses"][number];

/**
 * Course run (de-DE) for homepage banners.
 * Same calendar day: date + start/end times. Multi-day: dates only, no times.
 */
function formatGermanCourseDateTimeRange(
  startInput: string | Date,
  endInput: string | Date,
): string {
  const start = new Date(startInput);
  const end = new Date(endInput);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "";
  }

  const dateFmt: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  };
  const timeFmt: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };

  const d = (x: Date) => x.toLocaleDateString("de-DE", dateFmt);
  const t = (x: Date) => x.toLocaleTimeString("de-DE", timeFmt);

  if (start.getTime() === end.getTime()) {
    return `${d(start)}, ${t(start)}`;
  }

  const sameCalendarDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameCalendarDay) {
    return `${d(start)}, ${t(start)} – ${t(end)}`;
  }

  return `${d(start)} – ${d(end)}`;
}

function formatGermanRegistrationDeadline(input: string | Date): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isRegistrationCurrentlyOpen(course: CourseListItem): boolean {
  if (!course.registrationOpen) {
    return false;
  }

  const now = new Date();
  const opensAt = course.registrationOpensAt
    ? new Date(course.registrationOpensAt)
    : null;
  const deadline = course.registrationDeadline
    ? new Date(course.registrationDeadline)
    : null;

  if (opensAt && opensAt > now) {
    return false;
  }

  if (deadline && deadline < now) {
    return false;
  }

  return true;
}

/** Large banner: only courses whose registration window has ended (deadline in the past). */
function hasRegistrationDeadlinePassed(course: CourseListItem): boolean {
  if (!course.registrationDeadline) {
    return false;
  }
  return new Date(course.registrationDeadline).getTime() < Date.now();
}

function SmallOpenRegistrationCard({
  course,
  className,
}: {
  course: CourseListItem;
  className?: string;
}) {
  const districtColor = getDistrictColor(course?.bezirk?.number);

  return (
    <Link
      href={`/termine/course/${course.id}`}
      className={cn(
        "group bg-background dark:bg-dark-surface dark:border-dark-border hover:border-primary/40 flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-l-4 border-gray-200 shadow-sm transition-all hover:shadow-md",
        className,
      )}
      style={{ borderLeftColor: districtColor }}
    >
      <div className="flex min-w-0 flex-1 flex-col p-6 sm:p-7">
        <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
          <p className="text-primary text-sm font-semibold">Anmeldung offen</p>
          <span
            className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: districtColor }}
          >
            {course.bezirk?.number
              ? `Bezirk ${course.bezirk.number}`
              : "Bezirksübergreifend"}
          </span>
        </div>
        <h4 className="text-dark dark:text-dark-text mb-2 line-clamp-3 text-base leading-snug font-semibold sm:text-lg">
          {course.title}
        </h4>
        <div className="mb-1.5 flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 leading-snug">
            {formatGermanCourseDateTimeRange(course.startDate, course.endDate)}
          </span>
        </div>
        {course.registrationDeadline ? (
          <div className="mb-1.5 flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 leading-snug">
              Anmeldeschluss:{" "}
              {formatGermanRegistrationDeadline(course.registrationDeadline)}
            </span>
          </div>
        ) : null}
        {course.registrationTotalCapacity != null &&
        course.registrationTotalCapacity > 0 ? (
          <div className="mb-1.5 flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Users className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 leading-snug">
              {course.availableSlots != null && course.availableSlots > 0 ? (
                <>
                  Noch {course.availableSlots}{" "}
                  {course.availableSlots === 1 ? "Platz" : "Plätze"} frei
                </>
              ) : (
                "Keine Plätze mehr frei"
              )}
            </span>
          </div>
        ) : null}
        <p className="text-primary mt-auto inline-flex items-center pt-1 text-sm font-semibold sm:text-base">
          Anmelden
          <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </p>
      </div>
    </Link>
  );
}

const OPEN_CARDS_PER_PAGE = 2;

/** Homepage fallback when no “closed registration” hero course: carousel pages of upcoming courses */
const FALLBACK_COURSES_PER_PAGE = 3;

function homeCourseRegistrationStatus(course: CourseListItem): {
  label: string;
  emphasis: boolean;
} {
  if (isRegistrationCurrentlyOpen(course)) {
    return { label: "Anmeldung offen", emphasis: true };
  }
  if (hasRegistrationDeadlinePassed(course)) {
    return { label: "Anmeldung geschlossen", emphasis: false };
  }
  const opensAt = course.registrationOpensAt
    ? new Date(course.registrationOpensAt)
    : null;
  if (opensAt && opensAt.getTime() > Date.now()) {
    return {
      label: `Anmeldung ab ${opensAt.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`,
      emphasis: false,
    };
  }
  if (!course.registrationOpen) {
    return { label: "Details zur Anmeldung", emphasis: false };
  }
  return { label: "Kommender Lehrgang", emphasis: false };
}

function FallbackUpcomingCourseCard({ course }: { course: CourseListItem }) {
  const districtColor = getDistrictColor(course?.bezirk?.number);
  const status = homeCourseRegistrationStatus(course);

  return (
    <Link
      href={`/termine/course/${course.id}`}
      className={cn(
        "group bg-background dark:bg-dark-surface dark:border-dark-border hover:border-primary/40 flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-l-4 border-gray-200 shadow-sm transition-all hover:shadow-md",
      )}
      style={{ borderLeftColor: districtColor }}
    >
      <div className="relative h-36 w-full shrink-0 sm:h-40">
        {course.image?.url ? (
          <>
            <Image
              src={course.image.url}
              alt={course.image.alt || course.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            {(course.image.copyright || course.image.creator) && (
              <div className="absolute right-2 bottom-2 flex justify-end">
                <MediaCredit
                  copyright={course.image.copyright}
                  creator={course.image.creator}
                  showCreatorIcon
                  variant="light"
                  className="text-right text-white/90 drop-shadow-sm"
                />
              </div>
            )}
          </>
        ) : (
          <div className="from-primary/20 to-primary/5 flex h-full w-full items-center justify-center bg-linear-to-br">
            <GraduationCap
              className="text-primary h-12 w-12 opacity-40"
              aria-hidden
            />
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-5 sm:p-6">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm font-semibold",
              status.emphasis
                ? "text-primary"
                : "text-gray-600 dark:text-gray-400",
            )}
          >
            {status.label}
          </p>
          <span
            className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: districtColor }}
          >
            {course.bezirk?.number
              ? `Bezirk ${course.bezirk.number}`
              : "Bezirksübergreifend"}
          </span>
        </div>
        <p className="text-primary mb-2 text-xs font-medium">
          {capitalizeFirstLetter(course.courseType)}
        </p>
        <h4 className="text-dark dark:text-dark-text mb-3 line-clamp-2 text-base leading-snug font-semibold sm:text-lg">
          {course.title}
        </h4>
        <div className="mb-1.5 flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 leading-snug">
            {formatGermanCourseDateTimeRange(course.startDate, course.endDate)}
          </span>
        </div>
        <div className="mb-1.5 flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 leading-snug">
            {course.location?.city || "Ort folgt"}
          </span>
        </div>
        {isRegistrationCurrentlyOpen(course) &&
        course.registrationTotalCapacity != null &&
        course.registrationTotalCapacity > 0 ? (
          <div className="mb-1.5 flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Users className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 leading-snug">
              {course.availableSlots != null && course.availableSlots > 0 ? (
                <>
                  Noch {course.availableSlots}{" "}
                  {course.availableSlots === 1 ? "Platz" : "Plätze"} frei
                </>
              ) : (
                "Keine Plätze mehr frei"
              )}
            </span>
          </div>
        ) : null}
        <p className="text-primary mt-auto inline-flex items-center pt-3 text-sm font-semibold">
          Details ansehen
          <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </p>
      </div>
    </Link>
  );
}

const CAROUSEL_AUTO_ADVANCE_MS = 6000;

/** Next index in a circular list (autoplay always moves “forward”). */
function isCarouselForward(
  prev: number,
  next: number,
  length: number,
): boolean {
  if (length <= 1) return true;
  return next === (prev + 1) % length;
}
const CAROUSEL_AUTO_RESUME_MS = 10000;

interface UpcomingCoursesCarouselProps {
  courses: CourseListItem[];
}

export default function UpcomingCoursesCarousel({
  courses,
}: UpcomingCoursesCarouselProps) {
  const closedRegistrationCourses = useMemo(
    () =>
      courses
        .filter(hasRegistrationDeadlinePassed)
        .sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
        ),
    [courses],
  );

  const openRegistrationCourses = useMemo(
    () =>
      courses
        .filter(isRegistrationCurrentlyOpen)
        .sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
        ),
    [courses],
  );

  const [leftIndex, setLeftIndex] = useState(0);
  const [openPageIndex, setOpenPageIndex] = useState(0);
  const [leftAutoPlay, setLeftAutoPlay] = useState(true);
  const [rightAutoPlay, setRightAutoPlay] = useState(true);
  const [leftProgress, setLeftProgress] = useState(0);
  const [rightProgress, setRightProgress] = useState(0);
  const leftResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rightResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [leftEnterForward, setLeftEnterForward] = useState(true);
  const [rightEnterForward, setRightEnterForward] = useState(true);
  const [leftNavGeneration, setLeftNavGeneration] = useState(0);
  const [rightNavGeneration, setRightNavGeneration] = useState(0);
  const [fallbackPageIndex, setFallbackPageIndex] = useState(0);
  const [fallbackAutoPlay, setFallbackAutoPlay] = useState(true);
  const [fallbackProgress, setFallbackProgress] = useState(0);
  const [fallbackEnterForward, setFallbackEnterForward] = useState(true);
  const [fallbackNavGeneration, setFallbackNavGeneration] = useState(0);
  const fallbackResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const pauseLeftAutoTemporarily = useCallback(() => {
    setLeftAutoPlay(false);
    if (leftResumeTimerRef.current) {
      clearTimeout(leftResumeTimerRef.current);
    }
    leftResumeTimerRef.current = setTimeout(() => {
      setLeftAutoPlay(true);
      leftResumeTimerRef.current = null;
    }, CAROUSEL_AUTO_RESUME_MS);
  }, []);

  const pauseRightAutoTemporarily = useCallback(() => {
    setRightAutoPlay(false);
    if (rightResumeTimerRef.current) {
      clearTimeout(rightResumeTimerRef.current);
    }
    rightResumeTimerRef.current = setTimeout(() => {
      setRightAutoPlay(true);
      rightResumeTimerRef.current = null;
    }, CAROUSEL_AUTO_RESUME_MS);
  }, []);

  const pauseFallbackAutoTemporarily = useCallback(() => {
    setFallbackAutoPlay(false);
    if (fallbackResumeTimerRef.current) {
      clearTimeout(fallbackResumeTimerRef.current);
    }
    fallbackResumeTimerRef.current = setTimeout(() => {
      setFallbackAutoPlay(true);
      fallbackResumeTimerRef.current = null;
    }, CAROUSEL_AUTO_RESUME_MS);
  }, []);

  const openPageCount = Math.max(
    1,
    Math.ceil(openRegistrationCourses.length / OPEN_CARDS_PER_PAGE),
  );

  const effectiveLeftIndex =
    closedRegistrationCourses.length === 0
      ? 0
      : Math.min(leftIndex, closedRegistrationCourses.length - 1);

  const effectiveOpenPageIndex = Math.min(openPageIndex, openPageCount - 1);

  const leftCourse = closedRegistrationCourses[effectiveLeftIndex];

  const openPageCourses = useMemo(() => {
    const start = effectiveOpenPageIndex * OPEN_CARDS_PER_PAGE;
    return openRegistrationCourses.slice(start, start + OPEN_CARDS_PER_PAGE);
  }, [openRegistrationCourses, effectiveOpenPageIndex]);

  const allUpcomingSorted = useMemo(
    () =>
      [...courses].sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      ),
    [courses],
  );

  const noClosedRegistrationHero = closedRegistrationCourses.length === 0;

  /** Split 2/3 + 1/3 layout only when both hero (closed) and open-registration cards exist. */
  const showOpenRegistrationColumn =
    closedRegistrationCourses.length > 0 && openRegistrationCourses.length > 0;

  const fallbackPageCount = Math.max(
    1,
    Math.ceil(allUpcomingSorted.length / FALLBACK_COURSES_PER_PAGE),
  );

  const effectiveFallbackPageIndex = Math.min(
    fallbackPageIndex,
    fallbackPageCount - 1,
  );

  const fallbackPageCourses = useMemo(() => {
    const start = effectiveFallbackPageIndex * FALLBACK_COURSES_PER_PAGE;
    return allUpcomingSorted.slice(start, start + FALLBACK_COURSES_PER_PAGE);
  }, [allUpcomingSorted, effectiveFallbackPageIndex]);

  const leftDescriptionExcerpt = leftCourse?.description
    ? extractPlainTextFromMarkdown(leftCourse.description, 5, 320)
    : "";

  const leftDistrictColor = getDistrictColor(leftCourse?.bezirk?.number);

  const showOpenCarousel = openRegistrationCourses.length > OPEN_CARDS_PER_PAGE;

  useEffect(() => {
    if (!leftAutoPlay || closedRegistrationCourses.length <= 1) return;
    const len = closedRegistrationCourses.length;
    const id = setInterval(() => {
      setLeftEnterForward(true);
      setLeftNavGeneration((g) => g + 1);
      setLeftIndex((prev) => (prev + 1) % len);
    }, CAROUSEL_AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [leftAutoPlay, closedRegistrationCourses.length]);

  useEffect(() => {
    if (!rightAutoPlay || openPageCount <= 1 || !showOpenRegistrationColumn)
      return;
    const id = setInterval(() => {
      setRightEnterForward(true);
      setRightNavGeneration((g) => g + 1);
      setOpenPageIndex((prev) => (prev + 1) % openPageCount);
    }, CAROUSEL_AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [rightAutoPlay, openPageCount, showOpenRegistrationColumn]);

  useEffect(() => {
    return () => {
      if (leftResumeTimerRef.current) clearTimeout(leftResumeTimerRef.current);
      if (rightResumeTimerRef.current)
        clearTimeout(rightResumeTimerRef.current);
      if (fallbackResumeTimerRef.current)
        clearTimeout(fallbackResumeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (closedRegistrationCourses.length <= 1 || !leftAutoPlay) {
      return;
    }
    let rafId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(100, (elapsed / CAROUSEL_AUTO_ADVANCE_MS) * 100);
      setLeftProgress(p);
      if (p < 100) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [effectiveLeftIndex, leftAutoPlay, closedRegistrationCourses.length]);

  useEffect(() => {
    if (openPageCount <= 1 || !rightAutoPlay || !showOpenRegistrationColumn) {
      return;
    }
    let rafId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(100, (elapsed / CAROUSEL_AUTO_ADVANCE_MS) * 100);
      setRightProgress(p);
      if (p < 100) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [
    effectiveOpenPageIndex,
    rightAutoPlay,
    openPageCount,
    showOpenRegistrationColumn,
  ]);

  useEffect(() => {
    if (
      !noClosedRegistrationHero ||
      !fallbackAutoPlay ||
      fallbackPageCount <= 1
    ) {
      return;
    }
    const len = fallbackPageCount;
    const id = setInterval(() => {
      setFallbackEnterForward(true);
      setFallbackNavGeneration((g) => g + 1);
      setFallbackPageIndex((prev) => (prev + 1) % len);
    }, CAROUSEL_AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [fallbackAutoPlay, fallbackPageCount, noClosedRegistrationHero]);

  useEffect(() => {
    if (
      !noClosedRegistrationHero ||
      fallbackPageCount <= 1 ||
      !fallbackAutoPlay
    ) {
      return;
    }
    let rafId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(100, (elapsed / CAROUSEL_AUTO_ADVANCE_MS) * 100);
      setFallbackProgress(p);
      if (p < 100) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [
    effectiveFallbackPageIndex,
    fallbackAutoPlay,
    fallbackPageCount,
    noClosedRegistrationHero,
  ]);

  if (courses.length === 0) {
    return (
      <p className="text-gray-600 dark:text-gray-400">
        Aktuell keine Lehrgänge verfügbar.
      </p>
    );
  }

  const leftProgressDisplay =
    closedRegistrationCourses.length <= 1 ? 0 : leftProgress;
  const rightProgressDisplay =
    !showOpenRegistrationColumn || openPageCount <= 1 ? 0 : rightProgress;
  const fallbackProgressDisplay =
    !noClosedRegistrationHero || fallbackPageCount <= 1 ? 0 : fallbackProgress;

  const openRegistrationPillButtons = (
    layout: "horizontal" | "vertical",
  ): ReactNode[] =>
    Array.from({ length: openPageCount }, (_, i) => {
      const isActive = i === effectiveOpenPageIndex;
      const horizontal = layout === "horizontal";
      return (
        <button
          key={`${layout}-${i}`}
          type="button"
          onClick={() => {
            if (i === effectiveOpenPageIndex) return;
            setRightEnterForward(
              isCarouselForward(effectiveOpenPageIndex, i, openPageCount),
            );
            setRightNavGeneration((g) => g + 1);
            setOpenPageIndex(i);
            pauseRightAutoTemporarily();
          }}
          className={cn(
            "relative shrink-0 overflow-hidden rounded-full transition-[width,height]",
            horizontal
              ? isActive
                ? "h-2 w-6 bg-gray-300 dark:bg-gray-600"
                : "h-2 w-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600"
              : isActive
                ? "h-6 w-1.5 bg-gray-300 dark:bg-gray-600"
                : "h-2 w-1.5 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600",
          )}
          aria-label={`Seite ${i + 1} von ${openPageCount}${
            isActive
              ? `, Fortschritt ${Math.round(rightProgressDisplay)} Prozent`
              : ""
          }`}
          aria-current={isActive}
        >
          {isActive ? (
            <span
              className={cn(
                "bg-primary absolute rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
                horizontal ? "inset-y-0 left-0" : "top-0 right-0 left-0",
              )}
              style={
                horizontal
                  ? {
                      width: `${rightProgressDisplay}%`,
                      transition: "none",
                    }
                  : {
                      height: `${rightProgressDisplay}%`,
                      transition: "none",
                    }
              }
              aria-hidden
            />
          ) : null}
        </button>
      );
    });

  const mainBannerMinClass = "min-h-[520px] lg:min-h-[480px]";
  /** Matches banner min height so each small card can be exactly half the column. */
  const openCarouselColumnHeightClass =
    "h-[520px] min-h-[520px] lg:h-[480px] lg:min-h-[480px]";

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-x-6 gap-y-8 lg:items-stretch lg:gap-6",
        showOpenRegistrationColumn && "lg:grid-cols-3",
      )}
    >
      {/* Large hero (closed registration) or full-width fallback carousel */}
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-col",
          showOpenRegistrationColumn && "lg:col-span-2 lg:h-full",
        )}
      >
        {leftCourse ? (
          <>
            <div className="w-full min-w-0">
              <div
                key={leftCourse.id}
                className={cn(
                  "w-full",
                  mainBannerMinClass,
                  leftNavGeneration > 0 &&
                    (leftEnterForward
                      ? "animate-homepage-course-fwd"
                      : "animate-homepage-course-bwd"),
                  "motion-reduce:animate-none",
                )}
              >
                <Link
                  href={`/termine/course/${leftCourse.id}`}
                  className={cn(
                    "group bg-background dark:bg-dark-surface dark:border-dark-border flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-l-4 border-gray-200 shadow-sm transition-all hover:shadow-md lg:flex-row lg:items-stretch",
                    mainBannerMinClass,
                  )}
                  style={{ borderLeftColor: leftDistrictColor }}
                >
                  <div className="relative min-h-[220px] w-full shrink-0 self-stretch sm:min-h-[240px] lg:min-h-0 lg:w-[42%] lg:max-w-md">
                    {leftCourse.image?.url ? (
                      <>
                        <Image
                          src={leftCourse.image.url}
                          alt={leftCourse.image.alt || leftCourse.title}
                          fill
                          className="object-cover"
                          sizes={
                            showOpenRegistrationColumn
                              ? "(max-width: 1024px) 100vw, 40vw"
                              : "(max-width: 1024px) 100vw, 33vw"
                          }
                        />
                        {(leftCourse.image.copyright ||
                          leftCourse.image.creator) && (
                          <div className="absolute right-2 bottom-2 z-10 flex justify-end">
                            <MediaCredit
                              copyright={leftCourse.image.copyright}
                              creator={leftCourse.image.creator}
                              showCreatorIcon
                              variant="light"
                              className="text-right text-white/90 drop-shadow-sm"
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="from-primary/20 to-primary/5 absolute inset-0 flex items-center justify-center bg-linear-to-br">
                        <GraduationCap
                          className="text-primary h-20 w-20 opacity-40"
                          aria-hidden
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
                    <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                      <p className="text-primary text-sm font-semibold">
                        Anmeldung geschlossen
                      </p>
                      <span
                        className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-white"
                        style={{ backgroundColor: leftDistrictColor }}
                      >
                        {leftCourse.bezirk?.number
                          ? `Bezirk ${leftCourse.bezirk.number}`
                          : "Bezirksübergreifend"}
                      </span>
                    </div>
                    <h3 className="text-dark dark:text-dark-text mb-3 text-2xl font-bold">
                      {leftCourse.title}
                    </h3>

                    {leftDescriptionExcerpt ? (
                      <p className="mb-4 line-clamp-5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                        {leftDescriptionExcerpt}
                      </p>
                    ) : null}

                    <div className="mb-2 flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="min-w-0 leading-snug">
                        {formatGermanCourseDateTimeRange(
                          leftCourse.startDate,
                          leftCourse.endDate,
                        )}
                      </span>
                    </div>
                    <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span>{leftCourse.location?.city || "Ort folgt"}</span>
                    </div>

                    {leftCourse.collaborators?.some(
                      (c) => c.user.profileImage?.url,
                    ) ? (
                      <div className="mb-6 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Kurs-Team
                        </span>
                        <div className="flex -space-x-2">
                          {leftCourse.collaborators
                            .filter((c) => c.user.profileImage?.url)
                            .slice(0, 4)
                            .map((c) => (
                              <Image
                                key={c.user.id}
                                src={c.user.profileImage!.url}
                                alt={c.user.displayName ?? ""}
                                width={40}
                                height={40}
                                className="border-background dark:border-dark-surface ring-background dark:ring-dark-surface h-10 w-10 rounded-full border-2 object-cover ring-2"
                              />
                            ))}
                        </div>
                      </div>
                    ) : null}
                    <p className="text-primary mt-auto inline-flex items-center text-sm font-semibold">
                      Details ansehen
                      <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </p>
                  </div>
                </Link>
              </div>
            </div>

            {closedRegistrationCourses.length > 1 ? (
              <div
                className="mt-3 flex justify-center gap-1.5"
                role="tablist"
                aria-label="Lehrgänge mit abgelaufener Anmeldefrist"
              >
                {closedRegistrationCourses.map((c, i) => {
                  const isActive = i === effectiveLeftIndex;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        if (i === effectiveLeftIndex) return;
                        const len = closedRegistrationCourses.length;
                        setLeftEnterForward(
                          isCarouselForward(effectiveLeftIndex, i, len),
                        );
                        setLeftNavGeneration((g) => g + 1);
                        setLeftIndex(i);
                        pauseLeftAutoTemporarily();
                      }}
                      className={`relative shrink-0 overflow-hidden rounded-full transition-[width,height] ${
                        isActive
                          ? "h-2 w-6 bg-gray-300 dark:bg-gray-600"
                          : "h-2 w-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600"
                      }`}
                      aria-label={`Lehrgang ${i + 1} von ${closedRegistrationCourses.length}${
                        isActive
                          ? `, Fortschritt ${Math.round(leftProgressDisplay)} Prozent`
                          : ""
                      }`}
                      aria-current={isActive}
                    >
                      {isActive ? (
                        <span
                          className="bg-primary absolute inset-y-0 left-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                          style={{
                            width: `${leftProgressDisplay}%`,
                            transition: "none",
                          }}
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="w-full min-w-0">
              <div
                key={`fallback-${effectiveFallbackPageIndex}`}
                className={cn(
                  "grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6",
                  fallbackNavGeneration > 0 &&
                    (fallbackEnterForward
                      ? "animate-homepage-open-fwd"
                      : "animate-homepage-open-bwd"),
                  "motion-reduce:animate-none",
                )}
              >
                {fallbackPageCourses.map((course) => (
                  <FallbackUpcomingCourseCard key={course.id} course={course} />
                ))}
              </div>
            </div>

            {fallbackPageCount > 1 ? (
              <div
                className="mt-3 flex justify-center gap-1.5"
                role="tablist"
                aria-label="Weitere kommende Lehrgänge"
              >
                {Array.from({ length: fallbackPageCount }, (_, i) => {
                  const isActive = i === effectiveFallbackPageIndex;
                  return (
                    <button
                      key={`fallback-page-${i}`}
                      type="button"
                      onClick={() => {
                        if (i === effectiveFallbackPageIndex) return;
                        setFallbackEnterForward(
                          isCarouselForward(
                            effectiveFallbackPageIndex,
                            i,
                            fallbackPageCount,
                          ),
                        );
                        setFallbackNavGeneration((g) => g + 1);
                        setFallbackPageIndex(i);
                        pauseFallbackAutoTemporarily();
                      }}
                      className={`relative shrink-0 overflow-hidden rounded-full transition-[width,height] ${
                        isActive
                          ? "h-2 w-6 bg-gray-300 dark:bg-gray-600"
                          : "h-2 w-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600"
                      }`}
                      aria-label={`Seite ${i + 1} von ${fallbackPageCount}${
                        isActive
                          ? `, Fortschritt ${Math.round(fallbackProgressDisplay)} Prozent`
                          : ""
                      }`}
                      aria-current={isActive}
                    >
                      {isActive ? (
                        <span
                          className="bg-primary absolute inset-y-0 left-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                          style={{
                            width: `${fallbackProgressDisplay}%`,
                            transition: "none",
                          }}
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </>
        )}
      </div>

      {showOpenRegistrationColumn ? (
        /* Vertical carousel: 2 stacked small cards; dots sit to the right of the cards */
        <div className="max-lg:dark:border-dark-border flex min-h-0 w-full flex-col max-lg:border-t max-lg:border-gray-200 max-lg:pt-6 lg:h-full lg:min-h-0">
          <div className="flex w-full flex-1 flex-col lg:min-h-0">
            <div
              key={effectiveOpenPageIndex}
              className={cn(
                "flex w-full flex-col items-stretch gap-3 sm:gap-4 lg:flex-row",
                rightNavGeneration > 0 &&
                  (rightEnterForward
                    ? "animate-homepage-open-fwd"
                    : "animate-homepage-open-bwd"),
                "motion-reduce:animate-none",
              )}
            >
              <div
                className={cn(
                  "flex h-full min-h-0 min-w-0 flex-1 flex-col gap-6",
                  openCarouselColumnHeightClass,
                )}
              >
                {openPageCourses.map((course) => (
                  <SmallOpenRegistrationCard
                    key={course.id}
                    course={course}
                    className="min-h-0 flex-1 basis-0"
                  />
                ))}
                {openPageCourses.length === 1 ? (
                  <div className="min-h-0 flex-1 basis-0" aria-hidden />
                ) : null}
              </div>

              {showOpenCarousel ? (
                <>
                  <div
                    className="flex w-full justify-center gap-1.5 pt-1 lg:hidden"
                    role="tablist"
                    aria-label="Seiten Lehrgänge mit offener Anmeldung"
                  >
                    {openRegistrationPillButtons("horizontal")}
                  </div>
                  <div
                    className="hidden shrink-0 flex-col items-center justify-center gap-1.5 self-stretch py-1 pl-1 lg:flex"
                    aria-label="Seiten Lehrgänge mit offener Anmeldung"
                    role="tablist"
                  >
                    {openRegistrationPillButtons("vertical")}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
