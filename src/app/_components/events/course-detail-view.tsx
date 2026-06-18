"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import type { RouterOutputs } from "@/trpc/react";
import { sanitizeHtml } from "@/lib/sanitize";
import PublicPage from "../general/public-page";
import MediaCredit from "@/app/_components/general/media-credit";
import PublicShareButton from "@/app/_components/general/public-share-button";
import { CourseExistingRegistrationOptions } from "./course-existing-registration-options";
import {
  Clock,
  Calendar,
  CalendarArrowDownIcon,
  MapPin,
  MapPinIcon,
  Users,
  Wallet,
  CheckCircleIcon,
  UsersIcon,
  CircleXIcon,
  EditIcon,
  ExternalLink,
  UserIcon,
} from "lucide-react";
import { formatAcceptedCoursePaymentMethods } from "@/lib/course-payment-methods";
import { isExternalCourse } from "@/lib/course-external";
type CourseWithRelations = RouterOutputs["courses"]["getById"];
type CourseSpots = RouterOutputs["courses"]["getAvailableSlots"];

interface CourseDetailViewProps {
  course: CourseWithRelations;
  spots: CourseSpots;
}

const formatIcsDate = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());

  return `${year}${month}${day}T${hour}${minute}${second}`;
};

function formatCourseSchedule(course: {
  startDate: Date;
  endDate: Date;
}): string {
  const start = new Date(course.startDate);
  const end = new Date(course.endDate);
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${start.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })}, ${start.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    })} – ${end.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    })} Uhr`;
  }
  return `${start.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
  })} – ${end.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;
}

export default function CourseDetailView({
  course,
  spots,
}: CourseDetailViewProps) {
  const [showRegistrationOptions, setShowRegistrationOptions] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const { data: userProfile } = api.users.getMyProfile.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const { data: existingRegistration } =
    api.registrations.getMyActiveRegistrationForCourse.useQuery(
      { courseId: course.id },
      { enabled: !!session?.user },
    );

  const { hasAnyPermission } = usePermissions();

  const hasEditPermission = hasAnyPermission([
    "courses.edit" as any,
    "courses.approve" as any,
  ]);

  const canEdit =
    session?.user &&
    userProfile &&
    (course.createdById === session.user.id ||
      course.createdBy?.id === session.user.id ||
      hasEditPermission);

  const startDate = new Date(course.startDate);
  const endDate = new Date(course.endDate);
  const registrationDeadline = course.registrationDeadline
    ? new Date(course.registrationDeadline)
    : null;
  const registrationOpensAt = course.registrationOpensAt
    ? new Date(course.registrationOpensAt)
    : null;
  const isPast = endDate < new Date();
  const isDeadlinePassed =
    registrationDeadline && registrationDeadline < new Date();
  const isRegistrationNotOpenYet =
    registrationOpensAt && registrationOpensAt > new Date();

  const isSameDay = startDate.toDateString() === endDate.toDateString();
  const durationDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  const isExternal = isExternalCourse(course);

  const canRegister =
    course.registrationOpen &&
    !isPast &&
    !isDeadlinePassed &&
    !isRegistrationNotOpenYet &&
    (isExternal || !spots.isFull || course.allowWaitingList);

  const district = !course.bezirk
    ? "primary"
    : (`district-${course.bezirk.number}` as
        | "district-1"
        | "district-2"
        | "district-3"
        | "district-4"
        | "district-5"
        | "district-6"
        | "district-7"
        | "district-8"
        | "district-9"
        | "district-10"
        | "district-11"
        | "district-12"
        | "district-13"
        | undefined);

  const handleDownloadIcs = () => {
    const array = new Uint32Array(2);
    window.crypto.getRandomValues(array);
    const randomString = Array.from(array)
      .map((num) => num.toString(36))
      .join("");
    // eslint-disable-next-line react-hooks/purity
    const uid = `${Date.now()}-${randomString}`;

    const icsStartDate = formatIcsDate(startDate);
    const icsEndDate = formatIcsDate(endDate);

    const location =
      course.location?.name ||
      `${course.location?.street}, ${course.location?.city}`;

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//MyCompany//NONSGML Course Calendar//EN",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${formatIcsDate(new Date())}`,

      `DTSTART:${icsStartDate}`,
      `DTEND:${icsEndDate}`,
      `SUMMARY:${course.title}`,
      `DESCRIPTION:${
        course.motto ? course.motto + "\\n\\n" : ""
      }Weitere Informationen: [Deine Kurs-URL hier]`,
      `LOCATION:${location}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${course.title.replace(/ /g, "_")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const anmeldenHref = isExternal
    ? (course.externalRegistrationUrl ?? `/termine/course/${course.id}`)
    : `/termine/course/${course.id}/anmelden`;

  const handleEditExisting = () => {
    setShowRegistrationOptions(false);
    router.push(`/registrations/${existingRegistration?.id}/edit`);
  };

  const handleCreateNew = () => {
    setShowRegistrationOptions(false);
    router.push(anmeldenHref);
  };

  const locationLine =
    course.location &&
    [course.location.name, course.location.city].filter(Boolean).join(", ");

  const capacityMeta =
    isPast || isExternal
      ? null
      : spots.isFull && course.allowWaitingList
        ? "Warteliste"
        : `${spots.availableSlots} / ${course.maxParticipants} frei`;

  const acceptedPaymentHero = formatAcceptedCoursePaymentMethods(course);

  const heroDescription = (
    <div className="mt-1 space-y-4">
      {course.motto ? (
        <p className="italic opacity-90">{course.motto}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">
          {course.courseType}
        </span>
        {course.bezirk && (
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">
            {`Bezirk ${course.bezirk.number} (${course.bezirk.shortName})`}
          </span>
        )}
        {!isSameDay && (
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">
            {durationDays} {durationDays === 1 ? "Tag" : "Tage"}
          </span>
        )}
        {isPast && (
          <span className="rounded-full bg-gray-600 px-2.5 py-0.5 text-xs font-semibold">
            Vergangen
          </span>
        )}
        {!isExternal && spots.isFull && !course.allowWaitingList && (
          <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-semibold">
            Ausgebucht
          </span>
        )}
        {!isExternal && spots.isFull && course.allowWaitingList && (
          <span className="rounded-full bg-orange-600 px-2.5 py-0.5 text-xs font-semibold">
            Nur Warteliste
          </span>
        )}
        {canEdit && (
          <Link
            href={`/dashboard/courses/${course.id}/edit`}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-white/30 sm:gap-2 sm:px-3 sm:py-1.5"
          >
            <EditIcon className="h-4 w-4 shrink-0" aria-hidden />
            Bearbeiten
          </Link>
        )}
        <PublicShareButton
          title={course.title}
          text={course.motto || course.description || course.title}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-white/30 sm:gap-2 sm:px-3 sm:py-1.5"
        />
      </div>
      <div className="flex flex-col gap-2 border-t border-white/20 pt-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1 sm:gap-y-2">
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-white/90" aria-hidden />
          {formatCourseSchedule(course)}
        </span>
        {locationLine ? (
          <>
            <span
              className="hidden shrink-0 px-1 text-white/45 sm:inline"
              aria-hidden
            >
              ·
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-white/90" aria-hidden />
              {locationLine}
            </span>
          </>
        ) : null}
        {!isPast && capacityMeta ? (
          <>
            <span
              className="hidden shrink-0 px-1 text-white/45 sm:inline"
              aria-hidden
            >
              ·
            </span>
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0 text-white/90" aria-hidden />
              {capacityMeta}
            </span>
          </>
        ) : null}
        {!isExternal && !course.isFree && acceptedPaymentHero ? (
          <>
            <span
              className="hidden shrink-0 px-1 text-white/45 sm:inline"
              aria-hidden
            >
              ·
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <Wallet className="h-4 w-4 shrink-0 text-white/90" aria-hidden />
              <span className="truncate">{acceptedPaymentHero}</span>
            </span>
          </>
        ) : null}
      </div>
      {(registrationOpensAt && isRegistrationNotOpenYet) ||
      (registrationDeadline && !isPast) ? (
        <div className="flex flex-col gap-2 border-t border-white/20 pt-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1 sm:gap-y-2">
          {registrationOpensAt && isRegistrationNotOpenYet && (
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-white/90" aria-hidden />
              Anmeldung ab:{" "}
              {registrationOpensAt.toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              Uhr
            </span>
          )}
          {registrationDeadline && !isPast ? (
            <>
              {registrationOpensAt && isRegistrationNotOpenYet ? (
                <span
                  className="hidden shrink-0 px-1 text-white/45 sm:inline"
                  aria-hidden
                >
                  ·
                </span>
              ) : null}
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-white/90" aria-hidden />
                Anmeldeschluss:{" "}
                {registrationDeadline.toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <PublicPage
      title={course.title}
      color={district}
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Termine", href: "/termine" },
        { label: course.title },
      ]}
      heroSize="compact"
      description={heroDescription}
    >
      <div className="bg-background dark:bg-dark-background -mt-2 min-h-screen md:-mt-4">
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Main Content */}
              <div className="space-y-6 lg:col-span-2">
                {/* Course Image */}
                {course.image && (
                  <div className="dark:bg-dark-surface dark:shadow-dark-border overflow-hidden rounded-lg bg-white shadow-md">
                    <div className="relative aspect-video w-full">
                      <Image
                        src={course.image.url}
                        alt={course.image.alt || course.title}
                        fill
                        className="object-cover"
                      />
                      {(course.image.copyright || course.image.creator) && (
                        <div className="absolute right-2 bottom-2 flex justify-end">
                          <MediaCredit
                            copyright={course.image.copyright}
                            creator={course.image.creator}
                            showCreatorIcon
                            className="text-right text-white/90 drop-shadow-sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Date & Time */}
                <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                  <h2 className="text-dark dark:text-dark-text mb-4 flex items-center gap-2 text-xl font-bold">
                    <Calendar className="text-primary h-6 w-6" />
                    Termin
                  </h2>
                  <div className="space-y-2">
                    {isSameDay ? (
                      <>
                        <p className="text-dark dark:text-dark-text text-lg font-semibold">
                          {startDate.toLocaleDateString("de-DE", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {startDate.toLocaleTimeString("de-DE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          -{" "}
                          {endDate.toLocaleTimeString("de-DE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          Uhr
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-dark dark:text-dark-text text-lg font-semibold">
                          {startDate.toLocaleDateString("de-DE", {
                            day: "numeric",
                            month: "long",
                          })}{" "}
                          -{" "}
                          {endDate.toLocaleDateString("de-DE", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {startDate.toLocaleTimeString("de-DE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          Uhr -{" "}
                          {endDate.toLocaleTimeString("de-DE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          Uhr ({durationDays}{" "}
                          {durationDays === 1 ? "Tag" : "Tage"})
                        </p>
                      </>
                    )}
                    {registrationOpensAt && isRegistrationNotOpenYet && (
                      <div className="mt-4 rounded-lg border-2 border-purple-300 bg-purple-50 p-4 dark:border-purple-700 dark:bg-purple-900/30">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-purple-700 dark:text-purple-300" />
                          <div>
                            <p className="font-semibold text-purple-900 dark:text-purple-200">
                              Anmeldung öffnet am
                            </p>
                            <p className="text-lg font-bold text-purple-800 dark:text-purple-100">
                              {registrationOpensAt.toLocaleDateString("de-DE", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}{" "}
                              um{" "}
                              {registrationOpensAt.toLocaleTimeString("de-DE", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              Uhr
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="pt-4">
                      <button
                        onClick={handleDownloadIcs}
                        className="border-primary text-primary hover:bg-primary/10 flex w-full items-center justify-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-colors"
                      >
                        <CalendarArrowDownIcon className="h-5 w-5" />
                        Zum Kalender hinzufügen (ICS)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Location */}
                {course.location && (
                  <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                    <h2 className="text-dark dark:text-dark-text mb-4 flex items-center gap-2 text-xl font-bold">
                      <MapPinIcon className="text-primary h-6 w-6" />
                      Veranstaltungsort
                    </h2>
                    <div className="space-y-2">
                      {course.location.name && (
                        <p className="text-dark dark:text-dark-text font-semibold">
                          {course.location.name}
                        </p>
                      )}
                      {course.location.street && (
                        <p className="text-gray-600 dark:text-gray-400">
                          {course.location.street}
                        </p>
                      )}
                      <p className="text-gray-600 dark:text-gray-400">
                        {course.location.zipCode &&
                          `${course.location.zipCode} `}
                        {course.location.city}
                      </p>
                      {course.location.additionalInfo && (
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                          {course.location.additionalInfo}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                {course.description && (
                  <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                    <h2 className="text-dark dark:text-dark-text mb-4 text-xl font-bold">
                      Beschreibung
                    </h2>
                    <div
                      className="prose max-w-none text-gray-700 dark:text-gray-300"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(course.description),
                      }}
                    />
                  </div>
                )}

                {/* Prerequisites */}
                {course.prerequisites && (
                  <div className="rounded-r-lg border-l-4 border-blue-500 bg-blue-50 p-6 dark:bg-blue-900/30">
                    <h3 className="mb-2 flex items-center gap-2 text-lg font-bold text-blue-900 dark:text-blue-200">
                      <CheckCircleIcon className="h-5 w-5" />
                      Voraussetzungen
                    </h3>
                    <p className="text-blue-800 dark:text-blue-300">
                      {course.prerequisites}
                    </p>
                  </div>
                )}

                {/* What to Bring */}
                {course.whatToBring && (
                  <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                    <h3 className="text-dark dark:text-dark-text mb-3 flex items-center gap-2 text-lg font-bold">
                      <CheckCircleIcon className="text-primary h-5 w-5" />
                      Mitzubringen
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {course.whatToBring}
                    </p>
                  </div>
                )}

                {/* Kurs-Team (öffentlich): Konten + freie Namen */}
                {((course.collaborators?.length ?? 0) > 0 ||
                  (course.guestTeamMembers?.length ?? 0) > 0) && (
                  <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                    <h2 className="text-dark dark:text-dark-text mb-4 flex items-center gap-2 text-xl font-bold">
                      <UsersIcon className="text-primary h-6 w-6" />
                      Kurs-Team
                    </h2>
                    <div className="space-y-3">
                      {course.collaborators?.map((entry) => (
                        <div
                          key={entry.user.id}
                          className="flex items-start gap-3"
                        >
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            {entry.user.profileImage?.url ? (
                              <Image
                                src={entry.user.profileImage.url}
                                alt={
                                  entry.user.profileImage.alt ||
                                  entry.user.displayName ||
                                  "Profilbild"
                                }
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-gray-400">
                                <UserIcon className="h-6 w-6" />
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-dark dark:text-dark-text font-semibold">
                              {entry.user.displayName}
                            </p>
                            {entry.user.bio && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {entry.user.bio}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {course.guestTeamMembers?.map((row) => (
                        <div key={row.id} className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                            <UserIcon className="h-6 w-6 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-dark dark:text-dark-text font-semibold">
                              {row.displayName}
                            </p>
                            {row.bio ? (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {row.bio}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Registration CTA */}
                {canRegister && (
                  <div className="dark:bg-dark-surface dark:shadow-dark-border sticky top-20 rounded-lg bg-white p-6 shadow-md">
                    <h3 className="text-dark dark:text-dark-text mb-4 text-lg font-bold">
                      Anmeldung
                    </h3>

                    {isExternal ? (
                      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/30">
                        <p className="text-sm text-blue-900 dark:text-blue-200">
                          {course.externalProviderName
                            ? `Die Anmeldung erfolgt über ${course.externalProviderName}.`
                            : "Die Anmeldung erfolgt über einen externen Anbieter."}
                        </p>
                      </div>
                    ) : spots.isFull && course.allowWaitingList ? (
                      <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-900/30">
                        <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                          Der Kurs ist ausgebucht. Sie können sich auf die
                          Warteliste setzen lassen.
                        </p>
                      </div>
                    ) : (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Noch <strong>{spots.availableSlots}</strong>{" "}
                          {spots.availableSlots === 1 ? "Platz" : "Plätze"}{" "}
                          verfügbar
                        </p>
                      </div>
                    )}

                    {isExternal ? (
                      <a
                        href={anmeldenHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-primary hover:bg-primary-dark mb-3 flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-center font-bold text-white transition-colors"
                      >
                        Zur Anmeldung
                        <ExternalLink className="h-4 w-4 shrink-0" />
                      </a>
                    ) : existingRegistration ? (
                      <button
                        type="button"
                        onClick={() => setShowRegistrationOptions(true)}
                        className="bg-primary hover:bg-primary-dark mb-3 block w-full rounded-lg px-6 py-3 text-center font-bold text-white transition-colors"
                      >
                        {spots.isFull && course.allowWaitingList
                          ? "Auf Warteliste setzen"
                          : "Jetzt anmelden"}
                      </button>
                    ) : (
                      <Link
                        href={anmeldenHref}
                        className="bg-primary hover:bg-primary-dark mb-3 block w-full rounded-lg px-6 py-3 text-center font-bold text-white transition-colors"
                      >
                        {spots.isFull && course.allowWaitingList
                          ? "Auf Warteliste setzen"
                          : "Jetzt anmelden"}
                      </Link>
                    )}

                    {registrationDeadline && !isDeadlinePassed && (
                      <p className="text-center text-xs text-gray-500">
                        Anmeldung bis{" "}
                        {registrationDeadline.toLocaleDateString("de-DE")}{" "}
                        möglich
                      </p>
                    )}
                  </div>
                )}

                {/* Registration Closed Notice */}
                {!canRegister && !isPast && (
                  <div className="dark:bg-dark-surface dark:shadow-dark-border sticky top-20 rounded-lg bg-white p-6 shadow-md">
                    <h3 className="text-dark dark:text-dark-text mb-4 text-lg font-bold">
                      Anmeldung
                    </h3>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                      <div className="flex items-start gap-3">
                        <CircleXIcon className="mt-0.5 h-5 w-5 shrink-0 text-gray-500 dark:text-gray-400" />
                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300">
                            {isRegistrationNotOpenYet
                              ? "Anmeldung noch nicht geöffnet"
                              : isDeadlinePassed
                                ? "Anmeldefrist abgelaufen"
                                : !isExternal &&
                                    spots.isFull &&
                                    !course.allowWaitingList
                                  ? "Kurs ausgebucht"
                                  : "Anmeldung geschlossen"}
                          </p>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {isRegistrationNotOpenYet
                              ? `Die Anmeldung für diesen Kurs öffnet am ${registrationOpensAt?.toLocaleDateString(
                                  "de-DE",
                                  {
                                    day: "2-digit",
                                    month: "long",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )} Uhr. Die Kursdetails sind bereits verfügbar.`
                              : isDeadlinePassed
                                ? `Die Anmeldefrist für diesen Kurs ist am ${registrationDeadline?.toLocaleDateString("de-DE")} abgelaufen.`
                                : !isExternal &&
                                    spots.isFull &&
                                    !course.allowWaitingList
                                  ? "Alle Plätze sind belegt und es gibt keine Warteliste."
                                  : "Die Anmeldung für diesen Kurs ist derzeit nicht möglich."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Price Info */}
                {!isExternal || course.priceInfo ? (
                  <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                    <h3 className="text-dark dark:text-dark-text mb-4 text-lg font-bold">
                      {isExternal
                        ? "Kosten"
                        : course.isFree
                          ? "Kostenlos"
                          : "Preise"}
                    </h3>
                    {!isExternal &&
                      (course.isFree ? (
                        <p className="flex items-center gap-2 font-semibold text-green-700">
                          <CheckCircleIcon className="h-5 w-5" />
                          Dieser Kurs ist kostenfrei
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {course.priceOptions.map((option, idx) => (
                            <div
                              key={idx}
                              className="dark:border-dark-border flex items-start justify-between gap-3 border-b border-gray-200 pb-3 last:border-0"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-dark dark:text-dark-text font-semibold">
                                  {option.label}
                                </p>
                                {option.description && (
                                  <p className="text-xs text-gray-500 dark:text-gray-500">
                                    {option.description}
                                  </p>
                                )}
                              </div>
                              <p className="text-primary shrink-0 text-lg font-bold whitespace-nowrap tabular-nums">
                                {option.price.toFixed(2)}&nbsp;€
                              </p>
                            </div>
                          ))}
                        </div>
                      ))}
                    {course.priceInfo && (
                      <p
                        className={
                          isExternal || course.isFree
                            ? "text-sm text-gray-600 dark:text-gray-400"
                            : "mt-4 text-xs text-gray-500 dark:text-gray-500"
                        }
                      >
                        {course.priceInfo}
                      </p>
                    )}
                    {!isExternal &&
                      !course.isFree &&
                      formatAcceptedCoursePaymentMethods(course) && (
                        <div className="dark:border-dark-border mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                          <p className="text-dark dark:text-dark-text mb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                            Zahlung
                          </p>
                          <p className="text-dark dark:text-dark-text flex gap-2 text-sm">
                            <Wallet
                              className="text-primary h-4 w-4 shrink-0"
                              aria-hidden
                            />
                            {formatAcceptedCoursePaymentMethods(course)}
                          </p>
                        </div>
                      )}
                  </div>
                ) : null}

                {/* Back to Overview */}
                <Link
                  href="/termine"
                  className="text-dark dark:text-dark-text dark:border-dark-border dark:hover:bg-dark-surface block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-center font-semibold transition-colors hover:bg-gray-50"
                >
                  ← Zurück zur Übersicht
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Registration Options Modal */}
        {showRegistrationOptions && existingRegistration && (
          <CourseExistingRegistrationOptions
            participantCount={existingRegistration.participants.length}
            onEditExisting={handleEditExisting}
            onCreateAdditional={handleCreateNew}
            onCancel={() => setShowRegistrationOptions(false)}
          />
        )}
      </div>
    </PublicPage>
  );
}
