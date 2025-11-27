import Link from "next/link";
import { api } from "@/trpc/react";
import { capitalizeFirstLetter } from "@/lib/utils";
import { getDistrictColor } from "@/lib/district-color";
import CourseCardSkeleton from "./course-card-skeleton";

interface CourseCardProps {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  location: string;
  courseType: string;
  district?: number;
}

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
  const isSameDay = start.toDateString() === end.toDateString();

  // Berechne Dauer in Tagen
  const durationMs = end.getTime() - start.getTime();
  const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

  const districtColor = getDistrictColor(district);
  const spotsAvailable = api.courses.getAvailableSlots.useQuery({
    id: id,
  }).data;
  const course = api.courses.getById.useQuery({ id: id }).data;
  const registrationOpen =
    course &&
    course.registrationOpen &&
    course.registrationDeadline &&
    new Date() < new Date(course.registrationDeadline);

  if (!spotsAvailable || !course) {
    return <CourseCardSkeleton />;
  }

  return (
    <Link href={`/termine/course/${id}`} className="group block h-full">
      <article
        className="bg-background-secondary dark:bg-dark-surface dark:shadow-dark-border flex h-full cursor-pointer flex-col rounded-lg border-l-4 p-6 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
        style={{
          borderLeftColor: districtColor,
        }}
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div className="flex gap-2">
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold text-white"
              style={{ backgroundColor: districtColor }}
            >
              {capitalizeFirstLetter(courseType)}
            </span>
          </div>

          <div className="flex gap-2">
            {!isSameDay && (
              <span className="text-primary bg-primary/10 rounded-full px-3 py-1 text-xs font-semibold">
                {durationDays} {durationDays === 1 ? "Tag" : "Tage"}
              </span>
            )}
            {registrationOpen && spotsAvailable.availableSlots > 0 && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                Anmeldung offen
              </span>
            )}
            {registrationOpen &&
              spotsAvailable.isFull &&
              spotsAvailable.allowWaitingList && (
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                  Warteliste geöffnet
                </span>
              )}
            {registrationOpen &&
              spotsAvailable.isFull &&
              !spotsAvailable.allowWaitingList && (
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                  Ausgebucht
                </span>
              )}
          </div>
        </div>

        <h3 className="text-dark group-hover:text-primary dark:group-hover:text-primary mb-2 text-xl font-bold transition-colors dark:text-white">
          {title}
        </h3>

        <div className="mb-4 flex-col space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 shrink-0"
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
            {isSameDay ? (
              <span>
                {start.toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            ) : (
              <span>
                {start.toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "short",
                })}
                {" - "}
                {end.toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {location}
          </div>

          {registrationOpen && !spotsAvailable.isFull && (
            <div className="text-primary flex items-center gap-2 font-semibold">
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Noch {spotsAvailable.availableSlots}{" "}
              {spotsAvailable.availableSlots === 1 ? "Platz" : "Plätze"} frei
            </div>
          )}
        </div>

        <div className="text-primary mt-auto inline-flex items-center text-sm font-semibold">
          {registrationOpen && !spotsAvailable.isFull
            ? "Jetzt anmelden"
            : "Details ansehen"}
          <svg
            className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
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
        </div>
      </article>
    </Link>
  );
}
