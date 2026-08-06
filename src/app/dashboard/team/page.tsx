"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import Link from "next/link";
import Image from "next/image";
import { DashboardPage } from "@/app/_components/dashboard";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  EditIcon,
  Plus,
  TrashIcon,
  UsersIcon,
} from "lucide-react";
import { computeReorderUpdates } from "@/lib/reorder";

const CONTACT_TYPE_LABELS: Record<string, string> = {
  GESCHAEFTSSTELLE: "Geschäftsstelle",
  INTERNET_TEAM: "Internet-Team",
};

export default function DashboardTeamPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageOrganization = hasPermission(
    PERMISSIONS.ORGANIZATION_MANAGE_TEAM,
  );

  const {
    data: teamMembers,
    isLoading: membersLoading,
    refetch,
  } = api.organization.getTeam.useQuery();

  const reorderMutation = api.organization.updateTeamMember.useMutation();

  const deleteMutation = api.organization.deleteTeamMember.useMutation({
    onSuccess: () => {
      toast.success("Teammitglied erfolgreich gelöscht");
      void refetch();
      setDeletingId(null);
    },
    onError: (error) => {
      toast.error("Fehler beim Löschen: " + error.message);
      setDeletingId(null);
    },
  });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/team");
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

  const handleDelete = async (id: string) => {
    if (!confirm("Möchtest du dieses Teammitglied wirklich löschen?")) {
      return;
    }
    setDeletingId(id);
    deleteMutation.mutate({ id });
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (!teamMembers || isReordering) return;
    const updates = computeReorderUpdates(teamMembers, index, direction);
    if (!updates) return;
    setIsReordering(true);
    try {
      for (const update of updates) {
        await reorderMutation.mutateAsync({
          id: update.id,
          sortOrder: update.sortOrder,
        });
      }
      await refetch();
    } catch (error) {
      toast.error(
        "Fehler beim Ändern der Reihenfolge: " +
          (error instanceof Error ? error.message : "Unbekannter Fehler"),
      );
    } finally {
      setIsReordering(false);
    }
  };

  if (isPending || profileLoading || membersLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageOrganization) {
    return null;
  }

  return (
    <DashboardPage
      title="Team"
      description="Verwalte die Teammitglieder (Geschäftsstelle, Internet-Team)"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Team" },
      ]}
      actions={
        <Link
          href="/dashboard/team/new"
          className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-medium text-white transition-colors"
        >
          <Plus className="h-5 w-5" />
          Neues Mitglied
        </Link>
      }
    >
      {/* Members List */}
      {!teamMembers || teamMembers.length === 0 ? (
        <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="dark:text-dark-muted mx-auto mb-4 h-12 w-12 text-gray-400">
            <UsersIcon className="h-12 w-12" />
          </div>
          <h3 className="dark:text-dark-text mb-2 text-lg font-semibold text-gray-900">
            Keine Teammitglieder
          </h3>
          <p className="dark:text-dark-muted mb-6 text-gray-600">
            Es wurden noch keine Teammitglieder angelegt.
          </p>
          <Link
            href="/dashboard/team/new"
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
                    Bereich
                  </th>
                  <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Aufgaben
                  </th>
                  <th className="dark:text-dark-muted px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {teamMembers.map((member, index) => {
                  const displayName = member.user?.displayName || "Unbekannt";
                  const displayEmail = member.user?.email || "-";
                  const imageUrl = member.user?.profileImage?.url;

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
                              href={`/dashboard/team/${member.id}`}
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
                        <span className="dark:text-dark-text text-sm text-gray-900">
                          {member.role || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {member.contactType ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            {CONTACT_TYPE_LABELS[member.contactType] ||
                              member.contactType}
                          </span>
                        ) : (
                          <span className="dark:text-dark-muted text-sm text-gray-500">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          {member.responsibilities &&
                          member.responsibilities.length > 0 ? (
                            <ul className="dark:text-dark-muted text-sm text-gray-600">
                              {member.responsibilities
                                .slice(0, 2)
                                .map((r, i) => (
                                  <li key={i} className="truncate">
                                    • {r}
                                  </li>
                                ))}
                              {member.responsibilities.length > 2 && (
                                <li className="text-gray-400">
                                  + {member.responsibilities.length - 2} weitere
                                </li>
                              )}
                            </ul>
                          ) : (
                            <span className="dark:text-dark-muted text-sm text-gray-500">
                              -
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => void handleMove(index, "up")}
                            disabled={index === 0 || isReordering}
                            aria-label="Nach oben"
                            title="Nach oben"
                            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                          >
                            <ChevronUpIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => void handleMove(index, "down")}
                            disabled={
                              index === teamMembers.length - 1 || isReordering
                            }
                            aria-label="Nach unten"
                            title="Nach unten"
                            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                          >
                            <ChevronDownIcon className="h-4 w-4" />
                          </button>
                          <Link
                            href={`/dashboard/team/${member.id}/edit`}
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
    </DashboardPage>
  );
}
