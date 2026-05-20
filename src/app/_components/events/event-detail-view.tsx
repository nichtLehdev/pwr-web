"use client";

import Link from "next/link";
import PublicPage from "../general/public-page";
import Image from "next/image";
import MediaCredit from "@/app/_components/general/media-credit";
import PublicShareButton from "@/app/_components/general/public-share-button";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/trpc/react";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import {
  AlertTriangle,
  Calendar,
  CalendarArrowDownIcon,
  CalendarIcon,
  CheckCircleIcon,
  CircleXIcon,
  MapPin,
  MapPinIcon,
  NavigationIcon,
  Users,
  UsersIcon,
  EditIcon,
} from "lucide-react";

type EventWithRelations = RouterOutputs["events"]["getById"];

interface EventDetailViewProps {
  event: EventWithRelations;
}

function formatEventHeroSchedule(
  eventDate: Date,
  durationMinutes: number | null | undefined,
): string {
  const endDate = durationMinutes
    ? new Date(eventDate.getTime() + durationMinutes * 60 * 1000)
    : new Date(eventDate.getTime() + 2 * 60 * 60 * 1000);
  const datePart = eventDate.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStart = eventDate.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const timeEnd = endDate.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dur =
    durationMinutes && durationMinutes > 0
      ? ` (${Math.floor(durationMinutes / 60)}h${
          durationMinutes % 60 > 0 ? ` ${durationMinutes % 60}min` : ""
        })`
      : "";
  return `${datePart}, ${timeStart} – ${timeEnd}${dur} Uhr`;
}

export default function EventDetailView({ event }: EventDetailViewProps) {
  const { data: session } = useSession();
  const { data: profile } = api.users.getMyProfile.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const { data: userPermissions } = api.permissions.getMyPermissions.useQuery(
    undefined,
    { enabled: !!session?.user?.id },
  );

  const hasEditPermission =
    Array.isArray(userPermissions) &&
    userPermissions.some(
      (perm: string) => perm === "events.edit" || perm === "events.approve",
    );

  const eventDate = new Date(event.eventDate);

  const canEdit =
    session?.user &&
    profile &&
    (event.createdById === session.user.id ||
      event.createdBy?.id === session.user.id ||
      hasEditPermission);

  const endDate = event.duration
    ? new Date(eventDate.getTime() + event.duration * 60 * 1000)
    : new Date(eventDate.getTime() + 2 * 60 * 60 * 1000);
  const isPast = eventDate < new Date();

  const locationLine =
    event.location &&
    [event.location.name, event.location.city].filter(Boolean).join(", ");

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

  const heroDescription = (
    <div className="mt-1 space-y-4">
      {event.motto ? (
        <p
          className={cn(
            "italic opacity-90",
            event.cancelled && "line-through opacity-75",
          )}
        >
          {event.motto}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {event.cancelled && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            ABGESAGT
          </span>
        )}
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">
          {event.category}
        </span>
        {event.bezirk && (
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">
            {`Bezirk ${event.bezirk.number} (${event.bezirk.shortName})`}
          </span>
        )}
        {event.openToParticipants && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-700 px-2.5 py-0.5 text-xs font-bold text-white">
            <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Mitspielen möglich!
          </span>
        )}
        {isPast && (
          <span className="rounded-full bg-gray-600 px-2.5 py-0.5 text-xs font-semibold">
            Vergangen
          </span>
        )}
        {canEdit && (
          <Link
            href={`/dashboard/events/${event.id}/edit`}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-white/30 sm:gap-2 sm:px-3 sm:py-1.5"
          >
            <EditIcon className="h-4 w-4 shrink-0" aria-hidden />
            Bearbeiten
          </Link>
        )}
        <PublicShareButton
          title={event.title}
          text={
            event.motto ||
            event.description ||
            `${event.title} am ${eventDate.toLocaleDateString("de-DE")}`
          }
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-white/30 sm:gap-2 sm:px-3 sm:py-1.5"
        />
      </div>
      <div className="flex flex-col gap-2 border-t border-white/20 pt-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1 sm:gap-y-2">
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-white/90" aria-hidden />
          {formatEventHeroSchedule(eventDate, event.duration)}
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
      </div>
    </div>
  );

  return (
    <PublicPage
      title={event.title}
      color={district}
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Termine", href: "/termine" },
        { label: event.title },
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
                {/* Cover Image */}
                {event.coverImage && (
                  <div className="dark:bg-dark-surface dark:shadow-dark-border overflow-hidden rounded-lg bg-white shadow-md">
                    <div className="relative aspect-video w-full">
                      <Image
                        src={event.coverImage.url}
                        alt={event.coverImage.alt || event.title}
                        fill
                        className="object-cover"
                      />
                      {(event.coverImage.copyright ||
                        event.coverImage.creator) && (
                        <div className="absolute right-2 bottom-2 flex justify-end">
                          <MediaCredit
                            copyright={event.coverImage.copyright}
                            creator={event.coverImage.creator}
                            showCreatorIcon
                            className="text-right text-white/90 drop-shadow-sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Downloads */}
                {event.downloads && event.downloads.length > 0 && (
                  <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                    <h2 className="text-dark dark:text-dark-text mb-4 text-xl font-bold">
                      Downloads
                    </h2>
                    <div className="space-y-2">
                      {event.downloads.map((ed) => (
                        <a
                          key={ed.download.id}
                          href={ed.download.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary-dark flex items-center gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
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
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <span className="font-medium">
                            {ed.download.title}
                          </span>
                          {ed.download.description && (
                            <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                              {ed.download.description}
                            </span>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cancelled Warning */}
                {event.cancelled && (
                  <div className="rounded-lg border-2 border-red-500 bg-red-50 p-6 dark:border-red-700 dark:bg-red-950/50">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                        <CircleXIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-red-800 dark:text-red-300">
                          Diese Veranstaltung wurde abgesagt
                        </h2>
                        <p className="mt-1 text-red-700 dark:text-red-400">
                          Bitte beachten Sie, dass dieses Event nicht mehr
                          stattfindet.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Date & Time */}
                <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-dark dark:text-dark-text flex items-center gap-2 text-xl font-bold">
                      <CalendarIcon className="text-primary h-6 w-6" />
                      Datum & Uhrzeit
                    </h2>
                  </div>
                  <div className="space-y-2">
                    <p className="text-dark dark:text-dark-text text-lg font-semibold">
                      {eventDate.toLocaleDateString("de-DE", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {eventDate.toLocaleTimeString("de-DE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {event.duration && event.duration > 0 && (
                        <span>
                          {" "}
                          ({Math.floor(event.duration / 60)}h{" "}
                          {event.duration % 60 > 0
                            ? `${event.duration % 60}min`
                            : ""}
                          )
                        </span>
                      )}{" "}
                      Uhr
                    </p>
                  </div>
                  <div className="pt-4">
                    <button
                      onClick={handleDownloadIcs}
                      className="border-primary text-primary hover:bg-primary/10 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-colors"
                    >
                      <CalendarArrowDownIcon className="h-5 w-5" />
                      Zum Kalender hinzufügen (ICS)
                    </button>
                  </div>
                </div>

                {/* Location */}
                <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                  <h2 className="text-dark dark:text-dark-text mb-4 flex items-center gap-2 text-xl font-bold">
                    <MapPinIcon className="text-primary h-6 w-6" />
                    Veranstaltungsort
                  </h2>
                  {event.location && (
                    <div className="space-y-2">
                      {event.location.name && (
                        <p className="text-dark dark:text-dark-text font-semibold">
                          {event.location.name}
                        </p>
                      )}
                      {event.location.street && (
                        <p className="text-gray-600 dark:text-gray-400">
                          {event.location.street}
                        </p>
                      )}
                      <p className="text-gray-600 dark:text-gray-400">
                        {event.location.zipCode && `${event.location.zipCode} `}
                        {event.location.city}
                      </p>
                      {event.location.additionalInfo && (
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
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
                        <NavigationIcon className="h-5 w-5" />
                        Navigation starten
                      </a>
                    </div>
                  )}
                </div>

                {/* Description */}
                {event.description && (
                  <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                    <h2 className="text-dark dark:text-dark-text mb-4 text-xl font-bold">
                      Beschreibung
                    </h2>
                    <div
                      className="prose max-w-none text-gray-700 dark:text-gray-300"
                      dangerouslySetInnerHTML={{ __html: event.description }}
                    />
                  </div>
                )}

                {/* Performing Ensemble */}
                {event.performingEnsembleType && (
                  <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                    <h2 className="text-dark dark:text-dark-text mb-4 flex items-center gap-2 text-xl font-bold">
                      <UsersIcon className="text-primary h-6 w-6" />
                      Mitwirkende
                    </h2>
                    {event.performingEnsembleType === "AUSWAHLCHOR" &&
                      event.auswahlChor && (
                        <div className="flex flex-col gap-4 md:flex-row md:items-center">
                          <div>
                            <p className="text-dark dark:text-dark-text mb-1 font-semibold">
                              {event.auswahlChor.name}
                            </p>
                            {event.auswahlChor.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {event.auswahlChor.description}
                              </p>
                            )}
                            {event.auswahlChor.conductor && (
                              <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                                Leitung:{" "}
                                {event.auswahlChor.conductor.displayName}
                              </p>
                            )}
                          </div>
                          {event.auswahlChor.image && (
                            <div className="group relative ml-auto w-full shrink-0 overflow-hidden rounded-lg md:w-80 md:min-w-[320px]">
                              <div className="relative aspect-4/3 w-full">
                                <Image
                                  src={event.auswahlChor.image.url}
                                  alt={
                                    event.auswahlChor.image.alt ||
                                    event.auswahlChor.name
                                  }
                                  fill
                                  className="object-cover"
                                />
                                {(event.auswahlChor.image.copyright ||
                                  event.auswahlChor.image.creator) && (
                                  <div className="absolute right-2 bottom-2 flex justify-end opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                    <MediaCredit
                                      copyright={
                                        event.auswahlChor.image.copyright
                                      }
                                      creator={event.auswahlChor.image.creator}
                                      variant="light"
                                      showCreatorIcon
                                      className="text-right"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    {event.performingEnsembleType === "ENSEMBLE" &&
                      event.ensemble && (
                        <div className="flex flex-col gap-4 md:flex-row md:items-center">
                          <div>
                            <p className="text-dark dark:text-dark-text mb-1 font-semibold">
                              {event.ensemble.name}
                            </p>
                            {event.ensemble.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {event.ensemble.description}
                              </p>
                            )}
                            {(event.ensemble.conductorName ||
                              event.ensemble.conductor) && (
                              <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                                Leitung:{" "}
                                {event.ensemble.conductorName ||
                                  event.ensemble.conductor?.displayName}
                              </p>
                            )}
                          </div>
                          {event.ensemble.image && (
                            <div className="group relative ml-auto w-full shrink-0 overflow-hidden rounded-lg md:w-80 md:min-w-[320px]">
                              <div className="relative aspect-4/3 w-full">
                                <Image
                                  src={event.ensemble.image.url}
                                  alt={
                                    event.ensemble.image.alt ||
                                    event.ensemble.name
                                  }
                                  fill
                                  className="object-cover"
                                />
                                {(event.ensemble.image.copyright ||
                                  event.ensemble.image.creator) && (
                                  <div className="absolute right-2 bottom-2 flex justify-end opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                    <MediaCredit
                                      copyright={event.ensemble.image.copyright}
                                      creator={event.ensemble.image.creator}
                                      variant="light"
                                      showCreatorIcon
                                      className="text-right"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    {event.performingEnsembleType === "CUSTOM" &&
                      event.performingEnsembleName && (
                        <p className="text-dark dark:text-dark-text font-semibold">
                          {event.performingEnsembleName}
                        </p>
                      )}
                    {event.leitung && (
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
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
                      <CheckCircleIcon className="h-8 w-8 shrink-0" />
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
                  <div className="dark:bg-dark-surface dark:shadow-dark-border sticky top-20 rounded-lg bg-white p-6 shadow-md">
                    <h3 className="text-dark dark:text-dark-text mb-4 text-lg font-bold">
                      Eintrittspreise
                    </h3>
                    <div className="space-y-3">
                      {event.priceOptions.map((option, idx) => (
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
                            {option.price === 0
                              ? "Frei"
                              : `${option.price.toFixed(2)}\u00a0€`}
                          </p>
                        </div>
                      ))}
                    </div>
                    {event.priceInfo && (
                      <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">
                        {event.priceInfo}
                      </p>
                    )}
                  </div>
                )}

                {event.isFree && (
                  <div className="rounded-lg border-2 border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/30">
                    <p className="flex items-center gap-2 text-lg font-bold text-green-800 dark:text-green-400">
                      <CheckCircleIcon className="h-6 w-6 shrink-0" />
                      Eintritt frei
                    </p>
                  </div>
                )}

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
      </div>
    </PublicPage>
  );
}
