"use client";

import { useMemo, useState } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { CheckCircle2, XCircle, Users } from "lucide-react";
import {
  DataTable,
  createDataTableColumnHelper,
  type DataTableColumn,
} from "@/app/_components/ui/data-table";
import type { PaginationState, SortingState } from "@tanstack/react-table";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";

type ListedUser = RouterOutputs["users"]["list"]["users"][number];

/** The columns the server can sort by. */
const SORTABLE_COLUMNS = {
  displayName: "displayName",
  emailVerified: "emailVerified",
  createdAt: "createdAt",
  lastLoginAt: "lastLoginAt",
} as const;

type SortableColumn = keyof typeof SORTABLE_COLUMNS;

const column = createDataTableColumnHelper<ListedUser>();

/** Die Gremien, in denen die Person sitzt — mit ihrer Farbgebung. */
function membershipBadges(
  user: ListedUser,
): { label: string; className: string }[] {
  const badges: { label: string; className: string }[] = [];
  if (user.posaunenwart?.roleType === "LPW") {
    badges.push({
      label: "LPW",
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    });
  }
  if (user.posaunenwart?.roleType === "RPW") {
    badges.push({
      label: "RPW",
      className:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    });
  }
  if (user.teamMember) {
    badges.push({
      label: "Team",
      className:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    });
  }
  if (user.vorstandMember) {
    badges.push({
      label: "Vorstand",
      className:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    });
  }
  if (user.posaunenratMember) {
    badges.push({
      label: "Posaunenrat",
      className:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    });
  }
  if (user.foerdervereinMember) {
    badges.push({
      label: "Förderverein",
      className:
        "bg-foerderverein-light/40 text-foerderverein-dark dark:bg-foerderverein/20 dark:text-foerderverein-light",
    });
  }
  return badges;
}

/** Dieselben Gremien als Text — die Suchgrundlage der Spalte. */
function membershipLabels(user: ListedUser): string {
  return membershipBadges(user)
    .map((badge) => badge.label)
    .join(", ");
}

export default function DashboardUsersList() {
  const { data: session } = useSession();
  // Die Benutzerliste wächst unbegrenzt und wird deshalb serverseitig
  // geblättert; Sortierung und Suche sind darum Abfrageparameter — sonst würden
  // sie nur die gerade geladene Seite betreffen.
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [search, setSearch] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  const utils = api.useUtils();
  const { data, isLoading, error } = api.users.list.useQuery({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: search || undefined,
    sortBy: SORTABLE_COLUMNS[(sorting[0]?.id ?? "createdAt") as SortableColumn],
    sortOrder: sorting[0]?.desc === false ? "asc" : "desc",
  });

  const { data: stats } = api.users.getStatistics.useQuery();

  const deleteMutation = api.users.delete.useMutation({
    onSuccess: () => {
      setShowDeleteModal(null);
      void utils.users.list.invalidate();
      void utils.users.getStatistics.invalidate();
    },
    onError: (error) => {
      alert(`Fehler beim Löschen: ${error.message}`);
    },
  });

  const columns = useMemo<DataTableColumn<ListedUser>[]>(
    () =>
      column.columns([
        column.accessor((user) => user.displayName ?? "Unbenannt", {
          id: "displayName",
          header: "Benutzer",
          enableColumnFilter: false,
          meta: { alwaysVisible: true },
          cell: ({ row }) => {
            const user = row.original;
            return (
              <div className="flex items-center gap-3">
                <div className="dark:bg-dark-border h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200">
                  {user.profileImage?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.profileImage.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="dark:text-dark-muted flex h-full w-full items-center justify-center text-sm font-medium text-gray-500">
                      {(user.displayName ?? user.email)?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/users/${user.id}`}
                    className="hover:text-primary dark:text-dark-text dark:hover:text-primary font-medium text-gray-900"
                  >
                    {user.displayName ?? "Unbenannt"}
                  </Link>
                  <p className="dark:text-dark-muted text-sm text-gray-500">
                    {user.email}
                  </p>
                </div>
              </div>
            );
          },
        }),
        column.accessor(membershipLabels, {
          id: "memberships",
          header: "Mitgliedschaften",
          enableSorting: false,
          enableColumnFilter: false,
          cell: ({ row }) => {
            const badges = membershipBadges(row.original);
            if (badges.length === 0) {
              return (
                <span className="dark:text-dark-muted text-sm text-gray-400">
                  –
                </span>
              );
            }
            return (
              <div className="flex flex-wrap gap-1">
                {badges.map((badge) => (
                  <span
                    key={badge.label}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            );
          },
        }),
        column.accessor((user) => user.emailVerified, {
          id: "emailVerified",
          header: "E-Mail bestätigt",
          enableColumnFilter: false,
          meta: { align: "center", label: "E-Mail bestätigt" },
          cell: ({ getValue }) =>
            getValue() ? (
              <CheckCircle2 className="mx-auto h-5 w-5 text-green-500 dark:text-green-400" />
            ) : (
              <XCircle className="mx-auto h-5 w-5 text-amber-500 dark:text-amber-400" />
            ),
        }),
        column.accessor((user) => user.createdAt, {
          id: "createdAt",
          header: "Erstellt",
          enableColumnFilter: false,
          meta: { cellClassName: "whitespace-nowrap" },
          cell: ({ getValue }) =>
            new Date(getValue()).toLocaleDateString("de-DE"),
        }),
        column.accessor((user) => user.lastLoginAt, {
          id: "lastLoginAt",
          header: "Letzter Login",
          enableColumnFilter: false,
          meta: { cellClassName: "whitespace-nowrap" },
          cell: ({ getValue }) => {
            const value = getValue();
            return value ? new Date(value).toLocaleDateString("de-DE") : "–";
          },
        }),
        column.display({
          id: "actions",
          header: "Aktionen",
          meta: { align: "right", label: "Aktionen" },
          cell: ({ row }) => (
            <div className="flex items-center justify-end gap-3">
              <Link
                href={`/dashboard/users/${row.original.id}/edit`}
                className="text-primary hover:text-primary/80 text-sm font-medium"
              >
                Bearbeiten
              </Link>
              {session?.user.id !== row.original.id && (
                <button
                  onClick={() => setShowDeleteModal(row.original.id)}
                  className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Löschen
                </button>
              )}
            </div>
          ),
        }),
      ]),
    [session?.user],
  );

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-900/20">
        <p className="text-red-700 dark:text-red-400">
          Fehler beim Laden der Benutzer: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-4">
            <p className="dark:text-dark-muted text-sm text-gray-500">Gesamt</p>
            <p className="dark:text-dark-text text-2xl font-bold text-gray-900">
              {stats.totalUsers}
            </p>
          </div>
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-4">
            <p className="dark:text-dark-muted text-sm text-gray-500">
              Neue (30 Tage)
            </p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.recentUsers}
            </p>
          </div>
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-4">
            <p className="dark:text-dark-muted text-sm text-gray-500">Team</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.membership?.team ?? 0}
            </p>
          </div>
        </div>
      )}

      <DataTable
        data={data?.users}
        columns={columns}
        getRowId={(user) => user.id}
        isLoading={isLoading}
        rowNoun={["Benutzer", "Benutzer"]}
        searchPlaceholder="Suche nach Name, E-Mail…"
        pageSizeOptions={[20, 50, 100, 250]}
        initialColumnVisibility={{ lastLoginAt: false }}
        emptyState={
          <>
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="dark:text-dark-text mt-4 text-lg font-medium text-gray-900">
              Keine Benutzer gefunden
            </h3>
            <p className="dark:text-dark-muted mt-2 text-gray-500">
              Es gibt noch keine Benutzer.
            </p>
          </>
        }
        sorting={sorting}
        onSortingChange={setSorting}
        manualSorting
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPagination((current) => ({ ...current, pageIndex: 0 }));
        }}
        pagination={pagination}
        onPaginationChange={setPagination}
        manualPagination
        manualFiltering
        rowCount={data?.total ?? 0}
      />

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
                  onClick={() => setShowDeleteModal(null)}
                  className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => deleteMutation.mutate({ id: showDeleteModal })}
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
    </div>
  );
}
