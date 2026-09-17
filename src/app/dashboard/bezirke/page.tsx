"use client";

import { useSession } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import Link from "next/link";
import { DashboardPage } from "@/app/_components/dashboard";
import { Tag } from "@/app/_components/programmheft/tag";
import {
  DataTable,
  createDataTableColumnHelper,
  type DataTableColumn,
} from "@/app/_components/ui/data-table";
import {
  BookIcon,
  CalendarIcon,
  MapPinIcon,
  MusicIcon,
  EyeIcon,
  PencilIcon,
} from "lucide-react";

type Bezirk = RouterOutputs["bezirke"]["getAll"][number];

const column = createDataTableColumnHelper<Bezirk>();

/** `_count` fehlt in manchen Varianten der Abfrage — dann zählt alles als 0. */
function bezirkCounts(bezirk: Bezirk): {
  ensembles: number;
  events: number;
  courses: number;
} {
  const counts =
    "_count" in bezirk
      ? (bezirk._count as {
          ensembles?: number;
          events?: number;
          courses?: number;
        })
      : {};
  return {
    ensembles: counts.ensembles ?? 0,
    events: counts.events ?? 0,
    courses: counts.courses ?? 0,
  };
}

export default function DashboardBezirkePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageBezirke = hasPermission(
    PERMISSIONS.ORGANIZATION_MANAGE_BEZIRKE,
  );

  const { data: bezirke, isLoading: bezirkeLoading } =
    api.bezirke.getAll.useQuery();

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/bezirke");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !permissionsLoading &&
      !canManageBezirke &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, permissionsLoading, canManageBezirke, router]);

  const columns = useMemo<DataTableColumn<Bezirk>[]>(
    () =>
      column.columns([
        column.accessor((bezirk) => bezirk.number, {
          id: "number",
          header: "Nr.",
          enableColumnFilter: false,
          meta: { alwaysVisible: true, label: "Nummer" },
          cell: ({ row }) => (
            <span
              className="flex h-8 w-8 items-center justify-center text-sm font-bold text-white"
              style={{
                backgroundColor: `var(--color-district-${row.original.number})`,
              }}
            >
              {row.original.number}
            </span>
          ),
        }),
        column.accessor((bezirk) => bezirk.name ?? "", {
          id: "name",
          header: "Bezirk",
          meta: { alwaysVisible: true },
          cell: ({ row }) => (
            <div>
              <Link
                href={`/dashboard/bezirke/${row.original.id}`}
                className="hover:text-primary-ink dark:hover:text-primary text-ink dark:text-night-text font-medium"
              >
                {row.original.name}
              </Link>
              <p className="text-dark dark:text-night-muted text-sm">
                {row.original.shortName}
              </p>
            </div>
          ),
        }),
        column.accessor(
          (bezirk) => bezirk.obleute.map((person) => person.name).join(", "),
          {
            id: "obleute",
            header: "Obleute",
            cell: ({ row }) => {
              const obleute = row.original.obleute;
              return (
                <div className="flex flex-col gap-1">
                  {obleute.length > 0 ? (
                    obleute.slice(0, 2).map((person) => (
                      <span
                        key={person.id}
                        className="text-dark dark:text-night-muted text-sm"
                      >
                        {person.name}
                        <span className="text-dark/70 dark:text-night-muted/70 ml-1 text-xs">
                          ({person.roleName})
                        </span>
                      </span>
                    ))
                  ) : (
                    <span className="text-dark dark:text-night-muted text-sm italic">
                      Keine Obleute zugewiesen
                    </span>
                  )}
                  {obleute.length > 2 && (
                    <span className="text-dark/70 dark:text-night-muted/70 text-xs">
                      +{obleute.length - 2} weitere
                    </span>
                  )}
                </div>
              );
            },
          },
        ),
        column.accessor((bezirk) => bezirkCounts(bezirk).ensembles, {
          id: "ensembles",
          header: "Ensembles",
          meta: { align: "right", filterVariant: "number" },
          cell: ({ getValue }) => (
            <Tag tone="inverse">
              <MusicIcon className="h-3 w-3" />
              {getValue()}
            </Tag>
          ),
        }),
        column.accessor((bezirk) => bezirkCounts(bezirk).events, {
          id: "events",
          header: "Termine",
          meta: { align: "right", filterVariant: "number" },
          cell: ({ getValue }) => (
            <Tag tone="inverse">
              <CalendarIcon className="h-3 w-3" />
              {getValue()}
            </Tag>
          ),
        }),
        column.accessor((bezirk) => bezirkCounts(bezirk).courses, {
          id: "courses",
          header: "Kurse",
          meta: { align: "right", filterVariant: "number" },
          cell: ({ getValue }) => (
            <Tag tone="inverse">
              <BookIcon className="h-3 w-3" />
              {getValue()}
            </Tag>
          ),
        }),
        column.display({
          id: "actions",
          header: "Aktionen",
          meta: { align: "right", label: "Aktionen" },
          cell: ({ row }) => (
            <div className="flex items-center justify-end gap-2">
              <Link
                href={`/dashboard/bezirke/${row.original.id}`}
                className="text-dark hover:bg-rule/25 hover:text-ink dark:text-night-muted dark:hover:bg-night-raised dark:hover:text-night-text p-2 transition-colors"
                title="Details anzeigen"
              >
                <EyeIcon className="h-4 w-4" />
              </Link>
              <Link
                href={`/dashboard/bezirke/${row.original.id}/edit`}
                className="text-dark hover:bg-rule/25 hover:text-ink dark:text-night-muted dark:hover:bg-night-raised dark:hover:text-night-text p-2 transition-colors"
                title="Obleute bearbeiten"
              >
                <PencilIcon className="h-4 w-4" />
              </Link>
            </div>
          ),
        }),
      ]),
    [],
  );

  if (isPending || profileLoading || bezirkeLoading) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageBezirke) {
    return null;
  }

  return (
    <DashboardPage
      title="Bezirke"
      description="Verwalte die 13 Bezirke des Landesposaunenwerks"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Bezirke" },
      ]}
    >
      <DataTable
        data={bezirke}
        columns={columns}
        getRowId={(bezirk) => bezirk.id}
        isLoading={bezirkeLoading}
        rowNoun={["Bezirk", "Bezirke"]}
        searchPlaceholder="Bezirk oder Obmann/Obfrau suchen…"
        initialSorting={[{ id: "number", desc: false }]}
        emptyState={
          <>
            <MapPinIcon className="text-dark dark:text-night-muted mx-auto h-12 w-12" />
            <h3 className="condensed text-ink dark:text-night-text mt-4 mb-2 text-lg font-bold">
              Keine Bezirke vorhanden
            </h3>
            <p className="text-dark dark:text-night-muted">
              Die Bezirke wurden noch nicht in der Datenbank angelegt.
            </p>
          </>
        }
      />
    </DashboardPage>
  );
}
