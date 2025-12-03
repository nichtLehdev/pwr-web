"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import { UserRole } from "~/generated/prisma/enums";

// Roles that have access to the dashboard
const DASHBOARD_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.LPW,
  UserRole.RPW,
  UserRole.OBLEUTE,
];

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);

  // Fetch user profile for extended fields
  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/login?callbackUrl=/dashboard");
    }
  }, [isPending, session]);

  // Redirect if user doesn't have dashboard access
  useEffect(() => {
    if (!profileLoading && profile && !hasRedirected.current) {
      if (!DASHBOARD_ROLES.includes(profile.role)) {
        hasRedirected.current = true;
        redirect("/");
      }
    }
  }, [profile, profileLoading]);

  if (isPending || profileLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !DASHBOARD_ROLES.includes(profile.role)) {
    return null;
  }

  // Get display name from profile or fall back to session name
  const displayName =
    profile?.displayName ??
    profile?.firstName ??
    session.user.name?.split(" ")[0] ??
    "User";

  return (
    <main className="dark:bg-dark-background min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
            Dashboard
          </h1>
          <p className="dark:text-dark-muted mt-2 text-gray-600">
            Willkommen zurück, {displayName}!
          </p>
        </div>

        {/* Content Management */}
        <section className="mb-10">
          <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
            Inhalte
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
              title="Termine"
              description="Veranstaltungen verwalten"
              icon={<CalendarIcon />}
              href="/dashboard/events"
            />
            <DashboardCard
              title="Kurse"
              description="Kurse & Anmeldungen"
              icon={<AcademicCapIcon />}
              href="/dashboard/courses"
            />
            <DashboardCard
              title="Beiträge"
              description="News & Artikel"
              icon={<DocumentTextIcon />}
              href="/dashboard/posts"
            />
            <DashboardCard
              title="Geschichte"
              description="Historische Ereignisse"
              icon={<ClockIcon />}
              href="/dashboard/history"
              comingSoon
            />
          </div>
        </section>

        {/* Organization - Admin/LPW only */}
        {(profile.role === UserRole.ADMIN || profile.role === UserRole.LPW) && (
          <section className="mb-10">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Organisation
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DashboardCard
                title="Bezirke"
                description="Bezirke & Regionen"
                icon={<MapIcon />}
                href="/dashboard/bezirke"
                comingSoon
              />
              <DashboardCard
                title="Ensembles"
                description="Bläsergruppen"
                icon={<UsersIcon />}
                href="/dashboard/ensembles"
                comingSoon
              />
              <DashboardCard
                title="Auswahlchöre"
                description="Auswahlchöre verwalten"
                icon={<MusicNoteIcon />}
                href="/dashboard/auswahlchoere"
                comingSoon
              />
              <DashboardCard
                title="Veranstaltungsorte"
                description="Locations verwalten"
                icon={<LocationMarkerIcon />}
                href="/dashboard/locations"
                comingSoon
              />
            </div>
          </section>
        )}

        {/* People - Admin only */}
        {profile.role === UserRole.ADMIN && (
          <section className="mb-10">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Personen & Gremien
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DashboardCard
                title="Benutzer"
                description="Benutzerkonten verwalten"
                icon={<UserIcon />}
                href="/dashboard/users"
              />
              <DashboardCard
                title="Vorstand"
                description="Vorstandsmitglieder"
                icon={<UserGroupIcon />}
                href="/dashboard/vorstand"
              />
              <DashboardCard
                title="Team"
                description="Teammitglieder"
                icon={<UsersIcon />}
                href="/dashboard/team"
              />
              <DashboardCard
                title="Posaunenrat"
                description="Posaunenratsmitglieder"
                icon={<BadgeCheckIcon />}
                href="/dashboard/posaunenrat"
              />
              <DashboardCard
                title="Förderverein"
                description="Fördervereins-Mitglieder"
                icon={<HeartIcon />}
                href="/dashboard/foerderverein"
              />
              <DashboardCard
                title="Posaunenwarte"
                description="LPW & RPW verwalten"
                icon={<MusicNoteIcon />}
                href="/dashboard/posaunenwarte"
              />
            </div>
          </section>
        )}

        {/* Media & Resources - Admin/LPW only */}
        {(profile.role === UserRole.ADMIN || profile.role === UserRole.LPW) && (
          <section className="mb-10">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Medien & Ressourcen
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DashboardCard
                title="Medien"
                description="Bilder & Dateien"
                icon={<PhotographIcon />}
                href="/dashboard/media"
              />
              <DashboardCard
                title="Downloads"
                description="Downloadbare Dateien"
                icon={<DownloadIcon />}
                href="/dashboard/downloads"
              />
              <DashboardCard
                title="Bläserhefte"
                description="Notenhefte verwalten"
                icon={<BookOpenIcon />}
                href="/dashboard/blaeserhefte"
                comingSoon
              />
              {profile.role === UserRole.ADMIN && (
                <DashboardCard
                  title="Newsletter"
                  description="Abonnenten verwalten"
                  icon={<MailIcon />}
                  href="/dashboard/newsletter"
                  comingSoon
                />
              )}
            </div>
          </section>
        )}

        {/* Quick Links */}
        <section className="dark:border-dark-border border-t border-gray-200 pt-8">
          <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
            Schnellzugriff
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <QuickLink
              title="Einstellungen"
              href="/settings"
              icon={<CogIcon />}
            />
            <QuickLink title="Zur Webseite" href="/" icon={<HomeIcon />} />
            <QuickLink
              title="Termine"
              href="/termine"
              icon={<CalendarIcon />}
            />
            <QuickLink
              title="Aktuelles"
              href="/aktuelles"
              icon={<DocumentTextIcon />}
            />
            <QuickLink
              title="Über uns"
              href="/ueber-uns"
              icon={<InformationCircleIcon />}
            />
            <QuickLink
              title="Hilfe"
              href="/kontakt"
              icon={<QuestionMarkCircleIcon />}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function DashboardCard({
  title,
  description,
  icon,
  href,
  comingSoon = false,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  comingSoon?: boolean;
}) {
  const content = (
    <div
      className={`group dark:bg-dark-surface relative flex h-full flex-col rounded-xl border bg-white p-5 transition-all ${
        comingSoon
          ? "dark:border-dark-border cursor-not-allowed border-gray-200 opacity-60"
          : "hover:border-primary dark:border-dark-border dark:hover:border-primary border-gray-200 hover:shadow-lg"
      }`}
    >
      {comingSoon && (
        <span className="absolute top-2 right-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          Bald
        </span>
      )}
      <div
        className={`text-primary mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${
          comingSoon
            ? "dark:bg-dark-border bg-gray-100"
            : "bg-primary/10 group-hover:bg-primary group-hover:text-white"
        } transition-colors`}
      >
        {icon}
      </div>
      <h3 className="dark:text-dark-text font-semibold text-gray-900">
        {title}
      </h3>
      <p className="dark:text-dark-muted mt-1 text-sm text-gray-500">
        {description}
      </p>
    </div>
  );

  if (comingSoon) {
    return content;
  }

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
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
      className="hover:border-primary hover:text-primary dark:border-dark-border dark:bg-dark-surface dark:text-dark-text dark:hover:border-primary dark:hover:text-primary flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-all"
    >
      <span className="dark:text-dark-muted text-gray-400">{icon}</span>
      {title}
    </Link>
  );
}

// Icons
const CalendarIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const AcademicCapIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path d="M12 14l9-5-9-5-9 5 9 5z" />
    <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"
    />
  </svg>
);

const DocumentTextIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const ClockIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const MapIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
    />
  </svg>
);

const UsersIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

const UserIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

const MusicNoteIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
    />
  </svg>
);

const LocationMarkerIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const UserGroupIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
    />
  </svg>
);

const BadgeCheckIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
    />
  </svg>
);

const HeartIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
    />
  </svg>
);

const PhotographIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

const BookOpenIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
    />
  </svg>
);

const MailIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

const CogIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const HomeIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

const InformationCircleIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const QuestionMarkCircleIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
