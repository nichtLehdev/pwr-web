"use client";

import { useSession } from "@/lib/auth";
import { redirect, useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import { DashboardPage } from "@/app/_components/dashboard";
import { Edit, Trash2 } from "lucide-react";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const utils = api.useUtils();
  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: canManageUsers } = api.permissions.canManage.useQuery(
    undefined,
    { enabled: !!session?.user },
  );

  const { data: user, isLoading: userLoading } = api.users.getById.useQuery(
    { id: userId },
    { enabled: !!userId && !!session?.user },
  );

  const deleteMutation = api.users.delete.useMutation({
    onSuccess: () => {
      void utils.users.list.invalidate();
      void utils.users.getStatistics.invalidate();
      router.push("/dashboard/users");
    },
    onError: (error) => {
      alert(`Fehler beim Löschen: ${error.message}`);
      setShowDeleteModal(false);
    },
  });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/login?callbackUrl=/dashboard/users");
    }
  }, [isPending, session]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !canManageUsers &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      redirect("/dashboard");
    }
  }, [profile, profileLoading, canManageUsers]);

  if (isPending || profileLoading || userLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageUsers) {
    return null;
  }

  if (!user) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Benutzer nicht gefunden
          </h1>
          <Link
            href="/dashboard/users"
            className="text-primary mt-4 inline-block hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const userName =
    user.displayName ??
    (`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Unbenannt");

  return (
    <DashboardPage
      title={userName}
      description={user.email ?? undefined}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Benutzer", href: "/dashboard/users" },
        { label: userName },
      ]}
      actions={
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/users/${userId}/edit`}
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            <Edit className="h-4 w-4" />
            Bearbeiten
          </Link>
          {session?.user.id !== userId && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Löschen
            </button>
          )}
        </div>
      }
      maxWidth="7xl"
    >
      {/* Avatar and Role Badge */}
      <div className="mb-6 flex items-start gap-4">
        <div className="dark:bg-dark-border h-16 w-16 overflow-hidden rounded-full bg-gray-200">
          {user.profileImage?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.profileImage.url}
              alt={user.displayName ?? ""}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="dark:text-dark-muted flex h-full w-full items-center justify-center text-2xl font-bold text-gray-500">
              {(user.displayName ?? user.email)?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
        {user.districtRoleName && (
          <span className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            {user.districtRoleName}
          </span>
        )}
      </div>

        {/* User Info Sections */}
        <div className="space-y-6">
          {/* Basic Info */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Persönliche Informationen
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                  Vorname
                </dt>
                <dd className="dark:text-dark-text mt-1 text-gray-900">
                  {user.firstName ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                  Nachname
                </dt>
                <dd className="dark:text-dark-text mt-1 text-gray-900">
                  {user.lastName ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                  Anzeigename
                </dt>
                <dd className="dark:text-dark-text mt-1 text-gray-900">
                  {user.displayName ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                  Benutzername
                </dt>
                <dd className="dark:text-dark-text mt-1 text-gray-900">
                  {user.username ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                  E-Mail
                </dt>
                <dd className="dark:text-dark-text mt-1 text-gray-900">
                  {user.email}
                </dd>
              </div>
              <div>
                <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                  E-Mail bestätigt
                </dt>
                <dd className="dark:text-dark-text mt-1 text-gray-900">
                  {user.emailVerified ? (
                    <span className="text-green-600 dark:text-green-400">
                      Ja
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">
                      Nein
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          {/* Address */}
          {(user.street || user.zipCode || user.city) && (
            <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
                Adresse
              </h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                {user.street && (
                  <div className="sm:col-span-2">
                    <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                      Straße und Hausnummer
                    </dt>
                    <dd className="dark:text-dark-text mt-1 text-gray-900">
                      {user.street}
                    </dd>
                  </div>
                )}
                {user.zipCode && (
                  <div>
                    <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                      PLZ
                    </dt>
                    <dd className="dark:text-dark-text mt-1 text-gray-900">
                      {user.zipCode}
                    </dd>
                  </div>
                )}
                {user.city && (
                  <div>
                    <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                      Stadt
                    </dt>
                    <dd className="dark:text-dark-text mt-1 text-gray-900">
                      {user.city}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {/* Role & Permissions */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Rolle & Berechtigungen
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                  Rolle
                </dt>
                <dd className="mt-1">
                  {user.districtRoleName ? (
                    <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      {user.districtRoleName}
                    </span>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">–</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                  Angezeigte Rolle
                </dt>
                <dd className="dark:text-dark-text mt-1 text-gray-900">
                  {user.districtRoleName ?? "-"}
                </dd>
              </div>
              {user.bezirk && (
                <div className="sm:col-span-2">
                  <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                    Bezirk
                  </dt>
                  <dd className="dark:text-dark-text mt-1 text-gray-900">
                    Bezirk {user.bezirk.number} – {user.bezirk.shortName}
                    {user.districtRoleName && (
                      <span className="text-gray-500">
                        {" "}
                        ({user.districtRoleName})
                      </span>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {/* Memberships */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Mitgliedschaften
            </h2>
            <div className="flex flex-wrap gap-2">
              {user.teamMember && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  Team
                </span>
              )}
              {user.vorstandMember && (
                <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                  Vorstand
                </span>
              )}
              {user.posaunenratMember && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Posaunenrat
                </span>
              )}
              {user.foerdervereinMember && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  Förderverein
                </span>
              )}
              {!user.teamMember &&
                !user.vorstandMember &&
                !user.posaunenratMember &&
                !user.foerdervereinMember && (
                  <span className="dark:text-dark-muted text-sm text-gray-500">
                    Keine Mitgliedschaften
                  </span>
                )}
            </div>
          </section>

          {/* Metadata */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Kontodaten
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                  Erstellt am
                </dt>
                <dd className="dark:text-dark-text mt-1 text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
              <div>
                <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                  Zuletzt aktualisiert
                </dt>
                <dd className="dark:text-dark-text mt-1 text-gray-900">
                  {new Date(user.updatedAt).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="dark:text-dark-muted text-sm font-medium text-gray-500">
                  Benutzer-ID
                </dt>
                <dd className="dark:text-dark-text mt-1 font-mono text-sm text-gray-900">
                  {user.id}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <ScrollableModal>
            <ScrollableModalCard maxW="md">
              <ScrollableModalBody>
                <h3 className="dark:text-dark-text text-lg font-bold">
                  Benutzer löschen?
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Möchtest du diesen Benutzer wirklich unwiderruflich löschen?
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
              </ScrollableModalBody>
              <ScrollableModalFooter>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate({ id: userId })}
                    disabled={deleteMutation.isPending}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? "Löschen..." : "Löschen"}
                  </button>
                </div>
              </ScrollableModalFooter>
            </ScrollableModalCard>
          </ScrollableModal>
        )}
    </DashboardPage>
  );
}
