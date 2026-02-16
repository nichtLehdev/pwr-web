"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import ExportImportSection from "@/app/_components/dashboard/export-import-section";
import {
  Calendar,
  GraduationCap,
  FileText,
  Clock,
  Map,
  Users,
  User,
  Music,
  MapPin,
  Settings,
  Home,
  Info,
  HelpCircle,
  BadgeCheck,
  Heart,
  ImageIcon,
  Download,
  BookOpen,
  Mail,
  Layout,
  BarChart3,
  Shield,
} from "lucide-react";

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });
  const { data: canViewStats } = api.stats.canViewStats.useQuery(undefined, {
    enabled: !!session?.user && !!profile,
  });
  const { data: canManagePermissions } = api.permissions.canManage.useQuery(
    undefined,
    {
      enabled: !!session?.user && !!profile,
    },
  );

  // Check if user has any dashboard permissions
  const { data: userPermissions } = api.permissions.getMyPermissions.useQuery(
    undefined,
    { enabled: !!session?.user?.id },
  );

  const hasDashboardAccess =
    Array.isArray(userPermissions) && userPermissions.length > 0;

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
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
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
            />
          </div>
        </section>

        {/* Organization - Users with manage permissions */}
        {canManagePermissions && (
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
              />
              <DashboardCard
                title="Ensembles"
                description="Bläsergruppen"
                icon={<UsersIcon />}
                href="/dashboard/ensembles"
              />
              <DashboardCard
                title="Auswahlchöre"
                description="Auswahlchöre verwalten"
                icon={<MusicNoteIcon />}
                href="/dashboard/auswahlchoere"
              />
              <DashboardCard
                title="Veranstaltungsorte"
                description="Locations verwalten"
                icon={<LocationMarkerIcon />}
                href="/dashboard/locations"
              />
            </div>
          </section>
        )}

        {/* People - Users with manage permissions */}
        {canManagePermissions && (
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

        {/* Media & Resources - Users with manage permissions */}
        {canManagePermissions && (
          <section className="mb-10">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Medien & Ressourcen
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DashboardCard
                title="Homepage"
                description="Homepage Bildkarussell"
                icon={<Layout />}
                href="/dashboard/homepage"
              />
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
              />
              {canManagePermissions && (
                <DashboardCard
                  title="Newsletter"
                  description="Abonnenten verwalten"
                  icon={<MailIcon />}
                  href="/dashboard/newsletter"
                />
              )}
            </div>
          </section>
        )}

        {/* Export & Import - Users with manage permissions */}
        {canManagePermissions && <ExportImportSection />}

        {/* Stats - only for hardcoded allowlist */}
        {canViewStats && (
          <section className="mb-10">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Statistik
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DashboardCard
                title="Statistik"
                description="Anonyme Seitenaufrufe"
                icon={<BarChart3 className="h-5 w-5" />}
                href="/dashboard/stats"
              />
            </div>
          </section>
        )}

        {/* System - only for hardcoded permission managers */}
        {canManagePermissions && (
          <section className="mb-10">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              System
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DashboardCard
                title="Berechtigungen"
                description="Rollen & Berechtigungen verwalten"
                icon={<Shield className="h-5 w-5" />}
                href="/dashboard/permissions"
              />
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

const CalendarIcon = () => <Calendar className="h-5 w-5" />;

const AcademicCapIcon = () => <GraduationCap className="h-5 w-5" />;

const DocumentTextIcon = () => <FileText className="h-5 w-5" />;

const ClockIcon = () => <Clock className="h-5 w-5" />;

const MapIcon = () => <Map className="h-5 w-5" />;

const UsersIcon = () => <Users className="h-5 w-5" />;

const UserIcon = () => <User className="h-5 w-5" />;

const MusicNoteIcon = () => <Music className="h-5 w-5" />;

const LocationMarkerIcon = () => <MapPin className="h-5 w-5" />;

const UserGroupIcon = () => <Users className="h-5 w-5" />;

const BadgeCheckIcon = () => <BadgeCheck className="h-5 w-5" />;

const HeartIcon = () => <Heart className="h-5 w-5" />;

const PhotographIcon = () => <ImageIcon className="h-5 w-5" />;

const DownloadIcon = () => <Download className="h-5 w-5" />;

const BookOpenIcon = () => <BookOpen className="h-5 w-5" />;

const MailIcon = () => <Mail className="h-5 w-5" />;

const CogIcon = () => <Settings className="h-4 w-4" />;

const HomeIcon = () => <Home className="h-4 w-4" />;

const InformationCircleIcon = () => <Info className="h-4 w-4" />;

const QuestionMarkCircleIcon = () => <HelpCircle className="h-4 w-4" />;
