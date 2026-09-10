"use client";
import { useMemo, useState } from "react";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import type { PermissionKey } from "@/lib/permissions";
import Link from "next/link";
import Image from "next/image";
import { DashboardPage } from "@/app/_components/dashboard";
import {
  DataTable,
  createDataTableColumnHelper,
  type DataTableColumn,
} from "@/app/_components/ui/data-table";
import { EditIcon, MusicIcon, PlusIcon } from "lucide-react";
import { EyeIcon, TrashIcon } from "lucide-react";

type DashboardEnsemble =
  RouterOutputs["ensembles"]["getAll"]["ensembles"][number];

const column = createDataTableColumnHelper<DashboardEnsemble>();

/** Eingetragene Leitung, sonst der verknüpfte Benutzer. */
function conductorName(ensemble: DashboardEnsemble): string {
  return ensemble.conductorName ?? ensemble.conductor?.displayName ?? "";
}

/** Probenzeiten als eine Zeile — auch die Sortier- und Suchgrundlage. */
function rehearsalSummary(ensemble: DashboardEnsemble): string {
  if (ensemble.rehearsalSchedules?.length) {
    return ensemble.rehearsalSchedules
      .map((schedule) =>
        [schedule.day, schedule.time].filter(Boolean).join(", "),
      )
      .join(" · ");
  }
  return [ensemble.rehearsalDay, ensemble.rehearsalTime]
    .filter(Boolean)
    .join(", ");
}

export default function DashboardEnsemblesPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toast = useToast();

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { hasDashboardAccess, hasAnyPermission } = usePermissions();
  const hasManagePermission = hasAnyPermission([
    "ensembles.delete" as PermissionKey,
  ]);

  // Die ganze Liste auf einmal: Ensembles sind eine überschaubare Stammdatei,
  // und nur so greifen Sortierung und Spaltenfilter über alle Zeilen statt nur
  // über die gerade sichtbare Seite. Inaktive kommen mit und lassen sich über
  // den Status-Filter in der Spalte ausblenden.
  const {
    data: ensemblesData,
    isLoading: ensemblesLoading,
    refetch,
  } = api.ensembles.getAll.useQuery({ page: 1, limit: 500 });

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

  const columns = useMemo<DataTableColumn<DashboardEnsemble>[]>(
    () =>
      column.columns([
        column.accessor((ensemble) => ensemble.name, {
          id: "name",
          header: "Ensemble",
          meta: { alwaysVisible: true },
          cell: ({ row }) => {
            const ensemble = row.original;
            return (
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
                <div className="min-w-0">
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
            );
          },
        }),
        column.accessor((ensemble) => ensemble.bezirk?.shortName ?? "", {
          id: "bezirk",
          header: "Bezirk",
          meta: { filterVariant: "set" },
          cell: ({ row }) =>
            row.original.bezirk ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                style={{
                  backgroundColor: `var(--color-district-${row.original.bezirk.number})`,
                }}
              >
                {row.original.bezirk.shortName}
              </span>
            ) : (
              <span className="dark:text-dark-muted text-sm text-gray-400 italic">
                Kein Bezirk
              </span>
            ),
        }),
        column.accessor(conductorName, {
          id: "conductor",
          header: "Leitung",
          cell: ({ getValue }) =>
            getValue() || (
              <span className="dark:text-dark-muted text-sm text-gray-400 italic">
                Keine Leitung
              </span>
            ),
        }),
        column.accessor(rehearsalSummary, {
          id: "rehearsal",
          header: "Probe",
          cell: ({ row }) => {
            const ensemble = row.original;
            if (ensemble.rehearsalSchedules?.length) {
              return (
                <div className="space-y-1">
                  {ensemble.rehearsalSchedules.map((schedule, index) => (
                    <div
                      key={index}
                      className="dark:text-dark-muted text-sm text-gray-600"
                    >
                      {schedule.day}
                      {schedule.time && `, ${schedule.time}`}
                    </div>
                  ))}
                </div>
              );
            }
            const fallback = rehearsalSummary(ensemble);
            return fallback ? (
              <span className="dark:text-dark-muted text-sm text-gray-600">
                {fallback}
              </span>
            ) : (
              <span className="dark:text-dark-muted text-sm text-gray-400 italic">
                –
              </span>
            );
          },
        }),
        column.accessor(
          (ensemble) => (ensemble.isActive ? "Aktiv" : "Inaktiv"),
          {
            id: "status",
            header: "Status",
            meta: { filterVariant: "set" },
            cell: ({ row }) => (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  row.original.isActive
                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {row.original.isActive ? "Aktiv" : "Inaktiv"}
              </span>
            ),
          },
        ),
        column.display({
          id: "actions",
          header: "Aktionen",
          meta: { align: "right", label: "Aktionen" },
          cell: ({ row }) => (
            <div className="flex items-center justify-end gap-2">
              <Link
                href={`/dashboard/ensembles/${row.original.id}`}
                className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                title="Details anzeigen"
              >
                <EyeIcon className="h-4 w-4" />
              </Link>
              <Link
                href={`/dashboard/ensembles/${row.original.id}/edit`}
                className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                title="Bearbeiten"
              >
                <EditIcon className="h-4 w-4" />
              </Link>
              {hasManagePermission && (
                <button
                  onClick={() =>
                    handleDelete(row.original.id, row.original.name)
                  }
                  disabled={deletingId === row.original.id}
                  className="rounded p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  title="Löschen"
                >
                  {deletingId === row.original.id ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                  ) : (
                    <TrashIcon className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          ),
        }),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deletingId, hasManagePermission],
  );

  if (isPending || profileLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !hasDashboardAccess) {
    return null;
  }

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
      <DataTable
        data={ensemblesData?.ensembles}
        columns={columns}
        getRowId={(ensemble) => ensemble.id}
        isLoading={ensemblesLoading}
        rowNoun={["Ensemble", "Ensembles"]}
        searchPlaceholder="Ensemble, Ort oder Leitung suchen…"
        initialSorting={[{ id: "name", desc: false }]}
        emptyState={
          <>
            <MusicIcon className="dark:text-dark-muted mx-auto h-12 w-12 text-gray-400" />
            <h3 className="dark:text-dark-text mt-4 mb-2 text-lg font-semibold text-gray-900">
              Keine Ensembles gefunden
            </h3>
            <p className="dark:text-dark-muted mb-6 text-gray-600">
              Erstelle das erste Ensemble, um es hier anzuzeigen.
            </p>
            <Link
              href="/dashboard/ensembles/new"
              className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Ensemble erstellen
            </Link>
          </>
        }
      />
    </DashboardPage>
  );
}
