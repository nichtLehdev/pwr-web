"use client";

import { useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { DashboardPage } from "@/app/_components/dashboard";
import { Tag } from "@/app/_components/programmheft/tag";
import { formatBerlin } from "@/lib/berlin-time";
// Dashboard access is now controlled by permissions

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

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageOrganization = hasPermission(
    PERMISSIONS.ORGANIZATION_MANAGE_HISTORY,
  );

  const { data: historyEvent, isLoading: eventLoading } =
    api.organization.getHistoryEvent.useQuery(
      { id: eventId },
      { enabled: !!eventId && !!session?.user },
    );

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/history-timeline/${eventId}`);
    }
  }, [session, sessionLoading, router, eventId]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !permissionsLoading &&
      !canManageOrganization &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [
    profile,
    profileLoading,
    permissionsLoading,
    canManageOrganization,
    router,
  ]);

  if (sessionLoading || profileLoading || eventLoading) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageOrganization) {
    return null;
  }

  if (!historyEvent) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-ink dark:text-night-text text-xl font-semibold">
            Ereignis nicht gefunden
          </h1>
          <Link
            href="/dashboard/history-timeline"
            className="link-ink mt-4 inline-block"
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
    <DashboardPage
      title={historyEvent.title}
      description={historyEvent.year?.toString()}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Historie-Timeline", href: "/dashboard/history-timeline" },
        { label: historyEvent.title },
      ]}
      actions={
        <Link
          href={`/dashboard/history-timeline/${eventId}/edit`}
          className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors"
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
      }
      maxWidth="7xl"
    >
      {/* Image and Category Badge */}
      <div className="mb-6 flex items-center gap-4">
        {historyEvent.image?.url ? (
          <div className="border-rule dark:border-night-rule relative h-20 w-20 shrink-0 overflow-hidden border">
            <Image
              src={historyEvent.image.url}
              alt={historyEvent.imageAlt || historyEvent.title}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="bg-primary text-ink flex h-20 w-20 shrink-0 items-center justify-center">
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
        {historyEvent.category && (
          <Tag tone="inverse">
            {categoryLabels[historyEvent.category] || historyEvent.category}
          </Tag>
        )}
      </div>

      {/* Description */}
      {historyEvent.description && (
        <div className="border-rule dark:border-night-rule mb-6 border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-3 text-lg font-bold">
            Beschreibung
          </h2>
          <p className="text-dark dark:text-night-muted whitespace-pre-wrap">
            {historyEvent.description}
          </p>
        </div>
      )}

      {/* Image */}
      {historyEvent.image?.url && (
        <div className="border-rule dark:border-night-rule mb-6 border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-3 text-lg font-bold">
            Bild
          </h2>
          <div className="border-rule dark:border-night-rule relative aspect-video w-full overflow-hidden border">
            <Image
              src={historyEvent.image.url}
              alt={historyEvent.imageAlt || historyEvent.title}
              fill
              className="object-cover"
            />
          </div>
          {historyEvent.imageAlt && (
            <p className="text-dark dark:text-night-muted mt-2 text-sm">
              {historyEvent.imageAlt}
            </p>
          )}
        </div>
      )}

      {/* Details Grid */}
      <div className="mb-6 grid gap-6 sm:grid-cols-2">
        {/* Basic Info */}
        <div className="border-rule dark:border-night-rule border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
            Informationen
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-dark dark:text-night-muted text-sm">Jahr</dt>
              <dd className="text-ink dark:text-night-text font-medium">
                {historyEvent.year}
              </dd>
            </div>
            <div>
              <dt className="text-dark dark:text-night-muted text-sm">
                Kategorie
              </dt>
              <dd className="text-ink dark:text-night-text font-medium">
                {historyEvent.category
                  ? categoryLabels[historyEvent.category] ||
                    historyEvent.category
                  : "Keine Kategorie"}
              </dd>
            </div>
            <div>
              <dt className="text-dark dark:text-night-muted text-sm">
                Sortierreihenfolge
              </dt>
              <dd className="text-ink dark:text-night-text font-medium">
                {historyEvent.sortOrder}
              </dd>
            </div>
          </dl>
        </div>

        {/* Metadata */}
        <div className="border-rule dark:border-night-rule border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
            Details
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-dark dark:text-night-muted text-sm">
                Erstellt am
              </dt>
              <dd className="text-ink dark:text-night-text font-medium">
                {formatBerlin(historyEvent.createdAt, "datumLangZweistellig")}
              </dd>
            </div>
            <div>
              <dt className="text-dark dark:text-night-muted text-sm">
                Zuletzt aktualisiert
              </dt>
              <dd className="text-ink dark:text-night-text font-medium">
                {formatBerlin(historyEvent.updatedAt, "datumLangZweistellig")}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/dashboard/history-timeline"
          className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 items-center gap-2 border px-4 py-2 transition-colors"
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
    </DashboardPage>
  );
}
