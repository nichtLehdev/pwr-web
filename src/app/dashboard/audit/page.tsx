"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { DashboardPage } from "@/app/_components/dashboard";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { SearchIcon, ShieldIcon } from "lucide-react";

function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(date));
}

export default function AuditLogPage() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [action, setAction] = useState("");

  const canView = hasPermission(PERMISSIONS.AUDIT_VIEW);

  const { data, isLoading } = api.audit.list.useQuery(
    {
      page,
      limit: 50,
      search: search || undefined,
      action: action || undefined,
    },
    { enabled: canView },
  );
  const { data: actions } = api.audit.actions.useQuery(undefined, {
    enabled: canView,
  });

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  if (!permissionsLoading && !canView) {
    return (
      <DashboardPage title="Audit-Log">
        <p className="text-gray-600 dark:text-gray-400">
          Du hast keine Berechtigung, diese Seite zu sehen.
        </p>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage
      title="Audit-Log"
      description="Sicherheitsrelevante Aktionen: wer hat wann was geändert"
    >
      <div className="dark:bg-dark-surface dark:border-dark-border mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <form onSubmit={applySearch} className="flex-1">
            <label
              htmlFor="audit-search"
              className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700"
            >
              Suche
            </label>
            <div className="flex gap-2">
              <input
                id="audit-search"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Akteur-E-Mail, Aktion oder Objekt-ID…"
                className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="bg-primary hover:bg-primary-dark flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-white"
              >
                <SearchIcon className="h-4 w-4" />
                Suchen
              </button>
            </div>
          </form>

          <div>
            <label
              htmlFor="audit-action"
              className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700"
            >
              Aktion
            </label>
            <select
              id="audit-action"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Alle Aktionen</option>
              {actions?.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="dark:bg-dark-surface dark:border-dark-border overflow-hidden rounded-lg border border-gray-200 bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          </div>
        ) : !data || data.entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-gray-500 dark:text-gray-400">
            <ShieldIcon className="h-8 w-8" />
            <p>Keine Einträge gefunden.</p>
          </div>
        ) : (
          <>
            {/* Below md the five columns (the Details cell alone is max-w-md)
                only reach the reader by horizontal scrolling, so each entry
                becomes a stacked card instead. */}
            <ul className="divide-y divide-gray-200 md:hidden dark:divide-gray-700">
              {data.entries.map((entry) => (
                <li key={entry.id} className="space-y-2 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="dark:bg-dark-background inline-block rounded bg-gray-100 px-2 py-0.5 font-mono text-xs break-all text-gray-800 dark:text-gray-200">
                      {entry.action}
                    </span>
                    <time className="text-xs text-gray-500 tabular-nums dark:text-gray-400">
                      {formatDateTime(entry.createdAt)}
                    </time>
                  </div>
                  <p className="dark:text-dark-text text-sm break-all text-gray-900">
                    {entry.actorEmail ?? entry.actorId ?? "System"}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {entry.entityType}
                    {entry.entityId ? (
                      <span className="block font-mono break-all text-gray-400 dark:text-gray-500">
                        {entry.entityId}
                      </span>
                    ) : null}
                  </p>
                  {entry.details ? (
                    <details>
                      <summary className="text-primary cursor-pointer text-xs font-medium">
                        Details
                      </summary>
                      <pre className="mt-1 font-mono text-xs break-all whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                        {JSON.stringify(entry.details, null, 1)}
                      </pre>
                    </details>
                  ) : null}
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    {["Zeitpunkt", "Akteur", "Aktion", "Objekt", "Details"].map(
                      (header) => (
                        <th
                          key={header}
                          className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
                        >
                          {header}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="align-top hover:bg-gray-50 dark:hover:bg-gray-800/40"
                    >
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-500 tabular-nums dark:text-gray-400">
                        {formatDateTime(entry.createdAt)}
                      </td>
                      <td className="dark:text-dark-text px-4 py-3 text-sm text-gray-900">
                        {entry.actorEmail ?? entry.actorId ?? "System"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="dark:bg-dark-background inline-block rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-800 dark:text-gray-200">
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {entry.entityType}
                        {entry.entityId ? (
                          <span className="block font-mono text-xs text-gray-400 dark:text-gray-500">
                            {entry.entityId}
                          </span>
                        ) : null}
                      </td>
                      <td className="max-w-md px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                        {entry.details ? (
                          <pre className="font-mono break-all whitespace-pre-wrap">
                            {JSON.stringify(entry.details, null, 1)}
                          </pre>
                        ) : (
                          "–"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="dark:border-dark-border flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-4 py-3 text-sm">
              <p className="text-gray-600 dark:text-gray-400">
                {data.total} {data.total === 1 ? "Eintrag" : "Einträge"}
              </p>
              {data.pages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="dark:border-dark-border rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40"
                  >
                    Zurück
                  </button>
                  <span className="text-gray-600 dark:text-gray-400">
                    Seite {page} von {data.pages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                    disabled={page >= data.pages}
                    className="dark:border-dark-border rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40"
                  >
                    Weiter
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardPage>
  );
}
