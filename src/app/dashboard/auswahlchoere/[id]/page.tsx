"use client";

import { useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { DashboardPage } from "@/app/_components/dashboard";
import { Music, Edit, UserIcon, ArrowLeftIcon } from "lucide-react";

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

  const { data: canManageAuswahlchoere } = api.permissions.canManage.useQuery(
    undefined,
    { enabled: !!session?.user },
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
      !canManageAuswahlchoere &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, canManageAuswahlchoere, router]);

  if (sessionLoading || profileLoading || auswahlchorLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageAuswahlchoere) {
    return null;
  }

  if (!auswahlchor) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Auswahlchor nicht gefunden
          </h1>
          <Link
            href="/dashboard/auswahlchoere"
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
          className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
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
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
            <Image
              src={auswahlchor.image.url}
              alt={auswahlchor.name}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div
            className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-lg text-white`}
            style={{
              backgroundColor: auswahlchor.colorHex || "#faa619",
            }}
          >
            <Music className="h-10 w-10" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              auswahlchor.showApplication
                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {auswahlchor.showApplication
              ? "Bewerbung aktiv"
              : "Bewerbung inaktiv"}
          </span>
          <p className="dark:text-dark-muted text-sm text-gray-500">
            Slug: {auswahlchor.slug}
          </p>
        </div>
      </div>

        {/* Description */}
        {auswahlchor.description && (
          <div className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-3 text-lg font-semibold text-gray-900">
              Beschreibung
            </h2>
            <p className="dark:text-dark-muted whitespace-pre-wrap text-gray-600">
              {auswahlchor.description}
            </p>
          </div>
        )}

        {/* Details Grid */}
        <div className="mb-6 grid gap-6 sm:grid-cols-2">
          {/* Founded & Members */}
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Informationen
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="dark:text-dark-muted text-sm text-gray-500">
                  Gegründet
                </dt>
                <dd className="dark:text-dark-text font-medium text-gray-900">
                  {auswahlchor.founded}
                </dd>
              </div>
              <div>
                <dt className="dark:text-dark-muted text-sm text-gray-500">
                  Mitglieder
                </dt>
                <dd className="dark:text-dark-text font-medium text-gray-900">
                  {auswahlchor.members}
                </dd>
              </div>
            </dl>
          </div>

          {/* Conductor */}
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
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
                  <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <UserIcon className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <p className="dark:text-dark-text font-medium text-gray-900">
                    {auswahlchor.conductor.displayName ||
                      auswahlchor.conductor.email}
                  </p>
                  {auswahlchor.conductor.bio && (
                    <p className="dark:text-dark-muted mt-1 line-clamp-2 text-sm text-gray-500">
                      {auswahlchor.conductor.bio}
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
        </div>

        {/* Styling */}
        <div className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
            Styling
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="dark:text-dark-muted text-sm text-gray-500">
                Tailwind-Farbe
              </dt>
              <dd className="dark:text-dark-text font-medium text-gray-900">
                {auswahlchor.color || "–"}
              </dd>
            </div>
            <div>
              <dt className="dark:text-dark-muted text-sm text-gray-500">
                Hex-Farbe
              </dt>
              <dd className="flex items-center gap-2">
                <span className="dark:text-dark-text font-medium text-gray-900">
                  {auswahlchor.colorHex || "–"}
                </span>
                {auswahlchor.colorHex && (
                  <div
                    className="h-6 w-6 rounded border border-gray-300"
                    style={{ backgroundColor: auswahlchor.colorHex }}
                  />
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Upcoming Events */}
        {auswahlchor.events && auswahlchor.events.length > 0 && (
          <div className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Kommende Termine
            </h2>
            <div className="space-y-3">
              {auswahlchor.events.slice(0, 5).map((event) => (
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
                {new Date(auswahlchor.createdAt).toLocaleDateString("de-DE", {
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
                {new Date(auswahlchor.updatedAt).toLocaleDateString("de-DE", {
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
            href="/dashboard/auswahlchoere"
            className="dark:border-dark-border dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Zurück zur Übersicht
          </Link>
        </div>
    </DashboardPage>
  );
}
