"use client";

import { useSession } from "@/lib/auth";
import { redirect, useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import Link from "next/link";
import { DashboardPage } from "@/app/_components/dashboard";
import { Edit, Trash2 } from "lucide-react";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import { Tag } from "@/app/_components/programmheft/tag";
import { formatBerlin } from "@/lib/berlin-time";

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

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageUsers = hasPermission(PERMISSIONS.USERS_VIEW);

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
      !permissionsLoading &&
      !canManageUsers &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      redirect("/dashboard");
    }
  }, [profile, profileLoading, permissionsLoading, canManageUsers]);

  if (isPending || profileLoading || userLoading) {
    return (
      <div className="dark:bg-night bg-paper flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageUsers) {
    return null;
  }

  if (!user) {
    return (
      <div className="dark:bg-night bg-paper flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-ink dark:text-night-text text-xl font-semibold">
            Benutzer nicht gefunden
          </h1>
          <Link href="/dashboard/users" className="link-ink mt-4 inline-block">
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
            className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors"
          >
            <Edit className="h-4 w-4" />
            Bearbeiten
          </Link>
          {session?.user.id !== userId && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-paper dark:text-night inline-flex min-h-11 items-center gap-2 bg-red-700 px-4 py-2 text-sm font-semibold transition-colors hover:bg-red-800 dark:bg-red-400 dark:hover:bg-red-300"
            >
              <Trash2 className="h-4 w-4" />
              Löschen
            </button>
          )}
        </div>
      }
      maxWidth="7xl"
    >
      <div className="mb-6 flex items-start gap-4">
        <div className="bg-rule/60 dark:bg-night-raised h-16 w-16 overflow-hidden rounded-full">
          {user.profileImage?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.profileImage.url}
              alt={user.displayName ?? ""}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="text-dark dark:text-night-muted flex h-full w-full items-center justify-center text-2xl font-bold">
              {(user.displayName ?? user.email)?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <section className="border-rule dark:border-night-rule border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
            Persönliche Informationen
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-dark dark:text-night-muted text-sm font-medium">
                Vorname
              </dt>
              <dd className="text-ink dark:text-night-text mt-1">
                {user.firstName ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-dark dark:text-night-muted text-sm font-medium">
                Nachname
              </dt>
              <dd className="text-ink dark:text-night-text mt-1">
                {user.lastName ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-dark dark:text-night-muted text-sm font-medium">
                Anzeigename
              </dt>
              <dd className="text-ink dark:text-night-text mt-1">
                {user.displayName ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-dark dark:text-night-muted text-sm font-medium">
                Benutzername
              </dt>
              <dd className="text-ink dark:text-night-text mt-1">
                {user.username ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-dark dark:text-night-muted text-sm font-medium">
                E-Mail
              </dt>
              <dd className="text-ink dark:text-night-text mt-1">
                {user.email}
              </dd>
            </div>
            <div>
              <dt className="text-dark dark:text-night-muted text-sm font-medium">
                E-Mail bestätigt
              </dt>
              <dd className="text-ink dark:text-night-text mt-1">
                {user.emailVerified ? (
                  <span className="dark:text-night-text text-ink">Ja</span>
                ) : (
                  <span className="text-dark dark:text-night-muted">Nein</span>
                )}
              </dd>
            </div>
          </dl>
        </section>

        {(user.street || user.zipCode || user.city) && (
          <section className="border-rule dark:border-night-rule border p-6">
            <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
              Adresse
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              {user.street && (
                <div className="sm:col-span-2">
                  <dt className="text-dark dark:text-night-muted text-sm font-medium">
                    Straße und Hausnummer
                  </dt>
                  <dd className="text-ink dark:text-night-text mt-1">
                    {user.street}
                  </dd>
                </div>
              )}
              {user.zipCode && (
                <div>
                  <dt className="text-dark dark:text-night-muted text-sm font-medium">
                    PLZ
                  </dt>
                  <dd className="text-ink dark:text-night-text mt-1">
                    {user.zipCode}
                  </dd>
                </div>
              )}
              {user.city && (
                <div>
                  <dt className="text-dark dark:text-night-muted text-sm font-medium">
                    Stadt
                  </dt>
                  <dd className="text-ink dark:text-night-text mt-1">
                    {user.city}
                  </dd>
                </div>
              )}
            </dl>
          </section>
        )}

        <section className="border-rule dark:border-night-rule border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
            Mitgliedschaften
          </h2>
          <div className="flex flex-wrap gap-2">
            {user.teamMember && (
              <Tag tone="inverse">
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 bg-blue-600 dark:bg-blue-400"
                />
                Team
              </Tag>
            )}
            {user.vorstandMember && (
              <Tag tone="inverse">
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 bg-purple-600 dark:bg-purple-400"
                />
                Vorstand
              </Tag>
            )}
            {user.posaunenratMember && (
              <Tag tone="inverse">
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 bg-green-600 dark:bg-green-400"
                />
                Posaunenrat
              </Tag>
            )}
            {user.foerdervereinMember && (
              <Tag tone="inverse">
                <span
                  aria-hidden
                  className="bg-foerderverein dark:bg-foerderverein-light h-2 w-2 shrink-0"
                />
                Förderverein
              </Tag>
            )}
            {!user.teamMember &&
              !user.vorstandMember &&
              !user.posaunenratMember &&
              !user.foerdervereinMember && (
                <span className="text-dark dark:text-night-muted text-sm">
                  Keine Mitgliedschaften
                </span>
              )}
          </div>
        </section>

        <section className="border-rule dark:border-night-rule border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
            Kontodaten
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-dark dark:text-night-muted text-sm font-medium">
                Erstellt am
              </dt>
              <dd className="text-ink dark:text-night-text mt-1">
                {formatBerlin(user.createdAt, "datumUhrzeit")}
              </dd>
            </div>
            <div>
              <dt className="text-dark dark:text-night-muted text-sm font-medium">
                Zuletzt aktualisiert
              </dt>
              <dd className="text-ink dark:text-night-text mt-1">
                {formatBerlin(user.updatedAt, "datumUhrzeit")}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-dark dark:text-night-muted text-sm font-medium">
                Benutzer-ID
              </dt>
              <dd className="text-ink dark:text-night-text mt-1 font-mono text-sm">
                {user.id}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {showDeleteModal && (
        <ScrollableModal>
          <ScrollableModalCard maxW="md">
            <ScrollableModalBody>
              <h3 className="text-ink dark:text-night-text text-lg font-bold">
                Benutzer löschen?
              </h3>
              <p className="text-dark dark:text-night-muted mt-2 text-sm">
                Möchtest du diesen Benutzer wirklich unwiderruflich löschen?
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
            </ScrollableModalBody>
            <ScrollableModalFooter>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/60 dark:hover:bg-night-rule inline-flex min-h-11 items-center border-2 px-4 py-2 text-sm font-semibold transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => deleteMutation.mutate({ id: userId })}
                  disabled={deleteMutation.isPending}
                  className="text-paper dark:text-night inline-flex min-h-11 items-center bg-red-700 px-4 py-2 text-sm font-semibold transition-colors hover:bg-red-800 disabled:opacity-50 dark:bg-red-400 dark:hover:bg-red-300"
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
