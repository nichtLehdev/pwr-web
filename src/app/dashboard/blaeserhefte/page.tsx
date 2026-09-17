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
                  <div className="relative h-12 w-10 shrink-0 overflow-hidden">
                    <Image
                      src={heft.image.url}
                      alt={heft.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="bg-rule/25 dark:bg-night-raised text-dark dark:text-night-muted flex h-12 w-10 shrink-0 items-center justify-center">
                    <FileIcon className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/blaeserhefte/${heft.id}`}
                    className="hover:text-primary-ink dark:hover:text-primary text-ink dark:text-night-text font-medium"
                  >
                    {heft.title}
                  </Link>
                  <p className="text-dark dark:text-night-muted text-sm">
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
          cell: ({ getValue }) => <Tag tone="inverse">{getValue()}</Tag>,
        }),
        column.accessor((heft) => heft.priceBlaeserheft ?? 0, {
          id: "prices",
          header: "Preise",
          enableColumnFilter: false,
          cell: ({ row }) => {
            const heft = row.original;
            return (
              <div className="text-dark dark:text-night-muted space-y-1 text-sm">
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
                  <Tag key={label} tone="muted">
                    {label}
                  </Tag>
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
                className="text-dark hover:bg-rule/25 hover:text-ink dark:text-night-muted dark:hover:bg-night-raised dark:hover:text-night-text p-2 transition-colors"
                title="Details anzeigen"
              >
                <EyeIcon className="h-4 w-4" />
              </Link>
              <Link
                href={`/dashboard/blaeserhefte/${row.original.id}/edit`}
                className="text-dark hover:bg-rule/25 hover:text-ink dark:text-night-muted dark:hover:bg-night-raised dark:hover:text-night-text p-2 transition-colors"
                title="Bearbeiten"
              >
                <PencilIcon className="h-4 w-4" />
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
          ),
        }),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deletingId],
  );

  if (isPending || profileLoading || hefteLoading) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
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
          className="bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted semi-condensed inline-flex min-h-11 items-center gap-2 px-4 py-2.5 font-semibold transition-colors"
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
            <FileIcon className="text-dark dark:text-night-muted mx-auto h-12 w-12" />
            <h3 className="condensed text-ink dark:text-night-text mt-4 mb-2 text-lg font-bold">
              Keine Bläserhefte vorhanden
            </h3>
            <p className="text-dark dark:text-night-muted mb-6">
              Erstelle das erste Bläserheft, um es hier anzuzeigen.
            </p>
            <Link
              href="/dashboard/blaeserhefte/new"
              className="bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted semi-condensed inline-flex min-h-11 items-center gap-2 px-4 py-2.5 font-semibold transition-colors"
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
