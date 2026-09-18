"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import type { PermissionKey } from "@/lib/permissions";
import type { RouterOutputs } from "@/trpc/react";
import { renderDescriptionHtml } from "@/lib/sanitize";
import { markdownToSingleLine } from "@/lib/markdown-to-plain-text";
import { isRegistrationDeadlinePassed } from "@/lib/registration-deadline";
import { calendarDaysInclusive } from "@/lib/format-date-range";
import { formatAvailableSlots } from "@/lib/format-available-slots";
import PublicPage from "../general/public-page";
import { BezirkLabel } from "@/app/_components/programmheft/bezirk-label";
import { headMeta } from "@/app/_components/programmheft/page-head";
import { Tag } from "@/app/_components/programmheft/tag";
import { Note } from "@/app/_components/programmheft/note";
import { Panel } from "@/app/_components/programmheft/panel";
import { ButtonLink } from "@/app/_components/programmheft/button-link";
import { ValueTable } from "@/app/_components/programmheft/value-table";
import { Heading } from "@/app/_components/programmheft/section-head";
import {
  PersonList,
  PersonRow,
} from "@/app/_components/programmheft/person-row";
import { courseTypeLabel } from "@/lib/termine-labels";
import { TerminBeschreibung } from "./termin-bild";
import PublicShareButton from "@/app/_components/general/public-share-button";
import {
  Clock,
  Calendar,
  CalendarArrowDownIcon,
  MapPin,
  Users,
  Wallet,
  EditIcon,
} from "lucide-react";
import { formatAcceptedCoursePaymentMethods } from "@/lib/course-payment-methods";
import {
  courseHasDownPayment,
  downPaymentForPriceOption,
  downPaymentRefundNotice,
} from "@/lib/course-down-payment";
import { formatEuro } from "@/lib/invoice-document";
import { isExternalCourse } from "@/lib/course-external";
import { priceOptionAgeLabel } from "@/lib/course-price-option-age";
import { coursePath, courseRegistrationPath } from "@/lib/slug";
import LocationNavigationLink from "@/app/_components/general/location-navigation-link";
import { cn } from "@/lib/utils";
import { formatBerlin, isSameBerlinDay } from "@/lib/berlin-time";

type CourseWithRelations = RouterOutputs["courses"]["getById"];
type CourseSpots = RouterOutputs["courses"]["getAvailableSlots"];

interface CourseDetailViewProps {
  course: CourseWithRelations;
  spots: CourseSpots;
}

function formatCourseSchedule(course: {
  startDate: Date;
  endDate: Date;
}): string {
  const start = new Date(course.startDate);
  const end = new Date(course.endDate);
  const sameDay = isSameBerlinDay(start, end);
  if (sameDay) {
    return `${formatBerlin(start, "datumMitWochentag")}, ${formatBerlin(start, "uhrzeit")} – ${formatBerlin(end, "uhrzeit")} Uhr`;
  }
  return `${formatBerlin(start, "tagMonat")} – ${formatBerlin(end, "datumLang")}`;
}

/** Outline-Schaltfläche für nicht-navigierende Aktionen (ICS-Download). */
const OUTLINE_BUTTON =
  "semi-condensed border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night inline-flex min-h-12 w-full items-center justify-center gap-2 border-2 px-4 text-base font-semibold transition-colors";

export default function CourseDetailView({
  course,
  spots,
}: CourseDetailViewProps) {
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
    "courses.edit" as PermissionKey,
    "courses.approve" as PermissionKey,
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
  const isDeadlinePassed = isRegistrationDeadlinePassed(registrationDeadline);
  const isRegistrationNotOpenYet =
    registrationOpensAt && registrationOpensAt > new Date();

  const isSameDay = isSameBerlinDay(startDate, endDate);
  const durationDays = calendarDaysInclusive(startDate, endDate);

  const isExternal = isExternalCourse(course);

  const canRegister =
    course.registrationOpen &&
    !isPast &&
    !isDeadlinePassed &&
    !isRegistrationNotOpenYet &&
    (isExternal || !spots.isFull || course.allowWaitingList);

  const handleDownloadIcs = () => {
    // Server-generated single-item ICS: proper escaping, description, URL
    window.location.href = `/api/feed/ical?courseId=${course.id}`;
  };

  const anmeldenHref = isExternal
    ? (course.externalRegistrationUrl ?? coursePath(course))
    : courseRegistrationPath(course);

  const locationLine =
    course.location &&
    [course.location.name, course.location.city].filter(Boolean).join(", ");

  // Deadline beats seat count: a course you can no longer register for must
  // not advertise "Plätze verfügbar" in the hero.
  const capacityMeta =
    isPast || isExternal
      ? null
      : isDeadlinePassed
        ? "Anmeldung geschlossen"
        : spots.isFull && course.allowWaitingList
          ? "Warteliste"
          : formatAvailableSlots(spots.availableSlots, spots.totalCapacity);

  const acceptedPaymentHero = formatAcceptedCoursePaymentMethods(course);

  const heroDescription = (
    <div className="space-y-4">
      {course.motto ? (
        <p className="semi-condensed text-xl leading-snug font-medium">
          {course.motto}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className={headMeta.label}>
          {courseTypeLabel(course.courseType)}
        </span>
        {course.bezirk && (
          <span className={headMeta.label}>
            <BezirkLabel bezirk={course.bezirk} />
          </span>
        )}
        {!isSameDay && (
          <span className={headMeta.label}>
            {durationDays} {durationDays === 1 ? "Tag" : "Tage"}
          </span>
        )}
        {isPast && <Tag>Vergangen</Tag>}
        {!isExternal && spots.isFull && !course.allowWaitingList && (
          <Tag>Ausgebucht</Tag>
        )}
        {!isExternal && spots.isFull && course.allowWaitingList && (
          <Tag tone="orange">Nur Warteliste</Tag>
        )}
        {canEdit && (
          <Link
            href={`/dashboard/courses/${course.id}/edit`}
            className={headMeta.action}
          >
            <EditIcon className="h-4 w-4 shrink-0" aria-hidden />
            Bearbeiten
          </Link>
        )}
        <PublicShareButton
          title={course.title}
          /* Klartext, siehe event-detail-view. */
          text={
            course.motto ||
            markdownToSingleLine(course.description) ||
            course.title
          }
          className={headMeta.action}
        />
      </div>
      <div className={headMeta.line}>
        <span className="flex items-center gap-2">
          <Calendar className={headMeta.icon} aria-hidden />
          {formatCourseSchedule(course)}
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
        {!isPast && capacityMeta ? (
          <>
            <span className={headMeta.separator} aria-hidden>
              ·
            </span>
            <span className="flex items-center gap-2">
              <Users className={headMeta.icon} aria-hidden />
              {capacityMeta}
            </span>
          </>
        ) : null}
        {!isExternal && !course.isFree && acceptedPaymentHero ? (
          <>
            <span className={headMeta.separator} aria-hidden>
              ·
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <Wallet className={headMeta.icon} aria-hidden />
              <span className="truncate">{acceptedPaymentHero}</span>
            </span>
          </>
        ) : null}
      </div>
      {(registrationOpensAt && isRegistrationNotOpenYet) ||
      (registrationDeadline && !isPast) ? (
        <div className={headMeta.line}>
          {registrationOpensAt && isRegistrationNotOpenYet && (
            <span className="flex items-center gap-2">
              <Clock className={headMeta.icon} aria-hidden />
              Anmeldung ab:{" "}
              {formatBerlin(
                registrationOpensAt,
                "datumLangZweistelligUhrzeit",
              )}{" "}
              Uhr
            </span>
          )}
          {registrationDeadline && !isPast ? (
            <>
              {registrationOpensAt && isRegistrationNotOpenYet ? (
                <span className={headMeta.separator} aria-hidden>
                  ·
                </span>
              ) : null}
              <span className="flex items-center gap-2">
                <Clock className={headMeta.icon} aria-hidden />
                Anmeldeschluss:{" "}
                {formatBerlin(registrationDeadline, "datumLangZweistellig")}
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
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Termine", href: "/termine" },
        { label: course.title },
      ]}
      heroSize="compact"
      description={heroDescription}
    >
      <div className="sheet py-10 md:py-14">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            {/* Bild in der Hauptspalte, in der Randspalte drückte es „Jetzt anmelden“ nach unten. */}
            <TerminBeschreibung
              image={course.image}
              fallbackAlt={course.title}
              html={renderDescriptionHtml(course.description)}
            />

            <div>
              <Heading as="h2" size="list" rule>
                Termin
              </Heading>
              <div className="mt-4 space-y-2">
                {isSameDay ? (
                  <>
                    <p className="text-ink dark:text-night-text text-lg font-semibold">
                      {formatBerlin(startDate, "datumMitWochentag")}
                    </p>
                    <p className="text-dark dark:text-night-muted">
                      {formatBerlin(startDate, "uhrzeit")} -{" "}
                      {formatBerlin(endDate, "uhrzeit")} Uhr
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-ink dark:text-night-text text-lg font-semibold">
                      {formatBerlin(startDate, "tagMonat")} -{" "}
                      {formatBerlin(endDate, "datumLang")}
                    </p>
                    <p className="text-dark dark:text-night-muted">
                      {durationDays} {durationDays === 1 ? "Tag" : "Tage"}
                    </p>
                  </>
                )}
                {registrationOpensAt && isRegistrationNotOpenYet && (
                  <Note tone="info" className="mt-4">
                    <p className="font-semibold">Anmeldung öffnet am</p>
                    <p>
                      {formatBerlin(registrationOpensAt, "datumMitWochentag")}{" "}
                      um {formatBerlin(registrationOpensAt, "uhrzeit")} Uhr
                    </p>
                  </Note>
                )}
              </div>
              <button
                onClick={handleDownloadIcs}
                className={cn(OUTLINE_BUTTON, "mt-4 sm:w-auto")}
              >
                <CalendarArrowDownIcon className="h-5 w-5" aria-hidden />
                Zum Kalender hinzufügen (ICS)
              </button>
            </div>

            {course.location && (
              <div>
                <Heading as="h2" size="list" rule>
                  Veranstaltungsort
                </Heading>
                <div className="mt-4 space-y-2">
                  {course.location.name && (
                    <p className="text-ink dark:text-night-text font-semibold">
                      {course.location.name}
                    </p>
                  )}
                  {course.location.street && (
                    <p className="text-dark dark:text-night-muted">
                      {course.location.street}
                    </p>
                  )}
                  <p className="text-dark dark:text-night-muted">
                    {course.location.zipCode && `${course.location.zipCode} `}
                    {course.location.city}
                  </p>
                  {course.location.additionalInfo && (
                    <p className="text-dark dark:text-night-muted mt-2 text-sm">
                      {course.location.additionalInfo}
                    </p>
                  )}
                  <LocationNavigationLink location={course.location} />
                </div>
              </div>
            )}

            {course.prerequisites && (
              <Note tone="important" title="Voraussetzungen" titleAs="h3">
                <p>{course.prerequisites}</p>
              </Note>
            )}

            {course.whatToBring && (
              <div>
                <Heading as="h2" size="list" rule>
                  Mitzubringen
                </Heading>
                <p className="text-ink dark:text-night-text mt-4">
                  {course.whatToBring}
                </p>
              </div>
            )}

            {/* Kurs-Team (öffentlich): Konten + freie Namen */}
            {((course.collaborators?.length ?? 0) > 0 ||
              (course.guestTeamMembers?.length ?? 0) > 0) && (
              <div>
                <Heading as="h2" size="list" rule>
                  Kurs-Team
                </Heading>
                <PersonList columns={2} className="mt-4">
                  {course.collaborators?.map((entry) => (
                    <PersonRow
                      key={entry.user.id}
                      name={entry.user.displayName ?? ""}
                      role={entry.user.bio}
                      image={entry.user.profileImage}
                    />
                  ))}
                  {course.guestTeamMembers?.map((row) => (
                    <PersonRow
                      key={row.id}
                      name={row.displayName}
                      role={row.bio}
                    />
                  ))}
                </PersonList>
              </div>
            )}
          </div>

          {/* `sticky-below-nav` statt `lg:top-24`: rechnet Banner- und Navigationshöhe zur Laufzeit. */}
          <div className="sticky-below-nav space-y-8 lg:sticky lg:self-start">
            {canRegister && (
              <Panel labelledBy="anmeldung-heading">
                <Heading as="h3" id="anmeldung-heading" size="list">
                  Anmeldung
                </Heading>

                {isExternal ? (
                  <p className="text-dark dark:text-night-muted mt-4 text-sm">
                    {course.externalProviderName
                      ? `Die Anmeldung erfolgt über ${course.externalProviderName}.`
                      : "Die Anmeldung erfolgt über einen externen Anbieter."}
                  </p>
                ) : spots.isFull && course.allowWaitingList ? (
                  <p className="text-ink dark:text-night-text mt-4 text-sm font-semibold">
                    Der Kurs ist ausgebucht. Sie können sich auf die Warteliste
                    setzen lassen.
                  </p>
                ) : (
                  <p className="text-dark dark:text-night-muted mt-4 text-sm">
                    {formatAvailableSlots(
                      spots.availableSlots,
                      spots.totalCapacity,
                    )}
                  </p>
                )}

                {isExternal ? (
                  <ButtonLink
                    href={anmeldenHref}
                    kind="external"
                    className="mt-4 w-full justify-center"
                  >
                    Zur Anmeldung
                  </ButtonLink>
                ) : (
                  <>
                    <ButtonLink
                      href={anmeldenHref}
                      className="mt-4 w-full justify-center"
                    >
                      {spots.isFull && course.allowWaitingList
                        ? "Auf Warteliste setzen"
                        : "Jetzt anmelden"}
                    </ButtonLink>
                    {existingRegistration && (
                      <Link
                        href={`/registrations/${existingRegistration.id}/edit`}
                        className={cn(OUTLINE_BUTTON, "mt-3")}
                      >
                        <EditIcon className="h-4 w-4 shrink-0" aria-hidden />
                        Bestehende Anmeldung bearbeiten
                      </Link>
                    )}
                  </>
                )}

                {registrationDeadline && !isDeadlinePassed && (
                  <p className="text-dark dark:text-night-muted mt-3 text-center text-xs">
                    Anmeldung bis {formatBerlin(registrationDeadline)} möglich
                  </p>
                )}
              </Panel>
            )}

            {!canRegister && !isPast && (
              <Panel labelledBy="anmeldung-geschlossen-heading">
                <Heading as="h3" id="anmeldung-geschlossen-heading" size="list">
                  Anmeldung
                </Heading>
                <p className="text-ink dark:text-night-text mt-4 font-semibold">
                  {isRegistrationNotOpenYet
                    ? "Anmeldung noch nicht geöffnet"
                    : isDeadlinePassed
                      ? "Anmeldefrist abgelaufen"
                      : !isExternal && spots.isFull && !course.allowWaitingList
                        ? "Kurs ausgebucht"
                        : "Anmeldung geschlossen"}
                </p>
                <p className="text-dark dark:text-night-muted mt-1 text-sm">
                  {isRegistrationNotOpenYet
                    ? `Die Anmeldung für diesen Kurs öffnet am ${formatBerlin(registrationOpensAt, "datumLangZweistelligUhrzeit")} Uhr. Die Kursdetails sind bereits verfügbar.`
                    : isDeadlinePassed && registrationDeadline
                      ? `Die Anmeldefrist für diesen Kurs ist am ${formatBerlin(registrationDeadline)} abgelaufen.`
                      : !isExternal && spots.isFull && !course.allowWaitingList
                        ? "Alle Plätze sind belegt und es gibt keine Warteliste."
                        : "Die Anmeldung für diesen Kurs ist derzeit nicht möglich."}
                </p>
              </Panel>
            )}

            {!isExternal || course.priceInfo ? (
              <div>
                <Heading as="h3" size="list" rule>
                  {isExternal
                    ? "Kosten"
                    : course.isFree
                      ? "Kostenlos"
                      : "Preise"}
                </Heading>
                {!isExternal &&
                  (course.isFree ? (
                    <p className="mt-4">
                      <Tag>Dieser Kurs ist kostenfrei</Tag>
                    </p>
                  ) : (
                    <ValueTable
                      className="mt-4"
                      rows={course.priceOptions.map((option, idx) => {
                        const ageRange = priceOptionAgeLabel(option);
                        const downPayment =
                          course.downPaymentMode === "TICKET"
                            ? downPaymentForPriceOption(course, option.id)
                            : 0;
                        return {
                          label: (
                            <span key={idx}>
                              {option.label}
                              {option.description && (
                                <span className="text-dark dark:text-night-muted block text-xs">
                                  {option.description}
                                </span>
                              )}
                              {ageRange && (
                                <span className="text-dark dark:text-night-muted block text-xs">
                                  {ageRange} — Alter am ersten Kurstag
                                </span>
                              )}
                            </span>
                          ),
                          value: (
                            <span className="block">
                              {formatEuro(option.price)}
                              {downPayment > 0 && (
                                <span className="text-dark dark:text-night-muted mt-1 block text-xs font-normal normal-case">
                                  davon {formatEuro(downPayment)} Anzahlung
                                </span>
                              )}
                            </span>
                          ),
                        };
                      })}
                    />
                  ))}
                {course.priceInfo && (
                  <p
                    className={
                      isExternal || course.isFree
                        ? "text-dark dark:text-night-muted mt-3 text-sm"
                        : "text-dark dark:text-night-muted mt-3 text-xs"
                    }
                  >
                    {course.priceInfo}
                  </p>
                )}
                {!isExternal &&
                  !course.isFree &&
                  formatAcceptedCoursePaymentMethods(course) && (
                    <div className="border-rule dark:border-night-rule mt-4 border-t pt-4">
                      <p className={headMeta.label}>Zahlung</p>
                      <p className="text-ink dark:text-night-text mt-1 flex gap-2 text-sm">
                        <Wallet
                          className="text-dark dark:text-night-muted h-4 w-4 shrink-0"
                          aria-hidden
                        />
                        {formatAcceptedCoursePaymentMethods(course)}
                      </p>
                      {/* Schon vor „Jetzt anmelden“: ob und wie eine Anzahlung fällig wird. */}
                      {courseHasDownPayment(course) && (
                        <Note tone="info" className="mt-3">
                          <p>
                            {course.downPaymentMode === "COURSE" &&
                            course.downPaymentAmount
                              ? `Bei der Anmeldung wird eine Anzahlung von ${formatEuro(course.downPaymentAmount)} pro Teilnehmer per Überweisung fällig.`
                              : "Bei der Anmeldung wird je nach Preiskategorie eine Anzahlung per Überweisung fällig (siehe oben)."}{" "}
                            Der Restbetrag folgt mit der Rechnung.
                          </p>
                          {downPaymentRefundNotice(course) && (
                            <p className="mt-1 text-sm">
                              {downPaymentRefundNotice(course)}
                            </p>
                          )}
                        </Note>
                      )}
                    </div>
                  )}
              </div>
            ) : null}

            <Link href="/termine" className={OUTLINE_BUTTON}>
              ← Zurück zur Übersicht
            </Link>
          </div>
        </div>
      </div>
    </PublicPage>
  );
}
