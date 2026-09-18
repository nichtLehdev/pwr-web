"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import {
  RegistrationStatus,
  SiblingDiscountStatus,
} from "~/generated/prisma/enums";
import Link from "next/link";
import {
  Calendar,
  FileText,
  GraduationCap,
  Settings,
  Home,
  Info,
  HelpCircle,
  ArrowRight,
  Plus,
  CheckCircle2,
  ClipboardCheck,
  Users,
  Mail,
} from "lucide-react";
import { DashboardPage } from "@/app/_components/dashboard";
import { Tag, type TagTone } from "@/app/_components/programmheft/tag";
import { formatBerlin } from "@/lib/berlin-time";

function formatDate(date: Date | string): string {
  return formatBerlin(date, "datumZweistellig");
}

const registrationStatusTone: Record<RegistrationStatus, TagTone> = {
  CONFIRMED: "inverse",
  WAITLIST: "orange",
  CANCELLED: "cancelled",
};

const registrationStatusLabel: Record<RegistrationStatus, string> = {
  CONFIRMED: "Bestätigt",
  WAITLIST: "Warteliste",
  CANCELLED: "Storniert",
};

/** Gefüllte Werkbank-Schaltfläche, wie auf den Formularseiten des Hefts. */
const BTN_PRIMARY =
  "bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper semi-condensed inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold transition-colors";
/** Messing-Tinte-Textlink, immer unterstrichen — nie Orange als Textfarbe. */
const FOOTER_LINK = "link-ink inline-flex items-center gap-1 text-sm";

export default function DashboardPageRoute() {
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { hasDashboardAccess, hasPermission } = usePermissions();

  const ready = !!session?.user && !!profile;

  const canApproveCourses = hasPermission(PERMISSIONS.COURSES_APPROVE);
  const canApproveEvents = hasPermission(PERMISSIONS.EVENTS_APPROVE);
  const canApprovePosts = hasPermission(PERMISSIONS.POSTS_APPROVE);
  const canManageRegistrations = hasPermission(
    PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
  );
  const canManageNewsletter = hasPermission(PERMISSIONS.NEWSLETTER_MANAGE);
  const canManageSiblingDiscount = hasPermission(
    PERMISSIONS.REGISTRATIONS_MANAGE_SIBLING_DISCOUNT,
  );

  // Every tile query is gated on the permission its procedure enforces —
  // users without it neither see the tile nor fire the request.
  const { data: pendingCourses } = api.courses.getPendingReview.useQuery(
    { page: 1, limit: 1 },
    { enabled: ready && canApproveCourses },
  );
  const { data: pendingEvents } = api.events.getPendingReview.useQuery(
    { page: 1, limit: 1 },
    { enabled: ready && canApproveEvents },
  );
  const { data: pendingPosts } = api.posts.getPendingReview.useQuery(
    { page: 1, limit: 1 },
    { enabled: ready && canApprovePosts },
  );

  const { data: upcomingCourses } = api.courses.getDashboardCourses.useQuery(
    {
      page: 1,
      limit: 4,
      schedule: "active",
      sortBy: "startDate",
      sortOrder: "asc",
    },
    { enabled: ready },
  );

  const { data: latestRegistrations } = api.registrations.getAllAdmin.useQuery(
    { page: 1, limit: 5 },
    { enabled: ready && canManageRegistrations },
  );
  const { data: openPayments } = api.registrations.getAllAdmin.useQuery(
    { page: 1, limit: 1, paid: false },
    { enabled: ready && canManageRegistrations },
  );
  const { data: waitlisted } = api.registrations.getAllAdmin.useQuery(
    { page: 1, limit: 1, registrationStatus: [RegistrationStatus.WAITLIST] },
    { enabled: ready && canManageRegistrations },
  );
  // Geschwisterrabatte gehören in dieselbe Freigabe-Warteschlange wie Kurse,
  // Termine und Beiträge — und zwar für alle, die darüber entscheiden dürfen.
  // Die Abfrage ist auf den Rabattstatus eingegrenzt; genau dafür lässt
  // getAllAdmin auch die reine Rabattberechtigung zu.
  const { data: pendingDiscounts } = api.registrations.getAllAdmin.useQuery(
    {
      page: 1,
      limit: 1,
      siblingDiscountStatus: [SiblingDiscountStatus.PENDING],
    },
    { enabled: ready && (canManageRegistrations || canManageSiblingDiscount) },
  );

  const { data: newsletterStats } = api.newsletter.getStatistics.useQuery(
    undefined,
    { enabled: ready && canManageNewsletter },
  );

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/login?callbackUrl=/dashboard");
    }
  }, [isPending, session]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !hasDashboardAccess &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      redirect("/");
    }
  }, [profile, profileLoading, hasDashboardAccess]);

  if (isPending || profileLoading) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !hasDashboardAccess) {
    return null;
  }

  const displayName =
    profile?.displayName ??
    profile?.firstName ??
    session.user.name?.split(" ")[0] ??
    "User";

  const showReviewTile =
    canApproveCourses ||
    canApproveEvents ||
    canApprovePosts ||
    canManageRegistrations ||
    canManageSiblingDiscount;
  const pendingTotal =
    (pendingCourses?.total ?? 0) +
    (pendingEvents?.total ?? 0) +
    (pendingPosts?.total ?? 0) +
    (pendingDiscounts?.total ?? 0);
  const showCoursesTile = (upcomingCourses?.courses.length ?? 0) > 0;
  const showRegistrationsTile = canManageRegistrations;
  const showNewsletterTile = canManageNewsletter;
  const hasAnyTile =
    showReviewTile ||
    showCoursesTile ||
    showRegistrationsTile ||
    showNewsletterTile;

  const quickActions = [
    hasPermission(PERMISSIONS.EVENTS_CREATE) && {
      title: "Neuer Termin",
      href: "/dashboard/events/new",
    },
    hasPermission(PERMISSIONS.COURSES_CREATE) && {
      title: "Neuer Kurs",
      href: "/dashboard/courses/new",
    },
    hasPermission(PERMISSIONS.POSTS_CREATE) && {
      title: "Neuer Beitrag",
      href: "/dashboard/posts/new",
    },
  ].filter(Boolean) as { title: string; href: string }[];

  return (
    <DashboardPage
      title="Übersicht"
      description={`Willkommen zurück, ${displayName}!`}
      breadcrumbs={[{ label: "Dashboard" }]}
      actions={
        quickActions.length > 0 ? (
          <>
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={BTN_PRIMARY}
              >
                <Plus className="h-4 w-4" aria-hidden />
                {action.title}
              </Link>
            ))}
          </>
        ) : undefined
      }
    >
      {!hasAnyTile && (
        <div className="border-rule dark:border-night-rule border p-8 text-center">
          <p className="text-dark dark:text-night-muted text-sm">
            Nutze die Seitenleiste, um deine Bereiche zu verwalten.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Review queue */}
        {showReviewTile && (
          <OverviewTile
            title="Wartet auf Freigabe"
            icon={<ClipboardCheck className="h-5 w-5" aria-hidden />}
            badge={
              pendingTotal > 0 ? <Tag tone="orange">{pendingTotal}</Tag> : null
            }
          >
            {pendingTotal === 0 ? (
              <div className="dark:text-night-text text-ink flex items-center gap-2 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Alles erledigt — nichts wartet auf Freigabe.
              </div>
            ) : (
              <ul className="divide-rule dark:divide-night-rule divide-y">
                {canApproveCourses && (pendingCourses?.total ?? 0) > 0 && (
                  <ReviewRow
                    label="Kurse"
                    count={pendingCourses?.total ?? 0}
                    href="/dashboard/courses"
                  />
                )}
                {canApproveEvents && (pendingEvents?.total ?? 0) > 0 && (
                  <ReviewRow
                    label="Termine"
                    count={pendingEvents?.total ?? 0}
                    href="/dashboard/events"
                  />
                )}
                {canApprovePosts && (pendingPosts?.total ?? 0) > 0 && (
                  <ReviewRow
                    label="Beiträge"
                    count={pendingPosts?.total ?? 0}
                    href="/dashboard/posts"
                  />
                )}
                {(canManageRegistrations || canManageSiblingDiscount) &&
                  (pendingDiscounts?.total ?? 0) > 0 && (
                    <ReviewRow
                      label="Geschwisterrabatte"
                      count={pendingDiscounts?.total ?? 0}
                      href={`/dashboard/registrations?discount=${SiblingDiscountStatus.PENDING}`}
                    />
                  )}
              </ul>
            )}
          </OverviewTile>
        )}

        {/* Upcoming courses */}
        {showCoursesTile && (
          <OverviewTile
            title="Kommende Kurse"
            icon={<GraduationCap className="h-5 w-5" aria-hidden />}
            footer={{ label: "Alle Kurse", href: "/dashboard/courses" }}
          >
            <ul className="divide-rule dark:divide-night-rule divide-y">
              {upcomingCourses?.courses.map((course) => (
                <li
                  key={course.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/courses/${course.id}`}
                      className="text-ink dark:text-night-text block truncate text-sm font-medium hover:underline"
                    >
                      {course.title}
                    </Link>
                    <p className="text-dark dark:text-night-muted text-xs">
                      {formatDate(course.startDate)}
                      {course.maxParticipants
                        ? ` · ${course._count.participants} / ${course.maxParticipants} Teilnehmer`
                        : ` · ${course._count.participants} Teilnehmer`}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/courses/${course.id}/participants`}
                    className={`${FOOTER_LINK} shrink-0`}
                  >
                    Teilnehmer
                  </Link>
                </li>
              ))}
            </ul>
          </OverviewTile>
        )}

        {/* Latest registrations */}
        {showRegistrationsTile && (
          <OverviewTile
            title="Neueste Anmeldungen"
            icon={<Users className="h-5 w-5" aria-hidden />}
            footer={{
              label: "Alle Anmeldungen",
              href: "/dashboard/registrations",
            }}
          >
            {(latestRegistrations?.registrations.length ?? 0) === 0 ? (
              <p className="text-dark dark:text-night-muted py-2 text-sm">
                Noch keine Anmeldungen vorhanden.
              </p>
            ) : (
              <>
                <ul className="divide-rule dark:divide-night-rule divide-y">
                  {latestRegistrations?.registrations.map((registration) => (
                    <li
                      key={registration.id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/courses/${registration.course.id}/participants/${registration.id}`}
                          className="text-ink dark:text-night-text block truncate text-sm font-medium hover:underline"
                        >
                          {registration.registrantFirstName}{" "}
                          {registration.registrantLastName}
                        </Link>
                        <p className="text-dark dark:text-night-muted truncate text-xs">
                          {registration.course.title} ·{" "}
                          {formatDate(registration.createdAt)}
                        </p>
                      </div>
                      <Tag
                        tone={
                          registrationStatusTone[
                            registration.registrationStatus
                          ]
                        }
                        className="shrink-0"
                      >
                        {
                          registrationStatusLabel[
                            registration.registrationStatus
                          ]
                        }
                      </Tag>
                    </li>
                  ))}
                </ul>
                <div className="border-rule dark:border-night-rule mt-3 flex flex-wrap gap-4 border-t pt-3 text-sm">
                  <span className="text-dark dark:text-night-muted">
                    Offene Zahlungen:{" "}
                    <strong className="text-ink dark:text-night-text">
                      {openPayments?.total ?? 0}
                    </strong>
                  </span>
                  <span className="text-dark dark:text-night-muted">
                    Warteliste:{" "}
                    <strong className="text-ink dark:text-night-text">
                      {waitlisted?.total ?? 0}
                    </strong>
                  </span>
                </div>
              </>
            )}
          </OverviewTile>
        )}

        {/* Newsletter */}
        {showNewsletterTile && (
          <OverviewTile
            title="Newsletter"
            icon={<Mail className="h-5 w-5" aria-hidden />}
            footer={{
              label: "Newsletter erstellen",
              href: "/dashboard/newsletter/compose",
            }}
          >
            <div className="flex items-baseline gap-2 py-2">
              <span className="text-ink dark:text-night-text text-3xl font-bold">
                {newsletterStats?.active ?? 0}
              </span>
              <span className="text-dark dark:text-night-muted text-sm">
                aktive Abonnenten
                {newsletterStats ? ` (${newsletterStats.total} gesamt)` : ""}
              </span>
            </div>
            <Link
              href="/dashboard/newsletter/subscribers"
              className={FOOTER_LINK}
            >
              Abonnenten verwalten
            </Link>
          </OverviewTile>
        )}
      </div>

      {/* Quick Links */}
      <section className="border-rule dark:border-night-rule mt-6 border">
        <div className="border-rule dark:border-night-rule border-b px-4 py-3 sm:px-6">
          <h2 className="condensed text-ink dark:text-night-text text-lg font-bold">
            Schnellzugriff
          </h2>
          <p className="text-dark dark:text-night-muted mt-1 text-sm">
            Häufig verwendete Links und Funktionen
          </p>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <QuickLink
              title="Einstellungen"
              href="/settings"
              icon={<Settings className="h-4 w-4" aria-hidden />}
            />
            <QuickLink
              title="Zur Webseite"
              href="/"
              icon={<Home className="h-4 w-4" aria-hidden />}
            />
            <QuickLink
              title="Termine"
              href="/termine"
              icon={<Calendar className="h-4 w-4" aria-hidden />}
            />
            <QuickLink
              title="Aktuelles"
              href="/aktuelles"
              icon={<FileText className="h-4 w-4" aria-hidden />}
            />
            <QuickLink
              title="Über uns"
              href="/ueber-uns"
              icon={<Info className="h-4 w-4" aria-hidden />}
            />
            <QuickLink
              title="Hilfe"
              href="/kontakt"
              icon={<HelpCircle className="h-4 w-4" aria-hidden />}
            />
          </div>
        </div>
      </section>
    </DashboardPage>
  );
}

function OverviewTile({
  title,
  icon,
  badge,
  footer,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  footer?: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <section className="border-rule dark:border-night-rule flex flex-col border">
      <div className="border-rule dark:border-night-rule flex items-center justify-between border-b px-4 py-3 sm:px-6">
        <h2 className="condensed text-ink dark:text-night-text flex items-center gap-2 text-base font-bold sm:text-lg">
          {icon}
          {title}
        </h2>
        {badge}
      </div>
      <div className="flex-1 px-4 py-3 sm:px-6">{children}</div>
      {footer && (
        <div className="border-rule dark:border-night-rule border-t px-4 py-3 sm:px-6">
          <Link href={footer.href} className={FOOTER_LINK}>
            {footer.label}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      )}
    </section>
  );
}

function ReviewRow({
  label,
  count,
  href,
}: {
  label: string;
  count: number;
  href: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex min-h-11 items-center justify-between gap-3 py-2.5"
      >
        <span className="text-ink dark:text-night-text text-sm font-medium group-hover:underline">
          {label}
        </span>
        <Tag tone="orange">{count}</Tag>
      </Link>
    </li>
  );
}

function QuickLink({
  title,
  href,
  icon,
}: {
  title: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group border-rule dark:border-night-rule hover:border-ink dark:hover:border-night-text hover:bg-rule/25 dark:hover:bg-night-raised text-ink dark:text-night-text flex min-h-11 items-center gap-2 border px-3 py-2.5 text-sm font-medium transition-colors"
    >
      <span className="text-dark dark:text-night-muted group-hover:text-primary-ink dark:group-hover:text-primary transition-colors">
        {icon}
      </span>
      {title}
    </Link>
  );
}
