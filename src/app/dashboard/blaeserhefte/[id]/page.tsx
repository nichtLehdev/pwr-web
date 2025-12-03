"use client";

import { useSession } from "@/lib/auth";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import Image from "next/image";
import { UserRole } from "~/generated/prisma/enums";

// Only admins and LPW can access blaeserhefte management
const ALLOWED_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.LPW];

export default function DashboardBlaeserheftDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: heft, isLoading: heftLoading } =
    api.materials.getBlaserheftById.useQuery({ id }, { enabled: !!id });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/blaeserhefte/${id}`);
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

  if (isPending || profileLoading || heftLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !ALLOWED_ROLES.includes(profile.role)) {
    return null;
  }

  if (!heft) {
    return (
      <main className="dark:bg-dark-background min-h-screen bg-gray-50">
        <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-xl font-semibold text-gray-900">
              Bläserheft nicht gefunden
            </h2>
            <Link
              href="/dashboard/blaeserhefte"
              className="text-primary hover:text-primary/80"
            >
              Zurück zur Übersicht
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const chapters =
    typeof heft.chapters === "string"
      ? heft.chapters.split("\n").filter(Boolean)
      : Array.isArray(heft.chapters)
        ? heft.chapters
        : [];
  const highlights =
    typeof heft.highlights === "string"
      ? heft.highlights.split("\n").filter(Boolean)
      : Array.isArray(heft.highlights)
        ? heft.highlights
        : [];

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
                href="/dashboard/blaeserhefte"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Bläserhefte
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">{heft.title}</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {heft.image?.url ? (
              <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg shadow-md">
                <Image
                  src={heft.image.url}
                  alt={heft.title}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-24 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 shadow-md">
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
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
            )}
            <div>
              <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
                {heft.title}
              </h1>
              <p className="dark:text-dark-muted mt-1 text-lg text-gray-600">
                {heft.subtitle}
              </p>
              <span className="dark:bg-dark-background-secondary dark:text-dark-text mt-2 inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
                {heft.year}
              </span>
            </div>
          </div>
          <Link
            href={`/dashboard/blaeserhefte/${id}/edit`}
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
        <div className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
            Beschreibung
          </h2>
          <p className="dark:text-dark-muted whitespace-pre-wrap text-gray-700">
            {heft.description}
          </p>
        </div>

        {/* Prices and Availability */}
        <div className="mb-6 grid gap-6 md:grid-cols-2">
          {/* Prices */}
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Preise
            </h2>
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className="dark:text-dark-muted text-gray-600">
                  Bläserheft
                </dt>
                <dd className="dark:text-dark-text font-medium text-gray-900">
                  {heft.priceBlaeserheft ? `${heft.priceBlaeserheft} €` : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="dark:text-dark-muted text-gray-600">Beiheft</dt>
                <dd className="dark:text-dark-text font-medium text-gray-900">
                  {heft.priceBeiheft ? `${heft.priceBeiheft} €` : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="dark:text-dark-muted text-gray-600">
                  Trompetenstimmen
                </dt>
                <dd className="dark:text-dark-text font-medium text-gray-900">
                  {heft.priceTrompeten ? `${heft.priceTrompeten} €` : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="dark:text-dark-muted text-gray-600">CD</dt>
                <dd className="dark:text-dark-text font-medium text-gray-900">
                  {heft.priceCd ? `${heft.priceCd} €` : "—"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Availability */}
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Verfügbarkeit
            </h2>
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className="dark:text-dark-muted text-gray-600">
                  Bläserheft
                </dt>
                <dd>
                  {heft.availableBlaeserheft ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      <svg
                        className="h-3 w-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Verfügbar
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                      <svg
                        className="h-3 w-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Vergriffen
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="dark:text-dark-muted text-gray-600">Beiheft</dt>
                <dd>
                  {heft.availableBeiheft ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      <svg
                        className="h-3 w-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Verfügbar
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                      <svg
                        className="h-3 w-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Vergriffen
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="dark:text-dark-muted text-gray-600">
                  Trompetenstimmen
                </dt>
                <dd>
                  {heft.availableTrompeten ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      <svg
                        className="h-3 w-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Verfügbar
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                      <svg
                        className="h-3 w-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Vergriffen
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="dark:text-dark-muted text-gray-600">CD</dt>
                <dd>
                  {heft.availableCd ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      <svg
                        className="h-3 w-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Verfügbar
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                      <svg
                        className="h-3 w-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Vergriffen
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Chapters and Highlights */}
        <div className="mb-6 grid gap-6 md:grid-cols-2">
          {/* Chapters */}
          {chapters.length > 0 && (
            <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
                Kapitel
              </h2>
              <ul className="dark:text-dark-muted space-y-2 text-gray-700">
                {chapters.map((chapter, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="dark:bg-dark-background-secondary shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium">
                      {index + 1}
                    </span>
                    <span>{String(chapter)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Highlights */}
          {highlights.length > 0 && (
            <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
                Highlights
              </h2>
              <ul className="dark:text-dark-muted space-y-2 text-gray-700">
                {highlights.map((highlight, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <svg
                      className="text-primary mt-0.5 h-4 w-4 shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{String(highlight)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Audio Sample */}
        {heft.audioSample && (
          <div className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Hörprobe
            </h2>
            <audio controls className="w-full">
              <source src={heft.audioSample} type="audio/mpeg" />
              Dein Browser unterstützt das Audio-Element nicht.
            </audio>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/blaeserhefte"
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
        </div>
      </div>
    </main>
  );
}
