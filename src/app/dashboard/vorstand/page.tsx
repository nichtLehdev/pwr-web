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
  PlusIcon,
} from "lucide-react";
import { TrashIcon } from "lucide-react";
import { UsersIcon } from "lucide-react";
import { computeReorderUpdates } from "@/lib/reorder";

type VorstandMember = RouterOutputs["organization"]["getVorstand"][number];

const column = createDataTableColumnHelper<VorstandMember>();

/** Der verknüpfte Benutzername schlägt den frei eingetragenen. */
function memberName(member: VorstandMember): string {
  return member.user?.displayName ?? member.name ?? "Unbekannt";
}

function memberEmail(member: VorstandMember): string {
  return member.user?.email ?? member.email ?? "-";
}

export default function DashboardVorstandPage() {
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
    PERMISSIONS.ORGANIZATION_MANAGE_VORSTAND,
  );

  const {
    data: vorstandMembers,
    isLoading: membersLoading,
    refetch,
  } = api.organization.getVorstand.useQuery();

  const reorderMutation = api.organization.updateVorstandMember.useMutation();

  const deleteMutation = api.organization.deleteVorstandMember.useMutation({
    onSuccess: () => {
      toast.success("Vorstandsmitglied erfolgreich gelöscht");
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

  const handleDelete = async (id: string) => {
    if (!confirm("Möchtest du dieses Vorstandsmitglied wirklich löschen?")) {
      return;
    }
    setDeletingId(id);
    deleteMutation.mutate({ id });
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (!vorstandMembers || isReordering) return;
    const updates = computeReorderUpdates(vorstandMembers, index, direction);
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

  const columns = useMemo<DataTableColumn<VorstandMember>[]>(
    () =>
      column.columns([
        // Die gespeicherte Reihenfolge als eigene Spalte: nur so bleiben die
        // Hoch/Runter-Pfeile nachvollziehbar, wenn nach etwas anderem sortiert
        // wird — sie verschieben immer die gespeicherte Position, nie die Sicht.
        column.accessor((member) => member.sortOrder, {
          id: "sortOrder",
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
              member.image?.url ?? member.user?.profileImage?.url;
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
                <Link
                  href={`/dashboard/vorstand/${member.id}`}
                  className="hover:text-primary-ink dark:hover:text-primary text-ink dark:text-night-text font-medium"
                >
                  {displayName}
                </Link>
              </div>
            );
          },
        }),
        column.accessor((member) => member.position, {
          id: "position",
          header: "Position",
          meta: { filterVariant: "set" },
          cell: ({ row }) => (
            <span
              className={`semi-condensed inline-flex items-center px-2.5 py-0.5 text-xs font-semibold ${
                row.original.color ||
                "bg-rule/60 text-ink dark:bg-night-rule dark:text-night-text"
              }`}
            >
              {row.original.position}
            </span>
          ),
        }),
        column.accessor(memberEmail, {
          id: "contact",
          header: "Kontakt",
          cell: ({ row }) => (
            <>
              <p className="text-ink dark:text-night-text text-sm">
                {memberEmail(row.original)}
              </p>
              {row.original.phone && (
                <p className="text-dark dark:text-night-muted text-sm">
                  {row.original.phone}
                </p>
              )}
            </>
          ),
        }),
        column.accessor(
          (member) => (member.userId ? "Verknüpft" : "Nicht verknüpft"),
          {
            id: "linked",
            header: "Verknüpft",
            meta: { filterVariant: "set" },
            cell: ({ row }) =>
              row.original.userId ? (
                <Link
                  href={`/dashboard/users/${row.original.userId}`}
                  className="text-primary-ink dark:text-primary text-sm hover:underline"
                >
                  Benutzer verknüpft
                </Link>
              ) : (
                <span className="text-dark dark:text-night-muted text-sm">
                  Nicht verknüpft
                </span>
              ),
          },
        ),
        column.display({
          id: "actions",
          header: "Aktionen",
          meta: { align: "right", label: "Aktionen" },
          cell: ({ row }) => {
            const index = vorstandMembers?.indexOf(row.original) ?? -1;
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
                    index === (vorstandMembers?.length ?? 0) - 1 ||
                    isReordering
                  }
                  aria-label="Nach unten"
                  title="Nach unten"
                  className="text-dark hover:bg-rule/25 hover:text-ink dark:text-night-muted dark:hover:bg-night-raised dark:hover:text-night-text p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
                <Link
                  href={`/dashboard/vorstand/${row.original.id}/edit`}
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
    [vorstandMembers, deletingId, isReordering],
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
      title="Vorstand"
      description="Verwalte die Mitglieder des Vorstands"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Vorstand" },
      ]}
      actions={
        <Link
          href="/dashboard/vorstand/new"
          className="bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted semi-condensed inline-flex min-h-11 items-center gap-2 px-4 py-2.5 font-semibold transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Neues Mitglied
        </Link>
      }
    >
      <DataTable
        data={vorstandMembers}
        columns={columns}
        getRowId={(member) => member.id}
        isLoading={membersLoading}
        rowNoun={["Vorstandsmitglied", "Vorstandsmitglieder"]}
        searchPlaceholder="Name, Position oder Kontakt suchen…"
        initialSorting={[{ id: "position", desc: false }]}
        emptyState={
          <>
            <UsersIcon className="text-dark dark:text-night-muted mx-auto h-12 w-12" />
            <h3 className="condensed text-ink dark:text-night-text mt-4 mb-2 text-lg font-bold">
              Keine Vorstandsmitglieder
            </h3>
            <p className="text-dark dark:text-night-muted mb-6">
              Es wurden noch keine Vorstandsmitglieder angelegt.
            </p>
            <Link
              href="/dashboard/vorstand/new"
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
