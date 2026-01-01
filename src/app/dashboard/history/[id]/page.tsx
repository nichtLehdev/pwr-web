"use client";

import { useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { UserRole } from "~/generated/prisma/enums";

const ALLOWED_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.LPW];

export default function HistoryEventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: historyEvent, isLoading: eventLoading } =
    api.organization.getHistoryEvent.useQuery(
      { id: eventId },
      { enabled: !!eventId && !!session?.user },
    );

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(
        `/login?callbackUrl=/dashboard/history-timeline/${eventId}`,
      );
    }
  }, [session, sessionLoading, router, eventId]);

  useEffect(() => {
    if (!profileLoading && profile && !hasRedirected.current) {
      if (!ALLOWED_ROLES.includes(profile.role)) {
        hasRedirected.current = true;
        router.push("/dashboard");
      }
    }
  }, [profile, profileLoading, router]);

  if (sessionLoading || profileLoading || eventLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !ALLOWED_ROLES.includes(profile.role)) {
    return null;
  }

  if (!historyEvent) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Ereignis nicht gefunden
          </h1>
          <Link
            href="/dashboard/history-timeline"
            className="text-primary mt-4 inline-block hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const categoryLabels: Record<string, string> = {
    FOUNDING: "Gründung",
    MILESTONE: "Meilenstein",
    EXPANSION: "Erweiterung",
    MODERNIZATION: "Modernisierung",
    PARTNERSHIP: "Partnerschaft",
  };

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
                href="/dashboard/history-timeline"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Historie
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">
              {historyEvent.title}
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            {historyEvent.image?.url ? (
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={historyEvent.image.url}
                  alt={historyEvent.imageAlt || historyEvent.title}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
                  {historyEvent.title}
                </h1>
                {historyEvent.category && (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                    {categoryLabels[historyEvent.category] ||
                      historyEvent.category}
                  </span>
                )}
              </div>
              <p className="dark:text-primary text-primary mt-1 text-lg font-semibold">
                {historyEvent.year}
              </p>
            </div>
          </div>
          <Link
            href={`/dashboard/history-timeline/${eventId}/edit`}
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

        {/* Description */}
        {historyEvent.description && (
          <div className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-3 text-lg font-semibold text-gray-900">
              Beschreibung
            </h2>
            <p className="dark:text-dark-muted whitespace-pre-wrap text-gray-600">
              {historyEvent.description}
            </p>
          </div>
        )}

        {/* Image */}
        {historyEvent.image?.url && (
          <div className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-3 text-lg font-semibold text-gray-900">
              Bild
            </h2>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg">
              <Image
                src={historyEvent.image.url}
                alt={historyEvent.imageAlt || historyEvent.title}
                fill
                className="object-cover"
              />
            </div>
            {historyEvent.imageAlt && (
              <p className="dark:text-dark-muted mt-2 text-sm text-gray-500">
                {historyEvent.imageAlt}
              </p>
            )}
          </div>
        )}

        {/* Details Grid */}
        <div className="mb-6 grid gap-6 sm:grid-cols-2">
          {/* Basic Info */}
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Informationen
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="dark:text-dark-muted text-sm text-gray-500">
                  Jahr
                </dt>
                <dd className="dark:text-dark-text font-medium text-gray-900">
                  {historyEvent.year}
                </dd>
              </div>
              <div>
                <dt className="dark:text-dark-muted text-sm text-gray-500">
                  Kategorie
                </dt>
                <dd className="dark:text-dark-text font-medium text-gray-900">
                  {historyEvent.category
                    ? categoryLabels[historyEvent.category] ||
                      historyEvent.category
                    : "Keine Kategorie"}
                </dd>
              </div>
              <div>
                <dt className="dark:text-dark-muted text-sm text-gray-500">
                  Sortierreihenfolge
                </dt>
                <dd className="dark:text-dark-text font-medium text-gray-900">
                  {historyEvent.sortOrder}
                </dd>
              </div>
            </dl>
          </div>

          {/* Metadata */}
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Details
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="dark:text-dark-muted text-sm text-gray-500">
                  Erstellt am
                </dt>
                <dd className="dark:text-dark-text font-medium text-gray-900">
                  {new Date(historyEvent.createdAt).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
              <div>
                <dt className="dark:text-dark-muted text-sm text-gray-500">
                  Zuletzt aktualisiert
                </dt>
                <dd className="dark:text-dark-text font-medium text-gray-900">
                  {new Date(historyEvent.updatedAt).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard/history-timeline"
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

