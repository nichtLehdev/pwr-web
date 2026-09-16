"use client";

import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import Link from "next/link";
import Image from "next/image";
import { DashboardPage } from "@/app/_components/dashboard";
import { Tag } from "@/app/_components/programmheft/tag";
import { EditIcon, TrashIcon } from "lucide-react";
import { ArrowLeftIcon } from "lucide-react";

const POSAUNENRAT_ROLE_LABELS: Record<string, string> = {
  VORSTAND: "Vorstand",
  LANDESKIRCHENMUSIKDIREKTOR: "Landeskirchenmusikdirektor",
  LANDESKIRCHENMUSIKDIREKTORIN: "Landeskirchenmusikdirektorin",
  SACHVERSTAENDIGER: "Sachverständiger",
  SACHVERSTAENDIGE: "Sachverständige",
};

export default function PosaunenratDetailPage() {
  const router = useRouter();
  const params = useParams();
  const memberId = params.id as string;
  const { data: session, isPending } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageOrganization = hasPermission(
    PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENRAT,
  );

  const { data: member, isLoading: memberLoading } =
    api.organization.getPosaunenratMember.useQuery(
      { id: memberId },
      { enabled: !!memberId && !!session?.user },
    );

  const deleteMutation = api.organization.deletePosaunenratMember.useMutation({
    onSuccess: () => {
      toast.success("Posaunenratsmitglied erfolgreich gelöscht");
      router.push("/dashboard/posaunenrat");
    },
    onError: (error) => {
      setIsDeleting(false);
      toast.error("Fehler beim Löschen: " + error.message);
    },
  });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/posaunenrat");
    }
  }, [isPending, session, router]);

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

  const handleDelete = async () => {
    if (!confirm("Möchtest du dieses Posaunenratsmitglied wirklich löschen?")) {
      return;
    }
    setIsDeleting(true);
    deleteMutation.mutate({ id: memberId });
  };

  if (isPending || profileLoading || memberLoading) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageOrganization) {
    return null;
  }

  if (!member) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-ink dark:text-night-text text-xl font-semibold">
            Posaunenratsmitglied nicht gefunden
          </h1>
          <Link
            href="/dashboard/posaunenrat"
            className="text-primary-ink dark:text-primary mt-4 inline-block hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const displayName = member.person.name || "Unbekannt";
  const displayEmail = member.person.email || "-";
  const displayBio = member.person.bio || null;
  const imageUrl = member.person.image?.url;

  return (
    <DashboardPage
      title={displayName}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Posaunenrat", href: "/dashboard/posaunenrat" },
        { label: displayName },
      ]}
      actions={
        <div className="flex gap-2">
          <Link
            href={`/dashboard/posaunenrat/${memberId}/edit`}
            className="bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted semi-condensed inline-flex min-h-11 items-center gap-2 px-4 py-2 font-semibold transition-colors"
          >
            <EditIcon className="h-4 w-4" />
            Bearbeiten
          </Link>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="semi-condensed inline-flex min-h-11 items-center gap-2 border border-red-300 px-4 py-2 font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            {isDeleting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            ) : (
              <TrashIcon className="h-4 w-4" />
            )}
            Löschen
          </button>
        </div>
      }
      maxWidth="7xl"
    >
      {/* Avatar and Role Badge */}
      <div className="mb-6 flex items-center gap-4">
        {imageUrl ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full">
            <Image
              src={imageUrl}
              alt={displayName}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="bg-rule/25 dark:bg-night-raised flex h-20 w-20 shrink-0 items-center justify-center rounded-full">
            <span className="text-dark dark:text-night-muted text-2xl font-medium">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <Tag tone="inverse">
          {POSAUNENRAT_ROLE_LABELS[member.role] || member.role}
        </Tag>
      </div>

      {/* Details */}
      <div className="space-y-6">
        {/* Contact Info */}
        <section className="border-rule dark:border-night-rule dark:bg-night-raised bg-paper border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
            Kontaktinformationen
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-dark dark:text-night-muted text-sm font-medium">
                E-Mail
              </dt>
              <dd className="text-ink dark:text-night-text mt-1">
                {displayEmail !== "-" ? (
                  <a
                    href={`mailto:${displayEmail}`}
                    className="text-primary-ink dark:text-primary hover:underline"
                  >
                    {displayEmail}
                  </a>
                ) : (
                  "-"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-dark dark:text-night-muted text-sm font-medium">
                Verknüpfung
              </dt>
              <dd className="text-ink dark:text-night-text mt-1">
                {member.user ? (
                  <Link
                    href={`/dashboard/users/${member.user.id}`}
                    className="text-primary-ink dark:text-primary hover:underline"
                  >
                    Benutzer anzeigen
                  </Link>
                ) : (
                  <span className="text-dark dark:text-night-muted">
                    Manueller Eintrag (kein Benutzerkonto)
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </section>

        {/* Description / Bio */}
        {displayBio && (
          <section className="border-rule dark:border-night-rule dark:bg-night-raised bg-paper border p-6">
            <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
              Beschreibung
            </h2>
            <p className="text-dark dark:text-night-muted whitespace-pre-wrap">
              {displayBio}
            </p>
          </section>
        )}

        {/* Meta Info */}
        <section className="border-rule dark:border-night-rule dark:bg-night-raised bg-paper border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
            Weitere Informationen
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-dark dark:text-night-muted text-sm font-medium">
                Reihenfolge
              </dt>
              <dd className="text-ink dark:text-night-text mt-1">
                {member.sortOrder}
              </dd>
            </div>
            <div>
              <dt className="text-dark dark:text-night-muted text-sm font-medium">
                Erstellt am
              </dt>
              <dd className="text-ink dark:text-night-text mt-1">
                {new Date(member.createdAt).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </dd>
            </div>
            <div>
              <dt className="text-dark dark:text-night-muted text-sm font-medium">
                Zuletzt aktualisiert
              </dt>
              <dd className="text-ink dark:text-night-text mt-1">
                {new Date(member.updatedAt).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Back Link */}
      <div className="mt-8">
        <Link
          href="/dashboard/posaunenrat"
          className="text-dark hover:text-primary-ink dark:text-night-muted dark:hover:text-primary inline-flex items-center gap-2"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
      </div>
    </DashboardPage>
  );
}
