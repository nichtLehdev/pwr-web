"use client";

import { useSession } from "@/lib/auth";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import Link from "next/link";
import Image from "next/image";
import { DashboardPage } from "@/app/_components/dashboard";
import { Tag } from "@/app/_components/programmheft/tag";
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

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageMaterials = hasPermission(
    PERMISSIONS.DOWNLOADS_MANAGE_BLAESERHEFTE,
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
      !permissionsLoading &&
      !canManageMaterials &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, permissionsLoading, canManageMaterials, router]);

  if (isPending || profileLoading || heftLoading) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageMaterials) {
    return null;
  }

  if (!heft) {
    return (
      <main className="bg-paper dark:bg-night min-h-screen">
        <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="border-rule dark:border-night-rule border p-12 text-center">
            <h2 className="condensed text-ink dark:text-night-text mb-4 text-xl font-bold">
              Bläserheft nicht gefunden
            </h2>
            <Link href="/dashboard/blaeserhefte" className="link-ink">
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
          className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors"
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
          <div className="border-rule dark:border-night-rule relative h-24 w-20 shrink-0 overflow-hidden border">
            <Image
              src={heft.image.url}
              alt={heft.title}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="border-rule dark:border-night-rule bg-rule/25 text-dark dark:bg-night-raised dark:text-night-muted flex h-24 w-20 shrink-0 items-center justify-center border">
            <BookIcon className="h-10 w-10" />
          </div>
        )}
        <Tag tone="inverse" className="mt-2">
          {heft.year}
        </Tag>
      </div>

      {/* Description */}
      <div className="border-rule dark:border-night-rule mb-6 border p-6">
        <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
          Beschreibung
        </h2>
        <p className="text-dark dark:text-night-muted whitespace-pre-wrap">
          {heft.description}
        </p>
      </div>

      {/* Prices and Availability */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        {/* Prices */}
        <div className="border-rule dark:border-night-rule border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
            Preise
          </h2>
          <dl className="space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-dark dark:text-night-muted">Bläserheft</dt>
              <dd className="text-ink dark:text-night-text font-medium">
                {heft.priceBlaeserheft ? `${heft.priceBlaeserheft} €` : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-dark dark:text-night-muted">Beiheft</dt>
              <dd className="text-ink dark:text-night-text font-medium">
                {heft.priceBeiheft ? `${heft.priceBeiheft} €` : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-dark dark:text-night-muted">
                Trompetenstimmen
              </dt>
              <dd className="text-ink dark:text-night-text font-medium">
                {heft.priceTrompeten ? `${heft.priceTrompeten} €` : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-dark dark:text-night-muted">CD</dt>
              <dd className="text-ink dark:text-night-text font-medium">
                {heft.priceCd ? `${heft.priceCd} €` : "—"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Availability */}
        <div className="border-rule dark:border-night-rule border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
            Verfügbarkeit
          </h2>
          <dl className="space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-dark dark:text-night-muted">Bläserheft</dt>
              <dd>
                {heft.availableBlaeserheft ? (
                  <Tag tone="ink">
                    <CheckIcon className="h-3 w-3" />
                    Verfügbar
                  </Tag>
                ) : (
                  <Tag tone="cancelled">
                    <XIcon className="h-3 w-3" />
                    Vergriffen
                  </Tag>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-dark dark:text-night-muted">Beiheft</dt>
              <dd>
                {heft.availableBeiheft ? (
                  <Tag tone="ink">
                    <CheckIcon className="h-3 w-3" />
                    Verfügbar
                  </Tag>
                ) : (
                  <Tag tone="cancelled">
                    <XIcon className="h-3 w-3" fill="currentColor" />
                    Vergriffen
                  </Tag>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-dark dark:text-night-muted">
                Trompetenstimmen
              </dt>
              <dd>
                {heft.availableTrompeten ? (
                  <Tag tone="ink">
                    <CheckIcon className="h-3 w-3" />
                    Verfügbar
                  </Tag>
                ) : (
                  <Tag tone="cancelled">
                    <XIcon className="h-3 w-3" />
                    Vergriffen
                  </Tag>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-dark dark:text-night-muted">CD</dt>
              <dd>
                {heft.availableCd ? (
                  <Tag tone="ink">
                    <CheckIcon className="h-3 w-3" />
                    Verfügbar
                  </Tag>
                ) : (
                  <Tag tone="cancelled">
                    <XIcon className="h-3 w-3" />
                    Vergriffen
                  </Tag>
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
          <div className="border-rule dark:border-night-rule border p-6">
            <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
              Kapitel
            </h2>
            <ul className="text-dark dark:text-night-muted space-y-2">
              {chapters.map((chapter, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="bg-rule/25 dark:bg-night-raised shrink-0 px-1.5 py-0.5 text-xs font-medium">
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
          <div className="border-rule dark:border-night-rule border p-6">
            <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
              Highlights
            </h2>
            <ul className="text-dark dark:text-night-muted space-y-2">
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
        <div className="border-rule dark:border-night-rule mb-6 border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
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
          className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 items-center gap-2 border px-4 py-2 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
      </div>
    </DashboardPage>
  );
}
