"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tag } from "@/app/_components/programmheft/tag";
import {
  DataTable,
  createDataTableColumnHelper,
  type DataTableColumn,
} from "@/app/_components/ui";
import { formatDate, formatEuro } from "@/lib/invoice-document";
import type { BillingSection } from "@/app/_components/dashboard/office-billing-ui";

export interface BillingRunRow {
  id: string;
  status: "DRAFT" | "ISSUED";
  year: number;
  sourceFilename: string;
  invoiceDate: Date;
  createdAt: Date;
  createdByName: string | null;
  invoiceCount: number;
  mailedCount: number;
  failedCount: number;
  totalAmount: number;
}

function RunMailTags({ run }: { run: BillingRunRow }) {
  if (run.status === "DRAFT") return <Tag tone="orange">Entwurf</Tag>;
  return (
    <div className="flex flex-wrap gap-1.5">
      <Tag tone={run.mailedCount === run.invoiceCount ? "inverse" : "muted"}>
        {run.mailedCount} / {run.invoiceCount} versendet
      </Tag>
      {run.failedCount > 0 && (
        <Tag tone="cancelled">{run.failedCount} fehlgeschlagen</Tag>
      )}
    </div>
  );
}

const runColumn = createDataTableColumnHelper<BillingRunRow>();

/** Alle Läufe einer Abrechnung, neueste zuerst. */
export function BillingRunsTable({
  section,
  runs,
  emptyHint,
}: {
  section: BillingSection;
  runs: BillingRunRow[] | undefined;
  emptyHint: string;
}) {
  const router = useRouter();
  const columns = useMemo<DataTableColumn<BillingRunRow>[]>(
    () =>
      runColumn.columns([
        runColumn.accessor((run) => String(run.year), {
          id: "year",
          header: "Jahr",
          meta: { alwaysVisible: true, filterVariant: "set", label: "Jahr" },
          cell: ({ row }) => (
            <Link
              href={`${section.basePath}/${row.original.id}`}
              className="text-ink dark:text-night-text font-semibold hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {row.original.year}
            </Link>
          ),
        }),
        runColumn.accessor((run) => run.sourceFilename, {
          id: "sourceFilename",
          header: "Tabelle",
          enableColumnFilter: false,
          cell: ({ row }) => (
            <>
              <span className="break-all">{row.original.sourceFilename}</span>
              <span className="text-dark dark:text-night-muted block text-xs">
                {row.original.createdByName
                  ? `von ${row.original.createdByName}`
                  : ""}
              </span>
            </>
          ),
        }),
        runColumn.accessor((run) => run.createdAt, {
          id: "createdAt",
          header: "Angelegt",
          enableColumnFilter: false,
          meta: { cellClassName: "whitespace-nowrap" },
          cell: ({ row }) => formatDate(row.original.createdAt),
        }),
        runColumn.accessor((run) => run.invoiceDate, {
          id: "invoiceDate",
          header: "Rechnungsdatum",
          enableColumnFilter: false,
          meta: { cellClassName: "whitespace-nowrap" },
          cell: ({ row }) => formatDate(row.original.invoiceDate),
        }),
        runColumn.accessor((run) => run.invoiceCount, {
          id: "invoiceCount",
          header: "Rechnungen",
          enableColumnFilter: false,
          meta: { align: "right", cellClassName: "tabular-nums" },
        }),
        runColumn.accessor((run) => run.totalAmount, {
          id: "totalAmount",
          header: "Summe",
          enableColumnFilter: false,
          meta: {
            align: "right",
            cellClassName: "whitespace-nowrap font-medium tabular-nums",
          },
          cell: ({ row }) => formatEuro(row.original.totalAmount),
        }),
        runColumn.accessor(
          (run) => run.mailedCount / Math.max(run.invoiceCount, 1),
          {
            id: "mailed",
            header: "Versand",
            enableColumnFilter: false,
            cell: ({ row }) => <RunMailTags run={row.original} />,
          },
        ),
      ]),
    [section.basePath],
  );

  return (
    <section className="space-y-3">
      <h2 className="text-ink dark:text-night-text text-lg font-semibold">
        Abrechnungen
      </h2>
      <DataTable
        data={runs}
        columns={columns}
        getRowId={(run) => run.id}
        rowNoun={["Abrechnung", "Abrechnungen"]}
        searchPlaceholder="Jahr oder Dateiname"
        initialSorting={[{ id: "createdAt", desc: true }]}
        onRowClick={(run) => router.push(`${section.basePath}/${run.id}`)}
        emptyState={
          <p className="text-dark dark:text-night-muted text-sm">{emptyHint}</p>
        }
        renderMobileRow={(run) => (
          <div className="space-y-1 text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <Link
                href={`${section.basePath}/${run.id}`}
                className="font-semibold underline-offset-4 hover:underline"
              >
                {run.year}
              </Link>
              <span className="font-medium tabular-nums">
                {formatEuro(run.totalAmount)}
              </span>
            </div>
            <p className="text-dark dark:text-night-muted break-all">
              {run.sourceFilename} · {formatDate(run.invoiceDate)}
            </p>
            <RunMailTags run={run} />
          </div>
        )}
      />
    </section>
  );
}
