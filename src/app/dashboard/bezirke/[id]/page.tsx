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
import { MusicIcon, PencilIcon, ArrowLeftIcon, UserIcon } from "lucide-react";
import { formatBerlin } from "@/lib/berlin-time";

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

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageBezirke = hasPermission(
    PERMISSIONS.ORGANIZATION_MANAGE_BEZIRKE,
  );

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
    if (
      !profileLoading &&
      profile &&
      !permissionsLoading &&
      !canManageBezirke &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, permissionsLoading, canManageBezirke, router]);

  if (sessionLoading || profileLoading || bezirkLoading) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageBezirke) {
    return null;
  }

  if (!bezirk) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-ink dark:text-night-text text-xl font-semibold">
            Bezirk nicht gefunden
          </h1>
          <Link
            href="/dashboard/bezirke"
            className="link-ink mt-4 inline-block"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  return (
    <DashboardPage
      title={bezirk.name ?? ""}
      description={bezirk.shortName ?? undefined}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Bezirke", href: "/dashboard/bezirke" },
        { label: bezirk.shortName ?? "" },
      ]}
      actions={
        <Link
          href={`/dashboard/bezirke/${bezirkId}/edit`}
          className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors"
        >
          <PencilIcon className="h-4 w-4" />
          Obleute bearbeiten
        </Link>
      }
      maxWidth="7xl"
    >
      {/* District Badge */}
      <div className="mb-6 flex items-center gap-4">
        <span
          // Weiss traegt auf keiner der dreizehn Bezirksfarben (1,81:1 bis
          // 4,47:1). Tinte reicht bei Kleintext ebenfalls nicht ueberall
          // (schlechtester Wert 3,78:1) — deshalb steht die Farbe sonst als
          // Markierung neben der Schrift. Hier nicht: 24px fett ist
          // WCAG-Grosstext mit Schwelle 3:1, und dort traegt Tinte auf allen
          // dreizehn. Die Kachel darf ihre Flaeche behalten.
          className="text-ink flex h-16 w-16 items-center justify-center text-2xl font-bold"
          style={{
            backgroundColor: `var(--color-district-${bezirk.number})`,
          }}
        >
          {bezirk.number}
        </span>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="border-rule dark:border-night-rule border p-4">
            <div className="text-primary-ink dark:text-primary text-2xl font-bold">
              {stats.totalEnsembles}
            </div>
            <div className="text-dark dark:text-night-muted text-sm">
              Ensembles
            </div>
          </div>
          <div className="border-rule dark:border-night-rule border p-4">
            <div className="text-primary-ink dark:text-primary text-2xl font-bold">
              {stats.upcomingEvents}
            </div>
            <div className="text-dark dark:text-night-muted text-sm">
              Kommende Termine
            </div>
          </div>
          <div className="border-rule dark:border-night-rule border p-4">
            <div className="text-primary-ink dark:text-primary text-2xl font-bold">
              {stats.activeCourses}
            </div>
            <div className="text-dark dark:text-night-muted text-sm">
              Aktive Kurse
            </div>
          </div>
          <div className="border-rule dark:border-night-rule border p-4">
            <div className="text-primary-ink dark:text-primary text-2xl font-bold">
              {stats.totalObleute}
            </div>
            <div className="text-dark dark:text-night-muted text-sm">
              Obleute
            </div>
          </div>
        </div>
      )}

      {/* Obleute */}
      <div className="border-rule dark:border-night-rule mb-6 border p-6">
        <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
          Bezirksobleute
        </h2>
        {bezirk.obleute.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {bezirk.obleute.map((person) => (
              <div
                key={person.id}
                className="border-rule dark:border-night-rule flex items-start gap-4 border p-4"
              >
                {person.image?.url ? (
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={person.image.url}
                      alt={person.name || "Profilbild"}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="bg-rule/25 text-dark dark:bg-night-raised dark:text-night-muted flex h-14 w-14 shrink-0 items-center justify-center rounded-full">
                    <UserIcon className="h-7 w-7" />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-ink dark:text-night-text font-medium">
                    {person.name}
                  </p>
                  <p className="text-dark dark:text-night-muted text-sm">
                    {person.roleName}
                    {!person.userId && (
                      <Tag tone="inverse" className="ml-2">
                        ohne Benutzerkonto
                      </Tag>
                    )}
                  </p>
                  {person.email && (
                    <p className="text-dark dark:text-night-muted text-sm">
                      {person.email}
                    </p>
                  )}
                  {person.address && (
                    <p className="text-dark dark:text-night-muted mt-2 text-sm">
                      {person.address}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-dark dark:text-night-muted italic">
            Keine Bezirksobleute zugewiesen
          </p>
        )}
      </div>

      {/* Ensembles */}
      {bezirk.ensembles && bezirk.ensembles.length > 0 && (
        <div className="border-rule dark:border-night-rule mb-6 border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
            Ensembles ({bezirk.ensembles.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {bezirk.ensembles.map((ensemble) => (
              <div
                key={ensemble.id}
                className="border-rule dark:border-night-rule flex items-center gap-3 border p-3"
              >
                {ensemble.image?.url ? (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden">
                    <Image
                      src={ensemble.image.url}
                      alt={ensemble.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="bg-rule/25 text-dark dark:bg-night-raised dark:text-night-muted flex h-10 w-10 shrink-0 items-center justify-center">
                    <MusicIcon className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <p className="text-ink dark:text-night-text font-medium">
                    {ensemble.name}
                  </p>
                  {(ensemble.conductorName || ensemble.conductor) && (
                    <p className="text-dark dark:text-night-muted text-sm">
                      Leitung:{" "}
                      {ensemble.conductorName ||
                        ensemble.conductor?.displayName}
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
        <div className="border-rule dark:border-night-rule mb-6 border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
            Kommende Termine
          </h2>
          <div className="space-y-3">
            {bezirk.events.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="border-rule dark:border-night-rule flex items-center gap-3 border p-3"
              >
                <div className="text-primary-ink dark:text-primary shrink-0 text-center">
                  <div className="text-sm font-medium">
                    {formatBerlin(event.eventDate, "tagMonatKurz")}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-ink dark:text-night-text truncate font-medium">
                    {event.title}
                  </p>
                  {event.location && (
                    <p className="text-dark dark:text-night-muted truncate text-sm">
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
      <div className="border-rule dark:border-night-rule border p-6">
        <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
          Details
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-dark dark:text-night-muted text-sm">
              Bezirksnummer
            </dt>
            <dd className="text-ink dark:text-night-text font-medium">
              {bezirk.number}
            </dd>
          </div>
          <div>
            <dt className="text-dark dark:text-night-muted text-sm">
              Vollständiger Name
            </dt>
            <dd className="text-ink dark:text-night-text font-medium">
              {bezirk.name}
            </dd>
          </div>
          <div>
            <dt className="text-dark dark:text-night-muted text-sm">
              Kurzname
            </dt>
            <dd className="text-ink dark:text-night-text font-medium">
              {bezirk.shortName}
            </dd>
          </div>
          <div>
            <dt className="text-dark dark:text-night-muted text-sm">
              Erstellt am
            </dt>
            <dd className="text-ink dark:text-night-text font-medium">
              {formatBerlin(bezirk.createdAt, "datumLangZweistellig")}
            </dd>
          </div>
        </dl>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/dashboard/bezirke"
          className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 items-center gap-2 border px-4 py-2 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
      </div>
    </DashboardPage>
  );
}
