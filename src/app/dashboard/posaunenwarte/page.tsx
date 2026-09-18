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
import { Tag } from "@/app/_components/programmheft/tag";
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
        // Eigene Spalte: Die Hoch/Runter-Pfeile verschieben immer die gespeicherte
        // Position, nie die Sicht — auch wenn nach etwas anderem sortiert wird.
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
                  <div className="bg-rule/25 dark:bg-night-raised text-dark dark:text-night-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                    <UserIcon className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/posaunenwarte/${person.id}`}
                    className="hover:text-primary-ink dark:hover:text-primary text-ink dark:text-night-text font-medium"
                  >
                    {person.name ?? "Unbekannt"}
                  </Link>
                  <p className="text-dark dark:text-night-muted text-sm">
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
                <Tag tone={row.original.role === "LPW" ? "ink" : "inverse"}>
                  {getValue()}
                </Tag>
                {row.original.districtRoleName && (
                  <p className="text-dark dark:text-night-muted mt-1 text-xs">
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
                      <Tag key={bezirk.id} tone="inverse">
                        Bezirk {bezirk.number}
                      </Tag>
                    ))}
                  </div>
                );
              }
              return (
                <span className="text-dark dark:text-night-muted text-sm">
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
                  className="text-dark hover:bg-rule/25 hover:text-ink dark:text-night-muted dark:hover:bg-night-raised dark:hover:text-night-text p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
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
                  className="text-dark hover:bg-rule/25 hover:text-ink dark:text-night-muted dark:hover:bg-night-raised dark:hover:text-night-text p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
                <Link
                  href={`/dashboard/posaunenwarte/${person.id}`}
                  className="text-dark hover:bg-rule/25 hover:text-ink dark:text-night-muted dark:hover:bg-night-raised dark:hover:text-night-text p-1.5 transition-colors"
                  title="Details anzeigen"
                >
                  <EyeIcon className="h-4 w-4" />
                </Link>
                <Link
                  href={`/dashboard/posaunenwarte/${person.id}/edit`}
                  className="text-dark hover:bg-rule/25 hover:text-ink dark:text-night-muted dark:hover:bg-night-raised dark:hover:text-night-text p-1.5 transition-colors"
                  title="Bezirke bearbeiten"
                >
                  <EditIcon className="h-4 w-4" />
                </Link>
                {person.userId && (
                  <Link
                    href={`/dashboard/users/${person.userId}`}
                    className="text-dark hover:bg-rule/25 hover:text-ink dark:text-night-muted dark:hover:bg-night-raised dark:hover:text-night-text p-1.5 transition-colors"
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
            className="bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted semi-condensed inline-flex min-h-11 items-center gap-2 px-4 py-2.5 font-semibold transition-colors"
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
            <UsersIcon className="text-dark dark:text-night-muted mx-auto h-12 w-12" />
            <h3 className="condensed text-ink dark:text-night-text mt-4 mb-2 text-lg font-bold">
              Keine Posaunenwarte
            </h3>
            <p className="text-dark dark:text-night-muted mb-6">
              Es wurden noch keine Posaunenwarte angelegt.
            </p>
            <Link
              href="/dashboard/posaunenwarte/new"
              className="bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted semi-condensed inline-flex min-h-11 items-center gap-2 px-4 py-2.5 font-semibold transition-colors"
            >
              Ersten Posaunenwart anlegen
            </Link>
          </>
        }
      />
    </DashboardPage>
  );
}
