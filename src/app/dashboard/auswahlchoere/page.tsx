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
import { Plus, Music, Edit, Trash2, Eye, EyeOff } from "lucide-react";

type Auswahlchor =
  RouterOutputs["auswahlchoere"]["getAll"]["auswahlchoere"][number];

const column = createDataTableColumnHelper<Auswahlchor>();

export default function DashboardAuswahlchoerePage() {
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
  const canManageAuswahlchoere = hasPermission(
    PERMISSIONS.ORGANIZATION_MANAGE_AUSWAHLCHOERE,
  );

  // Die ganze Liste auf einmal: es gibt eine Handvoll Auswahlchöre, und nur so
  // greifen Sortierung und Spaltenfilter über alle Zeilen.
  const {
    data: auswahlchoereData,
    isLoading: auswahlchoereLoading,
    refetch,
  } = api.auswahlchoere.getAll.useQuery({ page: 1, limit: 100 });

  const deleteMutation = api.auswahlchoere.delete.useMutation({
    onSuccess: () => {
      void refetch();
      setDeletingId(null);
      toast.success("Auswahlchor erfolgreich gelöscht");
    },
    onError: (error) => {
      setDeletingId(null);
      toast.error("Fehler beim Löschen: " + error.message);
    },
  });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/auswahlchoere");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !permissionsLoading &&
      !canManageAuswahlchoere &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [
    profile,
    profileLoading,
    permissionsLoading,
    canManageAuswahlchoere,
    router,
  ]);

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Möchtest du den Auswahlchor "${name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      )
    ) {
      return;
    }
    setDeletingId(id);
    deleteMutation.mutate({ id });
  };

  const columns = useMemo<DataTableColumn<Auswahlchor>[]>(
    () =>
      column.columns([
        column.accessor((chor) => chor.name, {
          id: "name",
          header: "Auswahlchor",
          meta: { alwaysVisible: true },
          cell: ({ row }) => {
            const chor = row.original;
            return (
              <div className="flex items-center gap-3">
                {chor.image?.url ? (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded">
                    <Image
                      src={chor.image.url}
                      alt={chor.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-10 w-10 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-500">
                    <Music className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/auswahlchoere/${chor.id}`}
                    className="hover:text-primary dark:text-dark-text font-medium text-gray-900"
                  >
                    {chor.name}
                  </Link>
                  <p className="dark:text-dark-muted text-sm text-gray-500">
                    {chor.slug}
                  </p>
                </div>
              </div>
            );
          },
        }),
        column.accessor((chor) => chor.subtitle ?? "", {
          id: "subtitle",
          header: "Untertitel",
        }),
        column.accessor(
          (chor) => chor.conductor?.displayName ?? chor.conductor?.email ?? "",
          {
            id: "conductor",
            header: "Leitung",
            cell: ({ getValue }) =>
              getValue() || (
                <span className="dark:text-dark-muted text-sm text-gray-400 italic">
                  Keine Leitung
                </span>
              ),
          },
        ),
        column.accessor(
          (chor) => (chor.showApplication ? "Aktiv" : "Inaktiv"),
          {
            id: "application",
            header: "Bewerbung",
            meta: { filterVariant: "set" },
            cell: ({ row, getValue }) => (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  row.original.showApplication
                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {getValue()}
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
                href={`/dashboard/auswahlchoere/${row.original.id}`}
                className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                title="Details anzeigen"
              >
                {row.original.showApplication ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Link>
              <Link
                href={`/dashboard/auswahlchoere/${row.original.id}/edit`}
                className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                title="Bearbeiten"
              >
                <Edit className="h-4 w-4" />
              </Link>
              <button
                onClick={() => handleDelete(row.original.id, row.original.name)}
                disabled={deletingId === row.original.id}
                className="rounded p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
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

  if (isPending || profileLoading || auswahlchoereLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageAuswahlchoere) {
    return null;
  }

  return (
    <DashboardPage
      title="Auswahlchöre"
      description="Verwalte alle Auswahlchöre"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Auswahlchöre" },
      ]}
      actions={
        <Link
          href="/dashboard/auswahlchoere/new"
          className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
        >
          <Plus className="h-5 w-5" />
          Neuer Auswahlchor
        </Link>
      }
    >
      <DataTable
        data={auswahlchoereData?.auswahlchoere}
        columns={columns}
        getRowId={(chor) => chor.id}
        isLoading={auswahlchoereLoading}
        rowNoun={["Auswahlchor", "Auswahlchöre"]}
        searchPlaceholder="Auswahlchor oder Leitung suchen…"
        initialSorting={[{ id: "name", desc: false }]}
        emptyState={
          <>
            <Music className="dark:text-dark-muted mx-auto h-12 w-12 text-gray-400" />
            <h3 className="dark:text-dark-text mt-4 mb-2 text-lg font-semibold text-gray-900">
              Keine Auswahlchöre gefunden
            </h3>
            <p className="dark:text-dark-muted mb-6 text-gray-600">
              Erstelle den ersten Auswahlchor, um ihn hier anzuzeigen.
            </p>
            <Link
              href="/dashboard/auswahlchoere/new"
              className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
            >
              <Plus className="h-5 w-5" />
              Auswahlchor erstellen
            </Link>
          </>
        }
      />
    </DashboardPage>
  );
}
