"use client";

import Link from "next/link";
import PublicPage from "../general/public-page";
import { BezirkLabel } from "@/app/_components/programmheft/bezirk-label";
import { headMeta } from "@/app/_components/programmheft/page-head";
import { Tag } from "@/app/_components/programmheft/tag";
import { Note } from "@/app/_components/programmheft/note";
import { WayList, WayRow } from "@/app/_components/programmheft/way-list";
import { ValueTable } from "@/app/_components/programmheft/value-table";
import { Heading } from "@/app/_components/programmheft/section-head";
import { eventCategoryLabel } from "@/lib/termine-labels";
import { MitwirkendeBild, TerminBeschreibung } from "./termin-bild";
import PublicShareButton from "@/app/_components/general/public-share-button";
import { cn } from "@/lib/utils";
import { renderDescriptionHtml } from "@/lib/sanitize";
import { markdownToSingleLine } from "@/lib/markdown-to-plain-text";
import type { RouterOutputs } from "@/trpc/react";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import type { PermissionKey } from "@/lib/permissions";
import { formatEuro } from "@/lib/invoice-document";
import {
  AlertTriangle,
  CalendarArrowDownIcon,
  Calendar,
  MapPin,
  Users,
  EditIcon,
} from "lucide-react";

import LocationNavigationLink from "@/app/_components/general/location-navigation-link";
import { DownloadImagePreview } from "@/app/_components/general/download-image-preview";
import {
  downloadFormatCode,
  isPreviewableImageDownload,
} from "@/lib/download-file-types";
import { formatBerlin } from "@/lib/berlin-time";

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
  const datePart = formatBerlin(eventDate, "datumMitWochentag");
  const timeStart = formatBerlin(eventDate, "uhrzeit");
  const timeEnd = formatBerlin(endDate, "uhrzeit");
  const dur =
    durationMinutes && durationMinutes > 0
      ? ` (${Math.floor(durationMinutes / 60)}h${
          durationMinutes % 60 > 0 ? ` ${durationMinutes % 60}min` : ""
        })`
      : "";
  return `${datePart}, ${timeStart} – ${timeEnd}${dur} Uhr`;
}

/** Outline-Schaltfläche für nicht-navigierende Aktionen (ICS-Download). */
const OUTLINE_BUTTON =
  "semi-condensed border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night inline-flex min-h-12 w-full items-center justify-center gap-2 border-2 px-4 text-base font-semibold transition-colors";

export default function EventDetailView({ event }: EventDetailViewProps) {
  const { data: session } = useSession();
  const { data: profile } = api.users.getMyProfile.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const { hasAnyPermission } = usePermissions();

  const hasEditPermission = hasAnyPermission([
    "events.edit" as PermissionKey,
    "events.approve" as PermissionKey,
  ]);

  const eventDate = new Date(event.eventDate);

  const canEdit =
    session?.user &&
    profile &&
    (event.createdById === session.user.id ||
      event.createdBy?.id === session.user.id ||
      hasEditPermission);

  const isPast = eventDate < new Date();

  const locationLine =
    event.location &&
    [event.location.name, event.location.city].filter(Boolean).join(", ");

  const handleDownloadIcs = () => {
    // Server-generated single-item ICS: proper escaping, description, URL
    window.location.href = `/api/feed/ical?eventId=${event.id}`;
  };

  const heroDescription = (
    <div className="space-y-4">
      {event.motto ? (
        <p
          className={cn(
            "semi-condensed text-xl leading-snug font-medium",
            event.cancelled && "text-dark dark:text-night-muted line-through",
          )}
        >
          {event.motto}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {event.cancelled && (
          <Tag tone="cancelled">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Abgesagt
          </Tag>
        )}
        <span className={headMeta.label}>
          {eventCategoryLabel(event.category)}
        </span>
        {event.bezirk && (
          <span className={headMeta.label}>
            <BezirkLabel bezirk={event.bezirk} />
          </span>
        )}
        {event.openToParticipants && (
          <Tag tone="orange">
            <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Mitspielen möglich!
          </Tag>
        )}
        {isPast && <Tag>Vergangen</Tag>}
        {canEdit && (
          <Link
            href={`/dashboard/events/${event.id}/edit`}
            className={headMeta.action}
          >
            <EditIcon className="h-4 w-4 shrink-0" aria-hidden />
            Bearbeiten
          </Link>
        )}
        <PublicShareButton
          title={event.title}
          /* Klartext: die Beschreibung ist Markdown, sonst stünden Sternchen in der Nachricht. */
          text={
            event.motto ||
            markdownToSingleLine(event.description ?? "") ||
            `${event.title} am ${formatBerlin(eventDate)}`
          }
          className={headMeta.action}
        />
      </div>
      <div className={headMeta.line}>
        <span className="flex items-center gap-2">
          <Calendar className={headMeta.icon} aria-hidden />
          {formatEventHeroSchedule(eventDate, event.duration)}
        </span>
        {locationLine ? (
          <>
            <span className={headMeta.separator} aria-hidden>
              ·
            </span>
            <span className="flex items-center gap-2">
              <MapPin className={headMeta.icon} aria-hidden />
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
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Termine", href: "/termine" },
        { label: event.title },
      ]}
      heroSize="compact"
      description={heroDescription}
    >
      <div className="sheet py-10 md:py-14">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            {event.cancelled && (
              <Note
                tone="error"
                title="Diese Veranstaltung wurde abgesagt"
                titleAs="h3"
              >
                <p>
                  Bitte beachten Sie, dass dieses Event nicht mehr stattfindet.
                </p>
              </Note>
            )}

            <TerminBeschreibung
              image={event.coverImage}
              fallbackAlt={event.title}
              html={renderDescriptionHtml(event.description)}
            />

            <div>
              <Heading as="h2" size="list" rule>
                Datum &amp; Uhrzeit
              </Heading>
              <div className="mt-4 space-y-2">
                <p className="text-ink dark:text-night-text text-lg font-semibold">
                  {formatBerlin(eventDate, "datumMitWochentag")}
                </p>
                <p className="text-dark dark:text-night-muted">
                  {formatBerlin(eventDate, "uhrzeit")}
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
              <button
                onClick={handleDownloadIcs}
                className={cn(OUTLINE_BUTTON, "mt-4 sm:w-auto")}
              >
                <CalendarArrowDownIcon className="h-5 w-5" aria-hidden />
                Zum Kalender hinzufügen (ICS)
              </button>
            </div>

            {event.location && (
              <div>
                <Heading as="h2" size="list" rule>
                  Veranstaltungsort
                </Heading>
                <div className="mt-4 space-y-2">
                  {event.location.name && (
                    <p className="text-ink dark:text-night-text font-semibold">
                      {event.location.name}
                    </p>
                  )}
                  {event.location.street && (
                    <p className="text-dark dark:text-night-muted">
                      {event.location.street}
                    </p>
                  )}
                  <p className="text-dark dark:text-night-muted">
                    {event.location.zipCode && `${event.location.zipCode} `}
                    {event.location.city}
                  </p>
                  {event.location.additionalInfo && (
                    <p className="text-dark dark:text-night-muted mt-2 text-sm">
                      {event.location.additionalInfo}
                    </p>
                  )}
                  <LocationNavigationLink location={event.location} />
                </div>
              </div>
            )}

            {event.performingEnsembleType && (
              <div>
                <Heading as="h2" size="list" rule>
                  Mitwirkende
                </Heading>
                <div className="mt-4">
                  {event.performingEnsembleType === "AUSWAHLCHOR" &&
                    event.auswahlChor && (
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-8">
                        <div>
                          <p className="text-ink dark:text-night-text mb-1 font-semibold">
                            {event.auswahlChor.name}
                          </p>
                          {event.auswahlChor.description && (
                            <p className="text-dark dark:text-night-muted text-sm">
                              {event.auswahlChor.description}
                            </p>
                          )}
                          {event.auswahlChor.conductor && (
                            <p className="text-dark dark:text-night-muted mt-2 text-sm">
                              Leitung: {event.auswahlChor.conductor.displayName}
                            </p>
                          )}
                        </div>
                        {event.auswahlChor.image && (
                          <MitwirkendeBild
                            image={event.auswahlChor.image}
                            fallbackAlt={event.auswahlChor.name}
                          />
                        )}
                      </div>
                    )}
                  {event.performingEnsembleType === "ENSEMBLE" &&
                    event.ensemble && (
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-8">
                        <div>
                          <p className="text-ink dark:text-night-text mb-1 font-semibold">
                            {event.ensemble.name}
                          </p>
                          {event.ensemble.description && (
                            <p className="text-dark dark:text-night-muted text-sm">
                              {event.ensemble.description}
                            </p>
                          )}
                          {(event.ensemble.conductorName ||
                            event.ensemble.conductor) && (
                            <p className="text-dark dark:text-night-muted mt-2 text-sm">
                              Leitung:{" "}
                              {event.ensemble.conductorName ||
                                event.ensemble.conductor?.displayName}
                            </p>
                          )}
                        </div>
                        {event.ensemble.image && (
                          <MitwirkendeBild
                            image={event.ensemble.image}
                            fallbackAlt={event.ensemble.name}
                          />
                        )}
                      </div>
                    )}
                  {event.performingEnsembleType === "CUSTOM" &&
                    event.performingEnsembleName && (
                      <p className="text-ink dark:text-night-text font-semibold">
                        {event.performingEnsembleName}
                      </p>
                    )}
                  {event.leitung && (
                    <p className="text-dark dark:text-night-muted mt-2 text-sm">
                      Leitung: {event.leitung}
                    </p>
                  )}
                </div>
              </div>
            )}

            {event.downloads && event.downloads.length > 0 && (
              <div>
                <Heading as="h2" size="list" rule>
                  Downloads
                </Heading>
                {/* Bilder (Flyer) zuerst und mit Vorschau, die übrigen Dateien als Wegzeilen. */}
                <WayList className="mt-4" rule={false}>
                  {event.downloads
                    .filter((ed) => isPreviewableImageDownload(ed.download))
                    .map((ed) => (
                      <DownloadImagePreview
                        key={ed.download.id}
                        download={ed.download}
                      />
                    ))}
                  {event.downloads
                    .filter((ed) => !isPreviewableImageDownload(ed.download))
                    .map((ed) => (
                      <WayRow
                        key={ed.download.id}
                        href={ed.download.fileUrl}
                        kind="download"
                        fileType={downloadFormatCode(ed.download)}
                        title={ed.download.title}
                        description={ed.download.description || undefined}
                      />
                    ))}
                </WayList>
              </div>
            )}
          </div>

          {/* `sticky-below-nav` statt `lg:top-24`: rechnet Banner- und Navigationshöhe zur Laufzeit. */}
          <div className="sticky-below-nav space-y-8 lg:sticky lg:self-start">
            {event.openToParticipants && (
              <div className="border-rule dark:border-night-rule border-t pt-6">
                <Tag tone="orange">
                  <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Mitspielen möglich!
                </Tag>
                <p className="text-ink dark:text-night-text mt-3 text-base leading-relaxed">
                  {event.participationInfo ||
                    "Bei dieser Veranstaltung können Sie gerne mitspielen!"}
                </p>
                {!event.participationInfo && (
                  <p className="text-dark dark:text-night-muted mt-3 text-xs">
                    Kontaktieren Sie die Veranstalter für weitere Informationen.
                  </p>
                )}
              </div>
            )}

            {!event.isFree && event.priceOptions && (
              <div>
                <Heading as="h3" size="list" rule>
                  Eintrittspreise
                </Heading>
                <ValueTable
                  className="mt-4"
                  rows={event.priceOptions.map((option, idx) => ({
                    label: (
                      <span key={idx}>
                        {option.label}
                        {option.description && (
                          <span className="text-dark dark:text-night-muted block text-xs">
                            {option.description}
                          </span>
                        )}
                      </span>
                    ),
                    value:
                      option.price === 0 ? "Frei" : formatEuro(option.price),
                  }))}
                />
                {event.priceInfo && (
                  <p className="text-dark dark:text-night-muted mt-3 text-xs">
                    {event.priceInfo}
                  </p>
                )}
              </div>
            )}

            {event.isFree && <Tag>Eintritt frei</Tag>}

            <Link href="/termine" className={OUTLINE_BUTTON}>
              ← Zurück zur Übersicht
            </Link>
          </div>
        </div>
      </div>
    </PublicPage>
  );
}
