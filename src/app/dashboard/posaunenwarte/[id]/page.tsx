"use client";

import { useSession } from "@/lib/auth";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import Image from "next/image";
import { UserRole } from "~/generated/prisma/enums";

const ALLOWED_ROLES: UserRole[] = [UserRole.ADMIN];

const ROLE_LABELS: Record<string, string> = {
  LPW: "Landesposaunenwart",
  RPW: "Regionalposaunenwart",
};

export default function DashboardPosaunenwarteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: user, isLoading: userLoading } = api.users.getById.useQuery(
    { id },
    { enabled: !!id },
  );

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/posaunenwarte/${id}`);
    }
  }, [isPending, session, router, id]);

  useEffect(() => {
    if (!profileLoading && profile && !hasRedirected.current) {
      if (!ALLOWED_ROLES.includes(profile.role)) {
        hasRedirected.current = true;
        router.push("/dashboard");
      }
    }
  }, [profile, profileLoading, router]);

  useEffect(() => {
    if (user && user.role !== "LPW" && user.role !== "RPW") {
      router.push("/dashboard/posaunenwarte");
    }
  }, [user, router]);

  if (isPending || profileLoading || userLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !ALLOWED_ROLES.includes(profile.role)) {
    return null;
  }

  if (!user) {
    return (
      <main className="dark:bg-dark-background min-h-screen bg-gray-50">
        <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-xl font-semibold text-gray-900">
              Posaunenwart nicht gefunden
            </h2>
            <Link
              href="/dashboard/posaunenwarte"
              className="text-primary hover:text-primary/80"
            >
              Zurück zur Übersicht
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isPosaunenwart = user.role === "LPW" || user.role === "RPW";

  if (!isPosaunenwart) {
    return null;
  }

  return (
    <main className="dark:bg-dark-background min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
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
            <li>
              <Link
                href="/dashboard/posaunenwarte"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Posaunenwarte
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">
              {user.displayName || "Details"}
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            {user.profileImage?.url ? (
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full">
                <Image
                  src={user.profileImage.url}
                  alt={user.displayName || ""}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <svg
                  className="h-10 w-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            )}
            <div>
              <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
                {user.displayName || "Unbekannt"}
              </h1>
              <span
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                  user.role === "LPW"
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                }`}
              >
                {ROLE_LABELS[user.role] || user.role}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/posaunenwarte/${id}/edit`}
              className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Bezirke bearbeiten
            </Link>
          </div>
        </div>

        {/* User Info Card */}
        <div className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
            Kontaktinformationen
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                E-Mail
              </dt>
              <dd className="dark:text-dark-text mt-1 text-gray-900">
                {user.email ? (
                  <a
                    href={`mailto:${user.email}`}
                    className="text-primary hover:underline"
                  >
                    {user.email}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                Telefon
              </dt>
              <dd className="dark:text-dark-text mt-1 text-gray-900">
                {user.phone ? (
                  <a
                    href={`tel:${user.phone}`}
                    className="text-primary hover:underline"
                  >
                    {user.phone}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            {user.displayRole && (
              <div className="sm:col-span-2">
                <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                  Angezeigte Rolle
                </dt>
                <dd className="dark:text-dark-text mt-1 text-gray-900">
                  {user.displayRole}
                </dd>
              </div>
            )}
            {user.bio && (
              <div className="sm:col-span-2">
                <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                  Beschreibung
                </dt>
                <dd className="dark:text-dark-text mt-1 whitespace-pre-wrap text-gray-900">
                  {user.bio}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Bezirk Responsibilities */}
        <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="dark:text-dark-text text-lg font-semibold text-gray-900">
              Zuständige Bezirke
            </h2>
            <span className="dark:bg-dark-background-secondary dark:text-dark-muted rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-600">
              {user.posaunenwarteResponsibilities?.length || 0} Bezirk
              {(user.posaunenwarteResponsibilities?.length || 0) !== 1
                ? "e"
                : ""}
            </span>
          </div>

          {user.role === "LPW" &&
            (!user.posaunenwarteResponsibilities ||
              user.posaunenwarteResponsibilities.length === 0) && (
              <div className="dark:border-dark-border dark:bg-dark-background-secondary rounded-lg border border-gray-100 bg-gray-50 p-4">
                <div className="flex gap-3">
                  <svg
                    className="text-primary h-5 w-5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="dark:text-dark-text text-sm text-gray-700">
                    <p className="font-medium">Landesposaunenwart</p>
                    <p className="dark:text-dark-muted mt-1 text-gray-600">
                      Als Landesposaunenwart ist diese Person für alle Bezirke
                      zuständig. Es müssen keine spezifischen Bezirke zugewiesen
                      werden.
                    </p>
                  </div>
                </div>
              </div>
            )}

          {user.posaunenwarteResponsibilities &&
            user.posaunenwarteResponsibilities.length > 0 && (
              <div className="space-y-3">
                {user.posaunenwarteResponsibilities.map((resp) => (
                  <div
                    key={resp.bezirk.id}
                    className="dark:border-dark-border dark:hover:bg-dark-background-secondary flex items-center justify-between rounded-lg border border-gray-100 p-4 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="dark:bg-dark-background-secondary flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                        <span className="dark:text-dark-text font-semibold text-gray-700">
                          {resp.bezirk.number}
                        </span>
                      </div>
                      <div>
                        <p className="dark:text-dark-text font-medium text-gray-900">
                          Bezirk {resp.bezirk.number}
                        </p>
                        {resp.bezirk.name && (
                          <p className="dark:text-dark-muted text-sm text-gray-500">
                            {resp.bezirk.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        resp.roleType === "LPW"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                      }`}
                    >
                      {resp.roleType}
                    </span>
                  </div>
                ))}
              </div>
            )}

          {user.role === "RPW" &&
            (!user.posaunenwarteResponsibilities ||
              user.posaunenwarteResponsibilities.length === 0) && (
              <div className="py-8 text-center">
                <div className="dark:text-dark-muted mx-auto mb-4 h-12 w-12 text-gray-400">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <h3 className="dark:text-dark-text mb-2 text-lg font-semibold text-gray-900">
                  Keine Bezirke zugewiesen
                </h3>
                <p className="dark:text-dark-muted mb-6 text-gray-600">
                  Diesem Regionalposaunenwart wurden noch keine Bezirke
                  zugewiesen.
                </p>
                <Link
                  href={`/dashboard/posaunenwarte/${id}/edit`}
                  className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
                >
                  Bezirke zuweisen
                </Link>
              </div>
            )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard/posaunenwarte"
            className="dark:border-dark-border dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Zurück zur Übersicht
          </Link>
          <Link
            href={`/dashboard/users/${id}`}
            className="dark:border-dark-border dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            Benutzerprofil öffnen
          </Link>
        </div>
      </div>
    </main>
  );
}
