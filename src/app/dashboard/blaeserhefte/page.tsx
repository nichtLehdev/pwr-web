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
  EyeIcon,
  FileIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";

type Blaeserheft = RouterOutputs["materials"]["getBlaserhefte"][number];

const column = createDataTableColumnHelper<Blaeserheft>();

/** Die lieferbaren Ausgaben als Text — Grundlage für Suche und Sortierung. */
function availabilityList(heft: Blaeserheft): string {
  return [
    heft.availableBlaeserheft ? "Heft" : null,
    heft.availableBeiheft ? "Beiheft" : null,
    heft.availableCd ? "CD" : null,
    heft.availableTrompeten ? "Trompeten" : null,
  ]
    .filter(Boolean)
    .join(", ");
}

export default function DashboardBlaeserheftePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageMaterials = hasPermission(
    PERMISSIONS.DOWNLOADS_MANAGE_BLAESERHEFTE,
  );

  const {
    data: hefte,
    isLoading: hefteLoading,
    refetch,
  } = api.materials.getBlaserhefte.useQuery();

  const deleteMutation = api.materials.deleteBlaserheft.useMutation({
    onSuccess: () => {
      void refetch();
      setDeletingId(null);
      toast.success("Bläserheft erfolgreich gelöscht");
    },
    onError: (error) => {
      setDeletingId(null);
      toast.error("Fehler beim Löschen: " + error.message);
    },
  });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/blaeserhefte");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !permissionsLoading &&
      !canManageMaterials &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, permissionsLoading, canManageMaterials, router]);

  const handleDelete = async (id: string) => {
    if (!confirm("Möchtest du dieses Bläserheft wirklich löschen?")) {
      return;
    }
    setDeletingId(id);
    deleteMutation.mutate({ id });
  };

  const columns = useMemo<DataTableColumn<Blaeserheft>[]>(
    () =>
      column.columns([
        column.accessor((heft) => heft.title, {
          id: "title",
          header: "Bläserheft",
          meta: { alwaysVisible: true },
          cell: ({ row }) => {
            const heft = row.original;
            return (
              <div className="flex items-center gap-3">
                {heft.image?.url ? (
                  <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded">
                    <Image
                      src={heft.image.url}
                      alt={heft.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-12 w-10 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-500">
                    <FileIcon className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/blaeserhefte/${heft.id}`}
                    className="hover:text-primary dark:text-dark-text font-medium text-gray-900"
                  >
                    {heft.title}
                  </Link>
                  <p className="dark:text-dark-muted text-sm text-gray-500">
                    {heft.subtitle}
                  </p>
                </div>
              </div>
            );
          },
        }),
        column.accessor((heft) => heft.year, {
          id: "year",
          header: "Jahr",
          meta: { filterVariant: "set", align: "center" },
          cell: ({ getValue }) => (
            <span className="dark:bg-dark-background-secondary dark:text-dark-text inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-800">
              {getValue()}
            </span>
          ),
        }),
        column.accessor((heft) => heft.priceBlaeserheft ?? 0, {
          id: "prices",
          header: "Preise",
          enableColumnFilter: false,
          cell: ({ row }) => {
            const heft = row.original;
            return (
              <div className="dark:text-dark-muted space-y-1 text-sm text-gray-600">
                {heft.priceBlaeserheft && (
                  <p>Heft: {heft.priceBlaeserheft} €</p>
                )}
                {heft.priceBeiheft && <p>Beiheft: {heft.priceBeiheft} €</p>}
                {heft.priceCd && <p>CD: {heft.priceCd} €</p>}
              </div>
            );
          },
        }),
        column.accessor(availabilityList, {
          id: "availability",
          header: "Verfügbarkeit",
          cell: ({ row }) => (
            <div className="flex flex-wrap gap-1">
              {availabilityList(row.original)
                .split(", ")
                .filter(Boolean)
                .map((label) => (
                  <span
                    key={label}
                    className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  >
                    {label}
                  </span>
                ))}
            </div>
          ),
        }),
        column.display({
          id: "actions",
          header: "Aktionen",
          meta: { align: "right", label: "Aktionen" },
          cell: ({ row }) => (
            <div className="flex items-center justify-end gap-2">
              <Link
                href={`/dashboard/blaeserhefte/${row.original.id}`}
                className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                title="Details anzeigen"
              >
                <EyeIcon className="h-4 w-4" />
              </Link>
              <Link
                href={`/dashboard/blaeserhefte/${row.original.id}/edit`}
                className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                title="Bearbeiten"
              >
                <PencilIcon className="h-4 w-4" />
              </Link>
              <button
                onClick={() => handleDelete(row.original.id)}
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
            </div>
          ),
        }),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deletingId],
  );

  if (isPending || profileLoading || hefteLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageMaterials) {
    return null;
  }

  return (
    <DashboardPage
      title="Bläserhefte"
      description="Verwalte die Bläserhefte des Landesposaunenwerks"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Bläserhefte" },
      ]}
      actions={
        <Link
          href="/dashboard/blaeserhefte/new"
          className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Neues Bläserheft
        </Link>
      }
    >
      <DataTable
        data={hefte}
        columns={columns}
        getRowId={(heft) => heft.id}
        isLoading={hefteLoading}
        rowNoun={["Bläserheft", "Bläserhefte"]}
        searchPlaceholder="Titel oder Untertitel suchen…"
        initialSorting={[{ id: "year", desc: true }]}
        emptyState={
          <>
            <FileIcon className="dark:text-dark-muted mx-auto h-12 w-12 text-gray-400" />
            <h3 className="dark:text-dark-text mt-4 mb-2 text-lg font-semibold text-gray-900">
              Keine Bläserhefte vorhanden
            </h3>
            <p className="dark:text-dark-muted mb-6 text-gray-600">
              Erstelle das erste Bläserheft, um es hier anzuzeigen.
            </p>
            <Link
              href="/dashboard/blaeserhefte/new"
              className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Bläserheft erstellen
            </Link>
          </>
        }
      />
    </DashboardPage>
  );
}
