"use client";

import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import Image from "next/image";
import { DashboardPage } from "@/app/_components/dashboard";
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

  const { data: canManageOrganization } = api.permissions.canManage.useQuery(
    undefined,
    { enabled: !!session?.user },
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
      !canManageOrganization &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, canManageOrganization, router]);

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
      <main className="dark:bg-dark-background min-h-screen bg-gray-50">
        <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-xl font-semibold text-gray-900">
              Posaunenwart nicht gefunden
            </h2>
            <Link
              href="/dashboard/posaunenwarte"
              className="text-primary hover:text-primary/80"
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
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
          >
            <EditIcon className="h-4 w-4" />
            Bezirke bearbeiten
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
      {/* Avatar and Role Badge */}
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
          <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <UserIcon className="h-10 w-10" />
          </div>
        )}
        {(isLPW || isRPW) && (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
              isLPW
                ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
            }`}
          >
            {isLPW ? ROLE_LABELS["LPW"] : ROLE_LABELS["RPW"]}
          </span>
        )}
      </div>

      {/* Contact Info Card */}
      <div className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
          Kontaktinformationen
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
              E-Mail
            </dt>
            <dd className="dark:text-dark-text mt-1 text-gray-900">
              {member.email ? (
                <a
                  href={`mailto:${member.email}`}
                  className="text-primary hover:underline"
                >
                  {member.email}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
              Telefon
            </dt>
            <dd className="dark:text-dark-text mt-1 text-gray-900">
              {member.phone ? (
                <a
                  href={`tel:${member.phone}`}
                  className="text-primary hover:underline"
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
              <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                Angezeigte Rolle
              </dt>
              <dd className="dark:text-dark-text mt-1 text-gray-900">
                {member.districtRoleName}
              </dd>
            </div>
          )}
          {member.bio && (
            <div className="sm:col-span-2">
              <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                Beschreibung
              </dt>
              <dd className="dark:text-dark-text mt-1 whitespace-pre-wrap text-gray-900">
                {member.bio}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Bezirk Responsibilities */}
      <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="dark:text-dark-text text-lg font-semibold text-gray-900">
            Zuständige Bezirke
          </h2>
          <span className="dark:bg-dark-background-secondary dark:text-dark-muted rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-600">
            {member.bezirke?.length || 0} Bezirk
            {(member.bezirke?.length || 0) !== 1 ? "e" : ""}
          </span>
        </div>

        {isLPW && (!member.bezirke || member.bezirke.length === 0) && (
          <div className="dark:border-dark-border dark:bg-dark-background-secondary rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="flex gap-3">
              <MapPinIcon className="text-primary h-5 w-5 shrink-0" />
              <div className="dark:text-dark-text text-sm text-gray-700">
                <p className="font-medium">Landesposaunenwart</p>
                <p className="dark:text-dark-muted mt-1 text-gray-600">
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
                className="dark:border-dark-border dark:hover:bg-dark-background-secondary flex items-center justify-between rounded-lg border border-gray-100 p-4 transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="dark:bg-dark-background-secondary flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    <span className="dark:text-dark-text font-semibold text-gray-700">
                      {bezirk.number}
                    </span>
                  </div>
                  <div>
                    <p className="dark:text-dark-text font-medium text-gray-900">
                      Bezirk {bezirk.number}
                    </p>
                    {bezirk.name && (
                      <p className="dark:text-dark-muted text-sm text-gray-500">
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
            <div className="dark:text-dark-muted mx-auto mb-4 h-12 w-12 text-gray-400">
              <MapPinIcon className="h-12 w-12" />
            </div>
            <h3 className="dark:text-dark-text mb-2 text-lg font-semibold text-gray-900">
              Keine Bezirke zugewiesen
            </h3>
            <p className="dark:text-dark-muted mb-6 text-gray-600">
              Diesem Regionalposaunenwart wurden noch keine Bezirke zugewiesen.
            </p>
            <Link
              href={`/dashboard/posaunenwarte/${id}/edit`}
              className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
            >
              Bezirke zuweisen
            </Link>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/dashboard/posaunenwarte"
          className="dark:border-dark-border dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
        {member.userId && (
          <Link
            href={`/dashboard/users/${member.userId}`}
            className="dark:border-dark-border dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <UserIcon className="h-4 w-4" />
            Benutzerprofil öffnen
          </Link>
        )}
      </div>
    </DashboardPage>
  );
}
