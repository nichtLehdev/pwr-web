import Link from "next/link";
import { useState } from "react";
import type { Course } from "@/types/strapi";
import { getDistrictColor } from "@/lib/districtColors";
import CourseRegistrationForm from "@/components/CourseRegistrationForm";
import { getSpotsAvailable, isCourseFull } from "@/lib/mockData";
import Image from "next/image";
import PageHeader from "./PageHeader";

interface CourseDetailViewProps {
  course: Course;
}

// Hilfsfunktion zur Formatierung eines Datums für ICS (YYYYMMDDTHHMMSSZ)
// Wichtig: ICS verwendet UTC-Zeit. Dies ist eine vereinfachte Konvertierung.
// In einer Produktionsanwendung müsstest du Zeitzonen sorgfältiger behandeln.
const formatIcsDate = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());
  // Hinzufügen des 'Z' für UTC wird hier weggelassen,
  // da die JS Date-Objekte lokal sind. Für präzise ICS-Dateien
  // sollten die Zeiten zuerst in UTC konvertiert werden.
  return `${year}${month}${day}T${hour}${minute}${second}`;
};

export default function CourseDetailView({ course }: CourseDetailViewProps) {
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  const districtColor = getDistrictColor(course.districtInfo.name);
  const startDate = new Date(course.startDate);
  const endDate = new Date(course.endDate);
  const registrationDeadline = course.registrationDeadline
    ? new Date(course.registrationDeadline)
    : null;
  const isPast = endDate < new Date();
  const isDeadlinePassed =
    registrationDeadline && registrationDeadline < new Date();

  // Berechne aktuelle Teilnehmerzahl
  const spotsAvailable = getSpotsAvailable(course.id, course.maxParticipants);
  const isFull = isCourseFull(course.id, course.maxParticipants);

  const isSameDay = startDate.toDateString() === endDate.toDateString();
  const durationDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Check if registration is possible
  const canRegister =
    course.registrationOpen &&
    !isPast &&
    !isDeadlinePassed &&
    (!isFull || course.allowWaitingList);

  const district =
    course.districtInfo.name === "All Districts"
      ? "primary"
      : (course.districtInfo.name.replace(" ", "-").toLowerCase() as
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
          | "district-13");

  // NEUE FUNKTION: ICS-Datei herunterladen
  const handleDownloadIcs = () => {
    // Generiere eine eindeutige ID (simuliert)
    const uid = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Formatiere die Daten
    const icsStartDate = formatIcsDate(startDate);
    const icsEndDate = formatIcsDate(endDate);

    const location =
      course.location.venue ||
      `${course.location.street}, ${course.location.city}`;

    // Erstelle den ICS-Inhalt
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//MyCompany//NONSGML Course Calendar//EN",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${formatIcsDate(new Date())}`, // Aktueller Zeitstempel
      // Verwende DTSTART;VALUE=DATE wenn es ein ganztägiges Event ist.
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

    // Erstelle und löse den Download aus
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

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={course.title} color={district} />
      {/* Header */}
      <section
        className="text-white py-8 md:py-12 lg:py-16"
        style={{ backgroundColor: districtColor }}
      >
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <nav className="text-sm mb-4 flex items-center gap-2 opacity-90">
            <Link href="/" className="hover:text-white transition-colors">
              Start
            </Link>
            <span>/</span>
            <Link
              href="/termine"
              className="hover:text-white transition-colors"
            >
              Termine
            </Link>
            <span>/</span>
            <span>Lehrgang</span>
          </nav>

          {/* Course Info */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">
                  {course.courseType}
                </span>
                {course.targetAudience && (
                  <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">
                    {course.targetAudience}
                  </span>
                )}
                {course.districtInfo.name !== "All Districts" && (
                  <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">
                    {course.districtInfo.name}
                  </span>
                )}
                {!isSameDay && (
                  <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">
                    {durationDays} {durationDays === 1 ? "Tag" : "Tage"}
                  </span>
                )}
                {isPast && (
                  <span className="text-xs font-semibold bg-gray-600 px-3 py-1 rounded-full">
                    Vergangen
                  </span>
                )}
                {isFull && !course.allowWaitingList && (
                  <span className="text-xs font-semibold bg-red-600 px-3 py-1 rounded-full">
                    Ausgebucht
                  </span>
                )}
                {isFull && course.allowWaitingList && (
                  <span className="text-xs font-semibold bg-orange-600 px-3 py-1 rounded-full">
                    Nur Warteliste
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-2">
                {course.title}
              </h1>
              {course.motto && (
                <p className="text-lg md:text-xl opacity-90 italic">
                  {course.motto}
                </p>
              )}
            </div>

            {/* Registration Status */}
            {!isPast && (
              <div className="bg-white/20 rounded-lg p-4 min-w-[200px]">
                <div className="text-center">
                  <p className="text-sm opacity-90 mb-1">Verfügbare Plätze</p>
                  <p className="text-3xl font-bold">
                    {spotsAvailable} / {course.maxParticipants}
                  </p>
                  <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                    <div
                      className="bg-white rounded-full h-2 transition-all"
                      style={{
                        width: `${
                          ((course.maxParticipants - spotsAvailable) /
                            course.maxParticipants) *
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
            <div className="bg-white/10 rounded-lg p-4 inline-block">
              <p className="text-sm flex items-center gap-2">
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Date & Time */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-dark mb-4 flex items-center gap-2">
                  <svg
                    className="w-6 h-6 text-primary"
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
                  Termin
                </h2>
                <div className="space-y-2">
                  {isSameDay ? (
                    <>
                      <p className="text-lg font-semibold text-dark">
                        {startDate.toLocaleDateString("de-DE", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-gray-600">
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
                      <p className="text-lg font-semibold text-dark">
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
                      <p className="text-gray-600">
                        {durationDays} {durationDays === 1 ? "Tag" : "Tage"}
                      </p>
                    </>
                  )}
                  <div className="pt-4">
                    <button
                      onClick={handleDownloadIcs}
                      className="w-full px-4 py-2 border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary/10 transition-colors flex items-center justify-center gap-2 text-sm"
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
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 14l2-2-2-2M12 14v4"
                        />
                      </svg>
                      Zum Kalender hinzufügen (ICS)
                    </button>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-dark mb-4 flex items-center gap-2">
                  <svg
                    className="w-6 h-6 text-primary"
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
                  Veranstaltungsort
                </h2>
                <div className="space-y-2">
                  {course.location.venue && (
                    <p className="font-semibold text-dark">
                      {course.location.venue}
                    </p>
                  )}
                  {course.location.street && (
                    <p className="text-gray-600">{course.location.street}</p>
                  )}
                  <p className="text-gray-600">
                    {course.location.zipCode && `${course.location.zipCode} `}
                    {course.location.city}
                  </p>
                  {course.location.additionalInfo && (
                    <p className="text-sm text-gray-500 mt-2">
                      {course.location.additionalInfo}
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              {course.description && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-dark mb-4">
                    Beschreibung
                  </h2>
                  <div
                    className="text-gray-700 prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: course.description }}
                  />
                </div>
              )}

              {/* Prerequisites */}
              {course.prerequisites && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg">
                  <h3 className="text-lg font-bold text-blue-900 mb-2 flex items-center gap-2">
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
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Voraussetzungen
                  </h3>
                  <p className="text-blue-800">{course.prerequisites}</p>
                </div>
              )}

              {/* What to Bring */}
              {course.whatToBring && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-bold text-dark mb-3 flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      />
                    </svg>
                    Mitzubringen
                  </h3>
                  <p className="text-gray-700">{course.whatToBring}</p>
                </div>
              )}

              {/* Instructors */}
              {course.instructors && course.instructors.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-dark mb-4 flex items-center gap-2">
                    <svg
                      className="w-6 h-6 text-primary"
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
                            alt={instructor.displayName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <p className="font-semibold text-dark">
                            {instructor.displayName}
                          </p>
                          {instructor.bio && (
                            <p className="text-sm text-gray-600">
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
                <div className="bg-white rounded-lg shadow-md p-6 sticky top-20">
                  <h3 className="text-lg font-bold text-dark mb-4">
                    Anmeldung
                  </h3>

                  {isFull && course.allowWaitingList ? (
                    <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-800 font-semibold">
                        Der Kurs ist ausgebucht. Sie können sich auf die
                        Warteliste setzen lassen.
                      </p>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">
                        Noch <strong>{spotsAvailable}</strong>{" "}
                        {spotsAvailable === 1 ? "Platz" : "Plätze"} verfügbar
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => setShowRegistrationForm(true)}
                    className="w-full px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-colors mb-3"
                  >
                    {isFull && course.allowWaitingList
                      ? "Auf Warteliste setzen"
                      : "Jetzt anmelden"}
                  </button>

                  {registrationDeadline && !isDeadlinePassed && (
                    <p className="text-xs text-gray-500 text-center">
                      Anmeldung bis{" "}
                      {registrationDeadline.toLocaleDateString("de-DE")} möglich
                    </p>
                  )}
                </div>
              )}

              {/* Price Info */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-dark mb-4">
                  {course.isFree ? "Kostenlos" : "Preise"}
                </h3>
                {course.isFree ? (
                  <p className="text-green-700 font-semibold flex items-center gap-2">
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Dieser Kurs ist kostenfrei
                  </p>
                ) : (
                  <div className="space-y-3">
                    {course.priceOptions.map((option, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center pb-3 border-b border-gray-200 last:border-0"
                      >
                        <div>
                          <p className="font-semibold text-dark">
                            {option.label}
                          </p>
                          {option.description && (
                            <p className="text-xs text-gray-500">
                              {option.description}
                            </p>
                          )}
                        </div>
                        <p className="text-lg font-bold text-primary">
                          {option.price.toFixed(2)} €
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {course.priceInfo && (
                  <p className="text-xs text-gray-500 mt-4">
                    {course.priceInfo}
                  </p>
                )}
              </div>

              {/* Back to Overview */}
              <Link
                href="/termine"
                className="block w-full px-4 py-3 border-2 border-gray-300 text-dark font-semibold rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                ← Zurück zur Übersicht
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Registration Form Modal */}
      {showRegistrationForm && (
        <CourseRegistrationForm
          course={course}
          onClose={() => setShowRegistrationForm(false)}
          isWaitlist={isFull && course.allowWaitingList}
        />
      )}
    </div>
  );
}
