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
import { Tag } from "@/app/_components/programmheft/tag";
import { formatBerlin } from "@/lib/berlin-time";

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

/**
 * Die Gremien, in denen die Person sitzt — als Etikett mit einem quadratischen
 * Farbpunkt. Der Punkt ist reine Zusatzinformation (aria-hidden); die
 * Unterscheidung steht immer auch als Text im Etikett, nie nur in der Farbe.
 */
function membershipBadges(
  user: ListedUser,
): { label: string; dotClassName: string }[] {
  const badges: { label: string; dotClassName: string }[] = [];
  if (user.posaunenwart?.roleType === "LPW") {
    badges.push({ label: "LPW", dotClassName: "bg-red-600 dark:bg-red-400" });
  }
  if (user.posaunenwart?.roleType === "RPW") {
    badges.push({
      label: "RPW",
      dotClassName: "bg-orange-500 dark:bg-orange-400",
    });
  }
  if (user.teamMember) {
    badges.push({
      label: "Team",
      dotClassName: "bg-blue-600 dark:bg-blue-400",
    });
  }
  if (user.vorstandMember) {
    badges.push({
      label: "Vorstand",
      dotClassName: "bg-purple-600 dark:bg-purple-400",
    });
  }
  if (user.posaunenratMember) {
    badges.push({
      label: "Posaunenrat",
      dotClassName: "bg-green-600 dark:bg-green-400",
    });
  }
  if (user.foerdervereinMember) {
    badges.push({
      label: "Förderverein",
      dotClassName: "bg-foerderverein dark:bg-foerderverein-light",
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
                <div className="bg-rule/60 dark:bg-night-raised h-10 w-10 shrink-0 overflow-hidden rounded-full">
                  {user.profileImage?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.profileImage.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-dark dark:text-night-muted flex h-full w-full items-center justify-center text-sm font-medium">
                      {(user.displayName ?? user.email)?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/users/${user.id}`}
                    className="text-ink dark:text-night-text hover:text-primary-ink dark:hover:text-primary font-medium"
                  >
                    {user.displayName ?? "Unbenannt"}
                  </Link>
                  <p className="text-dark dark:text-night-muted text-sm">
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
                <span className="text-dark dark:text-night-muted text-sm">
                  –
                </span>
              );
            }
            return (
              <div className="flex flex-wrap gap-1">
                {badges.map((badge) => (
                  <Tag key={badge.label} tone="inverse">
                    <span
                      aria-hidden
                      className={`h-2 w-2 shrink-0 ${badge.dotClassName}`}
                    />
                    {badge.label}
                  </Tag>
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
              <CheckCircle2 className="dark:text-night-text text-ink mx-auto h-5 w-5" />
            ) : (
              <XCircle className="text-dark dark:text-night-muted mx-auto h-5 w-5" />
            ),
        }),
        column.accessor((user) => user.createdAt, {
          id: "createdAt",
          header: "Erstellt",
          enableColumnFilter: false,
          meta: { cellClassName: "whitespace-nowrap" },
          cell: ({ getValue }) => formatBerlin(new Date(getValue())),
        }),
        column.accessor((user) => user.lastLoginAt, {
          id: "lastLoginAt",
          header: "Letzter Login",
          enableColumnFilter: false,
          meta: { cellClassName: "whitespace-nowrap" },
          cell: ({ getValue }) => {
            const value = getValue();
            return value ? formatBerlin(value) : "–";
          },
        }),
        column.display({
          id: "actions",
          header: "Aktionen",
          meta: { align: "right", label: "Aktionen" },
          cell: ({ row }) => (
            <div className="flex items-center justify-end gap-4">
              <Link
                href={`/dashboard/users/${row.original.id}/edit`}
                className="link-ink text-sm"
              >
                Bearbeiten
              </Link>
              {session?.user.id !== row.original.id && (
                <button
                  onClick={() => setShowDeleteModal(row.original.id)}
                  className="text-sm font-semibold text-red-700 underline decoration-1 underline-offset-4 hover:decoration-2 dark:text-red-400"
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
      <div className="border-2 border-red-700 p-6 text-center dark:border-red-400">
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
          <div className="border-rule dark:border-night-rule bg-rule/25 dark:bg-night-raised border p-4">
            <p className="text-dark dark:text-night-muted text-sm">Gesamt</p>
            <p className="text-ink dark:text-night-text text-2xl font-bold">
              {stats.totalUsers}
            </p>
          </div>
          <div className="border-rule dark:border-night-rule bg-rule/25 dark:bg-night-raised border p-4">
            <p className="text-dark dark:text-night-muted text-sm">
              Neue (30 Tage)
            </p>
            <p className="dark:text-night-text text-ink text-2xl font-bold">
              {stats.recentUsers}
            </p>
          </div>
          <div className="border-rule dark:border-night-rule bg-rule/25 dark:bg-night-raised border p-4">
            <p className="text-dark dark:text-night-muted text-sm">Team</p>
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
            <Users className="text-dark dark:text-night-muted mx-auto h-12 w-12" />
            <h3 className="text-ink dark:text-night-text mt-4 text-lg font-medium">
              Keine Benutzer gefunden
            </h3>
            <p className="text-dark dark:text-night-muted mt-2">
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
                  onClick={() => setShowDeleteModal(null)}
                  className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/60 dark:hover:bg-night-rule inline-flex min-h-11 items-center border-2 px-4 py-2 text-sm font-semibold transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => deleteMutation.mutate({ id: showDeleteModal })}
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
    </div>
  );
}
