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
import { ArrowLeftIcon, Edit, Trash2 } from "lucide-react";

export default function VorstandDetailPage() {
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
    PERMISSIONS.ORGANIZATION_MANAGE_VORSTAND,
  );

  const { data: member, isLoading: memberLoading } =
    api.organization.getVorstandMember.useQuery(
      { id: memberId },
      { enabled: !!memberId && !!session?.user },
    );

  const deleteMutation = api.organization.deleteVorstandMember.useMutation({
    onSuccess: () => {
      toast.success("Vorstandsmitglied erfolgreich gelöscht");
      router.push("/dashboard/vorstand");
    },
    onError: (error) => {
      toast.error("Fehler beim Löschen: " + error.message);
      setIsDeleting(false);
    },
  });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/vorstand");
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
    if (!confirm("Möchtest du dieses Vorstandsmitglied wirklich löschen?")) {
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
            Vorstandsmitglied nicht gefunden
          </h1>
          <Link
            href="/dashboard/vorstand"
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
  const imageUrl = member.image?.url || member.user?.profileImage?.url;

  return (
    <DashboardPage
      title={displayName}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Vorstand", href: "/dashboard/vorstand" },
        { label: displayName },
      ]}
      actions={
        <div className="flex gap-2">
          <Link
            href={`/dashboard/vorstand/${memberId}/edit`}
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
          >
            <Edit className="h-4 w-4" />
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
              <Trash2 className="h-4 w-4" />
            )}
            Löschen
          </button>
        </div>
      }
      maxWidth="7xl"
    >
      {/* Avatar and Position Badge */}
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
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            member.color ||
            "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
          }`}
        >
          {member.position}
        </span>
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
            <div>
              <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                Telefon
              </dt>
              <dd className="dark:text-dark-text mt-1 text-gray-900">
                {member.phone || "-"}
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
                Verknüpfter Benutzer
              </dt>
              <dd className="dark:text-dark-text mt-1 text-gray-900">
                {member.userId ? (
                  <Link
                    href={`/dashboard/users/${member.userId}`}
                    className="text-primary hover:underline"
                  >
                    Benutzer anzeigen
                  </Link>
                ) : (
                  <span className="dark:text-dark-muted text-gray-500">
                    Nicht verknüpft
                  </span>
                )}
              </dd>
            </div>
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
          href="/dashboard/vorstand"
          className="hover:text-primary dark:text-dark-muted dark:hover:text-primary inline-flex items-center gap-2 text-gray-600"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
      </div>
    </DashboardPage>
  );
}
