"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";
import PageHeader from "../general/page-header";
import CourseRegistrationForm from "./course-registration-form";
import { getDistrictColor } from "@/lib/district-color";
import {
  Clock,
  Calendar,
  CalendarArrowDownIcon,
  MapPinIcon,
  CheckCircleIcon,
  UsersIcon,
  CircleXIcon,
} from "lucide-react";

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

export default function CourseDetailView({
  course,
  spots,
}: CourseDetailViewProps) {
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
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

  const districtColor = getDistrictColor(course.bezirk?.number);
  const startDate = new Date(course.startDate);
  const endDate = new Date(course.endDate);
  const registrationDeadline = course.registrationDeadline
    ? new Date(course.registrationDeadline)
    : null;
  const isPast = endDate < new Date();
  const isDeadlinePassed =
    registrationDeadline && registrationDeadline < new Date();

  const isSameDay = startDate.toDateString() === endDate.toDateString();
  const durationDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  const canRegister =
    course.registrationOpen &&
    !isPast &&
    !isDeadlinePassed &&
    (!spots.isFull || course.allowWaitingList);

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

  const handleCloseRegistrationForm = () => {
    setShowRegistrationForm(false);

    router.refresh();
  };

  const handleRegistrationSuccess = () => {
    setShowRegistrationForm(false);

    router.refresh();
  };

  const handleRegisterClick = () => {
    if (existingRegistration) {
      setShowRegistrationOptions(true);
    } else {
      setShowRegistrationForm(true);
    }
  };

  const handleEditExisting = () => {
    setShowRegistrationOptions(false);
    router.push(`/registrations/${existingRegistration?.id}/edit`);
  };

  const handleCreateNew = () => {
    setShowRegistrationOptions(false);
    setShowRegistrationForm(true);
  };

  return (
    <div className="bg-background dark:bg-dark-background min-h-screen">
      <PageHeader title={course.title} color={district} />
      {/* Header */}
      <section
        className="py-8 text-white md:py-12 lg:py-16"
        style={{ backgroundColor: districtColor }}
      >
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <nav className="mb-4 flex items-center gap-2 text-sm opacity-90">
            <Link href="/" className="transition-colors hover:text-white">
              Start
            </Link>
            <span>/</span>
            <Link
              href="/termine"
              className="transition-colors hover:text-white"
            >
              Termine
            </Link>
            <span>/</span>
            <span>Lehrgang</span>
          </nav>

          {/* Course Info */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                  {course.courseType}
                </span>
                {course.targetAudience && (
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                    {course.targetAudience}
                  </span>
                )}
                {course.bezirk && (
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                    {`Bezirk ${course.bezirk.number} (${course.bezirk.shortName})`}
                  </span>
                )}
                {!isSameDay && (
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                    {durationDays} {durationDays === 1 ? "Tag" : "Tage"}
                  </span>
                )}
                {isPast && (
                  <span className="rounded-full bg-gray-600 px-3 py-1 text-xs font-semibold">
                    Vergangen
                  </span>
                )}
                {spots.isFull && !course.allowWaitingList && (
                  <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold">
                    Ausgebucht
                  </span>
                )}
                {spots.isFull && course.allowWaitingList && (
                  <span className="rounded-full bg-orange-600 px-3 py-1 text-xs font-semibold">
                    Nur Warteliste
                  </span>
                )}
              </div>

              <h1 className="mb-2 text-2xl font-bold wrap-break-word md:text-4xl lg:text-5xl">
                {course.title}
              </h1>
              {course.motto && (
                <p className="text-lg italic opacity-90 md:text-xl">
                  {course.motto}
                </p>
              )}
            </div>

            {/* Registration Status */}
            {!isPast && (
              <div className="min-w-[200px] rounded-lg bg-white/20 p-4">
                <div className="text-center">
                  <p className="mb-1 text-sm opacity-90">Verfügbare Plätze</p>
                  <p className="text-3xl font-bold">
                    {spots.availableSlots} / {course.maxParticipants}
                  </p>
                  <div className="mt-2 h-2 w-full rounded-full bg-white/20">
                    <div
                      className="h-2 rounded-full bg-white transition-all"
                      style={{
                        width: `${
                          (((course.maxParticipants ?? 0) -
                            spots.availableSlots) /
                            (course.maxParticipants ?? 1)) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Registration Deadline */}
          {registrationDeadline && !isPast && (
            <div className="inline-block rounded-lg bg-white/10 p-4">
              <p className="flex items-center gap-2 text-sm">
                <Clock className="h-5 w-5" />
                <span>
                  Anmeldeschluss:{" "}
                  {registrationDeadline.toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Content */}
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
                        {durationDays} {durationDays === 1 ? "Tag" : "Tage"}
                      </p>
                    </>
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
                      {course.location.zipCode && `${course.location.zipCode} `}
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
                    dangerouslySetInnerHTML={{ __html: course.description }}
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

              {/* Instructors */}
              {course.instructors && course.instructors.length > 0 && (
                <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                  <h2 className="text-dark dark:text-dark-text mb-4 flex items-center gap-2 text-xl font-bold">
                    <UsersIcon className="text-primary h-6 w-6" />
                    Dozenten
                  </h2>
                  <div className="space-y-3">
                    {course.instructors.map((instructor) => (
                      <div
                        key={instructor.id}
                        className="flex items-start gap-3"
                      >
                        {instructor.profileImage?.url && (
                          <Image
                            src={instructor.profileImage.url}
                            alt={
                              instructor.profileImage.alt ||
                              instructor.displayName ||
                              "Instructor Image"
                            }
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <p className="text-dark dark:text-dark-text font-semibold">
                            {instructor.displayName}
                          </p>
                          {instructor.bio && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {instructor.bio}
                            </p>
                          )}
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

                  {spots.isFull && course.allowWaitingList ? (
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

                  <button
                    onClick={handleRegisterClick}
                    className="bg-primary hover:bg-primary-dark mb-3 w-full rounded-lg px-6 py-3 font-bold text-white transition-colors"
                  >
                    {spots.isFull && course.allowWaitingList
                      ? "Auf Warteliste setzen"
                      : "Jetzt anmelden"}
                  </button>

                  {registrationDeadline && !isDeadlinePassed && (
                    <p className="text-center text-xs text-gray-500">
                      Anmeldung bis{" "}
                      {registrationDeadline.toLocaleDateString("de-DE")} möglich
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
                          {isDeadlinePassed
                            ? "Anmeldefrist abgelaufen"
                            : spots.isFull && !course.allowWaitingList
                              ? "Kurs ausgebucht"
                              : "Anmeldung geschlossen"}
                        </p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {isDeadlinePassed
                            ? `Die Anmeldefrist für diesen Kurs ist am ${registrationDeadline?.toLocaleDateString("de-DE")} abgelaufen.`
                            : spots.isFull && !course.allowWaitingList
                              ? "Alle Plätze sind belegt und es gibt keine Warteliste."
                              : "Die Anmeldung für diesen Kurs ist derzeit nicht möglich."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Price Info */}
              <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                <h3 className="text-dark dark:text-dark-text mb-4 text-lg font-bold">
                  {course.isFree ? "Kostenlos" : "Preise"}
                </h3>
                {course.isFree ? (
                  <p className="flex items-center gap-2 font-semibold text-green-700">
                    <CheckCircleIcon className="h-5 w-5" />
                    Dieser Kurs ist kostenfrei
                  </p>
                ) : (
                  <div className="space-y-3">
                    {course.priceOptions.map((option, idx) => (
                      <div
                        key={idx}
                        className="dark:border-dark-border flex items-center justify-between border-b border-gray-200 pb-3 last:border-0"
                      >
                        <div>
                          <p className="text-dark dark:text-dark-text font-semibold">
                            {option.label}
                          </p>
                          {option.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {option.description}
                            </p>
                          )}
                        </div>
                        <p className="text-primary text-lg font-bold">
                          {option.price.toFixed(2)} €
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {course.priceInfo && (
                  <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">
                    {course.priceInfo}
                  </p>
                )}
              </div>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="dark:bg-dark-surface w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-dark dark:text-dark-text mb-4 text-xl font-bold">
              Bestehende Anmeldung gefunden
            </h2>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              Sie haben bereits eine aktive Anmeldung für diesen Kurs mit{" "}
              <strong>
                {existingRegistration.participants.length}{" "}
                {existingRegistration.participants.length === 1
                  ? "Teilnehmer"
                  : "Teilnehmern"}
              </strong>
              . Möchten Sie Ihre bestehende Anmeldung bearbeiten oder eine
              zusätzliche Anmeldung erstellen?
            </p>
            <div className="space-y-3">
              <button
                onClick={handleEditExisting}
                className="bg-primary hover:bg-primary-dark w-full rounded-lg px-6 py-3 font-semibold text-white transition-colors"
              >
                Bestehende Anmeldung bearbeiten
              </button>
              <button
                onClick={handleCreateNew}
                className="dark:border-dark-border dark:hover:bg-dark-surface w-full rounded-lg border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300"
              >
                Zusätzliche Anmeldung erstellen
              </button>
              <button
                onClick={() => setShowRegistrationOptions(false)}
                className="w-full rounded-lg px-6 py-3 font-semibold text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registration Form Modal */}
      {showRegistrationForm && (
        <CourseRegistrationForm
          course={course}
          onClose={handleCloseRegistrationForm}
          onSuccess={handleRegistrationSuccess}
          isWaitlist={spots.isFull && course.allowWaitingList}
          currentUser={userProfile || null}
        />
      )}
    </div>
  );
}
