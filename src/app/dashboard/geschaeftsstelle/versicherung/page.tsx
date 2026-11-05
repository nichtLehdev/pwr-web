"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Settings } from "lucide-react";
import { api, type RouterOutputs } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/app/_components/ui/toast";
import { DashboardPage } from "@/app/_components/dashboard";
import { Tag } from "@/app/_components/programmheft/tag";
import {
  Button,
  Card,
  CardContent,
  DataTable,
  Input,
  createDataTableColumnHelper,
  type DataTableColumn,
} from "@/app/_components/ui";
import { formatDate, formatEuro } from "@/lib/invoice-document";
import {
  INSURANCE_BASE_PATH,
  INSURANCE_BREADCRUMBS,
  LINK_OUTLINE,
  LINK_PRIMARY,
  TABLE,
  TABLE_WRAP,
  TBODY,
  TD,
  TD_NUM,
  TH,
  TH_NUM,
  THEAD,
  euroInput,
  parseEuroInput,
} from "@/app/_components/dashboard/insurance-billing-ui";
import {
  STANDARD_INSURANCE_CATEGORIES,
  formatTaxRate,
  grossPremium,
  insuranceCategoryLabel,
} from "@/lib/insurance-billing";

type RunRow = RouterOutputs["insuranceBilling"]["listRuns"][number];

function RunMailTags({ run }: { run: RunRow }) {
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

const runColumn = createDataTableColumnHelper<RunRow>();

const RUN_COLUMNS: DataTableColumn<RunRow>[] = runColumn.columns([
  runColumn.accessor((run) => String(run.year), {
    id: "year",
    header: "Jahr",
    meta: { alwaysVisible: true, filterVariant: "set", label: "Jahr" },
    cell: ({ row }) => (
      <Link
        href={`${INSURANCE_BASE_PATH}/${row.original.id}`}
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
  runColumn.accessor((run) => run.mailedCount / Math.max(run.invoiceCount, 1), {
    id: "mailed",
    header: "Versand",
    enableColumnFilter: false,
    cell: ({ row }) => <RunMailTags run={row.original} />,
  }),
]);

function RatesCard({ taxRate }: { taxRate: number }) {
  const toast = useToast();
  const utils = api.useUtils();
  const settings = api.insuranceBilling.getSettings.useQuery();
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const stored = useMemo(
    () =>
      new Map(
        (settings.data?.rates ?? []).map((rate) => [
          rate.maxValue,
          rate.netPremium,
        ]),
      ),
    [settings.data],
  );
  const categories = useMemo(
    () =>
      [...new Set([...STANDARD_INSURANCE_CATEGORIES, ...stored.keys()])].sort(
        (a, b) => a - b,
      ),
    [stored],
  );

  const setRates = api.insuranceBilling.setRates.useMutation({
    onSuccess: async () => {
      setDrafts({});
      await utils.insuranceBilling.getSettings.invalidate();
      toast.success("Prämien gespeichert.");
    },
    onError: (error) => toast.error(error.message),
  });

  const valueFor = (maxValue: number) =>
    drafts[maxValue] ??
    (stored.has(maxValue) ? euroInput(stored.get(maxValue)!) : "");

  const changed = Object.keys(drafts).length > 0;
  const invalid = categories.some((maxValue) =>
    Number.isNaN(parseEuroInput(valueFor(maxValue))),
  );

  const save = () =>
    setRates.mutate({
      rates: Object.keys(drafts).map((key) => {
        const maxValue = Number(key);
        return { maxValue, netPremium: parseEuroInput(drafts[maxValue]!) };
      }),
    });

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <h2 className="text-ink dark:text-night-text text-lg font-semibold">
            Prämien je Wertklasse
          </h2>
          <p className="text-dark dark:text-night-muted mt-1 text-sm">
            Nettoprämie je Instrument. Ist hier nichts eingetragen, gilt der
            Preis aus der hochgeladenen Tabelle. Auf der Rechnung steht der
            Bruttobetrag inklusive {formatTaxRate(taxRate)} Versicherungssteuer.
            Änderungen gelten für neue Abrechnungen; bestehende behalten ihre
            Preise.
          </p>
        </div>
        <div className={TABLE_WRAP}>
          <table className={TABLE}>
            <thead className={THEAD}>
              <tr>
                <th className={TH}>Wertklasse</th>
                <th className={TH}>Netto je Stück</th>
                <th className={TH_NUM}>Brutto je Stück</th>
              </tr>
            </thead>
            <tbody className={TBODY}>
              {categories.map((maxValue) => {
                const value = valueFor(maxValue);
                const net = parseEuroInput(value);
                return (
                  <tr key={maxValue}>
                    <td className={TD}>{insuranceCategoryLabel(maxValue)}</td>
                    <td className={TD}>
                      <div className="flex items-center gap-2">
                        <Input
                          inputMode="decimal"
                          className="w-28"
                          aria-label={`Nettoprämie ${insuranceCategoryLabel(maxValue)}`}
                          placeholder="aus Tabelle"
                          value={value}
                          error={Number.isNaN(net)}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [maxValue]: event.target.value,
                            }))
                          }
                        />
                        <span className="text-dark dark:text-night-muted text-sm">
                          €
                        </span>
                      </div>
                    </td>
                    <td className={TD_NUM}>
                      {net === null ? (
                        <span className="text-dark dark:text-night-muted">
                          aus Tabelle
                        </span>
                      ) : Number.isNaN(net) ? (
                        "—"
                      ) : (
                        formatEuro(grossPremium(net, taxRate))
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={save}
            disabled={!changed || invalid}
            isLoading={setRates.isPending}
          >
            Prämien speichern
          </Button>
          {changed && (
            <Button variant="ghost" onClick={() => setDrafts({})}>
              Verwerfen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function InsuranceBillingPage() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.BILLING_MANAGE);
  const router = useRouter();
  const runs = api.insuranceBilling.listRuns.useQuery(undefined, {
    enabled: canManage,
  });
  const settings = api.insuranceBilling.getSettings.useQuery(undefined, {
    enabled: canManage,
  });

  if (
    permissionsLoading ||
    (canManage && (runs.isLoading || settings.isLoading))
  ) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" aria-hidden />
      </div>
    );
  }

  if (!canManage) {
    return (
      <DashboardPage title="Versicherungsbeiträge">
        <p className="text-dark dark:text-night-muted">
          Für diesen Bereich fehlt dir die Berechtigung.
        </p>
      </DashboardPage>
    );
  }

  const taxRate = settings.data?.settings.taxRate ?? 0.19;

  return (
    <DashboardPage
      title="Versicherungsbeiträge"
      description="Rechnungen für die Instrumentenversicherung aus der Excel-Tabelle der Geschäftsstelle erstellen und per E-Mail versenden."
      breadcrumbs={[
        ...INSURANCE_BREADCRUMBS.slice(0, -1),
        { label: "Versicherungsbeiträge" },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            href={`${INSURANCE_BASE_PATH}/einstellungen`}
            className={LINK_OUTLINE}
          >
            <Settings className="h-4 w-4" aria-hidden />
            Texte & Einstellungen
          </Link>
          <Link href={`${INSURANCE_BASE_PATH}/neu`} className={LINK_PRIMARY}>
            <Plus className="h-4 w-4" aria-hidden />
            Neue Abrechnung
          </Link>
        </div>
      }
    >
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-ink dark:text-night-text text-lg font-semibold">
            Abrechnungen
          </h2>
          <DataTable
            data={runs.data}
            columns={RUN_COLUMNS}
            getRowId={(run) => run.id}
            rowNoun={["Abrechnung", "Abrechnungen"]}
            searchPlaceholder="Jahr oder Dateiname"
            initialSorting={[{ id: "createdAt", desc: true }]}
            onRowClick={(run) =>
              router.push(`${INSURANCE_BASE_PATH}/${run.id}`)
            }
            emptyState={
              <p className="text-dark dark:text-night-muted text-sm">
                Noch keine Abrechnung. Lade die Versicherungstabelle über „Neue
                Abrechnung“ hoch.
              </p>
            }
            renderMobileRow={(run) => (
              <div className="space-y-1 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <Link
                    href={`${INSURANCE_BASE_PATH}/${run.id}`}
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

        <RatesCard taxRate={taxRate} />
      </div>
    </DashboardPage>
  );
}
