"use client";

import { useMemo, useState } from "react";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import Link from "next/link";
import Image from "next/image";
import { DashboardPage } from "@/app/_components/dashboard";
import {
  DataTable,
  createDataTableColumnHelper,
  type DataTableColumn,
} from "@/app/_components/ui/data-table";
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

type TeamMember = RouterOutputs["organization"]["getTeam"][number];

const column = createDataTableColumnHelper<TeamMember>();

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

  const columns = useMemo<DataTableColumn<TeamMember>[]>(
    () =>
      column.columns([
        // Die gespeicherte Reihenfolge als eigene Spalte: nur so bleiben die
        // Hoch/Runter-Pfeile nachvollziehbar, wenn nach etwas anderem sortiert
        // wird — sie verschieben immer die gespeicherte Position, nie die Sicht.
        column.accessor((member) => (teamMembers?.indexOf(member) ?? 0) + 1, {
          id: "position",
          header: "#",
          enableColumnFilter: false,
          meta: { align: "right", label: "Reihenfolge" },
        }),
        column.accessor((member) => member.person.name || "Unbekannt", {
          id: "member",
          header: "Mitglied",
          meta: { alwaysVisible: true },
          cell: ({ row }) => {
            const member = row.original;
            const displayName = member.person.name || "Unbekannt";
            const imageUrl = member.person.image?.url;
            return (
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
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/team/${member.id}`}
                    className="hover:text-primary dark:text-dark-text font-medium text-gray-900"
                  >
                    {displayName}
                  </Link>
                  {!member.userId && (
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                      ohne Konto
                    </span>
                  )}
                  <p className="dark:text-dark-muted text-sm text-gray-500">
                    {member.person.email || "-"}
                  </p>
                </div>
              </div>
            );
          },
        }),
        column.accessor((member) => member.role ?? "", {
          id: "role",
          header: "Rolle",
          cell: ({ getValue }) => getValue() || "-",
        }),
        column.accessor(
          (member) =>
            member.contactType
              ? (CONTACT_TYPE_LABELS[member.contactType] ?? member.contactType)
              : "",
          {
            id: "contactType",
            header: "Bereich",
            meta: { filterVariant: "set" },
            cell: ({ getValue }) =>
              getValue() ? (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  {getValue()}
                </span>
              ) : (
                <span className="dark:text-dark-muted text-sm text-gray-500">
                  -
                </span>
              ),
          },
        ),
        column.accessor(
          (member) => (member.responsibilities ?? []).join(" · "),
          {
            id: "responsibilities",
            header: "Aufgaben",
            cell: ({ row }) => {
              const items = row.original.responsibilities ?? [];
              if (items.length === 0) {
                return (
                  <span className="dark:text-dark-muted text-sm text-gray-500">
                    -
                  </span>
                );
              }
              return (
                <ul className="dark:text-dark-muted max-w-xs text-sm text-gray-600">
                  {items.slice(0, 2).map((entry, i) => (
                    <li key={i} className="truncate">
                      • {entry}
                    </li>
                  ))}
                  {items.length > 2 && (
                    <li className="text-gray-400">
                      + {items.length - 2} weitere
                    </li>
                  )}
                </ul>
              );
            },
          },
        ),
        column.display({
          id: "actions",
          header: "Aktionen",
          meta: { align: "right", label: "Aktionen" },
          cell: ({ row }) => {
            const index = teamMembers?.indexOf(row.original) ?? -1;
            return (
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => void handleMove(index, "up")}
                  disabled={index <= 0 || isReordering}
                  aria-label="Nach oben"
                  title="Nach oben"
                  className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                >
                  <ChevronUpIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => void handleMove(index, "down")}
                  disabled={
                    index === -1 ||
                    index === (teamMembers?.length ?? 0) - 1 ||
                    isReordering
                  }
                  aria-label="Nach unten"
                  title="Nach unten"
                  className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                >
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
                <Link
                  href={`/dashboard/team/${row.original.id}/edit`}
                  className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                  title="Bearbeiten"
                >
                  <EditIcon className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => handleDelete(row.original.id)}
                  disabled={deletingId === row.original.id}
                  className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:hover:bg-red-900/20"
                  title="Löschen"
                >
                  {deletingId === row.original.id ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                  ) : (
                    <TrashIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            );
          },
        }),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [teamMembers, deletingId, isReordering],
  );

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
      <DataTable
        data={teamMembers}
        columns={columns}
        getRowId={(member) => member.id}
        isLoading={membersLoading}
        rowNoun={["Teammitglied", "Teammitglieder"]}
        searchPlaceholder="Name, E-Mail oder Rolle suchen…"
        initialSorting={[{ id: "position", desc: false }]}
        emptyState={
          <>
            <UsersIcon className="dark:text-dark-muted mx-auto h-12 w-12 text-gray-400" />
            <h3 className="dark:text-dark-text mt-4 mb-2 text-lg font-semibold text-gray-900">
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
          </>
        }
      />
    </DashboardPage>
  );
}
