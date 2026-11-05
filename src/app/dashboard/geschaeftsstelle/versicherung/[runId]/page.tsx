"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Download,
  DownloadIcon,
  Loader2,
  Mail,
  Pencil,
  Send,
  Stamp,
  Trash2,
} from "lucide-react";
import { api, type RouterOutputs } from "@/trpc/react";
import { useSession } from "@/lib/auth";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/app/_components/ui/toast";
import { DashboardPage } from "@/app/_components/dashboard";
import { Tag } from "@/app/_components/programmheft/tag";
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  DataTable,
  Input,
  Label,
  createDataTableColumnHelper,
  type DataTableColumn,
} from "@/app/_components/ui";
import { formatBerlin } from "@/lib/berlin-time";
import { formatDate, formatEuro } from "@/lib/invoice-document";
import {
  formatTaxRate,
  insuranceCategoryLabel,
  splitEmailList,
} from "@/lib/insurance-billing";
import {
  INSURANCE_BASE_PATH,
  INSURANCE_BREADCRUMBS,
  LINK_OUTLINE,
  TABLE,
  TABLE_WRAP,
  TBODY,
  TD,
  TD_NUM,
  TH,
  TH_NUM,
  THEAD,
  dateFromInput,
  dateInputValue,
} from "@/app/_components/dashboard/insurance-billing-ui";

type Run = RouterOutputs["insuranceBilling"]["getRun"];
type RunInvoice = Run["invoices"][number];

/** Wie die Vorschau-Schaltfläche der Kursrechnungen. */
const PREVIEW_LINK =
  "border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-9 items-center gap-2 border px-3 py-1.5 text-sm font-medium whitespace-nowrap";

function plural(count: number, one: string, many: string): string {
  return count === 1 ? `1 ${one}` : `${count} ${many}`;
}

function StatusTag({ invoice }: { invoice: RunInvoice }) {
  if (invoice.excluded) return <Tag tone="muted">nicht abgerechnet</Tag>;
  if (invoice.mailedAt) {
    return (
      <Tag tone="inverse">
        versendet {formatBerlin(invoice.mailedAt, "mittelKurz")}
      </Tag>
    );
  }
  if (invoice.mailError) {
    return <Tag tone="cancelled">Versand fehlgeschlagen</Tag>;
  }
  if (!invoice.email) return <Tag tone="orange">keine E-Mail</Tag>;
  return <Tag tone="muted">offen</Tag>;
}

function EmailCell({
  invoice,
  onSaved,
}: {
  invoice: RunInvoice;
  onSaved: () => Promise<void>;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(invoice.email ?? "");
  const update = api.insuranceBilling.updateInvoice.useMutation({
    onSuccess: async () => {
      setEditing(false);
      await onSaved();
    },
    onError: (error) => toast.error(error.message),
  });

  if (!editing) {
    return (
      <div className="flex items-start gap-1">
        {/* Je Adresse eine Zeile; umbrochen wird nur, wenn eine allein nicht passt. */}
        <span className="min-w-0 [overflow-wrap:anywhere]">
          {invoice.email
            ? splitEmailList(invoice.email).map((address) => (
                <span key={address} className="block">
                  {address}
                </span>
              ))
            : "—"}
        </span>
        <button
          type="button"
          className="text-dark hover:text-ink dark:text-night-muted dark:hover:text-night-text -mt-1 inline-flex min-h-8 min-w-8 shrink-0 items-center justify-center"
          aria-label={`E-Mail für Chor ${invoice.choirNumber} ändern`}
          onClick={() => {
            setValue(invoice.email ?? "");
            setEditing(true);
          }}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex min-w-56 flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        update.mutate({ id: invoice.id, email: value });
      }}
    >
      <Input
        autoFocus
        value={value}
        aria-label="E-Mail-Adressen, durch Komma getrennt"
        onChange={(event) => setValue(event.target.value)}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" isLoading={update.isPending}>
          Speichern
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setEditing(false)}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  );
}

const invoiceColumn = createDataTableColumnHelper<RunInvoice>();

function recipientLines(invoice: RunInvoice): string[] {
  return [
    invoice.recipientName1,
    invoice.recipientName2,
    invoice.recipientStreet,
    invoice.recipientCity,
  ].filter((line): line is string => Boolean(line));
}

function differsFromSheet(invoice: RunInvoice): boolean {
  return (
    invoice.sheetTotal !== null &&
    Math.abs(invoice.sheetTotal - invoice.total) > 0.005
  );
}

type InvoiceStatusKey = "excluded" | "mailed" | "failed" | "noEmail" | "open";

function statusKey(invoice: RunInvoice): InvoiceStatusKey {
  if (invoice.excluded) return "excluded";
  if (invoice.mailedAt) return "mailed";
  if (invoice.mailError) return "failed";
  if (!invoice.email) return "noEmail";
  return "open";
}

const STATUS_OPTIONS: { value: InvoiceStatusKey; label: string }[] = [
  { value: "open", label: "offen" },
  { value: "mailed", label: "versendet" },
  { value: "failed", label: "fehlgeschlagen" },
  { value: "noEmail", label: "keine E-Mail" },
  { value: "excluded", label: "nicht abgerechnet" },
];

/**
 * Im Entwurf heißt das Häkchen "abrechnen" und wird sofort gespeichert; nach
 * dem Ausstellen wählt es Rechnungen für den Versand aus.
 */
function RunInvoicesTable({
  run,
  pdfBase,
  checked,
  onCheck,
  onCheckAll,
  sending,
  updating,
  onSend,
  onToggleExcluded,
  onSaved,
}: {
  run: Run;
  pdfBase: string;
  checked: (invoice: RunInvoice) => boolean;
  onCheck: (invoice: RunInvoice, value: boolean) => void;
  onCheckAll: (value: boolean) => void;
  sending: boolean;
  updating: boolean;
  onSend: (invoice: RunInvoice) => void;
  onToggleExcluded: (invoice: RunInvoice) => void;
  onSaved: () => Promise<void>;
}) {
  const { draft, invoices, categories } = run;
  const checkable = draft
    ? invoices.filter((invoice) => !invoice.mailedAt)
    : invoices;
  const allChecked = checkable.length > 0 && checkable.every(checked);
  const noneChecked = !checkable.some(checked);
  const checkLabel = draft ? "abrechnen" : "auswählen";

  const columns = useMemo<DataTableColumn<RunInvoice>[]>(() => {
    const actions = (invoice: RunInvoice) => (
      <div className="flex flex-wrap justify-end gap-1">
        <a
          href={`${pdfBase}?invoice=${invoice.id}`}
          target="_blank"
          rel="noreferrer"
          className={PREVIEW_LINK}
        >
          <DownloadIcon className="h-4 w-4" aria-hidden />
          {draft ? "Vorschau" : "PDF"}
        </a>
        {!draft && !invoice.excluded && invoice.email && (
          <Button
            size="sm"
            variant="ghost"
            disabled={sending}
            onClick={() => onSend(invoice)}
          >
            <Send className="h-4 w-4" aria-hidden />
            {invoice.mailedAt ? "Erneut" : "Senden"}
          </Button>
        )}
        {!draft && !invoice.mailedAt && (
          <Button
            size="sm"
            variant="ghost"
            disabled={updating}
            onClick={() => onToggleExcluded(invoice)}
          >
            {invoice.excluded ? "Abrechnen" : "Ausnehmen"}
          </Button>
        )}
      </div>
    );

    return invoiceColumn.columns([
      invoiceColumn.display({
        id: "check",
        header: () => (
          <Checkbox
            aria-label={draft ? "Alle Chöre abrechnen" : "Alle auswählen"}
            checked={allChecked}
            disabled={updating}
            ref={(element) => {
              if (element) {
                element.indeterminate = !allChecked && !noneChecked;
              }
            }}
            onChange={(event) => onCheckAll(event.target.checked)}
          />
        ),
        meta: {
          alwaysVisible: true,
          label: draft ? "Abrechnen" : "Auswahl",
        },
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Chor ${row.original.choirNumber} ${checkLabel}`}
            checked={checked(row.original)}
            disabled={updating || (draft && !!row.original.mailedAt)}
            onChange={(event) => onCheck(row.original, event.target.checked)}
          />
        ),
      }),
      invoiceColumn.accessor(
        (invoice) => `${invoice.choirNumber} ${invoice.choirName ?? ""}`,
        {
          id: "choir",
          header: "Chor",
          enableColumnFilter: false,
          meta: { alwaysVisible: true },
          // Reihenfolge der Tabelle, nicht alphabetisch nach Nummer.
          sortFn: (a, b) => a.original.sheetRow - b.original.sheetRow,
          cell: ({ row }) => (
            <>
              <span className="font-semibold">{row.original.choirNumber}</span>
              {row.original.choirName && (
                <span className="block">{row.original.choirName}</span>
              )}
              <span className="text-dark dark:text-night-muted block text-xs">
                {draft
                  ? `Zeile ${row.original.sheetRow}${row.original.sheetNote ? ` · ${row.original.sheetNote}` : ""}`
                  : `Verwendungszweck ${row.original.paymentReference}`}
              </span>
              {draft && row.original.warnings.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-xs text-red-700 dark:text-red-400">
                  {row.original.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}
            </>
          ),
        },
      ),
      invoiceColumn.accessor((invoice) => recipientLines(invoice).join(" "), {
        id: "recipient",
        header: "Rechnungsempfänger",
        enableColumnFilter: false,
        cell: ({ row }) =>
          recipientLines(row.original).map((line, index) => (
            <span key={index} className="block">
              {line}
            </span>
          )),
      }),
      invoiceColumn.accessor((invoice) => invoice.email ?? "", {
        id: "email",
        header: "E-Mail",
        enableColumnFilter: false,
        // Neben sechs Zahlenspalten würde sie sonst auf Buchstabenbreite gequetscht.
        meta: { headerClassName: "min-w-72", cellClassName: "min-w-72" },
        cell: ({ row }) => (
          <EmailCell invoice={row.original} onSaved={onSaved} />
        ),
      }),
      ...(draft
        ? categories.map((category, index) =>
            invoiceColumn.accessor(
              (invoice) => invoice.quantities[index] ?? 0,
              {
                id: `qty-${category.maxValue}`,
                header: `bis ${category.maxValue.toLocaleString("de-DE")}`,
                enableColumnFilter: false,
                meta: { align: "right", cellClassName: "tabular-nums" },
                cell: ({ getValue }) => (getValue() as number) || "",
              },
            ),
          )
        : []),
      invoiceColumn.accessor((invoice) => invoice.total, {
        id: "total",
        header: "Betrag",
        enableColumnFilter: false,
        meta: {
          align: "right",
          cellClassName: "whitespace-nowrap font-medium tabular-nums",
        },
        cell: ({ row }) => formatEuro(row.original.total),
      }),
      ...(draft
        ? [
            invoiceColumn.accessor((invoice) => invoice.sheetTotal ?? 0, {
              id: "sheetTotal",
              header: "Laut Tabelle",
              enableColumnFilter: false,
              meta: {
                align: "right",
                cellClassName: "whitespace-nowrap tabular-nums",
              },
              cell: ({ row }) => (
                <span
                  className={
                    differsFromSheet(row.original)
                      ? "text-red-700 dark:text-red-400"
                      : "text-dark dark:text-night-muted"
                  }
                  title={
                    differsFromSheet(row.original)
                      ? "Weicht vom berechneten Betrag ab (andere Prämie oder Steuersatz?)"
                      : undefined
                  }
                >
                  {row.original.sheetTotal === null
                    ? "—"
                    : formatEuro(row.original.sheetTotal)}
                </span>
              ),
            }),
          ]
        : [
            invoiceColumn.accessor(statusKey, {
              id: "status",
              header: "Status",
              meta: {
                filterVariant: "set",
                label: "Status",
                filterOptions: STATUS_OPTIONS,
              },
              cell: ({ row }) => (
                <>
                  <StatusTag invoice={row.original} />
                  {row.original.mailedAt && row.original.mailedTo && (
                    <span className="text-dark dark:text-night-muted mt-1 block text-xs [overflow-wrap:anywhere]">
                      an {row.original.mailedTo}
                    </span>
                  )}
                  {!row.original.mailedAt && row.original.mailError && (
                    <span className="mt-1 block text-xs text-red-700 dark:text-red-400">
                      {row.original.mailError}
                    </span>
                  )}
                </>
              ),
            }),
          ]),
      invoiceColumn.display({
        id: "actions",
        header: () => <span className="sr-only">Aktionen</span>,
        meta: { alwaysVisible: true, label: "Aktionen", align: "right" },
        cell: ({ row }) => actions(row.original),
      }),
    ]);
  }, [
    draft,
    categories,
    allChecked,
    noneChecked,
    checkLabel,
    checked,
    sending,
    updating,
    pdfBase,
    onCheck,
    onCheckAll,
    onSend,
    onToggleExcluded,
    onSaved,
  ]);

  return (
    <DataTable
      data={invoices}
      columns={columns}
      getRowId={(invoice) => invoice.id}
      rowNoun={["Rechnung", "Rechnungen"]}
      searchPlaceholder="Chor-Nr., Name, Empfänger oder E-Mail"
      initialSorting={[{ id: "choir", desc: false }]}
      rowClassName={(invoice) => (invoice.excluded ? "opacity-60" : undefined)}
      renderMobileRow={(invoice) => (
        <div className="flex gap-3">
          <div className="pt-1">
            <Checkbox
              aria-label={`Chor ${invoice.choirNumber} ${checkLabel}`}
              checked={checked(invoice)}
              disabled={updating || (draft && !!invoice.mailedAt)}
              onChange={(event) => onCheck(invoice, event.target.checked)}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1 text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">
                {invoice.choirNumber}
                {invoice.choirName ? ` · ${invoice.choirName}` : ""}
              </span>
              <span className="font-medium whitespace-nowrap tabular-nums">
                {formatEuro(invoice.total)}
              </span>
            </div>
            <p className="text-dark dark:text-night-muted">
              {recipientLines(invoice).join(", ")}
            </p>
            <EmailCell invoice={invoice} onSaved={onSaved} />
            {draft ? (
              invoice.warnings.length > 0 && (
                <ul className="text-xs text-red-700 dark:text-red-400">
                  {invoice.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )
            ) : (
              <StatusTag invoice={invoice} />
            )}
            <a
              href={`${pdfBase}?invoice=${invoice.id}`}
              target="_blank"
              rel="noreferrer"
              className={PREVIEW_LINK}
            >
              <DownloadIcon className="h-4 w-4" aria-hidden />
              {draft ? "Vorschau" : "PDF"}
            </a>
          </div>
        </div>
      )}
    />
  );
}

/** Jahr und Daten, solange die Abrechnung Entwurf ist. */
function DraftDetailsCard({
  run,
  onSaved,
}: {
  run: Run;
  onSaved: () => Promise<void>;
}) {
  const toast = useToast();
  const [year, setYear] = useState(String(run.year));
  const [invoiceDate, setInvoiceDate] = useState(
    dateInputValue(new Date(run.invoiceDate)),
  );
  const [dueDate, setDueDate] = useState(dateInputValue(new Date(run.dueDate)));
  const save = api.insuranceBilling.updateRun.useMutation({
    onSuccess: async () => {
      await onSaved();
      toast.success("Rechnungsangaben gespeichert.");
    },
    onError: (error) => toast.error(error.message),
  });

  const parsedYear = Number(year);
  const parsedInvoiceDate = dateFromInput(invoiceDate);
  const parsedDueDate = dateFromInput(dueDate);
  const valid =
    Number.isInteger(parsedYear) && !!parsedInvoiceDate && !!parsedDueDate;
  const changed =
    year !== String(run.year) ||
    invoiceDate !== dateInputValue(new Date(run.invoiceDate)) ||
    dueDate !== dateInputValue(new Date(run.dueDate));

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <h2 className="text-ink dark:text-night-text text-lg font-semibold">
          Rechnungsangaben
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="year">Beitragsjahr</Label>
            <Input
              id="year"
              inputMode="numeric"
              value={year}
              onChange={(event) => setYear(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="invoiceDate">Rechnungsdatum</Label>
            <Input
              id="invoiceDate"
              type="date"
              value={invoiceDate}
              onChange={(event) => setInvoiceDate(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="dueDate">Zahlbar bis</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>
        </div>
        <Button
          variant="outline"
          disabled={!changed || !valid}
          isLoading={save.isPending}
          onClick={() =>
            parsedInvoiceDate &&
            parsedDueDate &&
            save.mutate({
              id: run.id,
              year: parsedYear,
              invoiceDate: parsedInvoiceDate,
              dueDate: parsedDueDate,
            })
          }
        >
          Angaben speichern
        </Button>
      </CardContent>
    </Card>
  );
}

function RatesTable({ run }: { run: Run }) {
  return (
    <section className="space-y-3">
      <h2 className="text-ink dark:text-night-text text-lg font-semibold">
        Prämien
      </h2>
      <div className={TABLE_WRAP}>
        <table className={TABLE}>
          <thead className={THEAD}>
            <tr>
              <th className={TH}>Wertklasse</th>
              <th className={TH_NUM}>Netto laut Tabelle</th>
              <th className={TH_NUM}>Netto verwendet</th>
              <th className={TH_NUM}>Brutto je Stück</th>
              <th className={TH}>Quelle</th>
            </tr>
          </thead>
          <tbody className={TBODY}>
            {run.categories.map((category) => (
              <tr key={category.maxValue}>
                <td className={TD}>
                  {insuranceCategoryLabel(category.maxValue)}
                </td>
                <td className={TD_NUM}>
                  {category.sheetNetPremium === null
                    ? "—"
                    : formatEuro(category.sheetNetPremium)}
                </td>
                <td className={TD_NUM}>
                  {category.netPremium === null
                    ? "—"
                    : formatEuro(category.netPremium)}
                </td>
                <td className={TD_NUM}>
                  {category.grossPremium === null
                    ? "—"
                    : formatEuro(category.grossPremium)}
                </td>
                <td className={TD}>
                  {category.source === "settings" ? (
                    <Tag tone="orange">Einstellungen</Tag>
                  ) : category.source === "sheet" ? (
                    <Tag tone="muted">Tabelle</Tag>
                  ) : (
                    <Tag tone="cancelled">fehlt</Tag>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function InsuranceRunPage() {
  const { runId } = useParams<{ runId: string }>();
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const { data: session } = useSession();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.BILLING_MANAGE);

  const run = api.insuranceBilling.getRun.useQuery(
    { id: runId },
    { enabled: canManage },
  );
  const [testEmail, setTestEmail] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const refresh = async () => {
    await Promise.all([
      utils.insuranceBilling.getRun.invalidate({ id: runId }),
      utils.insuranceBilling.listRuns.invalidate(),
    ]);
  };

  const send = api.insuranceBilling.send.useMutation({
    onSuccess: async (result) => {
      await refresh();
      if (result.test) {
        toast.success("Testmail verschickt.");
        return;
      }
      const parts = [`${result.sentCount} versendet`];
      if (result.failedCount) {
        parts.push(`${result.failedCount} fehlgeschlagen`);
      }
      if (result.skippedCount) {
        parts.push(`${result.skippedCount} ohne E-Mail`);
      }
      if (result.failedCount) toast.error(parts.join(", "));
      else toast.success(parts.join(", "));
    },
    onError: (error) => toast.error(error.message),
  });

  const setExcluded = api.insuranceBilling.setExcluded.useMutation({
    onSuccess: refresh,
    onError: (error) => toast.error(error.message),
  });

  const issueRun = api.insuranceBilling.issueRun.useMutation({
    onSuccess: async () => {
      setSelected(new Set());
      await refresh();
      toast.success("Abrechnung ausgestellt — jetzt kann versendet werden.");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteRun = api.insuranceBilling.deleteRun.useMutation({
    onSuccess: async () => {
      await utils.insuranceBilling.listRuns.invalidate();
      toast.success("Abrechnung gelöscht.");
      router.push(INSURANCE_BASE_PATH);
    },
    onError: (error) => toast.error(error.message),
  });

  if (permissionsLoading || (canManage && run.isLoading)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" aria-hidden />
      </div>
    );
  }

  if (!canManage || !run.data) {
    return (
      <DashboardPage title="Abrechnung" breadcrumbs={INSURANCE_BREADCRUMBS}>
        <p className="text-dark dark:text-night-muted">
          {canManage
            ? "Diese Abrechnung gibt es nicht."
            : "Für diesen Bereich fehlt dir die Berechtigung."}
        </p>
      </DashboardPage>
    );
  }

  const data = run.data;
  const draft = data.draft;
  const billed = data.invoices.filter((invoice) => !invoice.excluded);
  const pending = billed.filter(
    (invoice) => !invoice.mailedAt && invoice.email,
  );
  const withoutEmail = billed.filter(
    (invoice) => !invoice.mailedAt && !invoice.email,
  );
  const mailedCount = billed.filter((invoice) => invoice.mailedAt).length;
  const total = billed.reduce((sum, invoice) => sum + invoice.total, 0);
  const pdfBase = `/api/geschaeftsstelle/versicherung/${data.id}/pdf`;
  const sending = send.isPending;

  // Entwurf: Häkchen = abrechnen, sofort gespeichert. Ausgestellt: Auswahl für den Versand.
  const isChecked = (invoice: RunInvoice) =>
    draft ? !invoice.excluded : selected.has(invoice.id);
  const onCheck = (invoice: RunInvoice, value: boolean) => {
    if (draft) {
      setExcluded.mutate({
        runId: data.id,
        invoiceIds: [invoice.id],
        excluded: !value,
      });
      return;
    }
    setSelected((current) => {
      const next = new Set(current);
      if (value) next.add(invoice.id);
      else next.delete(invoice.id);
      return next;
    });
  };
  const onCheckAll = (value: boolean) => {
    if (draft) {
      setExcluded.mutate({
        runId: data.id,
        invoiceIds: data.invoices.map((invoice) => invoice.id),
        excluded: !value,
      });
      return;
    }
    setSelected(
      value ? new Set(data.invoices.map((invoice) => invoice.id)) : new Set(),
    );
  };
  const toggleExcluded = (invoice: RunInvoice) =>
    setExcluded.mutate({
      runId: data.id,
      invoiceIds: [invoice.id],
      excluded: !invoice.excluded,
    });

  const selectedSendable = data.invoices.filter(
    (invoice) => selected.has(invoice.id) && !invoice.excluded && invoice.email,
  );

  const sendAll = () => {
    if (
      !window.confirm(
        `${plural(pending.length, "Rechnung", "Rechnungen")} jetzt per E-Mail versenden? Das lässt sich nicht zurücknehmen.`,
      )
    ) {
      return;
    }
    send.mutate({ runId: data.id });
  };

  const sendSelected = () => {
    const resend = selectedSendable.filter(
      (invoice) => invoice.mailedAt,
    ).length;
    if (
      !window.confirm(
        `${plural(selectedSendable.length, "Rechnung", "Rechnungen")} jetzt per E-Mail versenden?${resend > 0 ? ` ${resend} davon gingen schon einmal raus.` : ""}`,
      )
    ) {
      return;
    }
    send.mutate(
      {
        runId: data.id,
        invoiceIds: selectedSendable.map((invoice) => invoice.id),
      },
      { onSuccess: () => setSelected(new Set()) },
    );
  };

  const sendOne = (invoice: RunInvoice) => {
    if (
      invoice.mailedAt &&
      !window.confirm(
        `Die Rechnung an ${invoice.mailedTo ?? invoice.email} wurde schon versendet. Noch einmal schicken?`,
      )
    ) {
      return;
    }
    send.mutate({ runId: data.id, invoiceIds: [invoice.id] });
  };

  const issue = () => {
    if (
      !window.confirm(
        `${plural(billed.length, "Rechnung", "Rechnungen")} über ${formatEuro(total)} ausstellen? Prämien, Steuersatz und Texte werden dabei festgeschrieben und lassen sich danach nicht mehr ändern.`,
      )
    ) {
      return;
    }
    issueRun.mutate({ id: data.id });
  };

  return (
    <DashboardPage
      title={`Versicherungsbeiträge ${data.year}`}
      description={`Aus „${data.sourceFilename}“, angelegt ${formatDate(data.createdAt)}${data.createdByName ? ` von ${data.createdByName}` : ""}${data.issuedAt ? `, ausgestellt ${formatDate(data.issuedAt)}` : ""}.`}
      breadcrumbs={[
        ...INSURANCE_BREADCRUMBS,
        { label: draft ? `${data.year} (Entwurf)` : String(data.year) },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <a href={pdfBase} className={LINK_OUTLINE}>
            <Download className="h-4 w-4" aria-hidden />
            {draft ? "Vorschauen als ZIP" : "Alle als ZIP"}
          </a>
          {!draft && withoutEmail.length > 0 && (
            <a href={`${pdfBase}?filter=unmailed`} className={LINK_OUTLINE}>
              <Download className="h-4 w-4" aria-hidden />
              Unversendete als ZIP
            </a>
          )}
        </div>
      }
    >
      <div className="space-y-8">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Status", draft ? "Entwurf" : "Ausgestellt"],
            ["Rechnungsdatum", formatDate(data.invoiceDate)],
            ["Zahlbar bis", formatDate(data.dueDate)],
            ["Summe", formatEuro(total)],
            draft
              ? ["Rechnungen", String(billed.length)]
              : ["Versendet", `${mailedCount} von ${billed.length}`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="border-rule dark:border-night-rule border-t-2 pt-2"
            >
              <dt className="text-dark dark:text-night-muted text-xs font-medium tracking-wider uppercase">
                {label}
              </dt>
              <dd className="text-ink dark:text-night-text text-lg font-semibold tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        {draft && (
          <div className="border-ink dark:border-night-text flex gap-3 border-l-2 py-2 pl-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div className="text-dark dark:text-night-muted space-y-1 text-sm">
              <p className="text-ink dark:text-night-text font-semibold">
                Entwurf — noch nichts ist festgeschrieben.
              </p>
              <p>
                Vorschauen tragen den Stempel „ENTWURF“ und rechnen mit den
                aktuellen Prämien, dem Steuersatz ({formatTaxRate(data.taxRate)}
                ) und den Texten aus den Einstellungen. Beim Ausstellen wird das
                festgeschrieben; danach kannst du versenden.
              </p>
              <ul className="space-y-1">
                {data.missingRates.map((maxValue) => (
                  <li
                    key={maxValue}
                    className="font-semibold text-red-700 dark:text-red-400"
                  >
                    Für „{insuranceCategoryLabel(maxValue)}“ fehlt eine Prämie —
                    trage sie unter „Prämien je Wertklasse“ ein.
                  </li>
                ))}
                {data.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {draft ? (
          <>
            <DraftDetailsCard
              key={`${data.year}-${String(data.invoiceDate)}-${String(data.dueDate)}`}
              run={data}
              onSaved={refresh}
            />
            <RatesTable run={data} />
          </>
        ) : (
          <Card>
            <CardContent className="space-y-4 p-6">
              <h2 className="text-ink dark:text-night-text text-lg font-semibold">
                Versand
              </h2>
              <p className="text-dark dark:text-night-muted text-sm">
                Jede Rechnung geht als PDF-Anhang an die E-Mail-Adresse aus der
                Tabelle; weitere Adressen lesen in Kopie mit. Betreff und Text
                stehen unter „Texte & Einstellungen“.
                {withoutEmail.length > 0 &&
                  ` ${withoutEmail.length === 1 ? "Ein Chor hat" : `${withoutEmail.length} Chöre haben`} keine E-Mail-Adresse — trage sie unten nach oder lade die Rechnungen als ZIP für den Postversand.`}
              </p>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                <div className="flex-1">
                  <Label htmlFor="testEmail">Testmail an</Label>
                  <div className="flex gap-2">
                    <Input
                      id="testEmail"
                      type="email"
                      placeholder={session?.user.email ?? "name@example.org"}
                      value={testEmail}
                      onChange={(event) => setTestEmail(event.target.value)}
                    />
                    <Button
                      variant="outline"
                      disabled={sending || billed.length === 0}
                      onClick={() =>
                        send.mutate({
                          runId: data.id,
                          invoiceIds: billed[0] ? [billed[0].id] : undefined,
                          testEmail:
                            testEmail.trim() ||
                            session?.user.email ||
                            undefined,
                        })
                      }
                    >
                      <Mail className="h-4 w-4" aria-hidden />
                      Test
                    </Button>
                  </div>
                  <p className="text-dark dark:text-night-muted mt-1 text-xs">
                    Schickt die erste Rechnung mit „[TEST]“ im Betreff; nichts
                    wird als versendet markiert.
                  </p>
                </div>
                <Button
                  disabled={sending || pending.length === 0}
                  isLoading={sending}
                  onClick={sendAll}
                >
                  <Send className="h-4 w-4" aria-hidden />
                  {pending.length === 0
                    ? "Alles versendet"
                    : pending.length === 1
                      ? "1 Rechnung versenden"
                      : `Alle ${pending.length} offenen versenden`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-ink dark:text-night-text text-lg font-semibold">
              {draft
                ? `Chöre (${billed.length} von ${data.invoices.length} abrechnen)`
                : "Rechnungen"}
            </h2>
            {!draft && selectedSendable.length > 0 && (
              <Button
                size="sm"
                disabled={sending}
                isLoading={sending}
                onClick={sendSelected}
              >
                <Send className="h-4 w-4" aria-hidden />
                {selectedSendable.length === 1
                  ? "Ausgewählte Rechnung versenden"
                  : `${selectedSendable.length} ausgewählte versenden`}
              </Button>
            )}
          </div>
          <RunInvoicesTable
            run={data}
            pdfBase={pdfBase}
            checked={isChecked}
            onCheck={onCheck}
            onCheckAll={onCheckAll}
            sending={sending}
            updating={setExcluded.isPending}
            onSend={sendOne}
            onToggleExcluded={toggleExcluded}
            onSaved={refresh}
          />
        </section>

        <div className="border-rule dark:border-night-rule flex flex-wrap gap-3 border-t pt-6">
          {draft && (
            <Button
              disabled={data.missingRates.length > 0 || billed.length === 0}
              isLoading={issueRun.isPending}
              onClick={issue}
            >
              <Stamp className="h-4 w-4" aria-hidden />
              {plural(billed.length, "Rechnung", "Rechnungen")} ausstellen
            </Button>
          )}
          {mailedCount === 0 && (
            <Button
              variant="danger"
              isLoading={deleteRun.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    draft
                      ? "Diesen Entwurf löschen?"
                      : "Diese Abrechnung mit allen Rechnungen löschen? Es wurde noch nichts versendet.",
                  )
                ) {
                  deleteRun.mutate({ id: data.id });
                }
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {draft ? "Entwurf löschen" : "Abrechnung löschen"}
            </Button>
          )}
        </div>
      </div>
    </DashboardPage>
  );
}
