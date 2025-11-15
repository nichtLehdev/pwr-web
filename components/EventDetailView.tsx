import Link from "next/link";
import type { Event } from "@/types/strapi";
import { getDistrictColor } from "@/lib/districtColors";
import PageHeader from "./PageHeader";
import Image from "next/image";

interface EventDetailViewProps {
  event: Event;
}

export default function EventDetailView({ event }: EventDetailViewProps) {
  const districtColor = getDistrictColor(event.districtInfo.name);
  const eventDate = new Date(event.eventDate);
  // set default duration to 2 hours if not provided
  const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000);
  const isPast = eventDate < new Date();

  // ICS Download Function
  const downloadICS = () => {
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
LOCATION:${event.location.venue ? event.location.venue + ", " : ""}${
      event.location.street ? event.location.street + ", " : ""
    }${event.location.zipCode || ""} ${event.location.city}
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

  const district =
    event.districtInfo.name === "All Districts"
      ? "primary"
      : (event.districtInfo.name.replace(" ", "-").toLowerCase() as
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

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={event.title} color={district} />
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
            <span>Event</span>
          </nav>

          {/* Event Info */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">
                  {event.category}
                </span>
                {event.districtInfo.name !== "All Districts" && (
                  <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">
                    {event.districtInfo.name}
                  </span>
                )}
                {event.openToParticipants && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-green-700 text-white px-3 py-1.5 rounded-full shadow-lg">
                    <svg
                      className="w-4 h-4"
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
                  <span className="text-xs font-semibold bg-gray-600 px-3 py-1 rounded-full">
                    Vergangen
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-2">
                {event.title}
              </h1>
              {event.motto && (
                <p className="text-lg md:text-xl opacity-90 italic">
                  {event.motto}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={downloadICS}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2"
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
                </svg>
                <span className="hidden sm:inline">Speichern</span>
              </button>
              <button
                onClick={shareEvent}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2"
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
                  Datum & Uhrzeit
                </h2>
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-dark">
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
                  {event.location.venue && (
                    <p className="font-semibold text-dark">
                      {event.location.venue}
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
                    <p className="text-sm text-gray-500 mt-2">
                      {event.location.additionalInfo}
                    </p>
                  )}
                  {/* Navigation Button */}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${event.location.venue || ""} ${
                        event.location.street || ""
                      } ${event.location.zipCode || ""} ${event.location.city}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
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
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                      />
                    </svg>
                    Navigation starten
                  </a>
                </div>
              </div>

              {/* Description */}
              {event.description && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-dark mb-4">
                    Beschreibung
                  </h2>
                  <div
                    className="text-gray-700 prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: event.description }}
                  />
                </div>
              )}

              {/* Performing Ensemble */}
              {event.performingEnsemble && (
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
                    Mitwirkende
                  </h2>
                  {typeof event.performingEnsemble !== "string" && (
                    <div className="flex">
                      <div>
                        <p className="font-semibold text-dark mb-1">
                          {event.performingEnsemble.name}
                        </p>
                        {event.performingEnsemble.description && (
                          <p className="text-gray-600 text-sm">
                            {event.performingEnsemble.description}
                          </p>
                        )}
                        {event.performingEnsemble.conductor && (
                          <p className="text-sm text-gray-500 mt-2">
                            Leitung:{" "}
                            {event.performingEnsemble.conductor.displayName}
                          </p>
                        )}
                      </div>
                      {event.performingEnsemble.image && (
                        <Image
                          src={event.performingEnsemble.image.url}
                          alt={event.performingEnsemble.name}
                          width={200}
                          height={150}
                          className="ml-auto rounded-md object-cover *:w-32 *:h-24"
                        />
                      )}
                    </div>
                  )}
                  {typeof event.performingEnsemble === "string" && (
                    <p className="font-semibold text-dark">
                      {event.performingEnsemble}
                    </p>
                  )}
                  {event.leitung && (
                    <p className="text-sm text-gray-500 mt-2">
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
                <div className="bg-linear-to-br from-green-500 to-green-700 text-white rounded-lg shadow-xl p-6 sticky top-20">
                  <div className="flex items-start gap-3 mb-4">
                    <svg
                      className="w-8 h-8 shrink-0"
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
                      <h3 className="text-xl font-bold mb-2">
                        Mitspielen möglich!
                      </h3>
                      <p className="text-sm text-green-50">
                        {event.participationInfo ||
                          "Bei dieser Veranstaltung können Sie gerne mitspielen!"}
                      </p>
                    </div>
                  </div>
                  {!event.participationInfo && (
                    <p className="text-xs text-green-100 mt-4 pt-4 border-t border-green-400">
                      Kontaktieren Sie die Veranstalter für weitere
                      Informationen.
                    </p>
                  )}
                </div>
              )}

              {/* Ticket Info */}
              {!event.isFree && event.priceOptions && (
                <div className="bg-white rounded-lg shadow-md p-6 sticky top-20">
                  <h3 className="text-lg font-bold text-dark mb-4">
                    Eintrittspreise
                  </h3>
                  <div className="space-y-3">
                    {event.priceOptions.map((option, idx) => (
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
                          {option.price === 0
                            ? "Frei"
                            : `${option.price.toFixed(2)} €`}
                        </p>
                      </div>
                    ))}
                  </div>
                  {event.priceInfo && (
                    <p className="text-xs text-gray-500 mt-4">
                      {event.priceInfo}
                    </p>
                  )}
                </div>
              )}

              {event.isFree && (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                  <p className="text-lg font-bold text-green-800 flex items-center gap-2">
                    <svg
                      className="w-6 h-6"
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
                className="block w-full px-4 py-3 border-2 border-gray-300 text-dark font-semibold rounded-lg hover:bg-gray-50 transition-colors text-center"
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
