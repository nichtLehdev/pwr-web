"use client";

import { useSession } from "@/lib/auth";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import Image from "next/image";
import { DashboardPage } from "@/app/_components/dashboard";
import {
  ArrowLeftIcon,
  BookIcon,
  CheckIcon,
  PencilIcon,
  XIcon,
} from "lucide-react";

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

  const { data: canManageMaterials } = api.permissions.canManage.useQuery(
    undefined,
    { enabled: !!session?.user },
  );

  const { data: heft, isLoading: heftLoading } =
    api.materials.getBlaserheftById.useQuery({ id }, { enabled: !!id });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/blaeserhefte/${id}`);
    }
  }, [isPending, session, router, id]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !canManageMaterials &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, canManageMaterials, router]);

  if (isPending || profileLoading || heftLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageMaterials) {
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
    <DashboardPage
      title={heft.title}
      description={heft.subtitle ?? undefined}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Bläserhefte", href: "/dashboard/blaeserhefte" },
        { label: heft.title },
      ]}
      actions={
        <Link
          href={`/dashboard/blaeserhefte/${id}/edit`}
          className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
        >
          <PencilIcon className="h-4 w-4" />
          Bearbeiten
        </Link>
      }
      maxWidth="7xl"
    >
      {/* Cover Image and Year Badge */}
      <div className="mb-6 flex items-start gap-4">
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
            <BookIcon className="h-10 w-10" />
          </div>
        )}
        <span className="dark:bg-dark-background-secondary dark:text-dark-text mt-2 inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
          {heft.year}
        </span>
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
                      <CheckIcon className="h-3 w-3" />
                      Verfügbar
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                      <XIcon className="h-3 w-3" />
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
                      <CheckIcon className="h-3 w-3" />
                      Verfügbar
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                      <XIcon className="h-3 w-3" fill="currentColor" />
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
                      <CheckIcon className="h-3 w-3" />
                      Verfügbar
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                      <XIcon className="h-3 w-3" />
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
                      <CheckIcon className="h-3 w-3" />
                      Verfügbar
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                      <XIcon className="h-3 w-3" />
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
                    <CheckIcon className="h-3 w-3" />
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
            <ArrowLeftIcon className="h-4 w-4" />
            Zurück zur Übersicht
          </Link>
        </div>
    </DashboardPage>
  );
}
