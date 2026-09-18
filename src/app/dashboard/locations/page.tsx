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
import { DashboardPage } from "@/app/_components/dashboard";
import {
  DataTable,
  createDataTableColumnHelper,
  type DataTableColumn,
} from "@/app/_components/ui/data-table";
import { Plus, MapPin, Edit, Trash2, Eye } from "lucide-react";

type DashboardLocation =
  RouterOutputs["locations"]["getAll"]["locations"][number];

const column = createDataTableColumnHelper<DashboardLocation>();

/** Wie oft ein Standort gebucht ist — auch die Sortiergrundlage der Spalte. */
function usageCount(location: DashboardLocation): number {
  return (
    location._count.events + location._count.courses + location._count.ensembles
  );
}

function addressLine(location: DashboardLocation): string {
  return [
    location.street,
    [location.zipCode, location.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}

export default function DashboardLocationsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const toast = useToast();

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageLocations = hasPermission(
    PERMISSIONS.ORGANIZATION_MANAGE_LOCATIONS,
  );

  // Die ganze Liste auf einmal, damit Sortierung und Spaltenfilter über alle Zeilen greifen.
  const {
    data: locationsData,
    isLoading: locationsLoading,
    refetch,
  } = api.locations.getAll.useQuery({ page: 1, limit: 1000 });

  const deleteMutation = api.locations.delete.useMutation({
    onSuccess: () => {
      void refetch();
      setDeletingId(null);
      toast.success("Standort erfolgreich gelöscht");
    },
    onError: (error) => {
      setDeletingId(null);
      toast.error("Fehler beim Löschen: " + error.message);
    },
  });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/locations");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !permissionsLoading &&
      !canManageLocations &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, permissionsLoading, canManageLocations, router]);

  const handleDelete = (id: string, name: string) => {
    if (
      !confirm(
        `Möchtest du den Standort "${name || "Unbekannt"}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      )
    ) {
      return;
    }
    setDeletingId(id);
    deleteMutation.mutate({ id });
  };

  const columns = useMemo<DataTableColumn<DashboardLocation>[]>(
    () =>
      column.columns([
        column.accessor((location) => location.name || "Unbenannter Standort", {
          id: "name",
          header: "Standort",
          meta: { alwaysVisible: true },
          cell: ({ row }) => (
            <div>
              <Link
                href={`/dashboard/locations/${row.original.id}`}
                className="hover:text-primary-ink dark:hover:text-primary text-ink dark:text-night-text font-medium"
              >
                {row.original.name || "Unbenannter Standort"}
              </Link>
              {row.original.additionalInfo && (
                <p className="text-dark dark:text-night-muted text-sm">
                  {row.original.additionalInfo}
                </p>
              )}
            </div>
          ),
        }),
        column.accessor((location) => location.city ?? "", {
          id: "city",
          header: "Ort",
          meta: { filterVariant: "set" },
        }),
        column.accessor(addressLine, {
          id: "address",
          header: "Adresse",
          cell: ({ getValue }) =>
            getValue() || (
              <span className="text-dark dark:text-night-muted italic">
                Keine Adresse
              </span>
            ),
        }),
        column.accessor(usageCount, {
          id: "usage",
          header: "Verwendung",
          meta: { filterVariant: "number", label: "Verwendung" },
          cell: ({ row }) => {
            const location = row.original;
            if (usageCount(location) === 0) {
              return (
                <span className="text-dark dark:text-night-muted italic">
                  Nicht verwendet
                </span>
              );
            }
            return (
              <div className="flex flex-col gap-1 text-sm">
                {location._count.events > 0 && (
                  <span>
                    {location._count.events} Termin
                    {location._count.events !== 1 && "e"}
                  </span>
                )}
                {location._count.courses > 0 && (
                  <span>
                    {location._count.courses} Kurs
                    {location._count.courses !== 1 && "e"}
                  </span>
                )}
                {location._count.ensembles > 0 && (
                  <span>
                    {location._count.ensembles} Ensemble
                    {location._count.ensembles !== 1 && "s"}
                  </span>
                )}
              </div>
            );
          },
        }),
        column.display({
          id: "actions",
          header: "Aktionen",
          meta: { align: "right", label: "Aktionen" },
          cell: ({ row }) => (
            <div className="flex items-center justify-end gap-2">
              <Link
                href={`/dashboard/locations/${row.original.id}`}
                className="text-dark hover:bg-rule/25 hover:text-ink dark:text-night-muted dark:hover:bg-night-raised dark:hover:text-night-text p-2 transition-colors"
                title="Details anzeigen"
              >
                <Eye className="h-4 w-4" />
              </Link>
              <Link
                href={`/dashboard/locations/${row.original.id}/edit`}
                className="text-dark hover:bg-rule/25 hover:text-ink dark:text-night-muted dark:hover:bg-night-raised dark:hover:text-night-text p-2 transition-colors"
                title="Bearbeiten"
              >
                <Edit className="h-4 w-4" />
              </Link>
              <button
                onClick={() =>
                  handleDelete(
                    row.original.id,
                    row.original.name || "Unbekannt",
                  )
                }
                disabled={
                  deletingId === row.original.id || usageCount(row.original) > 0
                }
                className="p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                title="Löschen"
              >
                {deletingId === row.original.id ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          ),
        }),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deletingId],
  );

  if (isPending || profileLoading) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageLocations) {
    return null;
  }

  return (
    <DashboardPage
      title="Standorte"
      description="Verwalte alle Standorte"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Standorte" },
      ]}
      actions={
        <Link
          href="/dashboard/locations/new"
          className="bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted semi-condensed inline-flex min-h-11 items-center gap-2 px-4 py-2.5 font-semibold transition-colors"
        >
          <Plus className="h-5 w-5" />
          Neuer Standort
        </Link>
      }
    >
      <DataTable
        data={locationsData?.locations}
        columns={columns}
        getRowId={(location) => location.id}
        isLoading={locationsLoading}
        rowNoun={["Standort", "Standorte"]}
        searchPlaceholder="Standort suchen…"
        initialSorting={[{ id: "city", desc: false }]}
        emptyState={
          <>
            <MapPin className="text-dark dark:text-night-muted mx-auto h-12 w-12" />
            <h3 className="condensed text-ink dark:text-night-text mt-4 mb-2 text-lg font-bold">
              Keine Standorte gefunden
            </h3>
            <p className="text-dark dark:text-night-muted mb-6">
              Erstelle den ersten Standort, um ihn hier anzuzeigen.
            </p>
            <Link
              href="/dashboard/locations/new"
              className="bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted semi-condensed inline-flex min-h-11 items-center gap-2 px-4 py-2.5 font-semibold transition-colors"
            >
              <Plus className="h-5 w-5" />
              Standort erstellen
            </Link>
          </>
        }
      />
    </DashboardPage>
  );
}
