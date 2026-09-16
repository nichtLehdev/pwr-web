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
import { Tag } from "@/app/_components/programmheft/tag";
import {
  DataTable,
  createDataTableColumnHelper,
  type DataTableColumn,
} from "@/app/_components/ui/data-table";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  EditIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { UsersIcon } from "lucide-react";
import { computeReorderUpdates } from "@/lib/reorder";

const POSAUNENRAT_ROLE_LABELS: Record<string, string> = {
  VORSTAND: "Vorstand",
  LANDESKIRCHENMUSIKDIREKTOR: "Landeskirchenmusikdirektor",
  LANDESKIRCHENMUSIKDIREKTORIN: "Landeskirchenmusikdirektorin",
  SACHVERSTAENDIGER: "Sachverständiger",
  SACHVERSTAENDIGE: "Sachverständige",
};

type PosaunenratMember =
  RouterOutputs["organization"]["getPosaunenrat"][number];

const column = createDataTableColumnHelper<PosaunenratMember>();

/** Der verknüpfte Benutzername schlägt den frei eingetragenen. */
function memberName(member: PosaunenratMember): string {
  return member.user?.displayName ?? member.name ?? "Unbekannt";
}

function memberEmail(member: PosaunenratMember): string {
  return member.user?.email ?? member.email ?? "-";
}

export default function DashboardPosaunenratPage() {
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
    PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENRAT,
  );

  const {
    data: members,
    isLoading: membersLoading,
    refetch,
  } = api.organization.getPosaunenrat.useQuery();

  const reorderMutation =
    api.organization.updatePosaunenratMember.useMutation();

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
    if (!confirm("Möchtest du dieses Posaunenratsmitglied wirklich löschen?")) {
      return;
    }
    setDeletingId(id);
    deleteMutation.mutate({ id });
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (!members || isReordering) return;
    const updates = computeReorderUpdates(members, index, direction);
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

  const columns = useMemo<DataTableColumn<PosaunenratMember>[]>(
    () =>
      column.columns([
        // Die gespeicherte Reihenfolge als eigene Spalte: nur so bleiben die
        // Hoch/Runter-Pfeile nachvollziehbar, wenn nach etwas anderem sortiert
        // wird — sie verschieben immer die gespeicherte Position, nie die Sicht.
        column.accessor((member) => (members?.indexOf(member) ?? 0) + 1, {
          id: "position",
          header: "#",
          enableColumnFilter: false,
          meta: { align: "right", label: "Reihenfolge" },
        }),
        column.accessor(memberName, {
          id: "member",
          header: "Mitglied",
          meta: { alwaysVisible: true },
          cell: ({ row }) => {
            const member = row.original;
            const displayName = memberName(member);
            const imageUrl =
              member.user?.profileImage?.url ?? member.image?.url;
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
                  <div className="bg-rule/25 dark:bg-night-raised flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                    <span className="text-dark dark:text-night-muted text-sm font-medium">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/posaunenrat/${member.id}`}
                    className="hover:text-primary-ink dark:hover:text-primary text-ink dark:text-night-text font-medium"
                  >
                    {displayName}
                  </Link>
                  <p className="text-dark dark:text-night-muted text-sm">
                    {memberEmail(member)}
                  </p>
                </div>
              </div>
            );
          },
        }),
        column.accessor(
          (member) => POSAUNENRAT_ROLE_LABELS[member.role] ?? member.role,
          {
            id: "role",
            header: "Rolle",
            meta: { filterVariant: "set" },
            cell: ({ getValue }) => <Tag tone="inverse">{getValue()}</Tag>,
          },
        ),
        column.accessor(
          (member) =>
            member.user ? "Benutzer verknüpft" : "Manueller Eintrag",
          {
            id: "linked",
            header: "Verknüpfung",
            meta: { filterVariant: "set" },
            cell: ({ row }) =>
              row.original.user ? (
                <Link
                  href={`/dashboard/users/${row.original.user.id}`}
                  className="text-primary-ink dark:text-primary text-sm hover:underline"
                >
                  Benutzer verknüpft
                </Link>
              ) : (
                <span className="text-dark dark:text-night-muted text-sm">
                  Manueller Eintrag
                </span>
              ),
          },
        ),
        column.display({
          id: "actions",
          header: "Aktionen",
          meta: { align: "right", label: "Aktionen" },
          cell: ({ row }) => {
            const index = members?.indexOf(row.original) ?? -1;
            return (
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => void handleMove(index, "up")}
                  disabled={index <= 0 || isReordering}
                  aria-label="Nach oben"
                  title="Nach oben"
                  className="text-dark hover:bg-rule/25 hover:text-ink dark:text-night-muted dark:hover:bg-night-raised dark:hover:text-night-text p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronUpIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => void handleMove(index, "down")}
                  disabled={
                    index === -1 ||
                    index === (members?.length ?? 0) - 1 ||
                    isReordering
                  }
                  aria-label="Nach unten"
                  title="Nach unten"
                  className="text-dark hover:bg-rule/25 hover:text-ink dark:text-night-muted dark:hover:bg-night-raised dark:hover:text-night-text p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
                <Link
                  href={`/dashboard/posaunenrat/${row.original.id}/edit`}
                  className="text-dark hover:bg-rule/25 hover:text-ink dark:text-night-muted dark:hover:bg-night-raised dark:hover:text-night-text p-2 transition-colors"
                  title="Bearbeiten"
                >
                  <EditIcon className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => handleDelete(row.original.id)}
                  disabled={deletingId === row.original.id}
                  className="p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
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
    [members, deletingId, isReordering],
  );

  if (isPending || profileLoading || membersLoading) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageOrganization) {
    return null;
  }

  return (
    <DashboardPage
      title="Posaunenrat"
      description="Verwalte die Mitglieder des Posaunenrats"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Posaunenrat" },
      ]}
      actions={
        <Link
          href="/dashboard/posaunenrat/new"
          className="bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted semi-condensed inline-flex min-h-11 items-center gap-2 px-4 py-2.5 font-semibold transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Neues Mitglied
        </Link>
      }
    >
      <DataTable
        data={members}
        columns={columns}
        getRowId={(member) => member.id}
        isLoading={membersLoading}
        rowNoun={["Mitglied", "Mitglieder"]}
        searchPlaceholder="Name, E-Mail oder Rolle suchen…"
        initialSorting={[{ id: "position", desc: false }]}
        emptyState={
          <>
            <UsersIcon className="text-dark dark:text-night-muted mx-auto h-12 w-12" />
            <h3 className="condensed text-ink dark:text-night-text mt-4 mb-2 text-lg font-bold">
              Keine Posaunenratsmitglieder
            </h3>
            <p className="text-dark dark:text-night-muted mb-6">
              Es wurden noch keine Posaunenratsmitglieder angelegt.
            </p>
            <Link
              href="/dashboard/posaunenrat/new"
              className="bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted semi-condensed inline-flex min-h-11 items-center gap-2 px-4 py-2.5 font-semibold transition-colors"
            >
              Erstes Mitglied anlegen
            </Link>
          </>
        }
      />
    </DashboardPage>
  );
}
