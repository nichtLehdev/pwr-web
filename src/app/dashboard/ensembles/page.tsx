"use client";
import { Select } from "@/app/_components/ui";

import { useState } from "react";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import Image from "next/image";
import { DashboardPage } from "@/app/_components/dashboard";
import {
  ArrowLeftIcon,
  EditIcon,
  MusicIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { ArrowRightIcon, EyeIcon, TrashIcon } from "lucide-react";

export default function DashboardEnsemblesPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedBezirk, setSelectedBezirk] = useState<string>("");
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  const toast = useToast();

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: userPermissions } = api.permissions.getMyPermissions.useQuery(
    undefined,
    { enabled: !!session?.user?.id },
  );

  const hasDashboardAccess =
    Array.isArray(userPermissions) && userPermissions.length > 0;
  const hasManagePermission =
    Array.isArray(userPermissions) &&
    userPermissions.some(
      (perm: string) =>
        perm === "ensembles.manage" || perm === "ensembles.delete",
    );

  const {
    data: ensemblesData,
    isLoading: ensemblesLoading,
    refetch,
  } = api.ensembles.getAll.useQuery({
    search: search || undefined,
    bezirkId: selectedBezirk || undefined,
    isActive: showInactive ? undefined : true,
    page,
    limit,
  });

  const { data: bezirke } = api.bezirke.getAll.useQuery();

  const deleteMutation = api.ensembles.delete.useMutation({
    onSuccess: () => {
      void refetch();
      setDeletingId(null);
      toast.success("Ensemble erfolgreich gelöscht");
    },
    onError: (error) => {
      setDeletingId(null);
      toast.error("Fehler beim Löschen: " + error.message);
    },
  });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/ensembles");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !hasDashboardAccess &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, hasDashboardAccess, router]);

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Möchtest du das Ensemble "${name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      )
    ) {
      return;
    }
    setDeletingId(id);
    deleteMutation.mutate({ id });
  };

  if (isPending || profileLoading || ensemblesLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !hasDashboardAccess) {
    return null;
  }

  const ensembles = ensemblesData?.ensembles ?? [];
  const isAdmin = hasManagePermission;

  return (
    <DashboardPage
      title="Ensembles"
      description="Verwalte alle Posaunenchöre und Ensembles"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Ensembles" },
      ]}
      actions={
        <Link
          href="/dashboard/ensembles/new"
          className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Neues Ensemble
        </Link>
      }
    >
      {/* Filters */}
      <div className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <SearchIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Ensemble suchen..."
                className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Bezirk Filter */}
          <div className="sm:w-48">
            <Select
              value={selectedBezirk}
              onChange={(e) => {
                setSelectedBezirk(e.target.value);
                setPage(1);
              }}
              className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle Bezirke</option>
              {bezirke?.map((bezirk) => (
                <option key={bezirk.id} value={bezirk.id}>
                  {bezirk.shortName}
                </option>
              ))}
            </Select>
          </div>

          {/* Show Inactive Toggle */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => {
                setShowInactive(e.target.checked);
                setPage(1);
              }}
              className="text-primary h-4 w-4 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="dark:text-dark-muted text-sm text-gray-600">
              Inaktive zeigen
            </span>
          </label>
        </div>
      </div>

      {/* Ensembles List */}
      {ensembles.length === 0 ? (
        <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="dark:text-dark-muted mx-auto mb-4 h-12 w-12 text-gray-400">
            <SearchIcon className="h-12 w-12" />
          </div>
          <h3 className="dark:text-dark-text mb-2 text-lg font-semibold text-gray-900">
            Keine Ensembles gefunden
          </h3>
          <p className="dark:text-dark-muted mb-6 text-gray-600">
            {search || selectedBezirk
              ? "Keine Ensembles entsprechen deinen Filterkriterien."
              : "Erstelle das erste Ensemble, um es hier anzuzeigen."}
          </p>
          {!search && !selectedBezirk && (
            <Link
              href="/dashboard/ensembles/new"
              className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Ensemble erstellen
            </Link>
          )}
        </div>
      ) : (
        <div className="dark:border-dark-border dark:bg-dark-surface overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="dark:border-dark-border dark:bg-dark-background-secondary border-b border-gray-200 bg-gray-50">
                  <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Ensemble
                  </th>
                  <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Bezirk
                  </th>
                  <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Leitung
                  </th>
                  <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Probe
                  </th>
                  <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="dark:text-dark-muted px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {ensembles.map((ensemble) => (
                  <tr
                    key={ensemble.id}
                    className="dark:hover:bg-dark-background-secondary hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {ensemble.image?.url ? (
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded">
                            <Image
                              src={ensemble.image.url}
                              alt={ensemble.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-10 w-10 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-500">
                            <MusicIcon className="h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <Link
                            href={`/dashboard/ensembles/${ensemble.id}`}
                            className="hover:text-primary dark:text-dark-text font-medium text-gray-900"
                          >
                            {ensemble.name}
                          </Link>
                          {ensemble.location && (
                            <p className="dark:text-dark-muted text-sm text-gray-500">
                              {ensemble.location.city}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {ensemble.bezirk ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                          style={{
                            backgroundColor: `var(--color-district-${ensemble.bezirk.number})`,
                          }}
                        >
                          {ensemble.bezirk.shortName}
                        </span>
                      ) : (
                        <span className="dark:text-dark-muted text-sm text-gray-400 italic">
                          Kein Bezirk
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {ensemble.conductorName ? (
                        <span className="dark:text-dark-text text-sm text-gray-900">
                          {ensemble.conductorName}
                        </span>
                      ) : ensemble.conductor ? (
                        <span className="dark:text-dark-text text-sm text-gray-900">
                          {ensemble.conductor.displayName}
                        </span>
                      ) : (
                        <span className="dark:text-dark-muted text-sm text-gray-400 italic">
                          Keine Leitung
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {ensemble.rehearsalSchedules &&
                      ensemble.rehearsalSchedules.length > 0 ? (
                        <div className="space-y-1">
                          {ensemble.rehearsalSchedules.map(
                            (schedule, index) => (
                              <div
                                key={index}
                                className="dark:text-dark-muted text-sm text-gray-600"
                              >
                                {schedule.day}
                                {schedule.time && `, ${schedule.time}`}
                              </div>
                            ),
                          )}
                        </div>
                      ) : ensemble.rehearsalDay || ensemble.rehearsalTime ? (
                        <span className="dark:text-dark-muted text-sm text-gray-600">
                          {ensemble.rehearsalDay}
                          {ensemble.rehearsalDay &&
                            ensemble.rehearsalTime &&
                            ", "}
                          {ensemble.rehearsalTime}
                        </span>
                      ) : (
                        <span className="dark:text-dark-muted text-sm text-gray-400 italic">
                          –
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          ensemble.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {ensemble.isActive ? "Aktiv" : "Inaktiv"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/ensembles/${ensemble.id}`}
                          className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                          title="Details anzeigen"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/dashboard/ensembles/${ensemble.id}/edit`}
                          className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                          title="Bearbeiten"
                        >
                          <EditIcon className="h-4 w-4" />
                        </Link>
                        {isAdmin && (
                          <button
                            onClick={() =>
                              handleDelete(ensemble.id, ensemble.name)
                            }
                            disabled={deletingId === ensemble.id}
                            className="rounded p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                            title="Löschen"
                          >
                            {deletingId === ensemble.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                            ) : (
                              <TrashIcon className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination & Results count */}
          <div className="dark:border-dark-border flex flex-col items-center justify-between gap-4 border-t border-gray-200 px-6 py-4 sm:flex-row">
            <div className="dark:text-dark-muted text-sm text-gray-500">
              {ensemblesData?.total} Ensemble
              {ensemblesData?.total !== 1 && "s"} gefunden
              {ensemblesData && ensemblesData.pages > 1 && (
                <span>
                  {" "}
                  · Seite {page} von {ensemblesData.pages}
                </span>
              )}
            </div>
            {ensemblesData && ensemblesData.pages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="dark:border-dark-border dark:text-dark-text inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Zurück
                </button>
                <div className="flex items-center gap-1">
                  {Array.from(
                    { length: Math.min(5, ensemblesData.pages) },
                    (_, i) => {
                      let pageNum: number;
                      if (ensemblesData.pages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= ensemblesData.pages - 2) {
                        pageNum = ensemblesData.pages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                            page === pageNum
                              ? "bg-primary text-white"
                              : "dark:text-dark-text text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    },
                  )}
                </div>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(ensemblesData.pages, p + 1))
                  }
                  disabled={page === ensemblesData.pages}
                  className="dark:border-dark-border dark:text-dark-text inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
                >
                  Weiter
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardPage>
  );
}
