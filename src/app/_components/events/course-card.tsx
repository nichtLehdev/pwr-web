import Link from "next/link";
import { isRegistrationDeadlinePassed } from "@/lib/registration-deadline";
import { formatDateRange } from "@/lib/format-date-range";
import { formatAvailableSlots } from "@/lib/format-available-slots";
import { api } from "@/trpc/react";
import { courseTypeLabel } from "@/lib/termine-labels";
import CourseCardSkeleton from "./course-card-skeleton";
import { isExternalCourse } from "@/lib/course-external";
import { ArrowRight, CalendarIcon, MapPinIcon } from "lucide-react";
import { coursePath } from "@/lib/slug";
import { BezirkLabel } from "@/app/_components/programmheft/bezirk-label";
import { Tag } from "@/app/_components/programmheft/tag";

interface CourseCardProps {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  location: string;
  courseType: string;
  district?: number;
}

/**
 * Kurs als Programmzeile (keine Karte). Nicht mehr im Einsatz seit
 * `/termine` Kurse über `ProgrammeRow`/`programme-data.ts` rendert — hier
 * nur für den Fall belassen, dass eine einzelne Zeile ohne den vollen
 * `ProgrammeEntry`-Datensatz gebraucht wird.
 */
export default function CourseCard({
  id,
  title,
  startDate,
  endDate,
  location,
  courseType,
  district,
}: CourseCardProps) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const spotsAvailable = api.courses.getAvailableSlots.useQuery({
    id: id,
  }).data;
  const course = api.courses.getById.useQuery({ id: id }).data;
  const registrationOpensAt = course?.registrationOpensAt
    ? new Date(course.registrationOpensAt)
    : null;
  const isRegistrationNotOpenYet =
    registrationOpensAt && registrationOpensAt > new Date();
  const isExternal = course ? isExternalCourse(course) : false;
  const registrationOpen =
    course &&
    course.registrationOpen &&
    !isRegistrationNotOpenYet &&
    (isExternal || !isRegistrationDeadlinePassed(course.registrationDeadline));

  if (!spotsAvailable || !course) {
    return <CourseCardSkeleton />;
  }

  return (
    <Link
      href={coursePath(course)}
      className="fill-row border-rule dark:border-night-rule flex items-start justify-between gap-4 border-b px-1 py-4"
    >
      <span className="min-w-0">
        <span className="condensed text-ink dark:text-night-text block text-xl leading-tight font-bold">
          {title}
        </span>
        <span className="text-dark dark:text-night-muted semi-condensed mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
          <span>{courseTypeLabel(courseType)}</span>
          <BezirkLabel bezirk={district ? { number: district } : null} />
        </span>
        <span className="text-dark dark:text-night-muted mt-1 flex items-center gap-2 text-sm">
          <CalendarIcon className="h-4 w-4 shrink-0" aria-hidden />
          {formatDateRange(start, end)}
        </span>
        <span className="text-dark dark:text-night-muted mt-1 flex items-center gap-2 text-sm">
          <MapPinIcon className="h-4 w-4 shrink-0" aria-hidden />
          {location}
        </span>
        <span className="mt-2 flex flex-wrap items-center gap-1.5 empty:mt-0">
          {isRegistrationNotOpenYet && (
            <Tag tone="inverse">
              Anmeldung ab{" "}
              {registrationOpensAt?.toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "short",
              })}
            </Tag>
          )}
          {registrationOpen && spotsAvailable.availableSlots > 0 && (
            <span className="text-primary-ink dark:text-primary text-sm font-semibold">
              {formatAvailableSlots(
                spotsAvailable.availableSlots,
                spotsAvailable.totalCapacity,
              )}
            </span>
          )}
          {registrationOpen &&
            spotsAvailable.isFull &&
            spotsAvailable.allowWaitingList && (
              <Tag tone="orange">Warteliste geöffnet</Tag>
            )}
          {registrationOpen &&
            spotsAvailable.isFull &&
            !spotsAvailable.allowWaitingList && <Tag>Ausgebucht</Tag>}
        </span>
      </span>
      <ArrowRight
        aria-hidden
        className="text-ink dark:text-night-text mt-1 h-5 w-5 shrink-0"
      />
    </Link>
  );
}
