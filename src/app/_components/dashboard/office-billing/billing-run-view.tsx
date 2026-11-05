"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Download,
  DownloadIcon,
  Mail,
  Pencil,
  Send,
  Stamp,
  Trash2,
} from "lucide-react";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { DashboardPage } from "@/app/_components/dashboard";
import { Tag } from "@/app/_components/programmheft/tag";
import {
  Button,
  Card,
  Checkbox,
  DataTable,
  Input,
  Label,
  createDataTableColumnHelper,
  type DataTableColumn,
} from "@/app/_components/ui";
import { formatBerlin } from "@/lib/berlin-time";
import { formatDate, formatEuro } from "@/lib/invoice-document";
import { splitEmailList } from "@/lib/office-billing";
import {
  LINK_OUTLINE,
  dateFromInput,
  dateInputValue,
  type BillingSection,
} from "@/app/_components/dashboard/office-billing-ui";

/**
 * Seite eines Abrechnungslaufs der Geschäftsstelle — für Versicherung und
 * Mitgliedsbeiträge gleich: Entwurf prüfen, zwischen „Abrechnen“ und „Nicht
 * abrechnen“ verschieben, Vorschau, Ausstellen, Versand. Was je Abrechnung
 * anders ist (Spalten, Sätze, Hinweise), kommt über Props herein.
 */

export interface BillingInvoiceBase {
  id: string;
  sheetRow: number;
  choirNumber: string;
  choirName: string | null;
  recipientName1: string | null;
  recipientName2: string | null;
  recipientStreet: string | null;
  recipientCity: string | null;
  email: string | null;
  sheetTotal: number | null;
  sheetNote: string | null;
  warnings: string[];
  sheetMarkedRed: boolean;
  excluded: boolean;
  mailedAt: Date | null;
  mailedTo: string | null;
  mailError: string | null;
  total: number;
  paymentReference: string;
}

export interface BillingRunBase<I extends BillingInvoiceBase> {
  id: string;
  draft: boolean;
  year: number;
  sourceFilename: string;
  invoiceDate: Date;
  dueDate: Date;
  createdAt: Date;
  createdByName: string | null;
  issuedAt: Date | null;
  warnings: string[];
  invoices: I[];
}

export interface SendResult {
  test: boolean;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
}

/** Die Mutationen des jeweiligen Routers; Fehler werfen, die Seite meldet sie. */
export interface BillingRunActions {
  updateRun: (input: {
    year: number;
    invoiceDate: Date;
    dueDate: Date;
  }) => Promise<unknown>;
  updateEmail: (invoiceId: string, email: string) => Promise<unknown>;
  setExcluded: (invoiceIds: string[], excluded: boolean) => Promise<unknown>;
  send: (input: {
    invoiceIds?: string[];
    testEmail?: string;
  }) => Promise<SendResult>;
  issue: () => Promise<unknown>;
  remove: () => Promise<unknown>;
}

export interface ExcludedReason {
  label: string;
  tone: "cancelled" | "muted";
}

export type InvoiceListVariant = "billed" | "excluded";

export interface ExtraColumnContext {
  draft: boolean;
  excludedList: boolean;
}

const PREVIEW_LINK =
  "border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-9 items-center gap-2 border px-3 py-1.5 text-sm font-medium whitespace-nowrap";

export function plural(count: number, one: string, many: string): string {
  return count === 1 ? `1 ${one}` : `${count} ${many}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function useRunner() {
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);
  const run = async <T,>(
    key: string,
    action: () => Promise<T>,
    onSuccess?: (result: T) => void,
  ) => {
    setPending(key);
    try {
      const result = await action();
      onSuccess?.(result);
      return result;
    } catch (error) {
      toast.error(errorMessage(error));
      return undefined;
    } finally {
      setPending(null);
    }
  };
  return { pending, run };
}

function StatusTag({ invoice }: { invoice: BillingInvoiceBase }) {
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
  onSave,
}: {
  invoice: BillingInvoiceBase;
  onSave: (email: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(invoice.email ?? "");
  const { pending, run } = useRunner();

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
        void run(
          "save",
          () => onSave(value),
          () => setEditing(false),
        );
      }}
    >
      <Input
        autoFocus
        value={value}
        aria-label="E-Mail-Adressen, durch Komma getrennt"
        onChange={(event) => setValue(event.target.value)}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" isLoading={pending === "save"}>
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

function recipientLines(invoice: BillingInvoiceBase): string[] {
  return [
    invoice.recipientName1,
    invoice.recipientName2,
    invoice.recipientStreet,
    invoice.recipientCity,
  ].filter((line): line is string => Boolean(line));
}

function differsFromSheet(invoice: BillingInvoiceBase): boolean {
  return (
    invoice.sheetTotal !== null &&
    Math.abs(invoice.sheetTotal - invoice.total) > 0.005
  );
}

type InvoiceStatusKey = "excluded" | "mailed" | "failed" | "noEmail" | "open";

function statusKey(invoice: BillingInvoiceBase): InvoiceStatusKey {
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
];

/**
 * Eine der beiden Listen eines Laufs. Häkchen wählen nur aus; verschoben wird
 * über die Schaltfläche in der Zeile oder für die ganze Auswahl darüber.
 */
function RunInvoicesTable<I extends BillingInvoiceBase>({
  section,
  draft,
  variant,
  invoices,
  pdfBase,
  selected,
  onSelect,
  onSelectAll,
  sending,
  updating,
  onSend,
  onMove,
  onUpdateEmail,
  extraColumns,
  excludedReasons,
  sheetTotalTitle,
}: {
  section: BillingSection;
  draft: boolean;
  variant: InvoiceListVariant;
  invoices: I[];
  pdfBase: string;
  selected: Set<string>;
  onSelect: (id: string, value: boolean) => void;
  onSelectAll: (value: boolean) => void;
  sending: boolean;
  updating: boolean;
  onSend: (invoice: I) => void;
  onMove: (invoices: I[], excluded: boolean) => void;
  onUpdateEmail: (invoiceId: string, email: string) => Promise<unknown>;
  extraColumns: (context: ExtraColumnContext) => DataTableColumn<I>[];
  excludedReasons: (invoice: I) => ExcludedReason[];
  sheetTotalTitle: string;
}) {
  const excludedList = variant === "excluded";
  const allSelected =
    invoices.length > 0 &&
    invoices.every((invoice) => selected.has(invoice.id));
  const noneSelected = !invoices.some((invoice) => selected.has(invoice.id));

  const columns = useMemo<DataTableColumn<I>[]>(() => {
    const column = createDataTableColumnHelper<I>();
    const actions = (invoice: I) => (
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
        {!draft && !excludedList && invoice.email && (
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
        {/* Versendete bleiben, wo sie sind — sie liegen beim Empfänger. */}
        {!invoice.mailedAt && (
          <Button
            size="sm"
            variant="ghost"
            disabled={updating}
            onClick={() => onMove([invoice], !excludedList)}
          >
            {excludedList ? (
              <>
                <ArrowUp className="h-4 w-4" aria-hidden />
                Abrechnen
              </>
            ) : (
              <>
                <ArrowDown className="h-4 w-4" aria-hidden />
                Nicht abrechnen
              </>
            )}
          </Button>
        )}
      </div>
    );

    return column.columns([
      column.display({
        id: "select",
        header: () => (
          <Checkbox
            aria-label="Alle in dieser Liste auswählen"
            checked={allSelected}
            ref={(element) => {
              if (element) {
                element.indeterminate = !allSelected && !noneSelected;
              }
            }}
            onChange={(event) => onSelectAll(event.target.checked)}
          />
        ),
        meta: { alwaysVisible: true, label: "Auswahl" },
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Chor ${row.original.choirNumber} auswählen`}
            checked={selected.has(row.original.id)}
            onChange={(event) =>
              onSelect(row.original.id, event.target.checked)
            }
          />
        ),
      }),
      column.accessor(
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
                {draft || excludedList
                  ? `Zeile ${row.original.sheetRow}${row.original.sheetNote ? ` · ${row.original.sheetNote}` : ""}`
                  : `Verwendungszweck ${row.original.paymentReference}`}
              </span>
              {draft && !excludedList && row.original.warnings.length > 0 && (
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
      ...(excludedList
        ? [
            column.accessor(
              (invoice) =>
                excludedReasons(invoice)
                  .map((reason) => reason.label)
                  .join(", "),
              {
                id: "reason",
                header: "Grund",
                enableColumnFilter: false,
                cell: ({ row }) => (
                  <div className="flex flex-wrap gap-1">
                    {excludedReasons(row.original).map((reason) => (
                      <Tag key={reason.label} tone={reason.tone}>
                        {reason.label}
                      </Tag>
                    ))}
                  </div>
                ),
              },
            ),
          ]
        : []),
      column.accessor((invoice) => recipientLines(invoice).join(" "), {
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
      column.accessor((invoice) => invoice.email ?? "", {
        id: "email",
        header: "E-Mail",
        enableColumnFilter: false,
        // Neben den Zahlenspalten würde sie sonst auf Buchstabenbreite gequetscht.
        meta: { headerClassName: "min-w-72", cellClassName: "min-w-72" },
        cell: ({ row }) => (
          <EmailCell
            invoice={row.original}
            onSave={(email) => onUpdateEmail(row.original.id, email)}
          />
        ),
      }),
      column.accessor((invoice) => invoice.total, {
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
            column.accessor((invoice) => invoice.sheetTotal ?? 0, {
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
                    differsFromSheet(row.original) ? sheetTotalTitle : undefined
                  }
                >
                  {row.original.sheetTotal === null
                    ? "—"
                    : formatEuro(row.original.sheetTotal)}
                </span>
              ),
            }),
          ]
        : []),
      ...extraColumns({ draft, excludedList }),
      ...(!draft && !excludedList
        ? [
            column.accessor(statusKey, {
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
          ]
        : []),
      column.display({
        id: "actions",
        // Sichtbar wie in den anderen Dashboard-Tabellen; ein sr-only-Text
        // (position: absolute) entkäme dem Scrollbereich der Tabelle und
        // machte die ganze Seite breiter.
        header: "Aktionen",
        meta: { alwaysVisible: true, label: "Aktionen", align: "right" },
        cell: ({ row }) => actions(row.original),
      }),
    ]);
  }, [
    draft,
    excludedList,
    allSelected,
    noneSelected,
    selected,
    sending,
    updating,
    pdfBase,
    onSelect,
    onSelectAll,
    onSend,
    onMove,
    onUpdateEmail,
    extraColumns,
    excludedReasons,
    sheetTotalTitle,
  ]);

  return (
    <DataTable
      data={invoices}
      columns={columns}
      getRowId={(invoice) => invoice.id}
      rowNoun={["Chor", "Chöre"]}
      searchPlaceholder="Chor-Nr., Name, Empfänger oder E-Mail"
      persistKey={`${section.persistKey}-${variant}`}
      initialSorting={[{ id: "choir", desc: false }]}
      emptyState={
        <p className="text-dark dark:text-night-muted text-sm">
          {excludedList
            ? "Alle Chöre werden abgerechnet."
            : "Kein Chor wird abgerechnet."}
        </p>
      }
      renderMobileRow={(invoice) => (
        <div className="flex gap-3">
          <div className="pt-1">
            <Checkbox
              aria-label={`Chor ${invoice.choirNumber} auswählen`}
              checked={selected.has(invoice.id)}
              onChange={(event) => onSelect(invoice.id, event.target.checked)}
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
            <EmailCell
              invoice={invoice}
              onSave={(email) => onUpdateEmail(invoice.id, email)}
            />
            {excludedList ? (
              <div className="flex flex-wrap gap-1">
                {excludedReasons(invoice).map((reason) => (
                  <Tag key={reason.label} tone={reason.tone}>
                    {reason.label}
                  </Tag>
                ))}
              </div>
            ) : (
              !draft && <StatusTag invoice={invoice} />
            )}
            <div className="flex flex-wrap gap-1">
              <a
                href={`${pdfBase}?invoice=${invoice.id}`}
                target="_blank"
                rel="noreferrer"
                className={PREVIEW_LINK}
              >
                <DownloadIcon className="h-4 w-4" aria-hidden />
                {draft ? "Vorschau" : "PDF"}
              </a>
              {!invoice.mailedAt && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={updating}
                  onClick={() => onMove([invoice], !excludedList)}
                >
                  {excludedList ? "Abrechnen" : "Nicht abrechnen"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    />
  );
}

/** Jahr und Daten, solange die Abrechnung Entwurf ist. */
function DraftDetailsCard({
  run,
  onSave,
}: {
  run: BillingRunBase<BillingInvoiceBase>;
  onSave: BillingRunActions["updateRun"];
}) {
  const toast = useToast();
  const { pending, run: runAction } = useRunner();
  const [year, setYear] = useState(String(run.year));
  const [invoiceDate, setInvoiceDate] = useState(
    dateInputValue(new Date(run.invoiceDate)),
  );
  const [dueDate, setDueDate] = useState(dateInputValue(new Date(run.dueDate)));

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
      <div className="space-y-4 p-6">
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
          isLoading={pending === "save"}
          onClick={() => {
            if (!parsedInvoiceDate || !parsedDueDate) return;
            void runAction(
              "save",
              () =>
                onSave({
                  year: parsedYear,
                  invoiceDate: parsedInvoiceDate,
                  dueDate: parsedDueDate,
                }),
              () => toast.success("Rechnungsangaben gespeichert."),
            );
          }}
        >
          Angaben speichern
        </Button>
      </div>
    </Card>
  );
}

export function BillingRunView<I extends BillingInvoiceBase>({
  section,
  run: data,
  actions,
  extraColumns,
  excludedReasons,
  draftExplanation,
  draftNotices,
  draftAside,
  canIssue,
  issueConfirm,
  sheetTotalTitle,
}: {
  section: BillingSection;
  run: BillingRunBase<I>;
  actions: BillingRunActions;
  /** Zusätzliche Spalten hinter „Betrag“ bzw. „Laut Tabelle“; stabil halten (useCallback). */
  extraColumns: (context: ExtraColumnContext) => DataTableColumn<I>[];
  /** Warum jemand in „Nicht abrechnen“ steht; stabil halten. */
  excludedReasons: (invoice: I) => ExcludedReason[];
  /** Was im Entwurf live gerechnet wird (Satz unter der Überschrift). */
  draftExplanation: ReactNode;
  /** Rot hervorgehobene Probleme, die das Ausstellen blockieren. */
  draftNotices?: ReactNode;
  /** Unter den Rechnungsangaben, z.B. die Tabelle der Sätze. */
  draftAside?: ReactNode;
  canIssue: boolean;
  /** Was beim Ausstellen festgeschrieben wird, für die Rückfrage. */
  issueConfirm: string;
  sheetTotalTitle: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const { data: session } = useSession();
  const { pending, run } = useRunner();

  const [testEmail, setTestEmail] = useState("");
  const [selectedBilled, setSelectedBilled] = useState<Set<string>>(new Set());
  const [selectedExcluded, setSelectedExcluded] = useState<Set<string>>(
    new Set(),
  );

  const draft = data.draft;
  const billed = data.invoices.filter((invoice) => !invoice.excluded);
  const excludedInvoices = data.invoices.filter((invoice) => invoice.excluded);
  const pending_ = billed.filter(
    (invoice) => !invoice.mailedAt && invoice.email,
  );
  const withoutEmail = billed.filter(
    (invoice) => !invoice.mailedAt && !invoice.email,
  );
  const mailedCount = billed.filter((invoice) => invoice.mailedAt).length;
  const total = billed.reduce((sum, invoice) => sum + invoice.total, 0);
  const pdfBase = `${section.pdfApiBase}/${data.id}/pdf`;
  const sending = pending === "send";
  const updating = pending === "move";
  const redCount = data.invoices.filter(
    (invoice) => invoice.sheetMarkedRed,
  ).length;

  const toggleIn =
    (setter: typeof setSelectedBilled) => (id: string, value: boolean) =>
      setter((current) => {
        const next = new Set(current);
        if (value) next.add(id);
        else next.delete(id);
        return next;
      });
  const selectAllIn =
    (setter: typeof setSelectedBilled, list: I[]) => (value: boolean) =>
      setter(value ? new Set(list.map((invoice) => invoice.id)) : new Set());

  /** Verschiebt zwischen den Listen; Versendete bleiben stehen. */
  const move = (invoices: I[], excluded: boolean) => {
    const movable = invoices.filter((invoice) => !invoice.mailedAt);
    if (movable.length === 0) return;
    void run(
      "move",
      () =>
        actions.setExcluded(
          movable.map((invoice) => invoice.id),
          excluded,
        ),
      () => {
        const moved = new Set(movable.map((invoice) => invoice.id));
        const drop = (current: Set<string>) =>
          new Set([...current].filter((id) => !moved.has(id)));
        setSelectedBilled(drop);
        setSelectedExcluded(drop);
        toast.success(
          `${plural(movable.length, "Chor", "Chöre")} ${excluded ? "nach „Nicht abrechnen“" : "nach „Abrechnen“"} verschoben.`,
        );
      },
    );
  };

  const send = (
    input: Parameters<BillingRunActions["send"]>[0],
    onDone?: () => void,
  ) =>
    void run(
      "send",
      () => actions.send(input),
      (result) => {
        onDone?.();
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
    );

  const selectedBilledInvoices = billed.filter((invoice) =>
    selectedBilled.has(invoice.id),
  );
  const selectedExcludedInvoices = excludedInvoices.filter((invoice) =>
    selectedExcluded.has(invoice.id),
  );
  const selectedSendable = selectedBilledInvoices.filter(
    (invoice) => invoice.email,
  );
  const selectedMovableBilled = selectedBilledInvoices.filter(
    (invoice) => !invoice.mailedAt,
  );

  const sendAll = () => {
    if (
      window.confirm(
        `${plural(pending_.length, "Rechnung", "Rechnungen")} jetzt per E-Mail versenden? Das lässt sich nicht zurücknehmen.`,
      )
    ) {
      send({});
    }
  };

  const sendSelected = () => {
    const resend = selectedSendable.filter(
      (invoice) => invoice.mailedAt,
    ).length;
    if (
      window.confirm(
        `${plural(selectedSendable.length, "Rechnung", "Rechnungen")} jetzt per E-Mail versenden?${resend > 0 ? ` ${resend} davon gingen schon einmal raus.` : ""}`,
      )
    ) {
      send({ invoiceIds: selectedSendable.map((invoice) => invoice.id) }, () =>
        setSelectedBilled(new Set()),
      );
    }
  };

  const sendOne = (invoice: I) => {
    if (
      invoice.mailedAt &&
      !window.confirm(
        `Die Rechnung an ${invoice.mailedTo ?? invoice.email} wurde schon versendet. Noch einmal schicken?`,
      )
    ) {
      return;
    }
    send({ invoiceIds: [invoice.id] });
  };

  const issue = () => {
    if (
      window.confirm(
        `${plural(billed.length, "Rechnung", "Rechnungen")} über ${formatEuro(total)} ausstellen? ${issueConfirm}`,
      )
    ) {
      void run("issue", actions.issue, () => {
        setSelectedBilled(new Set());
        toast.success("Abrechnung ausgestellt — jetzt kann versendet werden.");
      });
    }
  };

  const remove = () => {
    if (
      window.confirm(
        draft
          ? "Diesen Entwurf löschen?"
          : "Diese Abrechnung mit allen Rechnungen löschen? Es wurde noch nichts versendet.",
      )
    ) {
      void run("remove", actions.remove, () => {
        toast.success("Abrechnung gelöscht.");
        router.push(section.basePath);
      });
    }
  };

  const tableProps = {
    section,
    draft,
    pdfBase,
    sending,
    updating,
    onSend: sendOne,
    onMove: move,
    onUpdateEmail: actions.updateEmail,
    extraColumns,
    excludedReasons,
    sheetTotalTitle,
  };

  return (
    <DashboardPage
      title={`${section.title} ${data.year}`}
      description={`Aus „${data.sourceFilename}“, angelegt ${formatDate(data.createdAt)}${data.createdByName ? ` von ${data.createdByName}` : ""}${data.issuedAt ? `, ausgestellt ${formatDate(data.issuedAt)}` : ""}.`}
      breadcrumbs={[
        ...section.breadcrumbs,
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
              <p>{draftExplanation}</p>
              {draftNotices}
              {data.warnings.length > 0 && (
                <ul className="space-y-1">
                  {data.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {draft ? (
          <>
            <DraftDetailsCard
              key={`${data.year}-${String(data.invoiceDate)}-${String(data.dueDate)}`}
              run={data}
              onSave={actions.updateRun}
            />
            {draftAside}
          </>
        ) : (
          <Card>
            <div className="space-y-4 p-6">
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
              <div>
                <Label htmlFor="testEmail">Testmail an</Label>
                {/* Eine Zeile, eine Höhe: Feld und beide Knöpfe sind 40 px hoch. */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex flex-1 gap-2">
                    <Input
                      id="testEmail"
                      type="email"
                      className="h-10"
                      placeholder={session?.user.email ?? "name@example.org"}
                      value={testEmail}
                      onChange={(event) => setTestEmail(event.target.value)}
                    />
                    <Button
                      variant="outline"
                      className="shrink-0"
                      disabled={sending || billed.length === 0}
                      onClick={() =>
                        send({
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
                  <Button
                    className="shrink-0 sm:ml-4"
                    disabled={sending || pending_.length === 0}
                    isLoading={sending}
                    onClick={sendAll}
                  >
                    <Send className="h-4 w-4" aria-hidden />
                    {pending_.length === 0
                      ? "Alles versendet"
                      : pending_.length === 1
                        ? "1 Rechnung versenden"
                        : `Alle ${pending_.length} offenen versenden`}
                  </Button>
                </div>
                <p className="text-dark dark:text-night-muted mt-1 text-xs">
                  Schickt die erste Rechnung mit „[TEST]“ im Betreff; nichts
                  wird als versendet markiert.
                </p>
              </div>
            </div>
          </Card>
        )}

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-ink dark:text-night-text text-lg font-semibold">
              Abrechnen ({billed.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {selectedMovableBilled.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updating}
                  onClick={() => move(selectedMovableBilled, true)}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden />
                  {plural(
                    selectedMovableBilled.length,
                    "ausgewählten",
                    "ausgewählte",
                  )}{" "}
                  nicht abrechnen
                </Button>
              )}
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
          </div>
          <RunInvoicesTable
            {...tableProps}
            variant="billed"
            invoices={billed}
            selected={selectedBilled}
            onSelect={toggleIn(setSelectedBilled)}
            onSelectAll={selectAllIn(setSelectedBilled, billed)}
          />
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-ink dark:text-night-text text-lg font-semibold">
                Nicht abrechnen ({excludedInvoices.length})
              </h2>
              <p className="text-dark dark:text-night-muted text-sm">
                Diese Chöre bekommen keine Rechnung
                {redCount > 0 &&
                  ` — ${plural(redCount, "Zeile ist", "Zeilen sind")} in der Tabelle rot markiert`}
                . Prüfe, ob alle hierher gehören, und verschiebe Fehler mit
                „Abrechnen“.
              </p>
            </div>
            {selectedExcludedInvoices.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                disabled={updating}
                onClick={() => move(selectedExcludedInvoices, false)}
              >
                <ArrowUp className="h-4 w-4" aria-hidden />
                {plural(
                  selectedExcludedInvoices.length,
                  "ausgewählten",
                  "ausgewählte",
                )}{" "}
                abrechnen
              </Button>
            )}
          </div>
          <RunInvoicesTable
            {...tableProps}
            variant="excluded"
            invoices={excludedInvoices}
            selected={selectedExcluded}
            onSelect={toggleIn(setSelectedExcluded)}
            onSelectAll={selectAllIn(setSelectedExcluded, excludedInvoices)}
          />
        </section>

        <div className="border-rule dark:border-night-rule flex flex-wrap gap-3 border-t pt-6">
          {draft && (
            <Button
              disabled={!canIssue || billed.length === 0}
              isLoading={pending === "issue"}
              onClick={issue}
            >
              <Stamp className="h-4 w-4" aria-hidden />
              {plural(billed.length, "Rechnung", "Rechnungen")} ausstellen
            </Button>
          )}
          {mailedCount === 0 && (
            <Button
              variant="danger"
              isLoading={pending === "remove"}
              onClick={remove}
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
