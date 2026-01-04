"use client";

import { useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { UserRole } from "~/generated/prisma/enums";
import { Edit, UserIcon } from "lucide-react";
import { ArrowLeftIcon } from "lucide-react";

const ALLOWED_ROLES: UserRole[] = [UserRole.ADMIN];

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
    if (!profileLoading && profile && !hasRedirected.current) {
      if (!ALLOWED_ROLES.includes(profile.role)) {
        hasRedirected.current = true;
        router.push("/dashboard");
      }
    }
  }, [profile, profileLoading, router]);

  if (sessionLoading || profileLoading || locationLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !ALLOWED_ROLES.includes(profile.role)) {
    return null;
  }

  if (!location) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Standort nicht gefunden
          </h1>
          <Link
            href="/dashboard/locations"
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
                href="/dashboard/locations"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Standorte
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">
              {location.name || "Unbenannter Standort"}
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
              {location.name || "Unbenannter Standort"}
            </h1>
            {location.additionalInfo && (
              <p className="dark:text-dark-muted mt-2 text-gray-600">
                {location.additionalInfo}
              </p>
            )}
          </div>
          <Link
            href={`/dashboard/locations/${locationId}/edit`}
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
          >
            <Edit className="h-4 w-4" />
            Bearbeiten
          </Link>
        </div>

        {/* Address */}
        <div className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
            Adresse
          </h2>
          <dl className="space-y-3">
            {location.street && (
              <div>
                <dt className="dark:text-dark-muted text-sm text-gray-500">
                  Straße
                </dt>
                <dd className="dark:text-dark-text font-medium text-gray-900">
                  {location.street}
                </dd>
              </div>
            )}
            {(location.zipCode || location.city) && (
              <div>
                <dt className="dark:text-dark-muted text-sm text-gray-500">
                  Ort
                </dt>
                <dd className="dark:text-dark-text font-medium text-gray-900">
                  {location.zipCode && `${location.zipCode} `}
                  {location.city}
                </dd>
              </div>
            )}
            {!location.street && !location.zipCode && !location.city && (
              <p className="dark:text-dark-muted text-gray-500 italic">
                Keine Adresse angegeben
              </p>
            )}
          </dl>
        </div>

        {/* Coordinates */}
        {(location.latitude || location.longitude) && (
          <div className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Koordinaten
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              {location.latitude && (
                <div>
                  <dt className="dark:text-dark-muted text-sm text-gray-500">
                    Breitengrad
                  </dt>
                  <dd className="dark:text-dark-text font-medium text-gray-900">
                    {location.latitude}
                  </dd>
                </div>
              )}
              {location.longitude && (
                <div>
                  <dt className="dark:text-dark-muted text-sm text-gray-500">
                    Längengrad
                  </dt>
                  <dd className="dark:text-dark-text font-medium text-gray-900">
                    {location.longitude}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Usage */}
        <div className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
            Verwendung
          </h2>
          <div className="space-y-4">
            {location.events && location.events.length > 0 && (
              <div>
                <h3 className="dark:text-dark-text mb-2 text-sm font-medium text-gray-700">
                  Kommende Termine ({location.events.length})
                </h3>
                <div className="space-y-2">
                  {location.events.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      className="dark:border-dark-border flex items-center gap-3 rounded-lg border border-gray-100 p-3"
                    >
                      {event.coverImage?.url ? (
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded">
                          <Image
                            src={event.coverImage.url}
                            alt={event.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="text-primary shrink-0 text-center">
                          <div className="text-sm font-medium">
                            {new Date(event.eventDate).toLocaleDateString(
                              "de-DE",
                              {
                                day: "2-digit",
                                month: "short",
                              },
                            )}
                          </div>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="dark:text-dark-text truncate font-medium text-gray-900">
                          {event.title}
                        </p>
                        <p className="dark:text-dark-muted truncate text-sm text-gray-500">
                          {new Date(event.eventDate).toLocaleDateString(
                            "de-DE",
                            {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            },
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {location.courses && location.courses.length > 0 && (
              <div>
                <h3 className="dark:text-dark-text mb-2 text-sm font-medium text-gray-700">
                  Kurse ({location.courses.length})
                </h3>
                <div className="space-y-2">
                  {location.courses.slice(0, 5).map((course) => (
                    <div
                      key={course.id}
                      className="dark:border-dark-border flex items-center gap-3 rounded-lg border border-gray-100 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="dark:text-dark-text truncate font-medium text-gray-900">
                          {course.title}
                        </p>
                        <p className="dark:text-dark-muted truncate text-sm text-gray-500">
                          {new Date(course.startDate).toLocaleDateString(
                            "de-DE",
                            {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            },
                          )}{" "}
                          -{" "}
                          {new Date(course.endDate).toLocaleDateString(
                            "de-DE",
                            {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            },
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {location.ensembles && location.ensembles.length > 0 && (
              <div>
                <h3 className="dark:text-dark-text mb-2 text-sm font-medium text-gray-700">
                  Ensembles ({location.ensembles.length})
                </h3>
                <div className="space-y-2">
                  {location.ensembles.slice(0, 5).map((ensemble) => (
                    <div
                      key={ensemble.id}
                      className="dark:border-dark-border flex items-center gap-3 rounded-lg border border-gray-100 p-3"
                    >
                      {ensemble.image?.url ? (
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded">
                          <Image
                            src={ensemble.image.url}
                            alt={ensemble.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-12 w-12 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-500">
                        <UserIcon   
                            className="h-6 w-6"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="dark:text-dark-text truncate font-medium text-gray-900">
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
                <p className="dark:text-dark-muted text-gray-500 italic">
                  Dieser Standort wird derzeit nicht verwendet
                </p>
              )}
          </div>
        </div>

        {/* Metadata */}
        <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
            Details
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="dark:text-dark-muted text-sm text-gray-500">
                Erstellt am
              </dt>
              <dd className="dark:text-dark-text font-medium text-gray-900">
                {new Date(location.createdAt).toLocaleDateString("de-DE", {
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
                {new Date(location.updatedAt).toLocaleDateString("de-DE", {
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
            href="/dashboard/locations"
            className="dark:border-dark-border dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeftIcon
              className="h-4 w-4"
            />
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    </main>
  );
}
