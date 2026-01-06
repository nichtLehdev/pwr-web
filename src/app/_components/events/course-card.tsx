import Link from "next/link";
import Image from "next/image";
import { api } from "@/trpc/react";
import { capitalizeFirstLetter } from "@/lib/utils";
import { getDistrictColor } from "@/lib/district-color";
import CourseCardSkeleton from "./course-card-skeleton";
import { CalendarIcon, CheckIcon, MapPinIcon } from "lucide-react";

interface CourseCardProps {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  location: string;
  courseType: string;
  district?: number;
  imageUrl?: string | null;
}

export default function CourseCard({
  id,
  title,
  startDate,
  endDate,
  location,
  courseType,
  district,
  imageUrl,
}: CourseCardProps) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const isSameDay = start.toDateString() === end.toDateString();

  const durationMs = end.getTime() - start.getTime();
  const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

  const districtColor = getDistrictColor(district);
  const spotsAvailable = api.courses.getAvailableSlots.useQuery({
    id: id,
  }).data;
  const course = api.courses.getById.useQuery({ id: id }).data;
  const registrationOpensAt = course?.registrationOpensAt
    ? new Date(course.registrationOpensAt)
    : null;
  const isRegistrationNotOpenYet =
    registrationOpensAt && registrationOpensAt > new Date();
  const registrationOpen =
    course &&
    course.registrationOpen &&
    !isRegistrationNotOpenYet &&
    course.registrationDeadline &&
    new Date() < new Date(course.registrationDeadline);

  if (!spotsAvailable || !course) {
    return <CourseCardSkeleton />;
  }

  return (
    <Link href={`/termine/course/${id}`} className="group block h-full">
      <article
        className="bg-background-secondary dark:bg-dark-surface dark:shadow-dark-border flex h-full cursor-pointer flex-col overflow-hidden rounded-lg border-l-4 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
        style={{
          borderLeftColor: districtColor,
        }}
      >
        {/* Course Image */}
        {imageUrl && (
          <div className="relative h-48 w-full">
            <Image src={imageUrl} alt={title} fill className="object-cover" />
          </div>
        )}

        <div className="p-6">
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
              {isRegistrationNotOpenYet && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  Anmeldung ab{" "}
                  {registrationOpensAt?.toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "short",
                  })}
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

          <h3 className="text-dark group-hover:text-primary dark:group-hover:text-primary mb-2 line-clamp-2 text-xl font-bold transition-colors dark:text-white">
            {title}
          </h3>

          <div className="mb-4 flex-col space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 shrink-0" />
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
              <MapPinIcon className="h-4 w-4 shrink-0" />
              {location}
            </div>

            {registrationOpen && !spotsAvailable.isFull && (
              <div className="text-primary flex items-center gap-2 font-semibold">
                <CheckIcon className="h-4 w-4 shrink-0" />
                Noch {spotsAvailable.availableSlots}{" "}
                {spotsAvailable.availableSlots === 1 ? "Platz" : "Plätze"} frei
              </div>
            )}
          </div>

          <div className="text-primary mt-auto inline-flex items-center text-sm font-semibold">
            {registrationOpen && !spotsAvailable.isFull
              ? "Jetzt anmelden"
              : "Details ansehen"}
            <CheckIcon className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </article>
    </Link>
  );
}
