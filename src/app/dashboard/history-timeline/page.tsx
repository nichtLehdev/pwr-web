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
import { ClockIcon, EyeIcon, PencilIcon, Plus, Trash2Icon } from "lucide-react";

type HistoryEvent = RouterOutputs["organization"]["getHistory"][number];

const CATEGORY_LABELS: Record<string, string> = {
  FOUNDING: "Gründung",
  MILESTONE: "Meilenstein",
  EXPANSION: "Erweiterung",
  MODERNIZATION: "Modernisierung",
  PARTNERSHIP: "Partnerschaft",
};

const column = createDataTableColumnHelper<HistoryEvent>();

export default function DashboardHistoryTimelinePage() {
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
  const canManageOrganization = hasPermission(
    PERMISSIONS.ORGANIZATION_MANAGE_HISTORY,
  );

  // Alle Kategorien auf einmal: Die Kategorie ist ein Spaltenfilter.
  const {
    data: historyEvents,
    isLoading: historyLoading,
    refetch,
  } = api.organization.getHistory.useQuery({});

  const deleteMutation = api.organization.deleteHistoryEvent.useMutation({
    onSuccess: () => {
      void refetch();
      setDeletingId(null);
      toast.success("Ereignis erfolgreich gelöscht");
    },
    onError: (error) => {
      setDeletingId(null);
      toast.error("Fehler beim Löschen: " + error.message);
    },
  });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/history-timeline");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !permissionsLoading &&
      !canManageOrganization &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [
    profile,
    profileLoading,
    permissionsLoading,
    canManageOrganization,
    router,
  ]);

  const handleDelete = async (id: string, title: string) => {
    if (
      !confirm(
        `Möchtest du das Ereignis "${title}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      )
    ) {
      return;
    }
    setDeletingId(id);
    deleteMutation.mutate({ id });
  };

  const columns = useMemo<DataTableColumn<HistoryEvent>[]>(
    () =>
      column.columns([
        column.accessor((event) => event.year, {
          id: "year",
          header: "Jahr",
          meta: { filterVariant: "number", alwaysVisible: true },
          cell: ({ getValue }) => (
            <span className="text-ink dark:text-night-text font-semibold">
              {getValue()}
            </span>
          ),
        }),
        column.accessor((event) => `${event.title} ${event.description}`, {
          id: "event",
          header: "Ereignis",
          meta: { alwaysVisible: true, label: "Ereignis" },
          cell: ({ row }) => (
            <div>
              <Link
                href={`/dashboard/history-timeline/${row.original.id}`}
                className="hover:text-primary-ink dark:hover:text-primary text-ink dark:text-night-text font-medium"
              >
                {row.original.title}
              </Link>
              <p className="text-dark dark:text-night-muted mt-1 line-clamp-2 text-sm">
                {row.original.description}
              </p>
            </div>
          ),
        }),
        column.accessor(
          (event) =>
            event.category
              ? (CATEGORY_LABELS[event.category] ?? event.category)
              : "",
          {
            id: "category",
            header: "Kategorie",
            meta: { filterVariant: "set" },
            cell: ({ getValue }) =>
              getValue() ? (
                <Tag tone="inverse">{getValue()}</Tag>
              ) : (
                <span className="text-dark dark:text-night-muted text-sm italic">
                  Keine Kategorie
                </span>
              ),
          },
        ),
        column.accessor(
          (event) => (event.image?.url ? "Mit Bild" : "Kein Bild"),
          {
            id: "image",
            header: "Bild",
            meta: { filterVariant: "set" },
            cell: ({ row }) =>
              row.original.image?.url ? (
                <div className="relative h-10 w-10 shrink-0 overflow-hidden">
                  <Image
                    src={row.original.image.url}
                    alt={row.original.imageAlt ?? row.original.title}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <span className="text-dark dark:text-night-muted text-sm italic">
                  Kein Bild
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
                href={`/dashboard/history-timeline/${row.original.id}`}
                className="text-dark hover:bg-rule/25 hover:text-ink dark:text-night-muted dark:hover:bg-night-raised dark:hover:text-night-text p-2 transition-colors"
                title="Details anzeigen"
              >
                <EyeIcon className="h-4 w-4" />
              </Link>
              <Link
                href={`/dashboard/history-timeline/${row.original.id}/edit`}
                className="text-dark hover:bg-rule/25 hover:text-ink dark:text-night-muted dark:hover:bg-night-raised dark:hover:text-night-text p-2 transition-colors"
                title="Bearbeiten"
              >
                <PencilIcon className="h-4 w-4" />
              </Link>
              <button
                onClick={() =>
                  handleDelete(row.original.id, row.original.title)
                }
                disabled={deletingId === row.original.id}
                className="p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                title="Löschen"
              >
                {deletingId === row.original.id ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                ) : (
                  <Trash2Icon className="h-4 w-4" />
                )}
              </button>
            </div>
          ),
        }),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deletingId],
  );

  if (isPending || profileLoading || historyLoading) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageOrganization) {
    return null;
  }

  return (
    <DashboardPage
      title="Historie-Timeline"
      description="Verwalte alle historischen Ereignisse"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Historie-Timeline" },
      ]}
      actions={
        <Link
          href="/dashboard/history-timeline/new"
          className="bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted semi-condensed inline-flex min-h-11 items-center gap-2 px-4 py-2.5 font-semibold transition-colors"
        >
          <Plus className="h-5 w-5" />
          Neues Ereignis
        </Link>
      }
    >
      <DataTable
        data={historyEvents}
        columns={columns}
        getRowId={(event) => event.id}
        isLoading={historyLoading}
        rowNoun={["Ereignis", "Ereignisse"]}
        searchPlaceholder="Ereignis, Jahr oder Beschreibung suchen…"
        initialSorting={[{ id: "year", desc: true }]}
        emptyState={
          <>
            <ClockIcon className="text-dark dark:text-night-muted mx-auto h-12 w-12" />
            <h3 className="condensed text-ink dark:text-night-text mt-4 mb-2 text-lg font-bold">
              Keine Ereignisse gefunden
            </h3>
            <p className="text-dark dark:text-night-muted mb-6">
              Erstelle das erste Ereignis, um es hier anzuzeigen.
            </p>
            <Link
              href="/dashboard/history-timeline/new"
              className="bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted semi-condensed inline-flex min-h-11 items-center gap-2 px-4 py-2.5 font-semibold transition-colors"
            >
              <Plus className="h-5 w-5" />
              Ereignis erstellen
            </Link>
          </>
        }
      />
    </DashboardPage>
  );
}
