"use client";

import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
  ChevronDownIcon,
  ChevronUpIcon,
  EditIcon,
  EyeIcon,
  PlusIcon,
} from "lucide-react";
import { UserIcon, UsersIcon } from "lucide-react";
import { computeReorderUpdates } from "@/lib/reorder";

const ROLE_LABELS: Record<string, string> = {
  LPW: "Landesposaunenwart",
  RPW: "Regionalposaunenwart",
};

type Posaunenwart = RouterOutputs["organization"]["getPosaunenwarte"][number];

const column = createDataTableColumnHelper<Posaunenwart>();

export default function DashboardPosaunenwartenPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);
  const [isReordering, setIsReordering] = useState(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageOrganization = hasPermission(
    PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENWARTE,
  );

  const {
    data: posaunenwarte,
    isLoading: posaunenwarteLoading,
    refetch,
  } = api.organization.getPosaunenwarte.useQuery();

  const reorderMutation = api.organization.updatePosaunenwart.useMutation();

  // Die Liste ist nach Rolle gruppiert (LPW vor RPW) – Verschieben ist nur
  // innerhalb der eigenen Rollengruppe möglich.
  const handleMove = async (personId: string, direction: "up" | "down") => {
    if (!posaunenwarte || isReordering) return;
    const person = posaunenwarte.find((p) => p.id === personId);
    if (!person) return;
    const group = posaunenwarte.filter((p) => p.role === person.role);
    const index = group.findIndex((p) => p.id === personId);
    const updates = computeReorderUpdates(group, index, direction);
    if (!updates) return;
    setIsReordering(true);
    try {
      for (const update of updates) {
        await reorderMutation.mutateAsync({
          id: update.id,
          sortOrder: update.sortOrder,
        });
      }
      await refetch();
    } catch (error) {
      toast.error(
        "Fehler beim Ändern der Reihenfolge: " +
          (error instanceof Error ? error.message : "Unbekannter Fehler"),
      );
    } finally {
      setIsReordering(false);
    }
  };

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/posaunenwarte");
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

  const columns = useMemo<DataTableColumn<Posaunenwart>[]>(
    () =>
      column.columns([
        // Die gespeicherte Reihenfolge als eigene Spalte: nur so bleiben die
        // Hoch/Runter-Pfeile nachvollziehbar, wenn nach etwas anderem sortiert
        // wird — sie verschieben immer die gespeicherte Position, nie die Sicht.
        column.accessor((person) => (posaunenwarte?.indexOf(person) ?? 0) + 1, {
          id: "position",
          header: "#",
          enableColumnFilter: false,
          meta: { align: "right", label: "Reihenfolge" },
        }),
        column.accessor((person) => person.name ?? "Unbekannt", {
          id: "person",
          header: "Posaunenwart",
          meta: { alwaysVisible: true },
          cell: ({ row }) => {
            const person = row.original;
            return (
              <div className="flex items-center gap-3">
                {person.profileImage?.url ? (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={person.profileImage.url}
                      alt={person.name ?? ""}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <UserIcon className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/posaunenwarte/${person.id}`}
                    className="hover:text-primary dark:text-dark-text font-medium text-gray-900"
                  >
                    {person.name ?? "Unbekannt"}
                  </Link>
                  <p className="dark:text-dark-muted text-sm text-gray-500">
                    {person.email}
                  </p>
                </div>
              </div>
            );
          },
        }),
        column.accessor(
          (person) =>
            person.role
              ? (ROLE_LABELS[person.role] ?? person.role)
              : "Unbekannt",
          {
            id: "role",
            header: "Rolle",
            meta: { filterVariant: "set" },
            cell: ({ row, getValue }) => (
              <>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    row.original.role === "LPW"
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                  }`}
                >
                  {getValue()}
                </span>
                {row.original.districtRoleName && (
                  <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                    {row.original.districtRoleName}
                  </p>
                )}
              </>
            ),
          },
        ),
        column.accessor(
          (person) =>
            (person.bezirke ?? [])
              .map((bezirk) => `Bezirk ${bezirk.number}`)
              .join(", "),
          {
            id: "bezirke",
            header: "Zuständige Bezirke",
            cell: ({ row }) => {
              const person = row.original;
              if (person.bezirke && person.bezirke.length > 0) {
                return (
                  <div className="flex flex-wrap gap-1">
                    {person.bezirke.map((bezirk) => (
                      <span
                        key={bezirk.id}
                        className="dark:bg-dark-background-secondary dark:text-dark-muted inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                      >
                        Bezirk {bezirk.number}
                      </span>
                    ))}
                  </div>
                );
              }
              return (
                <span className="dark:text-dark-muted text-sm text-gray-500">
                  {person.role === "LPW" ? "Alle Bezirke" : "Keine Zuordnung"}
                </span>
              );
            },
          },
        ),
        column.display({
          id: "actions",
          header: "Aktionen",
          meta: { align: "right", label: "Aktionen" },
          cell: ({ row }) => {
            const person = row.original;
            const index = posaunenwarte?.indexOf(person) ?? -1;
            const list = posaunenwarte ?? [];
            return (
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => void handleMove(person.id, "up")}
                  disabled={
                    list[index - 1]?.role !== person.role || isReordering
                  }
                  aria-label="Nach oben"
                  title="Nach oben"
                  className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-gray-800"
                >
                  <ChevronUpIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => void handleMove(person.id, "down")}
                  disabled={
                    list[index + 1]?.role !== person.role || isReordering
                  }
                  aria-label="Nach unten"
                  title="Nach unten"
                  className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-gray-800"
                >
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
                <Link
                  href={`/dashboard/posaunenwarte/${person.id}`}
                  className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                  title="Details anzeigen"
                >
                  <EyeIcon className="h-4 w-4" />
                </Link>
                <Link
                  href={`/dashboard/posaunenwarte/${person.id}/edit`}
                  className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                  title="Bezirke bearbeiten"
                >
                  <EditIcon className="h-4 w-4" />
                </Link>
                {person.userId && (
                  <Link
                    href={`/dashboard/users/${person.userId}`}
                    className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                    title="Benutzerprofil"
                  >
                    <UserIcon className="h-4 w-4" />
                  </Link>
                )}
              </div>
            );
          },
        }),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [posaunenwarte, isReordering],
  );

  if (isPending || profileLoading || posaunenwarteLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageOrganization) {
    return null;
  }

  return (
    <DashboardPage
      title="Posaunenwarte"
      description="Verwalte die Landesposaunenwarte (LPW) und Regionalposaunenwarte (RPW)"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Posaunenwarte" },
      ]}
      actions={
        <div className="flex gap-2">
          <Link
            href="/dashboard/posaunenwarte/new"
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-medium text-white transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Neuer Posaunenwart
          </Link>
        </div>
      }
    >
      <DataTable
        data={posaunenwarte}
        columns={columns}
        getRowId={(person) => person.id}
        isLoading={posaunenwarteLoading}
        rowNoun={["Posaunenwart:in", "Posaunenwarte"]}
        searchPlaceholder="Name, E-Mail oder Bezirk suchen…"
        initialSorting={[{ id: "position", desc: false }]}
        emptyState={
          <>
            <UsersIcon className="dark:text-dark-muted mx-auto h-12 w-12 text-gray-400" />
            <h3 className="dark:text-dark-text mt-4 mb-2 text-lg font-semibold text-gray-900">
              Keine Posaunenwarte
            </h3>
            <p className="dark:text-dark-muted mb-6 text-gray-600">
              Es wurden noch keine Posaunenwarte angelegt.
            </p>
            <Link
              href="/dashboard/posaunenwarte/new"
              className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
            >
              Ersten Posaunenwart anlegen
            </Link>
          </>
        }
      />
    </DashboardPage>
  );
}
