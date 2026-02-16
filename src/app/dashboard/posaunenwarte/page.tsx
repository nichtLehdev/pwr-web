"use client";

import { useSession } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeftIcon, EditIcon, EyeIcon } from "lucide-react";
import { UserIcon, UsersIcon } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  LPW: "Landesposaunenwart",
  RPW: "Regionalposaunenwart",
};

export default function DashboardPosaunenwartenPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: canManageOrganization } = api.permissions.canManage.useQuery(
    undefined,
    { enabled: !!session?.user },
  );

  const { data: posaunenwarte, isLoading: posaunenwarteLoading } =
    api.organization.getPosaunenwarte.useQuery();

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/posaunenwarte");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !canManageOrganization &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, canManageOrganization]);

  if (isPending || profileLoading || posaunenwarteLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageOrganization) {
    return null;
  }

  return (
    <main className="dark:bg-dark-background min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm">
          <ol className="flex items-center gap-2">
            <li>
              <Link
                href="/dashboard"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Dashboard
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">Posaunenwarte</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
              Posaunenwarte
            </h1>
            <p className="dark:text-dark-muted mt-2 text-gray-600">
              Verwalte die Landesposaunenwarte (LPW) und Regionalposaunenwarte
              (RPW)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/users?role=LPW,RPW"
              className="dark:border-dark-border dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Benutzer verwalten
            </Link>
          </div>
        </div>

        {/* Info Box */}
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="flex gap-3">
            <ArrowLeftIcon className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium">Hinweis zur Verwaltung</p>
              <p className="mt-1">
                Posaunenwarte sind Benutzer mit der Rolle LPW oder RPW. Um einen
                neuen Posaunenwart hinzuzufügen, bearbeite einen Benutzer und
                weise ihm die entsprechende Rolle zu. Hier kannst du die
                Bezirkszuordnungen verwalten.
              </p>
            </div>
          </div>
        </div>

        {/* Posaunenwarte List */}
        {!posaunenwarte || posaunenwarte.length === 0 ? (
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="dark:text-dark-muted mx-auto mb-4 h-12 w-12 text-gray-400">
              <UsersIcon className="h-12 w-12" />
            </div>
            <h3 className="dark:text-dark-text mb-2 text-lg font-semibold text-gray-900">
              Keine Posaunenwarte gefunden
            </h3>
            <p className="dark:text-dark-muted mb-6 text-gray-600">
              Es gibt noch keine Benutzer mit der Rolle LPW oder RPW.
            </p>
            <Link
              href="/dashboard/users"
              className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
            >
              Benutzer verwalten
            </Link>
          </div>
        ) : (
          <div className="dark:border-dark-border dark:bg-dark-surface overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="dark:border-dark-border dark:bg-dark-background-secondary border-b border-gray-200 bg-gray-50">
                    <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Posaunenwart
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Rolle
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Zuständige Bezirke
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {posaunenwarte.map((person) => (
                    <tr
                      key={person.id}
                      className="dark:hover:bg-dark-background-secondary hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {person.profileImage?.url ? (
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                              <Image
                                src={person.profileImage.url}
                                alt={person.name || ""}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                              <UserIcon className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <Link
                              href={`/dashboard/posaunenwarte/${person.id}`}
                              className="hover:text-primary dark:text-dark-text font-medium text-gray-900"
                            >
                              {person.name || "Unbekannt"}
                            </Link>
                            <p className="dark:text-dark-muted text-sm text-gray-500">
                              {person.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            person.role === "LPW"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                          }`}
                        >
                          {person.role
                            ? ROLE_LABELS[person.role] || person.role
                            : "Unbekannt"}
                        </span>
                        {person.districtRoleName && (
                          <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                            {person.districtRoleName}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {person.bezirke && person.bezirke.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {person.bezirke.map(
                              (bezirk: {
                                id: string;
                                number: number;
                                name: string | null;
                              }) => (
                                <span
                                  key={bezirk.id}
                                  className="dark:bg-dark-background-secondary dark:text-dark-muted inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                                >
                                  Bezirk {bezirk.number}
                                </span>
                              ),
                            )}
                          </div>
                        ) : (
                          <span className="dark:text-dark-muted text-sm text-gray-500">
                            {person.role === "LPW"
                              ? "Alle Bezirke"
                              : person.role === "RPW"
                                ? `${person.bezirke?.length || 0} Bezirk(e)`
                                : "Keine Zuordnung"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/posaunenwarte/${person.id}`}
                            className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                            title="Details anzeigen"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/dashboard/posaunenwarte/${person.id}/edit`}
                            className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                            title="Bezirke bearbeiten"
                          >
                            <EditIcon className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/dashboard/users/${person.id}`}
                            className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                            title="Benutzerprofil"
                          >
                            <UserIcon className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
