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

function RatesSection({ taxRate }: { taxRate: number }) {
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
  const latestSheet = settings.data?.latestSheet ?? null;
  const sheetPrices = useMemo(
    () =>
      new Map(
        (latestSheet?.rates ?? []).map((rate) => [
          rate.maxValue,
          rate.netPremium,
        ]),
      ),
    [latestSheet],
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
  const setValue = (maxValue: number, value: string) =>
    setDrafts((current) => ({ ...current, [maxValue]: value }));

  const changedCount = categories.filter((maxValue) => {
    if (!(maxValue in drafts)) return false;
    const before = stored.get(maxValue) ?? null;
    const after = parseEuroInput(drafts[maxValue]!);
    return before !== after;
  }).length;
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
    <section className="space-y-4">
      <div>
        <h2 className="text-ink dark:text-night-text text-lg font-semibold">
          Prämien je Wertklasse
        </h2>
        <p className="text-dark dark:text-night-muted mt-1 max-w-3xl text-sm">
          Nettoprämie je Instrument. Leere Felder nehmen den Preis aus der
          hochgeladenen Tabelle. Auf der Rechnung steht der Bruttobetrag mit{" "}
          {formatTaxRate(taxRate)} Versicherungssteuer. Änderungen gelten für
          Entwürfe und neue Abrechnungen; ausgestellte behalten ihre Preise.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((maxValue) => {
          const value = valueFor(maxValue);
          const net = parseEuroInput(value);
          const sheetNet = sheetPrices.get(maxValue) ?? null;
          const own = net !== null && !Number.isNaN(net);
          const effective = own ? net : sheetNet;
          const label = insuranceCategoryLabel(maxValue);
          const inputId = `rate-${maxValue}`;
          return (
            <div
              key={maxValue}
              className={`border p-4 transition-colors ${
                own
                  ? "border-ink dark:border-night-text"
                  : "border-rule dark:border-night-rule"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <label
                  htmlFor={inputId}
                  className="text-ink dark:text-night-text font-semibold"
                >
                  {label}
                </label>
                <Tag tone={own ? "inverse" : "muted"}>
                  {own ? "Eigener Preis" : "Aus Tabelle"}
                </Tag>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    id={inputId}
                    inputMode="decimal"
                    className="pr-20 text-right tabular-nums"
                    placeholder={
                      sheetNet !== null ? euroInput(sheetNet) : "aus Tabelle"
                    }
                    value={value}
                    error={Number.isNaN(net)}
                    onChange={(event) => setValue(maxValue, event.target.value)}
                  />
                  <span className="text-dark dark:text-night-muted pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm">
                    € netto
                  </span>
                </div>
              </div>

              <div className="text-dark dark:text-night-muted mt-2 flex min-h-6 flex-wrap items-center justify-between gap-x-3 text-sm">
                <span className="tabular-nums">
                  {Number.isNaN(net)
                    ? "Kein gültiger Betrag"
                    : effective !== null
                      ? `${formatEuro(grossPremium(effective, taxRate))} brutto`
                      : "Preis kommt aus der Tabelle"}
                </span>
                {own && (
                  <button
                    type="button"
                    className="hover:text-ink dark:hover:text-night-text underline underline-offset-4"
                    onClick={() => setValue(maxValue, "")}
                  >
                    {sheetNet !== null
                      ? `Tabelle nutzen (${euroInput(sheetNet)} €)`
                      : "Tabellenpreis nutzen"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={save}
          disabled={changedCount === 0 || invalid}
          isLoading={setRates.isPending}
        >
          {changedCount > 1
            ? `${changedCount} Prämien speichern`
            : "Prämien speichern"}
        </Button>
        {Object.keys(drafts).length > 0 && (
          <Button variant="ghost" onClick={() => setDrafts({})}>
            Verwerfen
          </Button>
        )}
        {latestSheet && (
          <span className="text-dark dark:text-night-muted text-xs">
            Tabellenpreise aus {latestSheet.filename}
          </span>
        )}
      </div>
    </section>
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

        <RatesSection taxRate={taxRate} />
      </div>
    </DashboardPage>
  );
}
