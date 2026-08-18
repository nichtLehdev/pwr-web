"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { RegistrationStatus } from "~/generated/prisma/enums";
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

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const registrationStatusBadge: Record<RegistrationStatus, string> = {
  CONFIRMED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  WAITLIST:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const registrationStatusLabel: Record<RegistrationStatus, string> = {
  CONFIRMED: "Bestätigt",
  WAITLIST: "Warteliste",
  CANCELLED: "Storniert",
};

export default function DashboardPage() {
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
    { page: 1, limit: 1, registrationStatus: RegistrationStatus.WAITLIST },
    { enabled: ready && canManageRegistrations },
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
      <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
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
    canApproveCourses || canApproveEvents || canApprovePosts;
  const pendingTotal =
    (pendingCourses?.total ?? 0) +
    (pendingEvents?.total ?? 0) +
    (pendingPosts?.total ?? 0);
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
    <main className="bg-background-secondary dark:bg-dark-background-secondary min-h-[calc(100vh-4rem)]">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-dark dark:text-dark-text text-3xl font-bold">
              Übersicht
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Willkommen zurück, {displayName}!
            </p>
          </div>
          {quickActions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="bg-primary hover:bg-primary-dark inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  {action.title}
                </Link>
              ))}
            </div>
          )}
        </div>

        {!hasAnyTile && (
          <div className="dark:bg-dark-surface mb-8 rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400">
              Nutze die Seitenleiste, um deine Bereiche zu verwalten.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Review queue */}
          {showReviewTile && (
            <OverviewTile
              title="Wartet auf Freigabe"
              icon={<ClipboardCheck className="text-primary h-5 w-5" />}
              badge={
                pendingTotal > 0 ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    {pendingTotal}
                  </span>
                ) : null
              }
            >
              {pendingTotal === 0 ? (
                <div className="flex items-center gap-2 py-2 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Alles erledigt — nichts wartet auf Freigabe.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
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
                </ul>
              )}
            </OverviewTile>
          )}

          {/* Upcoming courses */}
          {showCoursesTile && (
            <OverviewTile
              title="Kommende Kurse"
              icon={<GraduationCap className="text-primary h-5 w-5" />}
              footer={{ label: "Alle Kurse", href: "/dashboard/courses" }}
            >
              <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {upcomingCourses?.courses.map((course) => (
                  <li
                    key={course.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/courses/${course.id}`}
                        className="text-dark dark:text-dark-text hover:text-primary block truncate text-sm font-medium"
                      >
                        {course.title}
                      </Link>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(course.startDate)}
                        {course.maxParticipants
                          ? ` · ${course._count.participants} / ${course.maxParticipants} Teilnehmer`
                          : ` · ${course._count.participants} Teilnehmer`}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/courses/${course.id}/participants`}
                      className="text-primary hover:text-primary-dark shrink-0 text-sm font-medium"
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
              icon={<Users className="text-primary h-5 w-5" />}
              footer={{
                label: "Alle Anmeldungen",
                href: "/dashboard/registrations",
              }}
            >
              {(latestRegistrations?.registrations.length ?? 0) === 0 ? (
                <p className="py-2 text-sm text-gray-500 dark:text-gray-400">
                  Noch keine Anmeldungen vorhanden.
                </p>
              ) : (
                <>
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {latestRegistrations?.registrations.map((registration) => (
                      <li
                        key={registration.id}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/dashboard/courses/${registration.course.id}/participants/${registration.id}`}
                            className="text-dark dark:text-dark-text hover:text-primary block truncate text-sm font-medium"
                          >
                            {registration.registrantFirstName}{" "}
                            {registration.registrantLastName}
                          </Link>
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {registration.course.title} ·{" "}
                            {formatDate(registration.createdAt)}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${registrationStatusBadge[registration.registrationStatus]}`}
                        >
                          {
                            registrationStatusLabel[
                              registration.registrationStatus
                            ]
                          }
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-4 border-t border-gray-100 pt-3 text-sm dark:border-gray-700/60">
                    <span className="text-gray-600 dark:text-gray-400">
                      Offene Zahlungen:{" "}
                      <strong className="text-dark dark:text-dark-text">
                        {openPayments?.total ?? 0}
                      </strong>
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      Warteliste:{" "}
                      <strong className="text-dark dark:text-dark-text">
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
              icon={<Mail className="text-primary h-5 w-5" />}
              footer={{
                label: "Newsletter erstellen",
                href: "/dashboard/newsletter/compose",
              }}
            >
              <div className="flex items-baseline gap-2 py-2">
                <span className="text-dark dark:text-dark-text text-3xl font-bold">
                  {newsletterStats?.active ?? 0}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  aktive Abonnenten
                  {newsletterStats ? ` (${newsletterStats.total} gesamt)` : ""}
                </span>
              </div>
              <Link
                href="/dashboard/newsletter/subscribers"
                className="text-primary hover:text-primary-dark text-sm font-medium"
              >
                Abonnenten verwalten
              </Link>
            </OverviewTile>
          )}
        </div>

        {/* Quick Links */}
        <section className="mt-8">
          <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-dark dark:text-dark-text text-lg font-semibold">
                Schnellzugriff
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Häufig verwendete Links und Funktionen
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <QuickLink
                  title="Einstellungen"
                  href="/settings"
                  icon={<Settings className="h-4 w-4" />}
                />
                <QuickLink
                  title="Zur Webseite"
                  href="/"
                  icon={<Home className="h-4 w-4" />}
                />
                <QuickLink
                  title="Termine"
                  href="/termine"
                  icon={<Calendar className="h-4 w-4" />}
                />
                <QuickLink
                  title="Aktuelles"
                  href="/aktuelles"
                  icon={<FileText className="h-4 w-4" />}
                />
                <QuickLink
                  title="Über uns"
                  href="/ueber-uns"
                  icon={<Info className="h-4 w-4" />}
                />
                <QuickLink
                  title="Hilfe"
                  href="/kontakt"
                  icon={<HelpCircle className="h-4 w-4" />}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
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
    <section className="dark:bg-dark-surface flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h2 className="text-dark dark:text-dark-text flex items-center gap-2 text-lg font-semibold">
          {icon}
          {title}
        </h2>
        {badge}
      </div>
      <div className="flex-1 px-6 py-3">{children}</div>
      {footer && (
        <div className="border-t border-gray-100 px-6 py-3 dark:border-gray-700/60">
          <Link
            href={footer.href}
            className="text-primary hover:text-primary-dark inline-flex items-center gap-1 text-sm font-medium"
          >
            {footer.label}
            <ArrowRight className="h-4 w-4" />
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
        className="group flex items-center justify-between py-2.5"
      >
        <span className="text-dark dark:text-dark-text group-hover:text-primary text-sm font-medium">
          {label}
        </span>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          {count}
        </span>
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
      className="group hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition-all dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
    >
      <span className="group-hover:text-primary dark:group-hover:text-primary text-gray-400 transition-colors dark:text-gray-500">
        {icon}
      </span>
      {title}
    </Link>
  );
}
