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
import {
  ArrowLeftIcon,
  EditIcon,
  MapPinIcon,
  Trash2,
  UserIcon,
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  LPW: "Landesposaunenwart",
  RPW: "Regionalposaunenwart",
};

export default function DashboardPosaunenwarteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
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
    PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENWARTE,
  );

  const { data: member, isLoading: memberLoading } =
    api.organization.getPosaunenwart.useQuery({ id }, { enabled: !!id });

  const deleteMutation = api.organization.deletePosaunenwart.useMutation({
    onSuccess: () => {
      toast.success("Posaunenwart erfolgreich gelöscht");
      router.push("/dashboard/posaunenwarte");
    },
    onError: (error) => {
      toast.error("Fehler beim Löschen: " + error.message);
      setIsDeleting(false);
    },
  });

  const handleDelete = async () => {
    if (!confirm("Möchtest du diesen Posaunenwart wirklich löschen?")) return;
    setIsDeleting(true);
    deleteMutation.mutate({ id });
  };

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/posaunenwarte/${id}`);
    }
  }, [isPending, session, router, id]);

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
      <main className="bg-paper dark:bg-night min-h-screen">
        <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="border-rule dark:border-night-rule dark:bg-night-raised bg-paper border p-12 text-center">
            <h2 className="text-ink dark:text-night-text mb-4 text-xl font-semibold">
              Posaunenwart nicht gefunden
            </h2>
            <Link
              href="/dashboard/posaunenwarte"
              className="text-primary-ink dark:text-primary hover:underline"
            >
              Zurück zur Übersicht
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isLPW = member.role === "LPW";
  const isRPW = member.role === "RPW";
  const displayName = member.name || "Unbekannt";

  return (
    <DashboardPage
      title={displayName}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Posaunenwarte", href: "/dashboard/posaunenwarte" },
        { label: displayName },
      ]}
      actions={
        <div className="flex gap-2">
          <Link
            href={`/dashboard/posaunenwarte/${id}/edit`}
            className="bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted semi-condensed inline-flex min-h-11 items-center gap-2 px-4 py-2 font-semibold transition-colors"
          >
            <EditIcon className="h-4 w-4" />
            Bezirke bearbeiten
          </Link>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="semi-condensed inline-flex min-h-11 items-center gap-2 border border-red-300 px-4 py-2 font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
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
      <div className="mb-6 flex items-center gap-4">
        {member.profileImage?.url ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full">
            <Image
              src={member.profileImage.url}
              alt={displayName}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="bg-rule/25 dark:bg-night-raised text-dark dark:text-night-muted flex h-20 w-20 shrink-0 items-center justify-center rounded-full">
            <UserIcon className="h-10 w-10" />
          </div>
        )}
        {(isLPW || isRPW) && (
          <Tag tone={isLPW ? "ink" : "inverse"}>
            {isLPW ? ROLE_LABELS["LPW"] : ROLE_LABELS["RPW"]}
          </Tag>
        )}
      </div>

      <div className="border-rule dark:border-night-rule dark:bg-night-raised bg-paper mb-6 border p-6">
        <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
          Kontaktinformationen
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-dark dark:text-night-muted text-sm font-medium">
              E-Mail
            </dt>
            <dd className="text-ink dark:text-night-text mt-1">
              {member.email ? (
                <a
                  href={`mailto:${member.email}`}
                  className="text-primary-ink dark:text-primary hover:underline"
                >
                  {member.email}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-dark dark:text-night-muted text-sm font-medium">
              Telefon
            </dt>
            <dd className="text-ink dark:text-night-text mt-1">
              {member.phone ? (
                <a
                  href={`tel:${member.phone}`}
                  className="text-primary-ink dark:text-primary hover:underline"
                >
                  {member.phone}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          {member.districtRoleName && (
            <div className="sm:col-span-2">
              <dt className="text-dark dark:text-night-muted text-sm font-medium">
                Angezeigte Rolle
              </dt>
              <dd className="text-ink dark:text-night-text mt-1">
                {member.districtRoleName}
              </dd>
            </div>
          )}
          {member.bio && (
            <div className="sm:col-span-2">
              <dt className="text-dark dark:text-night-muted text-sm font-medium">
                Beschreibung
              </dt>
              <dd className="text-ink dark:text-night-text mt-1 whitespace-pre-wrap">
                {member.bio}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="border-rule dark:border-night-rule dark:bg-night-raised bg-paper border p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="condensed text-ink dark:text-night-text text-lg font-bold">
            Zuständige Bezirke
          </h2>
          <Tag tone="inverse">
            {member.bezirke?.length || 0} Bezirk
            {(member.bezirke?.length || 0) !== 1 ? "e" : ""}
          </Tag>
        </div>

        {isLPW && (!member.bezirke || member.bezirke.length === 0) && (
          <div className="border-rule dark:border-night-rule bg-rule/25 dark:bg-night-raised border p-4">
            <div className="flex gap-3">
              <MapPinIcon className="text-primary-ink dark:text-primary h-5 w-5 shrink-0" />
              <div className="text-ink dark:text-night-text text-sm">
                <p className="font-medium">Landesposaunenwart</p>
                <p className="text-dark dark:text-night-muted mt-1">
                  Als Landesposaunenwart ist diese Person für alle Bezirke
                  zuständig. Es müssen keine spezifischen Bezirke zugewiesen
                  werden.
                </p>
              </div>
            </div>
          </div>
        )}

        {member.bezirke && member.bezirke.length > 0 && (
          <div className="space-y-3">
            {member.bezirke.map((bezirk) => (
              <div
                key={bezirk.id}
                className="border-rule dark:border-night-rule hover:bg-rule/25 dark:hover:bg-night-raised flex items-center justify-between border p-4 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-rule/25 dark:bg-night-raised flex h-10 w-10 items-center justify-center">
                    <span className="text-ink dark:text-night-text font-semibold">
                      {bezirk.number}
                    </span>
                  </div>
                  <div>
                    <p className="text-ink dark:text-night-text font-medium">
                      Bezirk {bezirk.number}
                    </p>
                    {bezirk.name && (
                      <p className="text-dark dark:text-night-muted text-sm">
                        {bezirk.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isRPW && (!member.bezirke || member.bezirke.length === 0) && (
          <div className="py-8 text-center">
            <div className="text-dark dark:text-night-muted mx-auto mb-4 h-12 w-12">
              <MapPinIcon className="h-12 w-12" />
            </div>
            <h3 className="condensed text-ink dark:text-night-text mb-2 text-lg font-bold">
              Keine Bezirke zugewiesen
            </h3>
            <p className="text-dark dark:text-night-muted mb-6">
              Diesem Regionalposaunenwart wurden noch keine Bezirke zugewiesen.
            </p>
            <Link
              href={`/dashboard/posaunenwarte/${id}/edit`}
              className="bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted semi-condensed inline-flex min-h-11 items-center gap-2 px-4 py-2 font-semibold transition-colors"
            >
              Bezirke zuweisen
            </Link>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/dashboard/posaunenwarte"
          className="border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night semi-condensed inline-flex min-h-11 items-center gap-2 border-2 px-4 py-2 font-semibold transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
        {member.userId && (
          <Link
            href={`/dashboard/users/${member.userId}`}
            className="border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night semi-condensed inline-flex min-h-11 items-center gap-2 border-2 px-4 py-2 font-semibold transition-colors"
          >
            <UserIcon className="h-4 w-4" />
            Benutzerprofil öffnen
          </Link>
        )}
      </div>
    </DashboardPage>
  );
}
