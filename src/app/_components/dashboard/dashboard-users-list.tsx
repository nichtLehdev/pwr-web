"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import { UserRole } from "~/generated/prisma/enums";
import { useSession } from "@/lib/auth";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Users,
  Search,
} from "lucide-react";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Administrator",
  LPW: "Landesposaunenwart",
  RPW: "Regionalposaunenwart",
  OBLEUTE: "Obleute",
  USER: "Benutzer",
};

const roleBadgeColors: Record<UserRole, string> = {
  ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  LPW: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  RPW: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  OBLEUTE:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  USER: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

const roleFilters: { value: UserRole | "all"; label: string }[] = [
  { value: "all", label: "Alle Rollen" },
  { value: "ADMIN", label: "Administratoren" },
  { value: "LPW", label: "LPW" },
  { value: "RPW", label: "RPW" },
  { value: "OBLEUTE", label: "Obleute" },
  { value: "USER", label: "Benutzer" },
];

type SortField = "displayName" | "email" | "role" | "createdAt";

function SortIcon({
  field,
  sortBy,
  sortOrder,
}: {
  field: SortField;
  sortBy: SortField;
  sortOrder: "asc" | "desc";
}) {
  if (sortBy !== field) {
    return <ArrowUpDown className="ml-1 h-4 w-4 text-gray-400" />;
  }
  return sortOrder === "asc" ? (
    <ArrowUp className="text-primary ml-1 h-4 w-4" />
  ) : (
    <ArrowDown className="text-primary ml-1 h-4 w-4" />
  );
}

export default function DashboardUsersList() {
  const { data: session } = useSession();
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const limit = 20;

  const utils = api.useUtils();
  const { data, isLoading, error } = api.users.list.useQuery({
    page,
    limit,
    role: roleFilter === "all" ? undefined : roleFilter,
    search: search || undefined,
    sortBy,
    sortOrder,
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

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

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
            <p className="dark:text-dark-muted text-sm text-gray-500">Admins</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.usersByRole?.ADMIN ?? 0}
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

      {/* Search & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Suche nach Name, E-Mail..."
            className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-surface dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white py-2 pr-4 pl-10 text-gray-900 focus:ring-1 focus:outline-none"
          />
          <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Filter Toggle (Mobile) */}
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-surface flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:hidden"
        >
          <Filter className="h-5 w-5" />
          Filter
        </button>

        {/* Desktop Filters */}
        <div className="hidden items-center gap-3 sm:flex">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as UserRole | "all");
              setPage(1);
            }}
            className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:ring-1 focus:outline-none"
          >
            {roleFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile Filters */}
      {filtersOpen && (
        <div className="dark:border-dark-border dark:bg-dark-surface flex flex-wrap gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:hidden">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as UserRole | "all");
              setPage(1);
            }}
            className="dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {roleFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Users Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
        </div>
      ) : data?.users.length === 0 ? (
        <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="dark:text-dark-text mt-4 text-lg font-medium text-gray-900">
            Keine Benutzer gefunden
          </h3>
          <p className="dark:text-dark-muted mt-2 text-gray-500">
            {search
              ? "Versuche eine andere Suche."
              : "Es gibt noch keine Benutzer."}
          </p>
        </div>
      ) : (
        <div className="dark:border-dark-border dark:bg-dark-surface overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="dark:divide-dark-border min-w-full divide-y divide-gray-200">
              <thead className="dark:bg-dark-background-secondary bg-gray-50">
                <tr>
                  <th
                    className="dark:text-dark-muted dark:hover:text-dark-text cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:text-gray-700"
                    onClick={() => handleSort("displayName")}
                  >
                    <div className="flex items-center">
                      Benutzer
                      <SortIcon
                        field="displayName"
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                      />
                    </div>
                  </th>
                  <th
                    className="dark:text-dark-muted dark:hover:text-dark-text cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:text-gray-700"
                    onClick={() => handleSort("role")}
                  >
                    <div className="flex items-center">
                      Rolle
                      <SortIcon
                        field="role"
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                      />
                    </div>
                  </th>
                  <th className="dark:text-dark-muted hidden px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:table-cell">
                    Bezirk
                  </th>
                  <th
                    className="dark:text-dark-muted dark:hover:text-dark-text hidden cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:text-gray-700 md:table-cell"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center">
                      Erstellt
                      <SortIcon
                        field="createdAt"
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                      />
                    </div>
                  </th>
                  <th className="dark:text-dark-muted px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="dark:divide-dark-border divide-y divide-gray-200">
                {data?.users.map((user) => (
                  <tr
                    key={user.id}
                    className="dark:hover:bg-dark-background-secondary hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
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
                              {(user.displayName ??
                                user.email)?.[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeColors[user.role]}`}
                      >
                        {roleLabels[user.role]}
                      </span>
                    </td>
                    <td className="hidden px-6 py-4 whitespace-nowrap sm:table-cell">
                      {user.bezirk ? (
                        <span className="dark:text-dark-text text-sm text-gray-900">
                          Bezirk {user.bezirk.number}
                        </span>
                      ) : (
                        <span className="dark:text-dark-muted text-sm text-gray-400">
                          –
                        </span>
                      )}
                    </td>
                    <td className="hidden px-6 py-4 whitespace-nowrap md:table-cell">
                      <span className="dark:text-dark-muted text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString("de-DE")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/dashboard/users/${user.id}/edit`}
                          className="text-primary hover:text-primary/80 text-sm font-medium"
                        >
                          Bearbeiten
                        </Link>
                        {session?.user.id !== user.id && (
                          <button
                            onClick={() => setShowDeleteModal(user.id)}
                            className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Löschen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="dark:border-dark-border dark:bg-dark-background-secondary flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3">
              <p className="dark:text-dark-muted text-sm text-gray-700">
                Seite {data.page} von {data.pages} ({data.total} Benutzer)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-surface rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Zurück
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                  disabled={page === data.pages}
                  className="dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-surface rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Weiter
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
