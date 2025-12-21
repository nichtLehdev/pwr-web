"use client";

import { useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { UserRole } from "~/generated/prisma/enums";

const ALLOWED_ROLES: UserRole[] = [UserRole.ADMIN];

export default function BezirkDetailPage() {
  const router = useRouter();
  const params = useParams();
  const bezirkId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: bezirk, isLoading: bezirkLoading } =
    api.bezirke.getById.useQuery(
      { id: bezirkId },
      { enabled: !!bezirkId && !!session?.user },
    );

  const { data: stats } = api.bezirke.getStatistics.useQuery(
    { id: bezirkId },
    { enabled: !!bezirkId && !!session?.user },
  );

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/bezirke/${bezirkId}`);
    }
  }, [session, sessionLoading, router, bezirkId]);

  useEffect(() => {
    if (!profileLoading && profile && !hasRedirected.current) {
      if (!ALLOWED_ROLES.includes(profile.role)) {
        hasRedirected.current = true;
        router.push("/dashboard");
      }
    }
  }, [profile, profileLoading, router]);

  if (sessionLoading || profileLoading || bezirkLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !ALLOWED_ROLES.includes(profile.role)) {
    return null;
  }

  if (!bezirk) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Bezirk nicht gefunden
          </h1>
          <Link
            href="/dashboard/bezirke"
            className="text-primary mt-4 inline-block hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
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
                href="/dashboard/bezirke"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Bezirke
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">
              {bezirk.shortName}
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white"
              style={{
                backgroundColor: `var(--color-district-${bezirk.number})`,
              }}
            >
              {bezirk.number}
            </span>
            <div>
              <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
                {bezirk.name}
              </h1>
              <p className="dark:text-dark-muted mt-1 text-gray-600">
                {bezirk.shortName}
              </p>
            </div>
          </div>
          <Link
            href={`/dashboard/bezirke/${bezirkId}/edit`}
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
            Bearbeiten
          </Link>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-primary text-2xl font-bold">
                {stats.totalEnsembles}
              </div>
              <div className="dark:text-dark-muted text-sm text-gray-600">
                Ensembles
              </div>
            </div>
            <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-primary text-2xl font-bold">
                {stats.upcomingEvents}
              </div>
              <div className="dark:text-dark-muted text-sm text-gray-600">
                Kommende Termine
              </div>
            </div>
            <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-primary text-2xl font-bold">
                {stats.activeCourses}
              </div>
              <div className="dark:text-dark-muted text-sm text-gray-600">
                Aktive Kurse
              </div>
            </div>
            <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-primary text-2xl font-bold">
                {stats.totalObleute}
              </div>
              <div className="dark:text-dark-muted text-sm text-gray-600">
                Obleute
              </div>
            </div>
          </div>
        )}

        {/* Obleute */}
        <div className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
            Bezirksobleute
          </h2>
          {bezirk.users && bezirk.users.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {bezirk.users.map((user) => (
                <div
                  key={user.id}
                  className="dark:border-dark-border flex items-start gap-4 rounded-lg border border-gray-100 p-4"
                >
                  {user.profileImage?.url ? (
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full">
                      <Image
                        src={user.profileImage.url}
                        alt={user.displayName || "Profilbild"}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                      <svg
                        className="h-7 w-7"
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
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="dark:text-dark-text font-medium text-gray-900">
                      {user.displayName}
                    </p>
                    {user.obleuteRole && (
                      <p className="dark:text-dark-muted text-sm text-gray-500">
                        {user.obleuteRole}
                      </p>
                    )}
                    <p className="dark:text-dark-muted text-sm text-gray-500">
                      {user.email}
                    </p>
                    {(user.street || user.zipCode || user.city) && (
                      <p className="dark:text-dark-muted mt-2 text-sm text-gray-500">
                        {[user.street, user.zipCode, user.city]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="dark:text-dark-muted text-gray-500 italic">
              Keine Bezirksobleute zugewiesen
            </p>
          )}
        </div>

        {/* Ensembles */}
        {bezirk.ensembles && bezirk.ensembles.length > 0 && (
          <div className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Ensembles ({bezirk.ensembles.length})
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {bezirk.ensembles.map((ensemble) => (
                <div
                  key={ensemble.id}
                  className="dark:border-dark-border flex items-center gap-3 rounded-lg border border-gray-100 p-3"
                >
                  {ensemble.image?.url ? (
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded">
                      <Image
                        src={ensemble.image.url}
                        alt={ensemble.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-10 w-10 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-500">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    </div>
                  )}
                  <div>
                    <p className="dark:text-dark-text font-medium text-gray-900">
                      {ensemble.name}
                    </p>
                    {ensemble.conductor && (
                      <p className="dark:text-dark-muted text-sm text-gray-500">
                        Leitung: {ensemble.conductor.displayName}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        {bezirk.events && bezirk.events.length > 0 && (
          <div className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Kommende Termine
            </h2>
            <div className="space-y-3">
              {bezirk.events.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="dark:border-dark-border flex items-center gap-3 rounded-lg border border-gray-100 p-3"
                >
                  <div className="text-primary shrink-0 text-center">
                    <div className="text-sm font-medium">
                      {new Date(event.eventDate).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="dark:text-dark-text truncate font-medium text-gray-900">
                      {event.title}
                    </p>
                    {event.location && (
                      <p className="dark:text-dark-muted truncate text-sm text-gray-500">
                        {event.location.name}, {event.location.city}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
            Details
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="dark:text-dark-muted text-sm text-gray-500">
                Bezirksnummer
              </dt>
              <dd className="dark:text-dark-text font-medium text-gray-900">
                {bezirk.number}
              </dd>
            </div>
            <div>
              <dt className="dark:text-dark-muted text-sm text-gray-500">
                Vollständiger Name
              </dt>
              <dd className="dark:text-dark-text font-medium text-gray-900">
                {bezirk.name}
              </dd>
            </div>
            <div>
              <dt className="dark:text-dark-muted text-sm text-gray-500">
                Kurzname
              </dt>
              <dd className="dark:text-dark-text font-medium text-gray-900">
                {bezirk.shortName}
              </dd>
            </div>
            <div>
              <dt className="dark:text-dark-muted text-sm text-gray-500">
                Erstellt am
              </dt>
              <dd className="dark:text-dark-text font-medium text-gray-900">
                {new Date(bezirk.createdAt).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </div>
          </dl>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard/bezirke"
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    </main>
  );
}
