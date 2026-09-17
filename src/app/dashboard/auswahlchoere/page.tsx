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
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden">
                    <Image
                      src={chor.image.url}
                      alt={chor.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="bg-rule/25 dark:bg-night-raised text-dark dark:text-night-muted flex h-10 w-10 shrink-0 items-center justify-center">
                    <Music className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/auswahlchoere/${chor.id}`}
                    className="hover:text-primary-ink dark:hover:text-primary text-ink dark:text-night-text font-medium"
                  >
                    {chor.name}
                  </Link>
                  <p className="text-dark dark:text-night-muted text-sm">
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
                <span className="text-dark dark:text-night-muted text-sm italic">
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
              <Tag tone={row.original.showApplication ? "ink" : "muted"}>
                {getValue()}
              </Tag>
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
                className="text-dark hover:bg-rule/25 hover:text-ink dark:text-night-muted dark:hover:bg-night-raised dark:hover:text-night-text p-2 transition-colors"
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
                className="text-dark hover:bg-rule/25 hover:text-ink dark:text-night-muted dark:hover:bg-night-raised dark:hover:text-night-text p-2 transition-colors"
                title="Bearbeiten"
              >
                <Edit className="h-4 w-4" />
              </Link>
              <button
                onClick={() => handleDelete(row.original.id, row.original.name)}
                disabled={deletingId === row.original.id}
                className="p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
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
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
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
          className="bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted semi-condensed inline-flex min-h-11 items-center gap-2 px-4 py-2.5 font-semibold transition-colors"
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
            <Music className="text-dark dark:text-night-muted mx-auto h-12 w-12" />
            <h3 className="condensed text-ink dark:text-night-text mt-4 mb-2 text-lg font-bold">
              Keine Auswahlchöre gefunden
            </h3>
            <p className="text-dark dark:text-night-muted mb-6">
              Erstelle den ersten Auswahlchor, um ihn hier anzuzeigen.
            </p>
            <Link
              href="/dashboard/auswahlchoere/new"
              className="bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted semi-condensed inline-flex min-h-11 items-center gap-2 px-4 py-2.5 font-semibold transition-colors"
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
