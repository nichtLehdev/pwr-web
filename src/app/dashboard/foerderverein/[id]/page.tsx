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
import { EditIcon } from "lucide-react";
import { TrashIcon } from "lucide-react";
import { ArrowLeftIcon } from "lucide-react";

const FOERDERVEREIN_ROLE_LABELS: Record<string, string> = {
  VORSITZENDER: "Vorsitzender",
  STELLVERTRETER: "Stellvertreter",
  SCHATZMEISTER: "Schatzmeister",
  SCHRIFTFUEHRER: "Schriftführer",
  BEISITZER: "Beisitzer",
  MITGLIED: "Mitglied",
};

export default function FoerdervereinDetailPage() {
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
    PERMISSIONS.ORGANIZATION_MANAGE_FOERDERVEREIN,
  );

  const { data: member, isLoading: memberLoading } =
    api.organization.getFoerdervereinMember.useQuery(
      { id: memberId },
      { enabled: !!memberId && !!session?.user },
    );

  const deleteMutation = api.organization.deleteFoerdervereinMember.useMutation(
    {
      onSuccess: () => {
        toast.success("Fördervereinsmitglied erfolgreich gelöscht");
        router.push("/dashboard/foerderverein");
      },
      onError: (error) => {
        setIsDeleting(false);
        toast.error("Fehler beim Löschen: " + error.message);
      },
    },
  );

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/foerderverein");
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
    if (
      !confirm("Möchtest du dieses Fördervereinsmitglied wirklich löschen?")
    ) {
      return;
    }
    setIsDeleting(true);
    deleteMutation.mutate({ id: memberId });
  };

  if (isPending || profileLoading || memberLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageOrganization) {
    return null;
  }

  if (!member) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Fördervereinsmitglied nicht gefunden
          </h1>
          <Link
            href="/dashboard/foerderverein"
            className="text-primary mt-4 inline-block hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const displayName = member.user?.displayName || member.name || "Unbekannt";
  const displayEmail = member.user?.email || member.email || "-";
  const displayBio = member.user?.bio || member.description || null;
  const imageUrl = member.user?.profileImage?.url || member.image?.url;

  return (
    <DashboardPage
      title={displayName}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Förderverein", href: "/dashboard/foerderverein" },
        { label: displayName },
      ]}
      actions={
        <div className="flex gap-2">
          <Link
            href={`/dashboard/foerderverein/${memberId}/edit`}
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
          >
            <EditIcon className="h-4 w-4" />
            Bearbeiten
          </Link>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
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
      {/* Avatar and Role Badges */}
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
          <div className="dark:bg-dark-background-secondary flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gray-100">
            <span className="dark:text-dark-muted text-2xl font-medium text-gray-500">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {member.position && (
            <span className="dark:text-dark-text text-gray-700">
              {member.position}
            </span>
          )}
          <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-sm font-medium text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
            {FOERDERVEREIN_ROLE_LABELS[member.role] || member.role}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-6">
        {/* Contact Info */}
        <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
            Kontaktinformationen
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                E-Mail
              </dt>
              <dd className="dark:text-dark-text mt-1 text-gray-900">
                {displayEmail !== "-" ? (
                  <a
                    href={`mailto:${displayEmail}`}
                    className="text-primary hover:underline"
                  >
                    {displayEmail}
                  </a>
                ) : (
                  "-"
                )}
              </dd>
            </div>
            {member.phone && (
              <div>
                <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                  Telefon
                </dt>
                <dd className="dark:text-dark-text mt-1 text-gray-900">
                  <a
                    href={`tel:${member.phone}`}
                    className="text-primary hover:underline"
                  >
                    {member.phone}
                  </a>
                </dd>
              </div>
            )}
            {member.memberSince && (
              <div>
                <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                  Mitglied seit
                </dt>
                <dd className="dark:text-dark-text mt-1 text-gray-900">
                  {new Date(member.memberSince).toLocaleDateString("de-DE", {
                    year: "numeric",
                    month: "long",
                  })}
                </dd>
              </div>
            )}
            <div>
              <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                Verknüpfung
              </dt>
              <dd className="dark:text-dark-text mt-1 text-gray-900">
                {member.user ? (
                  <Link
                    href={`/dashboard/users/${member.user.id}`}
                    className="text-primary hover:underline"
                  >
                    Benutzer anzeigen
                  </Link>
                ) : (
                  <span className="dark:text-dark-muted text-gray-500">
                    Manueller Eintrag (kein Benutzerkonto)
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </section>

        {/* Description / Bio */}
        {displayBio && (
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Beschreibung
            </h2>
            <p className="dark:text-dark-muted whitespace-pre-wrap text-gray-600">
              {displayBio}
            </p>
          </section>
        )}

        {/* Meta Info */}
        <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
            Weitere Informationen
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                Reihenfolge
              </dt>
              <dd className="dark:text-dark-text mt-1 text-gray-900">
                {member.sortOrder}
              </dd>
            </div>
            <div>
              <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                Erstellt am
              </dt>
              <dd className="dark:text-dark-text mt-1 text-gray-900">
                {new Date(member.createdAt).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </dd>
            </div>
            <div>
              <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                Zuletzt aktualisiert
              </dt>
              <dd className="dark:text-dark-text mt-1 text-gray-900">
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
          href="/dashboard/foerderverein"
          className="hover:text-primary dark:text-dark-muted dark:hover:text-primary inline-flex items-center gap-2 text-gray-600"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
      </div>
    </DashboardPage>
  );
}
