"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import Image from "next/image";
import { UserRole } from "~/generated/prisma/enums";
import { EditIcon, PlusIcon, TrashIcon } from "lucide-react";
import { UsersIcon } from "lucide-react";

const ALLOWED_ROLES: UserRole[] = [UserRole.ADMIN];

const POSAUNENRAT_ROLE_LABELS: Record<string, string> = {
  VORSTAND: "Vorstand",
  BEZIRKSOBMANN: "Bezirksobmann",
  BEZIRKSOBFRAU: "Bezirksobfrau",
  LANDESKIRCHENMUSIKDIREKTOR: "Landeskirchenmusikdirektor",
  SACHVERSTAENDIGER: "Sachverständiger",
  SACHVERSTAENDIGE: "Sachverständige",
};

export default function DashboardPosaunenratPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const {
    data: members,
    isLoading: membersLoading,
    refetch,
  } = api.organization.getPosaunenrat.useQuery();

  const deleteMutation = api.organization.deletePosaunenratMember.useMutation({
    onSuccess: () => {
      void refetch();
      setDeletingId(null);
      toast.success("Posaunenratsmitglied erfolgreich gelöscht");
    },
    onError: (error) => {
      setDeletingId(null);
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
    if (!profileLoading && profile && !hasRedirected.current) {
      if (!ALLOWED_ROLES.includes(profile.role)) {
        hasRedirected.current = true;
        router.push("/dashboard");
      }
    }
  }, [profile, profileLoading, router]);

  const handleDelete = async (id: string) => {
    if (!confirm("Möchtest du dieses Posaunenratsmitglied wirklich löschen?")) {
      return;
    }
    setDeletingId(id);
    deleteMutation.mutate({ id });
  };

  if (isPending || profileLoading || membersLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !ALLOWED_ROLES.includes(profile.role)) {
    return null;
  }

  return (
    <main className="dark:bg-dark-background min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
            <li className="dark:text-dark-text text-gray-900">Posaunenrat</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
              Posaunenrat
            </h1>
            <p className="dark:text-dark-muted mt-2 text-gray-600">
              Verwalte die Mitglieder des Posaunenrats
            </p>
          </div>
          <Link
            href="/dashboard/posaunenrat/new"
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-medium text-white transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Neues Mitglied
          </Link>
        </div>

        {/* Members List */}
        {!members || members.length === 0 ? (
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="dark:text-dark-muted mx-auto mb-4 h-12 w-12 text-gray-400">
              <UsersIcon className="h-12 w-12" />
            </div>
            <h3 className="dark:text-dark-text mb-2 text-lg font-semibold text-gray-900">
              Keine Posaunenratsmitglieder
            </h3>
            <p className="dark:text-dark-muted mb-6 text-gray-600">
              Es wurden noch keine Posaunenratsmitglieder angelegt.
            </p>
            <Link
              href="/dashboard/posaunenrat/new"
              className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
            >
              Erstes Mitglied anlegen
            </Link>
          </div>
        ) : (
          <div className="dark:border-dark-border dark:bg-dark-surface overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="dark:border-dark-border dark:bg-dark-background-secondary border-b border-gray-200 bg-gray-50">
                    <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Mitglied
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Rolle
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Verknüpfung
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {members.map((member) => {
                    const displayName =
                      member.user?.displayName || member.name || "Unbekannt";
                    const displayEmail =
                      member.user?.email || member.email || "-";
                    const imageUrl =
                      member.user?.profileImage?.url || member.image?.url;

                    return (
                      <tr
                        key={member.id}
                        className="dark:hover:bg-dark-background-secondary hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {imageUrl ? (
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                                <Image
                                  src={imageUrl}
                                  alt={displayName}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="dark:bg-dark-background-secondary flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
                                <span className="dark:text-dark-muted text-sm font-medium text-gray-500">
                                  {displayName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <Link
                                href={`/dashboard/posaunenrat/${member.id}`}
                                className="hover:text-primary dark:text-dark-text font-medium text-gray-900"
                              >
                                {displayName}
                              </Link>
                              <p className="dark:text-dark-muted text-sm text-gray-500">
                                {displayEmail}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            {POSAUNENRAT_ROLE_LABELS[member.role] ||
                              member.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {member.user ? (
                            <Link
                              href={`/dashboard/users/${member.user.id}`}
                              className="text-primary text-sm hover:underline"
                            >
                              Benutzer verknüpft
                            </Link>
                          ) : (
                            <span className="dark:text-dark-muted text-sm text-gray-500">
                              Manueller Eintrag
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/dashboard/posaunenrat/${member.id}/edit`}
                              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                              title="Bearbeiten"
                            >
                              <EditIcon className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(member.id)}
                              disabled={deletingId === member.id}
                              className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:hover:bg-red-900/20"
                              title="Löschen"
                            >
                              {deletingId === member.id ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                              ) : (
                                <TrashIcon className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
