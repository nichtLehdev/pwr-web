"use client";

import Link from "next/link";
import { getDistrictColor } from "@/lib/district-color";
import PageHeader from "../general/page-header";
import Image from "next/image";
import type { RouterOutputs } from "@/trpc/react";

// Use the actual return types from your tRPC router
type EventWithRelations = RouterOutputs["events"]["getById"];

interface EventDetailViewProps {
  event: EventWithRelations;
}

export default function EventDetailView({ event }: EventDetailViewProps) {
  const districtColor = getDistrictColor(event.bezirk?.number);
  const eventDate = new Date(event.eventDate);
  // set default duration to 2 hours if not provided
  const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000);
  const isPast = eventDate < new Date();

  // ICS Download Function
  const handleDownloadIcs = () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Posaunenwerk Rheinland//Event//DE
BEGIN:VEVENT
UID:${event.id}@posaunenwerk-rheinland.de
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z
DTSTART:${eventDate.toISOString().replace(/[-:]/g, "").split(".")[0]}Z
DTEND:${endDate.toISOString().replace(/[-:]/g, "").split(".")[0]}Z
SUMMARY:${event.title}
DESCRIPTION:${event.description || ""}
LOCATION:${event.location?.name ? event.location.name + ", " : ""}${
      event.location?.street ? event.location.street + ", " : ""
    }${event.location?.zipCode || ""} ${event.location?.city}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${event.title.replace(/[^a-z0-9]/gi, "_")}.ics`;
    link.click();
  };

  const deviceWidth = typeof window !== "undefined" ? window.innerWidth : 0;

  // Share Function
  const shareEvent = async () => {
    const shareData = {
      title: event.title,
      text:
        event.motto ||
        event.description ||
        `${event.title} am ${eventDate.toLocaleDateString("de-DE")}`,
      url: typeof window !== "undefined" ? window.location.href : "",
    };

    // Check if Web Share API is supported
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error occurred
        console.log("Share cancelled or failed:", err);
      }
    } else {
      // Fallback: Copy link to clipboard
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(window.location.href);
          alert("Link wurde in die Zwischenablage kopiert!");
        } catch (err) {
          console.error("Failed to copy:", err);
        }
      }
    }
  };

  const district = !event.bezirk
    ? "primary"
    : (`district-${event.bezirk.number}` as
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

  return (
    <div className="bg-background min-h-screen">
      <PageHeader title={event.title} color={district} />
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
            <span>Event</span>
          </nav>

          {/* Event Info */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                  {event.category}
                </span>
                {event.bezirk && (
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                    {`Bezirk ${event.bezirk.number} (${event.bezirk.name})`}
                  </span>
                )}
                {event.openToParticipants && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-700 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
                    <svg
                      className="h-4 w-4"
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
                    Mitspielen möglich!
                  </span>
                )}
                {isPast && (
                  <span className="rounded-full bg-gray-600 px-3 py-1 text-xs font-semibold">
                    Vergangen
                  </span>
                )}
              </div>

              <h1 className="mb-2 text-2xl font-bold md:text-4xl lg:text-5xl">
                {event.title}
              </h1>
              {event.motto && (
                <p className="text-lg italic opacity-90 md:text-xl">
                  {event.motto}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={shareEvent}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-white/20 px-4 py-2 transition-colors hover:bg-white/30"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                <span className="hidden sm:inline">Teilen</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="space-y-6 lg:col-span-2">
              {/* Date & Time */}
              <div className="rounded-lg bg-white p-6 shadow-md">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-dark flex items-center gap-2 text-xl font-bold">
                    <svg
                      className="text-primary h-6 w-6"
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
                    Datum & Uhrzeit
                  </h2>
                </div>
                <div className="space-y-2">
                  <p className="text-dark text-lg font-semibold">
                    {eventDate.toLocaleDateString("de-DE", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-gray-600">
                    {eventDate.toLocaleTimeString("de-DE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    Uhr
                  </p>
                </div>
                <div className="pt-4">
                  <button
                    onClick={handleDownloadIcs}
                    className="border-primary text-primary hover:bg-primary/10 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-colors"
                  >
                    <svg
                      className="h-5 w-5"
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

              {/* Location */}
              <div className="rounded-lg bg-white p-6 shadow-md">
                <h2 className="text-dark mb-4 flex items-center gap-2 text-xl font-bold">
                  <svg
                    className="text-primary h-6 w-6"
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
                {event.location && (
                  <div className="space-y-2">
                    {event.location.name && (
                      <p className="text-dark font-semibold">
                        {event.location.name}
                      </p>
                    )}
                    {event.location.street && (
                      <p className="text-gray-600">{event.location.street}</p>
                    )}
                    <p className="text-gray-600">
                      {event.location.zipCode && `${event.location.zipCode} `}
                      {event.location.city}
                    </p>
                    {event.location.additionalInfo && (
                      <p className="mt-2 text-sm text-gray-500">
                        {event.location.additionalInfo}
                      </p>
                    )}
                    {/* Navigation Button */}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${event.location.name || ""} ${
                          event.location.street || ""
                        } ${event.location.zipCode || ""} ${
                          event.location.city
                        }`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-primary hover:bg-primary-dark mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-white transition-colors"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                        />
                      </svg>
                      Navigation starten
                    </a>
                  </div>
                )}
              </div>

              {/* Description */}
              {event.description && (
                <div className="rounded-lg bg-white p-6 shadow-md">
                  <h2 className="text-dark mb-4 text-xl font-bold">
                    Beschreibung
                  </h2>
                  <div
                    className="prose max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: event.description }}
                  />
                </div>
              )}

              {/* Performing Ensemble */}
              {event.performingEnsembleType && (
                <div className="rounded-lg bg-white p-6 shadow-md">
                  <h2 className="text-dark mb-4 flex items-center gap-2 text-xl font-bold">
                    <svg
                      className="text-primary h-6 w-6"
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
                    Mitwirkende
                  </h2>
                  {event.performingEnsembleType === "AUSWAHLCHOR" &&
                    event.auswahlChor && (
                      <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div>
                          <p className="text-dark mb-1 font-semibold">
                            {event.auswahlChor.name}
                          </p>
                          {event.auswahlChor.description && (
                            <p className="text-sm text-gray-600">
                              {event.auswahlChor.description}
                            </p>
                          )}
                          {event.auswahlChor.conductor && (
                            <p className="mt-2 text-sm text-gray-500">
                              Leitung: {event.auswahlChor.conductor.displayName}
                            </p>
                          )}
                        </div>
                        {event.auswahlChor.image && (
                          <Image
                            src={event.auswahlChor.image.url}
                            alt={
                              event.auswahlChor.image.alt ||
                              event.auswahlChor.name
                            }
                            width={deviceWidth > 768 ? 200 : 600}
                            height={deviceWidth > 768 ? 150 : 450}
                            className="ml-auto rounded-md object-cover *:h-24 *:w-32 md:h-auto md:w-full"
                          />
                        )}
                      </div>
                    )}
                  {event.performingEnsembleType === "ENSEMBLE" &&
                    event.ensemble && (
                      <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div>
                          <p className="text-dark mb-1 font-semibold">
                            {event.ensemble.name}
                          </p>
                          {event.ensemble.description && (
                            <p className="text-sm text-gray-600">
                              {event.ensemble.description}
                            </p>
                          )}
                          {event.ensemble.conductor && (
                            <p className="mt-2 text-sm text-gray-500">
                              Leitung: {event.ensemble.conductor.displayName}
                            </p>
                          )}
                        </div>
                        {event.ensemble.image && (
                          <Image
                            src={event.ensemble.image.url}
                            alt={
                              event.ensemble.image.alt || event.ensemble.name
                            }
                            width={deviceWidth > 768 ? 200 : 600}
                            height={deviceWidth > 768 ? 150 : 450}
                            className="ml-auto rounded-md object-cover *:h-24 *:w-32 md:h-auto md:w-full"
                          />
                        )}
                      </div>
                    )}
                  {event.performingEnsembleType === "CUSTOM" &&
                    event.performingEnsembleName && (
                      <p className="text-dark font-semibold">
                        {event.performingEnsembleName}
                      </p>
                    )}
                  {event.leitung && (
                    <p className="mt-2 text-sm text-gray-500">
                      Leitung: {event.leitung}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Mitmachangebot - Prominent! */}
              {event.openToParticipants && (
                <div className="sticky top-20 rounded-lg bg-linear-to-br from-green-500 to-green-700 p-6 text-white shadow-xl">
                  <div className="mb-4 flex items-start gap-3">
                    <svg
                      className="h-8 w-8 shrink-0"
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
                    <div>
                      <h3 className="mb-2 text-xl font-bold">
                        Mitspielen möglich!
                      </h3>
                      <p className="text-sm text-green-50">
                        {event.participationInfo ||
                          "Bei dieser Veranstaltung können Sie gerne mitspielen!"}
                      </p>
                    </div>
                  </div>
                  {!event.participationInfo && (
                    <p className="mt-4 border-t border-green-400 pt-4 text-xs text-green-100">
                      Kontaktieren Sie die Veranstalter für weitere
                      Informationen.
                    </p>
                  )}
                </div>
              )}

              {/* Ticket Info */}
              {!event.isFree && event.priceOptions && (
                <div className="sticky top-20 rounded-lg bg-white p-6 shadow-md">
                  <h3 className="text-dark mb-4 text-lg font-bold">
                    Eintrittspreise
                  </h3>
                  <div className="space-y-3">
                    {event.priceOptions.map((option, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between border-b border-gray-200 pb-3 last:border-0"
                      >
                        <div>
                          <p className="text-dark font-semibold">
                            {option.label}
                          </p>
                          {option.description && (
                            <p className="text-xs text-gray-500">
                              {option.description}
                            </p>
                          )}
                        </div>
                        <p className="text-primary text-lg font-bold">
                          {option.price === 0
                            ? "Frei"
                            : `${option.price.toFixed(2)} €`}
                        </p>
                      </div>
                    ))}
                  </div>
                  {event.priceInfo && (
                    <p className="mt-4 text-xs text-gray-500">
                      {event.priceInfo}
                    </p>
                  )}
                </div>
              )}

              {event.isFree && (
                <div className="rounded-lg border-2 border-green-200 bg-green-50 p-6">
                  <p className="flex items-center gap-2 text-lg font-bold text-green-800">
                    <svg
                      className="h-6 w-6"
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
                    Eintritt frei
                  </p>
                </div>
              )}

              {/* Back to Overview */}
              <Link
                href="/termine"
                className="text-dark block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-center font-semibold transition-colors hover:bg-gray-50"
              >
                ← Zurück zur Übersicht
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
