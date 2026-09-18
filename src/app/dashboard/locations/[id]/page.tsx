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
import { Edit, UserIcon } from "lucide-react";
import { ArrowLeftIcon } from "lucide-react";
import { formatBerlin } from "@/lib/berlin-time";

export default function LocationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const locationId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageLocations = hasPermission(
    PERMISSIONS.ORGANIZATION_MANAGE_LOCATIONS,
  );

  const { data: location, isLoading: locationLoading } =
    api.locations.getById.useQuery(
      { id: locationId },
      { enabled: !!locationId && !!session?.user },
    );

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/locations/${locationId}`);
    }
  }, [session, sessionLoading, router, locationId]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !permissionsLoading &&
      !canManageLocations &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, permissionsLoading, canManageLocations, router]);

  if (sessionLoading || profileLoading || locationLoading) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageLocations) {
    return null;
  }

  if (!location) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-ink dark:text-night-text text-xl font-semibold">
            Standort nicht gefunden
          </h1>
          <Link
            href="/dashboard/locations"
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
      title={location.name || "Unbenannter Standort"}
      description={location.additionalInfo ?? undefined}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Standorte", href: "/dashboard/locations" },
        { label: location.name || "Unbenannter Standort" },
      ]}
      actions={
        <Link
          href={`/dashboard/locations/${locationId}/edit`}
          className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors"
        >
          <Edit className="h-4 w-4" />
          Bearbeiten
        </Link>
      }
      maxWidth="7xl"
    >
      {/* Address */}
      <div className="border-rule dark:border-night-rule mb-6 border p-6">
        <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
          Adresse
        </h2>
        <dl className="space-y-3">
          {location.street && (
            <div>
              <dt className="text-dark dark:text-night-muted text-sm">
                Straße
              </dt>
              <dd className="text-ink dark:text-night-text font-medium">
                {location.street}
              </dd>
            </div>
          )}
          {(location.zipCode || location.city) && (
            <div>
              <dt className="text-dark dark:text-night-muted text-sm">Ort</dt>
              <dd className="text-ink dark:text-night-text font-medium">
                {location.zipCode && `${location.zipCode} `}
                {location.city}
              </dd>
            </div>
          )}
          {!location.street && !location.zipCode && !location.city && (
            <p className="text-dark dark:text-night-muted italic">
              Keine Adresse angegeben
            </p>
          )}
        </dl>
      </div>

      {/* Coordinates */}
      {(location.latitude || location.longitude) && (
        <div className="border-rule dark:border-night-rule mb-6 border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
            Koordinaten
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            {location.latitude && (
              <div>
                <dt className="text-dark dark:text-night-muted text-sm">
                  Breitengrad
                </dt>
                <dd className="text-ink dark:text-night-text font-medium">
                  {location.latitude}
                </dd>
              </div>
            )}
            {location.longitude && (
              <div>
                <dt className="text-dark dark:text-night-muted text-sm">
                  Längengrad
                </dt>
                <dd className="text-ink dark:text-night-text font-medium">
                  {location.longitude}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Usage */}
      <div className="border-rule dark:border-night-rule mb-6 border p-6">
        <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
          Verwendung
        </h2>
        <div className="space-y-4">
          {location.events && location.events.length > 0 && (
            <div>
              <h3 className="text-ink dark:text-night-text mb-2 text-sm font-medium">
                Kommende Termine ({location.events.length})
              </h3>
              <div className="space-y-2">
                {location.events.slice(0, 5).map((event) => (
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
                      <p className="text-dark dark:text-night-muted truncate text-sm">
                        {formatBerlin(event.eventDate, "datumLangZweistellig")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {location.courses && location.courses.length > 0 && (
            <div>
              <h3 className="text-ink dark:text-night-text mb-2 text-sm font-medium">
                Kurse ({location.courses.length})
              </h3>
              <div className="space-y-2">
                {location.courses.slice(0, 5).map((course) => (
                  <div
                    key={course.id}
                    className="border-rule dark:border-night-rule flex items-center gap-3 border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-ink dark:text-night-text truncate font-medium">
                        {course.title}
                      </p>
                      <p className="text-dark dark:text-night-muted truncate text-sm">
                        {formatBerlin(course.startDate, "datumLangZweistellig")}{" "}
                        - {formatBerlin(course.endDate, "datumLangZweistellig")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {location.ensembles && location.ensembles.length > 0 && (
            <div>
              <h3 className="text-ink dark:text-night-text mb-2 text-sm font-medium">
                Ensembles ({location.ensembles.length})
              </h3>
              <div className="space-y-2">
                {location.ensembles.slice(0, 5).map((ensemble) => (
                  <div
                    key={ensemble.id}
                    className="border-rule dark:border-night-rule flex items-center gap-3 border p-3"
                  >
                    {ensemble.image?.url ? (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden">
                        <Image
                          src={ensemble.image.url}
                          alt={ensemble.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="bg-rule/25 text-dark dark:bg-night-raised dark:text-night-muted flex h-12 w-12 shrink-0 items-center justify-center">
                        <UserIcon className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-ink dark:text-night-text truncate font-medium">
                        {ensemble.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!location.events || location.events.length === 0) &&
            (!location.courses || location.courses.length === 0) &&
            (!location.ensembles || location.ensembles.length === 0) && (
              <p className="text-dark dark:text-night-muted italic">
                Dieser Standort wird derzeit nicht verwendet
              </p>
            )}
        </div>
      </div>

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
              {formatBerlin(location.createdAt, "datumLangZweistellig")}
            </dd>
          </div>
          <div>
            <dt className="text-dark dark:text-night-muted text-sm">
              Zuletzt aktualisiert
            </dt>
            <dd className="text-ink dark:text-night-text font-medium">
              {formatBerlin(location.updatedAt, "datumLangZweistellig")}
            </dd>
          </div>
        </dl>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/dashboard/locations"
          className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 items-center gap-2 border px-4 py-2 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
      </div>
    </DashboardPage>
  );
}
