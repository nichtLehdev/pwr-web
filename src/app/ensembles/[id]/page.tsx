import type { Metadata } from "next";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import Image from "next/image";
import { api } from "@/trpc/server";
import { sanitizeHtml } from "@/lib/sanitize";
import EnsembleMapWrapper from "@/app/_components/ensembles/ensemble-map-wrapper";
import PublicPage from "@/app/_components/general/public-page";
import { BezirkLabel } from "@/app/_components/programmheft/bezirk-label";
import { headMeta } from "@/app/_components/programmheft/page-head";
import { Heading } from "@/app/_components/programmheft/section-head";
import { WayList, WayRow } from "@/app/_components/programmheft/way-list";
import MediaCredit from "@/app/_components/general/media-credit";
import ZoomableImage from "@/app/_components/general/zoomable-image";
import LocationNavigationLink from "@/app/_components/general/location-navigation-link";
import { MailIcon, PhoneIcon, UserIcon } from "lucide-react";
import { SocialIcon } from "@/app/_components/ui/social-icon";
import { readSocialLinks, socialTypeLabel } from "@/lib/social-links";
import { formatPublicAddress } from "@/lib/resolve-ensemble-contact";
import { db } from "@/server/db";
import { buildPageMetadata, plainTextExcerpt, SITE_NAME } from "@/lib/seo";
import { ensemblePath, eventPath, isUuid } from "@/lib/slug";
import JsonLd from "@/app/_components/seo/json-ld";
import { breadcrumbSchema, musicGroupSchema } from "@/lib/structured-data";
import { formatBerlin } from "@/lib/berlin-time";

/** Kontaktzeile für Chorleitung/Ansprechpartner: Ink-Text, Messing-Tinte beim Hover. */
const CONTACT_ROW =
  "hover:text-primary-ink dark:hover:text-primary text-ink dark:text-night-text flex items-center gap-2 transition-colors";

function EnsembleRoleContact({
  email,
  phone,
  street,
  zipCode,
  city,
}: {
  email: string | null;
  phone: string | null;
  street: string | null;
  zipCode: string | null;
  city: string | null;
}) {
  const address = formatPublicAddress({ email, phone, street, zipCode, city });
  if (!email && !phone && !address) return null;

  return (
    <div className="mt-3 space-y-2 text-sm">
      {email && (
        <a href={`mailto:${email}`} className={CONTACT_ROW}>
          <MailIcon className={headMeta.icon} aria-hidden />
          <span className="break-all">{email}</span>
        </a>
      )}
      {phone && (
        <a href={`tel:${phone}`} className={CONTACT_ROW}>
          <PhoneIcon className={headMeta.icon} aria-hidden />
          <span>{phone}</span>
        </a>
      )}
      {address && (
        <p className="text-dark dark:text-night-muted flex items-start gap-2">
          <span className="mt-0.5">{address}</span>
        </p>
      )}
    </div>
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

const getEnsembleForMetadata = cache(async (identifier: string) =>
  db.ensemble.findFirst({
    where: {
      ...(isUuid(identifier) ? { id: identifier } : { slug: identifier }),
      isActive: true,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      image: { select: { url: true, width: true, height: true, alt: true } },
      location: { select: { name: true, city: true } },
      bezirk: { select: { name: true } },
    },
  }),
);

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const ensemble = await getEnsembleForMetadata(id);

  if (!ensemble) {
    return { title: "Posaunenchor", robots: { index: false, follow: false } };
  }

  // Town first: people search for "Posaunenchor <Ort>", not for the chor's
  // own name.
  const city = ensemble.location?.city;
  const place = city ? ` in ${city}` : "";
  const fallback = `Posaunenchor${place}${
    ensemble.bezirk ? ` — ${ensemble.bezirk.name}` : ""
  }. Proben, Kontakt und Termine beim ${SITE_NAME}.`;

  return buildPageMetadata({
    title: city ? `${ensemble.name} (${city})` : ensemble.name,
    description: plainTextExcerpt(ensemble.description) ?? fallback,
    path: ensemblePath(ensemble),
    image: ensemble.image,
  });
}

export default async function EnsembleDetailPage({ params }: PageProps) {
  const { id } = await params;

  const ensemble = await api.ensembles.getById({ id });

  if (!ensemble || !ensemble.isActive) {
    notFound();
  }

  // Old UUID links keep working but hand their ranking to the slug URL.
  if (isUuid(id) && ensemble.slug) {
    permanentRedirect(ensemblePath(ensemble));
  }

  const socialLinks = readSocialLinks(ensemble.socials);

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

  const hasHeroMeta =
    ensemble.bezirk || ensemble.location?.city || ensemble.image?.url;

  const concerts =
    ensemble.events?.filter((event) => event.category === "KONZERT") ?? [];
  const otherEvents =
    ensemble.events?.filter((event) => event.category !== "KONZERT") ?? [];

  const hasConductorCard =
    ensemble.conductorName ||
    ensemble.conductor ||
    ensemble.conductorEmail ||
    ensemble.conductorPhone ||
    ensemble.conductorStreet ||
    ensemble.conductorCity;

  const hasRepresentativeCard =
    ensemble.representativeName ||
    ensemble.representative ||
    ensemble.representativeEmail ||
    ensemble.representativePhone ||
    ensemble.representativeStreet ||
    ensemble.representativeCity;

  return (
    <PublicPage
      title={ensemble.name}
      heroSize="compact"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Chor finden", href: "/mitmachen/chor-finden" },
        { label: "Ensemble" },
      ]}
      description={
        hasHeroMeta ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {ensemble.bezirk && (
                <span className={headMeta.label}>
                  <BezirkLabel bezirk={ensemble.bezirk} />
                </span>
              )}
              {ensemble.location?.city && (
                <span className={headMeta.label}>
                  {ensemble.location.city}
                  {ensemble.location.zipCode &&
                    `, ${ensemble.location.zipCode}`}
                </span>
              )}
            </div>
            {ensemble.image?.url && (
              <div className="flex shrink-0 flex-col gap-1 sm:items-end">
                <ZoomableImage
                  src={ensemble.image.url}
                  alt={ensemble.image.alt || ensemble.name}
                  copyright={ensemble.image.copyright}
                  creator={ensemble.image.creator}
                  className="bg-rule dark:bg-night-rule h-24 w-24 overflow-hidden sm:h-28 sm:w-28"
                >
                  <Image
                    src={ensemble.image.url}
                    alt={ensemble.image.alt || ensemble.name}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </ZoomableImage>
                <MediaCredit
                  copyright={ensemble.image.copyright}
                  creator={ensemble.image.creator}
                  showCreatorIcon
                  className="max-w-28 sm:justify-end sm:text-right"
                />
              </div>
            )}
          </div>
        ) : undefined
      }
    >
      <JsonLd
        data={[
          musicGroupSchema({
            path: ensemblePath(ensemble),
            name: ensemble.name,
            description: plainTextExcerpt(ensemble.description, 300),
            imageUrl: ensemble.image?.url,
            websiteUrl: ensemble.contactWebsite,
            // Uses the coordinates resolved above, so chöre whose location row
            // has not been backfilled yet still get a geo node.
            location: ensemble.location
              ? { ...ensemble.location, latitude, longitude }
              : null,
          }),
          breadcrumbSchema([
            { name: "Start", path: "/" },
            { name: "Chor finden", path: "/mitmachen/chor-finden" },
            { name: ensemble.name },
          ]),
        ]}
      />
      <div className="sheet py-10 md:py-14">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            {ensemble.description && (
              <div>
                <Heading as="h2" size="list" rule>
                  Über uns
                </Heading>
                <div
                  className="prose dark:prose-invert text-ink dark:text-night-text mt-4 max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(ensemble.description),
                  }}
                />
              </div>
            )}

            {ensemble.location && (
              <div>
                <Heading as="h2" size="list" rule>
                  Probenort
                </Heading>
                <div className="mt-4 space-y-2">
                  {ensemble.location.name && (
                    <p className="text-ink dark:text-night-text font-semibold">
                      {ensemble.location.name}
                    </p>
                  )}
                  {ensemble.location.street && (
                    <p className="text-dark dark:text-night-muted">
                      {ensemble.location.street}
                    </p>
                  )}
                  <p className="text-dark dark:text-night-muted">
                    {ensemble.location.zipCode &&
                      `${ensemble.location.zipCode} `}
                    {ensemble.location.city}
                  </p>
                  {ensemble.location.additionalInfo && (
                    <p className="text-dark dark:text-night-muted mt-2 text-sm">
                      {ensemble.location.additionalInfo}
                    </p>
                  )}
                  <LocationNavigationLink
                    location={{ ...ensemble.location, latitude, longitude }}
                  />

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

            {(ensemble.rehearsalSchedules &&
              ensemble.rehearsalSchedules.length > 0) ||
            ensemble.rehearsalDay ||
            ensemble.rehearsalTime ? (
              <div>
                <Heading as="h2" size="list" rule>
                  Probenzeiten
                </Heading>
                <WayList rule={false} className="mt-4">
                  {ensemble.rehearsalSchedules &&
                  ensemble.rehearsalSchedules.length > 0
                    ? ensemble.rehearsalSchedules.map((schedule, index) => (
                        <WayRow
                          key={index}
                          title={schedule.day}
                          description={schedule.time || undefined}
                        />
                      ))
                    : // Legacy fallback: ein einzelner Termin ohne eigene Liste.
                      (ensemble.rehearsalDay || ensemble.rehearsalTime) && (
                        <WayRow
                          title={ensemble.rehearsalDay ?? "Probenzeit"}
                          description={ensemble.rehearsalTime || undefined}
                        />
                      )}
                </WayList>
              </div>
            ) : null}

            {concerts.length > 0 && (
              <div>
                <Heading as="h2" size="list" rule>
                  Kommende Konzerte
                </Heading>
                <WayList rule={false} className="mt-4">
                  {concerts.map((event) => {
                    const date = new Date(event.eventDate);
                    const locationLine = event.location
                      ? `${event.location.name ? `${event.location.name}, ` : ""}${event.location.city}`
                      : null;
                    return (
                      <WayRow
                        key={event.id}
                        href={eventPath(event)}
                        title={event.title}
                        description={`${formatBerlin(date, "datumMitWochentag")}, ${formatBerlin(date, "uhrzeit")}${locationLine ? ` · ${locationLine}` : ""}`}
                      />
                    );
                  })}
                </WayList>
              </div>
            )}

            {otherEvents.length > 0 && (
              <div>
                <Heading as="h2" size="list" rule>
                  Kommende Veranstaltungen
                </Heading>
                <WayList rule={false} className="mt-4">
                  {otherEvents.map((event) => (
                    <WayRow
                      key={event.id}
                      href={eventPath(event)}
                      title={event.title}
                      description={formatBerlin(
                        event.eventDate,
                        "datumMitWochentag",
                      )}
                    />
                  ))}
                </WayList>
              </div>
            )}
          </div>

          {/* `sticky-below-nav` statt fester Zahl: Die Navigationshöhe ändert sich mit dem Banner. */}
          <div className="sticky-below-nav space-y-8 lg:sticky lg:self-start">
            {hasConductorCard && (
              <div>
                <Heading as="h3" size="list" rule>
                  Chorleitung
                </Heading>
                <div className="mt-4">
                  {ensemble.conductorName ? (
                    <div className="flex items-center gap-3">
                      <div className="bg-rule dark:bg-night-rule text-dark dark:text-night-muted flex h-12 w-12 shrink-0 items-center justify-center">
                        <UserIcon className="h-6 w-6" aria-hidden />
                      </div>
                      <p className="text-ink dark:text-night-text font-semibold">
                        {ensemble.conductorName}
                      </p>
                    </div>
                  ) : ensemble.conductor ? (
                    <div className="flex items-center gap-3">
                      {ensemble.conductor.profileImage ? (
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden">
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
                        <div className="bg-rule dark:bg-night-rule text-dark dark:text-night-muted flex h-12 w-12 shrink-0 items-center justify-center">
                          <UserIcon className="h-6 w-6" aria-hidden />
                        </div>
                      )}
                      <div>
                        <p className="text-ink dark:text-night-text font-semibold">
                          {ensemble.conductor.displayName}
                        </p>
                        {ensemble.conductor.bio && (
                          <p className="text-dark dark:text-night-muted mt-1 line-clamp-2 text-sm">
                            {ensemble.conductor.bio}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                  <EnsembleRoleContact
                    email={ensemble.conductorEmail}
                    phone={ensemble.conductorPhone}
                    street={ensemble.conductorStreet}
                    zipCode={ensemble.conductorZipCode}
                    city={ensemble.conductorCity}
                  />
                </div>
              </div>
            )}

            {hasRepresentativeCard && (
              <div>
                <Heading as="h3" size="list" rule>
                  Ansprechpartner
                </Heading>
                <div className="mt-4">
                  {ensemble.representativeName ? (
                    <div className="flex items-center gap-3">
                      <div className="bg-rule dark:bg-night-rule text-dark dark:text-night-muted flex h-12 w-12 shrink-0 items-center justify-center">
                        <UserIcon className="h-6 w-6" aria-hidden />
                      </div>
                      <p className="text-ink dark:text-night-text font-semibold">
                        {ensemble.representativeName}
                      </p>
                    </div>
                  ) : ensemble.representative ? (
                    <div className="flex items-center gap-3">
                      {ensemble.representative.profileImage ? (
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden">
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
                        <div className="bg-rule dark:bg-night-rule text-dark dark:text-night-muted flex h-12 w-12 shrink-0 items-center justify-center">
                          <UserIcon className="h-6 w-6" aria-hidden />
                        </div>
                      )}
                      <p className="text-ink dark:text-night-text font-semibold">
                        {ensemble.representative.displayName}
                      </p>
                    </div>
                  ) : null}
                  <EnsembleRoleContact
                    email={ensemble.representativeEmail}
                    phone={ensemble.representativePhone}
                    street={ensemble.representativeStreet}
                    zipCode={ensemble.representativeZipCode}
                    city={ensemble.representativeCity}
                  />
                </div>
              </div>
            )}

            {(ensemble.contactWebsite || socialLinks.length > 0) && (
              <div>
                <Heading as="h3" size="list" rule>
                  {ensemble.contactWebsite && socialLinks.length > 0
                    ? "Webseite & Social Media"
                    : ensemble.contactWebsite
                      ? "Webseite"
                      : "Social Media"}
                </Heading>
                <div className="mt-4 space-y-3">
                  {ensemble.contactWebsite && (
                    <a
                      href={ensemble.contactWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={CONTACT_ROW}
                    >
                      <SocialIcon type="website" className={headMeta.icon} />
                      <span className="break-all">Webseite besuchen</span>
                    </a>
                  )}
                  {socialLinks.map((social, index) => (
                    <a
                      key={index}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={CONTACT_ROW}
                    >
                      <SocialIcon
                        type={social.type}
                        className={headMeta.icon}
                      />
                      <span className="break-all">
                        {social.label ?? socialTypeLabel(social.type)}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicPage>
  );
}
