import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/trpc/server";
import { getDistrictColor } from "@/lib/district-color";
import EnsembleMapWrapper from "@/app/_components/ensembles/ensemble-map-wrapper";
import PageHeader from "@/app/_components/general/page-header";
import {
  ClockIcon,
  GlobeIcon,
  MapPinIcon,
  MailIcon,
  PhoneIcon,
  UserIcon,
  NavigationIcon,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EnsembleDetailPage({ params }: PageProps) {
  const { id } = await params;

  const ensemble = await api.ensembles.getById({ id });

  if (!ensemble || !ensemble.isActive) {
    notFound();
  }

  const districtColor = ensemble.bezirk
    ? getDistrictColor(ensemble.bezirk.number)
    : "#6b7280";

  const district = !ensemble.bezirk
    ? "primary"
    : (`district-${ensemble.bezirk.number}` as
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

  let latitude: number | null = null;
  let longitude: number | null = null;

  if (ensemble.location?.city) {
    if (ensemble.location.latitude && ensemble.location.longitude) {
      latitude = ensemble.location.latitude;
      longitude = ensemble.location.longitude;
    } else {
      try {
        const geocodeResult = await api.locations.geocode({
          street: ensemble.location.street ?? undefined,
          zipCode: ensemble.location.zipCode ?? undefined,
          city: ensemble.location.city,
        });
        if (
          geocodeResult?.latitude != null &&
          geocodeResult?.longitude != null
        ) {
          latitude = geocodeResult.latitude;
          longitude = geocodeResult.longitude;
        } else {
          console.warn("Geocoding returned no coordinates for address:", {
            street: ensemble.location.street,
            zipCode: ensemble.location.zipCode,
            city: ensemble.location.city,
            result: geocodeResult,
          });
        }
      } catch (error) {
        console.error("Geocoding failed:", error);
      }
    }
  }

  return (
    <div className="bg-background dark:bg-dark-background min-h-screen">
      <PageHeader title={ensemble.name} color={district} />
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
              href="/mitmachen/chor-finden"
              className="transition-colors hover:text-white"
            >
              Chor finden
            </Link>
            <span>/</span>
            <span>Ensemble</span>
          </nav>

          {/* Ensemble Info */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                {ensemble.bezirk && (
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                    Bezirk {ensemble.bezirk.number}
                    {ensemble.bezirk.name && ` (${ensemble.bezirk.shortName})`}
                  </span>
                )}
                {ensemble.location?.city && (
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                    {ensemble.location.city}
                    {ensemble.location.zipCode &&
                      `, ${ensemble.location.zipCode}`}
                  </span>
                )}
              </div>

              <h1 className="mb-2 text-2xl font-bold md:text-4xl lg:text-5xl">
                {ensemble.name}
              </h1>
            </div>

            {/* Ensemble Image */}
            {ensemble.image?.url && (
              <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg shadow-lg md:h-40 md:w-40">
                <Image
                  src={ensemble.image.url}
                  alt={ensemble.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-background dark:bg-dark-background py-8 md:py-12 lg:py-16">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="space-y-6 lg:col-span-2">
              {/* Description */}
              {ensemble.description && (
                <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                  <h2 className="text-dark dark:text-dark-text mb-4 text-xl font-bold">
                    Über uns
                  </h2>
                  <div
                    className="prose max-w-none text-gray-700 dark:text-gray-300"
                    dangerouslySetInnerHTML={{ __html: ensemble.description }}
                  />
                </div>
              )}

              {/* Practice Location & Map */}
              {ensemble.location && (
                <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                  <h2 className="text-dark dark:text-dark-text mb-4 flex items-center gap-2 text-xl font-bold">
                    <MapPinIcon className="text-primary h-5 w-5" />
                    Probenort
                  </h2>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      {ensemble.location.name && (
                        <p className="dark:text-dark-text font-semibold text-gray-900">
                          {ensemble.location.name}
                        </p>
                      )}
                      {ensemble.location.street && (
                        <p className="text-gray-600 dark:text-gray-400">
                          {ensemble.location.street}
                        </p>
                      )}
                      <p className="text-gray-600 dark:text-gray-400">
                        {ensemble.location.zipCode &&
                          `${ensemble.location.zipCode} `}
                        {ensemble.location.city}
                      </p>
                      {ensemble.location.additionalInfo && (
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                          {ensemble.location.additionalInfo}
                        </p>
                      )}
                    </div>

                    {/* Navigation Button */}
                    {(latitude && longitude) || ensemble.location.city ? (
                      <a
                        href={
                          latitude && longitude
                            ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                `${ensemble.location.name || ""} ${
                                  ensemble.location.street || ""
                                } ${ensemble.location.zipCode || ""} ${
                                  ensemble.location.city
                                }`,
                              )}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-primary hover:bg-primary-dark mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-white transition-colors"
                      >
                        <NavigationIcon className="h-5 w-5" />
                        Navigation starten
                      </a>
                    ) : null}

                    {/* OpenStreetMap Map */}
                    {latitude != null &&
                      longitude != null &&
                      !isNaN(latitude) &&
                      !isNaN(longitude) &&
                      typeof latitude === "number" &&
                      typeof longitude === "number" && (
                        <EnsembleMapWrapper
                          latitude={latitude}
                          longitude={longitude}
                          locationName={ensemble.location.name}
                        />
                      )}
                  </div>
                </div>
              )}

              {/* Rehearsal Schedule */}
              {(ensemble.rehearsalSchedules &&
                ensemble.rehearsalSchedules.length > 0) ||
              ensemble.rehearsalDay ||
              ensemble.rehearsalTime ? (
                <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                  <h2 className="text-dark dark:text-dark-text mb-4 flex items-center gap-2 text-xl font-bold">
                    <ClockIcon className="text-primary h-5 w-5" />
                    Probenzeiten
                  </h2>
                  <div className="space-y-3">
                    {ensemble.rehearsalSchedules &&
                      ensemble.rehearsalSchedules.length > 0 &&
                      ensemble.rehearsalSchedules.map((schedule, index) => (
                        <div
                          key={index}
                          className="dark:border-dark-border flex items-center gap-3 rounded-lg border border-gray-200 p-3"
                        >
                          <div className="flex-1">
                            <p className="text-gray-700 dark:text-gray-300">
                              <span className="font-medium">
                                {schedule.day}
                              </span>
                              {schedule.time && (
                                <>
                                  {" "}
                                  um{" "}
                                  <span className="font-medium">
                                    {schedule.time}
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    {/* Legacy fallback */}
                    {(ensemble.rehearsalDay || ensemble.rehearsalTime) &&
                      (!ensemble.rehearsalSchedules ||
                        ensemble.rehearsalSchedules.length === 0) && (
                        <div className="dark:border-dark-border flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                          <div className="flex-1">
                            {ensemble.rehearsalDay && (
                              <p className="text-gray-700 dark:text-gray-300">
                                <span className="font-medium">Tag:</span>{" "}
                                {ensemble.rehearsalDay}
                              </p>
                            )}
                            {ensemble.rehearsalTime && (
                              <p className="text-gray-700 dark:text-gray-300">
                                <span className="font-medium">Uhrzeit:</span>{" "}
                                {ensemble.rehearsalTime}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              ) : null}

              {/* Upcoming Concerts */}
              {ensemble.events &&
                ensemble.events.filter((event) => event.category === "KONZERT")
                  .length > 0 && (
                  <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                    <h2 className="text-dark dark:text-dark-text mb-4 text-xl font-bold">
                      Kommende Konzerte
                    </h2>
                    <div className="space-y-3">
                      {ensemble.events
                        .filter((event) => event.category === "KONZERT")
                        .map((event) => (
                          <Link
                            key={event.id}
                            href={`/termine/event/${event.id}`}
                            className="dark:border-dark-border dark:hover:bg-dark-background-secondary block rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="dark:text-dark-text font-semibold text-gray-900">
                                  {event.title}
                                </h3>
                                <div className="mt-2 space-y-1">
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {new Date(
                                      event.eventDate,
                                    ).toLocaleDateString("de-DE", {
                                      weekday: "long",
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })}
                                    {", "}
                                    {new Date(
                                      event.eventDate,
                                    ).toLocaleTimeString("de-DE", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                  {event.location && (
                                    <p className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                                      <MapPinIcon className="h-4 w-4 shrink-0" />
                                      {event.location.name && (
                                        <span>{event.location.name}, </span>
                                      )}
                                      {event.location.city}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span
                                className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-white"
                                style={{ backgroundColor: districtColor }}
                              >
                                Konzert
                              </span>
                            </div>
                          </Link>
                        ))}
                    </div>
                  </div>
                )}

              {/* Upcoming Events (non-concerts) */}
              {ensemble.events &&
                ensemble.events.filter((event) => event.category !== "KONZERT")
                  .length > 0 && (
                  <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                    <h2 className="text-dark dark:text-dark-text mb-4 text-xl font-bold">
                      Kommende Veranstaltungen
                    </h2>
                    <div className="space-y-3">
                      {ensemble.events
                        .filter((event) => event.category !== "KONZERT")
                        .map((event) => (
                          <Link
                            key={event.id}
                            href={`/termine/event/${event.id}`}
                            className="dark:border-dark-border dark:hover:bg-dark-background-secondary block rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="dark:text-dark-text font-semibold text-gray-900">
                                  {event.title}
                                </h3>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                  {new Date(event.eventDate).toLocaleDateString(
                                    "de-DE",
                                    {
                                      weekday: "long",
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    },
                                  )}
                                </p>
                              </div>
                            </div>
                          </Link>
                        ))}
                    </div>
                  </div>
                )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Conductor */}
              {(ensemble.conductorName || ensemble.conductor) && (
                <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                  <h2 className="text-dark dark:text-dark-text mb-4 text-lg font-bold">
                    Chorleitung
                  </h2>
                  {ensemble.conductorName ? (
                    <div className="flex items-center gap-3">
                      <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                        <UserIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="dark:text-dark-text font-medium text-gray-900">
                          {ensemble.conductorName}
                        </p>
                      </div>
                    </div>
                  ) : ensemble.conductor ? (
                    <div className="flex items-center gap-3">
                      {ensemble.conductor.profileImage ? (
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
                          <Image
                            src={ensemble.conductor.profileImage.url}
                            alt={
                              ensemble.conductor.displayName || "Chorleitung"
                            }
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                          <UserIcon className="h-6 w-6" />
                        </div>
                      )}
                      <div>
                        <p className="dark:text-dark-text font-medium text-gray-900">
                          {ensemble.conductor.displayName}
                        </p>
                        {ensemble.conductor.bio && (
                          <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                            {ensemble.conductor.bio}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Representative */}
              {(ensemble.representativeName || ensemble.representative) && (
                <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                  <h2 className="text-dark dark:text-dark-text mb-4 text-lg font-bold">
                    Ansprechpartner
                  </h2>
                  {ensemble.representativeName ? (
                    <div className="flex items-center gap-3">
                      <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                        <UserIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="dark:text-dark-text font-medium text-gray-900">
                          {ensemble.representativeName}
                        </p>
                      </div>
                    </div>
                  ) : ensemble.representative ? (
                    <div className="flex items-center gap-3">
                      {ensemble.representative.profileImage ? (
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
                          <Image
                            src={ensemble.representative.profileImage.url}
                            alt={
                              ensemble.representative.displayName ||
                              "Ansprechpartner"
                            }
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                          <UserIcon className="h-6 w-6" />
                        </div>
                      )}
                      <div>
                        <p className="dark:text-dark-text font-medium text-gray-900">
                          {ensemble.representative.displayName}
                        </p>
                        {ensemble.representative.email && (
                          <a
                            href={`mailto:${ensemble.representative.email}`}
                            className="text-primary mt-1 text-sm hover:underline"
                          >
                            {ensemble.representative.email}
                          </a>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Contact Information */}
              <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                <h2 className="text-dark dark:text-dark-text mb-4 text-lg font-bold">
                  Kontakt
                </h2>
                <div className="space-y-3">
                  {ensemble.contactEmail && (
                    <a
                      href={`mailto:${ensemble.contactEmail}`}
                      className="hover:text-primary flex items-center gap-2 text-gray-700 transition-colors dark:text-gray-300"
                    >
                      <MailIcon className="h-5 w-5 shrink-0" />
                      <span className="break-all">{ensemble.contactEmail}</span>
                    </a>
                  )}
                  {ensemble.contactPhone && (
                    <a
                      href={`tel:${ensemble.contactPhone}`}
                      className="hover:text-primary flex items-center gap-2 text-gray-700 transition-colors dark:text-gray-300"
                    >
                      <PhoneIcon className="h-5 w-5 shrink-0" />
                      <span>{ensemble.contactPhone}</span>
                    </a>
                  )}
                  {ensemble.contactWebsite && (
                    <a
                      href={ensemble.contactWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary flex items-center gap-2 text-gray-700 transition-colors dark:text-gray-300"
                    >
                      <GlobeIcon className="h-5 w-5 shrink-0" />
                      <span className="break-all">Webseite besuchen</span>
                    </a>
                  )}
                  {!ensemble.contactEmail &&
                    !ensemble.contactPhone &&
                    !ensemble.contactWebsite && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Keine Kontaktdaten verfügbar
                      </p>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
