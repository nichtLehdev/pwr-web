"use client";

import { useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { DashboardPage } from "@/app/_components/dashboard";
import { EditIcon, MusicIcon } from "lucide-react";
import { UserIcon } from "lucide-react";
import { ArrowLeftIcon } from "lucide-react";

export default function EnsembleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ensembleId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: userPermissions } = api.permissions.getMyPermissions.useQuery(
    undefined,
    { enabled: !!session?.user?.id },
  );

  const hasDashboardAccess =
    Array.isArray(userPermissions) && userPermissions.length > 0;

  const { data: ensemble, isLoading: ensembleLoading } =
    api.ensembles.getById.useQuery(
      { id: ensembleId },
      { enabled: !!ensembleId && !!session?.user },
    );

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/ensembles/${ensembleId}`);
    }
  }, [session, sessionLoading, router, ensembleId]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !hasDashboardAccess &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, hasDashboardAccess, router]);

  if (sessionLoading || profileLoading || ensembleLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !hasDashboardAccess) {
    return null;
  }

  if (!ensemble) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Ensemble nicht gefunden
          </h1>
          <Link
            href="/dashboard/ensembles"
            className="text-primary mt-4 inline-block hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  return (
    <DashboardPage
      title={ensemble.name}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Ensembles", href: "/dashboard/ensembles" },
        { label: ensemble.name },
      ]}
      actions={
        <Link
          href={`/dashboard/ensembles/${ensembleId}/edit`}
          className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
        >
          <EditIcon className="h-4 w-4" />
          Bearbeiten
        </Link>
      }
      maxWidth="7xl"
    >
      {/* Ensemble Image and Status Badges */}
      <div className="mb-6 flex items-center gap-4">
        {ensemble.image?.url ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
            <Image
              src={ensemble.image.url}
              alt={ensemble.name}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
            <MusicIcon className="h-10 w-10" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              ensemble.isActive
                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {ensemble.isActive ? "Aktiv" : "Inaktiv"}
          </span>
          {ensemble.bezirk && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
              style={{
                backgroundColor: `var(--color-district-${ensemble.bezirk.number})`,
              }}
            >
              {ensemble.bezirk.name}
            </span>
          )}
        </div>
      </div>

        {/* Description */}
        {ensemble.description && (
          <div className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-3 text-lg font-semibold text-gray-900">
              Beschreibung
            </h2>
            <p className="dark:text-dark-muted whitespace-pre-wrap text-gray-600">
              {ensemble.description}
            </p>
          </div>
        )}

        {/* Conductor & Representative */}
        <div className="mb-6 grid gap-6 sm:grid-cols-2">
          {/* Conductor */}
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Chorleitung
            </h2>
            {ensemble.conductorName ? (
              <div className="flex items-center gap-3">
                <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <UserIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="dark:text-dark-text font-medium text-gray-900">
                    {ensemble.conductorName}
                  </p>
                </div>
              </div>
            ) : ensemble.conductor ? (
              <div className="flex items-center gap-3">
                {ensemble.conductor.profileImage ? (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={ensemble.conductor.profileImage.url}
                      alt={ensemble.conductor.displayName || "Chorleitung"}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <UserIcon className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <p className="dark:text-dark-text font-medium text-gray-900">
                    {ensemble.conductor.displayName}
                  </p>
                  {ensemble.conductor.bio && (
                    <p className="dark:text-dark-muted mt-1 line-clamp-2 text-sm text-gray-500">
                      {ensemble.conductor.bio}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="dark:text-dark-muted text-gray-500 italic">
                Keine Chorleitung zugewiesen
              </p>
            )}
          </div>

          {/* Representative */}
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Ansprechpartner
            </h2>
            {ensemble.representativeName ? (
              <div className="flex items-center gap-3">
                <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <UserIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="dark:text-dark-text font-medium text-gray-900">
                    {ensemble.representativeName}
                  </p>
                </div>
              </div>
            ) : ensemble.representative ? (
              <div className="flex items-center gap-3">
                {ensemble.representative.profileImage ? (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={ensemble.representative.profileImage.url}
                      alt={
                        ensemble.representative.displayName || "Ansprechpartner"
                      }
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <UserIcon className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <p className="dark:text-dark-text font-medium text-gray-900">
                    {ensemble.representative.displayName}
                  </p>
                  {ensemble.representative.email && (
                    <a
                      href={`mailto:${ensemble.representative.email}`}
                      className="text-primary text-sm hover:underline"
                    >
                      {ensemble.representative.email}
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="dark:text-dark-muted text-gray-500 italic">
                Kein Ansprechpartner zugewiesen
              </p>
            )}
          </div>
        </div>

        {/* Rehearsal & Location */}
        <div className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
            Probendetails
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            {/* Rehearsal Schedules */}
            <div className="sm:col-span-2">
              <dt className="dark:text-dark-muted mb-2 text-sm text-gray-500">
                Probenzeiten
              </dt>
              <dd className="space-y-2">
                {ensemble.rehearsalSchedules &&
                ensemble.rehearsalSchedules.length > 0 ? (
                  ensemble.rehearsalSchedules.map((schedule, index) => (
                    <div
                      key={index}
                      className="dark:border-dark-border flex items-center gap-3 rounded-lg border border-gray-200 p-3"
                    >
                      <div className="flex-1">
                        <p className="dark:text-dark-text font-medium text-gray-900">
                          <span>{schedule.day}</span>
                          {schedule.time && (
                            <>
                              {" "}
                              um <span>{schedule.time}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  ))
                ) : ensemble.rehearsalDay || ensemble.rehearsalTime ? (
                  <div className="dark:border-dark-border flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                    <div className="flex-1">
                      {ensemble.rehearsalDay && (
                        <p className="dark:text-dark-text font-medium text-gray-900">
                          <span>Tag:</span> {ensemble.rehearsalDay}
                        </p>
                      )}
                      {ensemble.rehearsalTime && (
                        <p className="dark:text-dark-text mt-1 font-medium text-gray-900">
                          <span>Uhrzeit:</span> {ensemble.rehearsalTime}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="dark:text-dark-muted text-gray-500 italic">–</p>
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="dark:text-dark-muted text-sm text-gray-500">
                Probenort
              </dt>
              <dd className="dark:text-dark-text font-medium text-gray-900">
                {ensemble.location ? (
                  <span>
                    {ensemble.location.name}
                    {ensemble.location.street &&
                      `, ${ensemble.location.street}`}
                    {ensemble.location.city && `, ${ensemble.location.city}`}
                  </span>
                ) : (
                  "–"
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Contact Information */}
        <div className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
            Kontaktdaten
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="dark:text-dark-muted text-sm text-gray-500">
                E-Mail
              </dt>
              <dd className="dark:text-dark-text font-medium text-gray-900">
                {ensemble.contactEmail ? (
                  <a
                    href={`mailto:${ensemble.contactEmail}`}
                    className="text-primary hover:underline"
                  >
                    {ensemble.contactEmail}
                  </a>
                ) : (
                  "–"
                )}
              </dd>
            </div>
            <div>
              <dt className="dark:text-dark-muted text-sm text-gray-500">
                Telefon
              </dt>
              <dd className="dark:text-dark-text font-medium text-gray-900">
                {ensemble.contactPhone ? (
                  <a
                    href={`tel:${ensemble.contactPhone}`}
                    className="text-primary hover:underline"
                  >
                    {ensemble.contactPhone}
                  </a>
                ) : (
                  "–"
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="dark:text-dark-muted text-sm text-gray-500">
                Website
              </dt>
              <dd className="dark:text-dark-text font-medium text-gray-900">
                {ensemble.contactWebsite ? (
                  <a
                    href={ensemble.contactWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {ensemble.contactWebsite}
                  </a>
                ) : (
                  "–"
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Upcoming Events */}
        {ensemble.events && ensemble.events.length > 0 && (
          <div className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Kommende Termine
            </h2>
            <div className="space-y-3">
              {ensemble.events.slice(0, 5).map((event) => (
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
                        {new Date(event.eventDate).toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </div>
                    </div>
                  )}
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
                Erstellt am
              </dt>
              <dd className="dark:text-dark-text font-medium text-gray-900">
                {new Date(ensemble.createdAt).toLocaleDateString("de-DE", {
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
                {new Date(ensemble.updatedAt).toLocaleDateString("de-DE", {
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
            href="/dashboard/ensembles"
            className="dark:border-dark-border dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Zurück zur Übersicht
          </Link>
        </div>
    </DashboardPage>
  );
}
