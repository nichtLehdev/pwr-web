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
import { Music, Edit, UserIcon, ArrowLeftIcon } from "lucide-react";
import { formatBerlin } from "@/lib/berlin-time";

export default function AuswahlchorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const auswahlchorId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageAuswahlchoere = hasPermission(
    PERMISSIONS.ORGANIZATION_MANAGE_AUSWAHLCHOERE,
  );

  const { data: auswahlchor, isLoading: auswahlchorLoading } =
    api.auswahlchoere.getById.useQuery(
      { id: auswahlchorId },
      { enabled: !!auswahlchorId && !!session?.user },
    );

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(
        `/login?callbackUrl=/dashboard/auswahlchoere/${auswahlchorId}`,
      );
    }
  }, [session, sessionLoading, router, auswahlchorId]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !permissionsLoading &&
      !canManageAuswahlchoere &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [
    profile,
    profileLoading,
    permissionsLoading,
    canManageAuswahlchoere,
    router,
  ]);

  if (sessionLoading || profileLoading || auswahlchorLoading) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageAuswahlchoere) {
    return null;
  }

  if (!auswahlchor) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-ink dark:text-night-text text-xl font-semibold">
            Auswahlchor nicht gefunden
          </h1>
          <Link
            href="/dashboard/auswahlchoere"
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
      title={auswahlchor.name}
      description={auswahlchor.subtitle ?? undefined}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Auswahlchöre", href: "/dashboard/auswahlchoere" },
        { label: auswahlchor.name },
      ]}
      actions={
        <Link
          href={`/dashboard/auswahlchoere/${auswahlchorId}/edit`}
          className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors"
        >
          <Edit className="h-4 w-4" />
          Bearbeiten
        </Link>
      }
      maxWidth="7xl"
    >
      {/* Auswahlchor Image and Status Badge */}
      <div className="mb-6 flex items-center gap-4">
        {auswahlchor.image?.url ? (
          <div className="border-rule dark:border-night-rule relative h-20 w-20 shrink-0 overflow-hidden border">
            <Image
              src={auswahlchor.image.url}
              alt={auswahlchor.name}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div
            // Tinte statt Weiss: Die Standardfarbe ist Druckorange, auf dem
            // weisse Schrift nur 1,99:1 erreicht.
            className="text-ink flex h-20 w-20 shrink-0 items-center justify-center"
            style={{
              backgroundColor: auswahlchor.colorHex || "#faa619",
            }}
          >
            <Music className="h-10 w-10" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone={auswahlchor.showApplication ? "ink" : "inverse"}>
            {auswahlchor.showApplication
              ? "Bewerbung aktiv"
              : "Bewerbung inaktiv"}
          </Tag>
          <p className="text-dark dark:text-night-muted text-sm">
            Slug: {auswahlchor.slug}
          </p>
        </div>
      </div>

      {/* Description */}
      {auswahlchor.description && (
        <div className="border-rule dark:border-night-rule mb-6 border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-3 text-lg font-bold">
            Beschreibung
          </h2>
          <p className="text-dark dark:text-night-muted whitespace-pre-wrap">
            {auswahlchor.description}
          </p>
        </div>
      )}

      {/* Details Grid */}
      <div className="mb-6 grid gap-6 sm:grid-cols-2">
        {/* Founded & Members */}
        <div className="border-rule dark:border-night-rule border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
            Informationen
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-dark dark:text-night-muted text-sm">
                Gegründet
              </dt>
              <dd className="text-ink dark:text-night-text font-medium">
                {auswahlchor.founded}
              </dd>
            </div>
            <div>
              <dt className="text-dark dark:text-night-muted text-sm">
                Mitglieder
              </dt>
              <dd className="text-ink dark:text-night-text font-medium">
                {auswahlchor.members}
              </dd>
            </div>
          </dl>
        </div>

        {/* Conductor */}
        <div className="border-rule dark:border-night-rule border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
            Chorleitung
          </h2>
          {auswahlchor.conductor ? (
            <div className="flex items-center gap-3">
              {auswahlchor.conductor.profileImage ? (
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
                  <Image
                    src={auswahlchor.conductor.profileImage.url}
                    alt={auswahlchor.conductor.displayName || "Chorleitung"}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="bg-rule/25 text-dark dark:bg-night-raised dark:text-night-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                  <UserIcon className="h-6 w-6" />
                </div>
              )}
              <div>
                <p className="text-ink dark:text-night-text font-medium">
                  {auswahlchor.conductor.displayName ||
                    auswahlchor.conductor.email}
                </p>
                {auswahlchor.conductor.bio && (
                  <p className="text-dark dark:text-night-muted mt-1 line-clamp-2 text-sm">
                    {auswahlchor.conductor.bio}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-dark dark:text-night-muted italic">
              Keine Chorleitung zugewiesen
            </p>
          )}
        </div>
      </div>

      {/* Styling */}
      <div className="border-rule dark:border-night-rule mb-6 border p-6">
        <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
          Styling
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-dark dark:text-night-muted text-sm">
              Tailwind-Farbe
            </dt>
            <dd className="text-ink dark:text-night-text font-medium">
              {auswahlchor.color || "–"}
            </dd>
          </div>
          <div>
            <dt className="text-dark dark:text-night-muted text-sm">
              Hex-Farbe
            </dt>
            <dd className="flex items-center gap-2">
              <span className="text-ink dark:text-night-text font-medium">
                {auswahlchor.colorHex || "–"}
              </span>
              {auswahlchor.colorHex && (
                <div
                  className="border-rule dark:border-night-rule h-6 w-6 shrink-0 border"
                  style={{ backgroundColor: auswahlchor.colorHex }}
                />
              )}
            </dd>
          </div>
        </dl>
      </div>

      {/* Upcoming Events */}
      {auswahlchor.events && auswahlchor.events.length > 0 && (
        <div className="border-rule dark:border-night-rule mb-6 border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
            Kommende Termine
          </h2>
          <div className="space-y-3">
            {auswahlchor.events.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="border-rule dark:border-night-rule flex items-center gap-3 border p-3"
              >
                {event.coverImage?.url ? (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden">
                    <Image
                      src={event.coverImage.url}
                      alt={event.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="text-primary-ink dark:text-primary shrink-0 text-center">
                    <div className="text-sm font-medium">
                      {formatBerlin(event.eventDate, "tagMonatKurz")}
                    </div>
                  </div>
                )}
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
              Erstellt am
            </dt>
            <dd className="text-ink dark:text-night-text font-medium">
              {formatBerlin(auswahlchor.createdAt, "datumLangZweistellig")}
            </dd>
          </div>
          <div>
            <dt className="text-dark dark:text-night-muted text-sm">
              Zuletzt aktualisiert
            </dt>
            <dd className="text-ink dark:text-night-text font-medium">
              {formatBerlin(auswahlchor.updatedAt, "datumLangZweistellig")}
            </dd>
          </div>
        </dl>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/dashboard/auswahlchoere"
          className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 items-center gap-2 border px-4 py-2 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
      </div>
    </DashboardPage>
  );
}
