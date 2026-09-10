"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth";
import { api, type RouterOutputs } from "@/trpc/react";
import DashboardPage from "@/app/_components/dashboard/dashboard-page";
import {
  DataTable,
  createDataTableColumnHelper,
  type DataTableColumn,
} from "@/app/_components/ui/data-table";
import { InvoicePaymentBadge } from "@/app/_components/dashboard/invoice-payment-badge";
import {
  InvoiceStatusBadge,
  INVOICE_STATUS_LABELS,
} from "@/app/_components/dashboard/invoice-status-badge";
import { SignatureCanvas } from "@/app/_components/dashboard/signature-canvas";
import { useToast } from "@/app/_components/ui/toast";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import {
  formatDate,
  formatEuro,
  lineItemTotal,
  SIBLING_DISCOUNT_LINE_DESCRIPTION,
  type InvoiceLineItem,
} from "@/lib/invoice-document";
import { InvoiceStatus } from "~/generated/prisma/enums";
import {
  ArrowLeftIcon,
  DownloadIcon,
  FileTextIcon,
  MailIcon,
  PencilIcon,
  PlusIcon,
  ReceiptTextIcon,
  SendIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";

/** `;`-getrennt wie der Teilnehmer-Export, damit Excel (de-DE) es ohne Import-Dialog öffnet. */
function escapeCSVValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Summe der Geschwisterkindrabatt-Zeilen einer Rechnung, als positiver Betrag. */
function siblingDiscountAmount(lineItems: unknown): number {
  const items = Array.isArray(lineItems) ? lineItems : [];
  const discountTotal = items
    .filter(
      (raw) =>
        (raw as Partial<InvoiceLineItem>).description ===
        SIBLING_DISCOUNT_LINE_DESCRIPTION,
    )
    .reduce((sum, raw) => sum + lineItemTotal(raw as InvoiceLineItem), 0);
  return -discountTotal;
}

type CourseInvoice = RouterOutputs["invoices"]["listForCourse"][number];

const invoiceColumn = createDataTableColumnHelper<CourseInvoice>();

/** Firma und Person der Rechnungsanschrift als eine Zeile. */
function invoiceRecipient(invoice: CourseInvoice): string {
  return (
    [
      invoice.recipientCompany,
      `${invoice.recipientFirstName ?? ""} ${invoice.recipientLastName ?? ""}`.trim(),
    ]
      .filter(Boolean)
      .join(" · ") || "—"
  );
}

type SignatureMode = "none" | "upload" | "draw";

/** Mirrors the signature cap in the publish input on the server. */
const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

export default function CourseInvoicesPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const courseId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const utils = api.useUtils();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showPicker, setShowPicker] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [reviewedConfirmed, setReviewedConfirmed] = useState(false);
  const [notifyRegistrants, setNotifyRegistrants] = useState(true);
  const [bulkDueDate, setBulkDueDate] = useState("");
  const [bulkSignatureName, setBulkSignatureName] = useState("");
  // Only ever held in memory and handed to the publish call — the signature is
  // baked into the PDFs, never stored as a reusable signature on its own.
  const [bulkSignatureBase64, setBulkSignatureBase64] = useState<string | null>(
    null,
  );
  const [bulkSignatureMode, setBulkSignatureMode] =
    useState<SignatureMode>("none");
  const [bulkSignatureFileName, setBulkSignatureFileName] = useState<
    string | null
  >(null);
  const bulkSignatureInputRef = useRef<HTMLInputElement>(null);

  const { data: course } = api.courses.getById.useQuery(
    { id: courseId },
    { enabled: !!courseId && !!session?.user },
  );

  const { data: access, isLoading: accessLoading } =
    api.invoices.canManageCourseInvoices.useQuery(
      { courseId },
      { enabled: !!courseId && !!session?.user },
    );

  const canManage = access?.canManage ?? false;

  const { data: invoices, isLoading: invoicesLoading } =
    api.invoices.listForCourse.useQuery(
      { courseId },
      { enabled: !!courseId && canManage },
    );

  const { data: registrations } =
    api.invoices.invoiceableRegistrations.useQuery(
      { courseId },
      { enabled: !!courseId && canManage && showPicker },
    );

  const createDraft = api.invoices.createDraft.useMutation({
    onSuccess: (invoice) => {
      void utils.invoices.listForCourse.invalidate({ courseId });
      router.push(`/dashboard/courses/${courseId}/invoices/${invoice.id}`);
    },
    onError: (error) => toast.error(error.message),
  });

  const createDraftsBulk = api.invoices.createDraftsBulk.useMutation({
    onSuccess: (result) => {
      void utils.invoices.listForCourse.invalidate({ courseId });
      void utils.invoices.invoiceableRegistrations.invalidate({ courseId });
      setSelected(new Set());
      setShowPicker(false);
      toast.success(
        result.skipped > 0
          ? `${result.created} Entwürfe erstellt, ${result.skipped} übersprungen (bereits vorhanden)`
          : `${result.created} Entwürfe erstellt`,
      );
    },
    onError: (error) => toast.error(error.message),
  });

  const resetBulkSignature = () => {
    setBulkSignatureBase64(null);
    setBulkSignatureFileName(null);
    setBulkSignatureMode("none");
    if (bulkSignatureInputRef.current) bulkSignatureInputRef.current.value = "";
  };

  const resetFinalizeForm = () => {
    setReviewedConfirmed(false);
    setBulkDueDate("");
    setBulkSignatureName("");
    resetBulkSignature();
  };

  const handleBulkSignatureUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Bitte ein Bild hochladen (PNG, JPG, …).");
      return;
    }
    if (file.size > MAX_SIGNATURE_BYTES) {
      toast.error("Die Datei ist zu groß. Maximal 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setBulkSignatureBase64(reader.result as string);
      setBulkSignatureFileName(file.name);
    };
    reader.onerror = () =>
      toast.error("Die Datei konnte nicht gelesen werden.");
    reader.readAsDataURL(file);
  };

  const publishAllDrafts = api.invoices.publishAllDrafts.useMutation({
    onSuccess: (result) => {
      void utils.invoices.listForCourse.invalidate({ courseId });
      setFinalizeOpen(false);
      resetFinalizeForm();
      if (result.failed === 0) {
        toast.success(
          result.published === 1
            ? "1 Rechnung ausgestellt"
            : `${result.published} Rechnungen ausgestellt`,
        );
      } else {
        toast.error(
          `${result.published} ausgestellt, ${result.failed} fehlgeschlagen: ` +
            result.failures
              .map((f) => `${f.recipient} (${f.message})`)
              .join("; "),
        );
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const invoiceColumns = useMemo<DataTableColumn<CourseInvoice>[]>(
    () =>
      invoiceColumn.columns([
        invoiceColumn.accessor(
          (invoice) => invoice.invoiceNumber ?? "Entwurf",
          {
            id: "invoiceNumber",
            header: "Nummer",
            meta: { alwaysVisible: true, cellClassName: "whitespace-nowrap" },
            cell: ({ row }) => (
              <>
                <Link
                  href={`/dashboard/courses/${courseId}/invoices/${row.original.id}`}
                  className="dark:text-dark-text font-medium text-gray-900 hover:underline"
                >
                  {row.original.invoiceNumber ?? "Entwurf"}
                </Link>
                {row.original.replaces?.invoiceNumber && (
                  <span className="dark:text-dark-muted block text-xs text-gray-500">
                    ersetzt {row.original.replaces.invoiceNumber}
                  </span>
                )}
                {row.original.replacedBy?.invoiceNumber && (
                  <span className="dark:text-dark-muted block text-xs text-gray-500">
                    ersetzt durch {row.original.replacedBy.invoiceNumber}
                  </span>
                )}
              </>
            ),
          },
        ),
        invoiceColumn.accessor(invoiceRecipient, {
          id: "recipient",
          header: "Empfänger",
          cell: ({ row }) => (
            <>
              <span className="block">{invoiceRecipient(row.original)}</span>
              {row.original.recipientEmail && (
                <span className="dark:text-dark-muted block text-xs text-gray-500">
                  {row.original.recipientEmail}
                </span>
              )}
            </>
          ),
        }),
        invoiceColumn.accessor(
          (invoice) =>
            (invoice.registration?.participants ?? [])
              .map((p) => `${p.firstName} ${p.lastName}`.trim())
              .join(", "),
          {
            id: "participants",
            header: "Teilnehmer:innen",
            cell: ({ getValue }) => (
              <span className="dark:text-dark-muted text-gray-600">
                {getValue() || "—"}
              </span>
            ),
          },
        ),
        invoiceColumn.accessor((invoice) => invoice.invoiceDate, {
          id: "invoiceDate",
          header: "Datum",
          sortFn: "datetime",
          sortUndefined: "last",
          meta: { filterVariant: "date", cellClassName: "whitespace-nowrap" },
          cell: ({ row }) =>
            row.original.invoiceDate
              ? formatDate(row.original.invoiceDate)
              : "—",
        }),
        invoiceColumn.accessor((invoice) => invoice.totalAmount, {
          id: "totalAmount",
          header: "Betrag",
          meta: {
            align: "right",
            filterVariant: "number",
            cellClassName: "font-semibold whitespace-nowrap",
          },
          cell: ({ getValue }) => formatEuro(getValue()),
        }),
        invoiceColumn.accessor(
          (invoice) => INVOICE_STATUS_LABELS[invoice.status],
          {
            id: "status",
            header: "Status",
            meta: {
              filterVariant: "set",
              filterOptions: Object.values(INVOICE_STATUS_LABELS).map(
                (label) => ({ value: label, label }),
              ),
            },
            cell: ({ row }) => (
              <div className="flex flex-wrap items-center gap-1">
                <InvoiceStatusBadge status={row.original.status} />
                <InvoicePaymentBadge invoice={row.original} />
              </div>
            ),
          },
        ),
      ]),
    [courseId],
  );

  const summary = useMemo(() => {
    const list = invoices ?? [];
    return {
      drafts: list.filter((i) => i.status === InvoiceStatus.DRAFT).length,
      published: list.filter((i) => i.status === InvoiceStatus.PUBLISHED),
      cancelled: list.filter((i) => i.status === InvoiceStatus.CANCELLED)
        .length,
    };
  }, [invoices]);

  const openTotal = summary.published.reduce(
    (sum, invoice) => sum + invoice.totalAmount,
    0,
  );

  // Only issued invoices: an auditor checking who paid the right amount
  // reconciles against real invoice numbers, not drafts still being edited or
  // storniert invoices that no longer carry a claim.
  const exportableInvoices = (invoices ?? []).filter(
    (invoice) => invoice.status === InvoiceStatus.PUBLISHED,
  );

  const handleExportCsv = () => {
    const rows = exportableInvoices.map((invoice) => {
      const registration = invoice.registration;
      const registrantName = registration
        ? `${registration.registrantFirstName} ${registration.registrantLastName}`.trim()
        : "";
      const participantNames = (registration?.participants ?? [])
        .map((p) => `${p.firstName} ${p.lastName}`.trim())
        .join(", ");

      return {
        registrant: registrantName,
        registrantEmail: registration?.registrantEmail ?? "",
        participants: participantNames,
        courseNumber: course?.courseNumber ?? "",
        invoiceNumber: invoice.invoiceNumber ?? "",
        totalAmount: invoice.totalAmount.toFixed(2),
        siblingDiscountAmount: siblingDiscountAmount(invoice.lineItems).toFixed(
          2,
        ),
      };
    });

    const headers = [
      "Anmelder:in",
      "E-Mail",
      "Teilnehmer:innen",
      "Interne Kursnummer",
      "Rechnungsnummer",
      "Zu überweisender Betrag",
      "Förderverein Zuschuss",
    ];
    const keys: (keyof (typeof rows)[number])[] = [
      "registrant",
      "registrantEmail",
      "participants",
      "courseNumber",
      "invoiceNumber",
      "totalAmount",
      "siblingDiscountAmount",
    ];

    const csvContent = [
      headers.map(escapeCSVValue).join(";"),
      ...rows.map((row) =>
        keys.map((key) => escapeCSVValue(String(row[key]))).join(";"),
      ),
    ].join("\n");

    const bom = "﻿";
    const blob = new Blob([bom + csvContent], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const filenameBase = (course?.title ?? "kurs").replace(
      /[^a-zA-Z0-9äöüÄÖÜß]/g,
      "_",
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenameBase}_rechnungen_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (sessionLoading || accessLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <DashboardPage title="Rechnungen" description="Keine Berechtigung">
        <div className="dark:bg-dark-surface rounded-lg bg-white p-8 text-center shadow">
          <p className="dark:text-dark-muted text-gray-600">
            Du hast keine Berechtigung, für diesen Kurs Rechnungen zu erstellen.
            Das dürfen Kurs-Organisator:innen sowie Landesposaunenwarte und
            Administratoren.
          </p>
          <Link
            href={`/dashboard/courses/${courseId}`}
            className="text-primary mt-4 inline-block hover:underline"
          >
            Zurück zum Kurs
          </Link>
        </div>
      </DashboardPage>
    );
  }

  const selectableRegistrations = (registrations ?? []).filter(
    (registration) => !registration.hasOpenInvoice,
  );

  return (
    <DashboardPage
      title="Rechnungen"
      description={course?.title}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Kurse", href: "/dashboard/courses" },
        {
          label: course?.title ?? "Kurs",
          href: `/dashboard/courses/${courseId}`,
        },
        { label: "Rechnungen" },
      ]}
      actions={
        <>
          {/* Redundant on phones: the breadcrumb above already links to the
              course, so this only cost a second row of buttons. */}
          <Link
            href={`/dashboard/courses/${courseId}`}
            className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text hidden items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:inline-flex dark:hover:bg-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Zurück zum Kurs
          </Link>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exportableInvoices.length === 0}
            className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
          >
            <DownloadIcon className="h-4 w-4" />
            CSV exportieren
          </button>
          {summary.drafts > 0 && (
            <button
              type="button"
              onClick={() => setFinalizeOpen(true)}
              disabled={!access?.invoicingEnabled}
              title={
                access?.invoicingEnabled
                  ? undefined
                  : "Für diesen Kurs ist die Rechnungsstellung nicht freigeschaltet."
              }
              className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
            >
              <SendIcon className="h-4 w-4" />
              Alle Entwürfe ausstellen ({summary.drafts})
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowPicker((open) => !open)}
            disabled={!access?.invoicingEnabled}
            title={
              access?.invoicingEnabled
                ? undefined
                : "Für diesen Kurs ist die Rechnungsstellung nicht freigeschaltet."
            }
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlusIcon className="h-4 w-4" />
            Rechnung erstellen
          </button>
        </>
      }
    >
      {!access?.invoicingEnabled && (
        <div className="mb-6 rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/50 dark:bg-yellow-900/20">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Rechnungsstellung ist für diesen Kurs nicht freigeschaltet
          </p>
          <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
            Ein Landes-/Regionalposaunenwart oder Administrator kann sie in den
            Kurseinstellungen aktivieren. Bestehende Rechnungen bleiben
            sichtbar.
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Entwürfe", value: String(summary.drafts) },
          { label: "Ausgestellt", value: String(summary.published.length) },
          { label: "Storniert", value: String(summary.cancelled) },
          { label: "Offene Summe", value: formatEuro(openTotal) },
        ].map((tile) => (
          <div
            key={tile.label}
            className="dark:bg-dark-surface rounded-lg bg-white p-4 shadow"
          >
            <p className="dark:text-dark-muted text-xs text-gray-500">
              {tile.label}
            </p>
            <p className="dark:text-dark-text mt-1 text-2xl font-semibold text-gray-900">
              {tile.value}
            </p>
          </div>
        ))}
      </div>

      {/* Registration picker */}
      {showPicker && (
        <div className="dark:bg-dark-surface mb-6 rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="dark:text-dark-text text-lg font-semibold text-gray-900">
                Anmeldungen auswählen
              </h2>
              <p className="dark:text-dark-muted text-sm text-gray-500">
                Für jede Auswahl wird ein Entwurf aus den Teilnehmerdaten
                vorbefüllt. Danach kannst du ihn frei bearbeiten.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelected(new Set(selectableRegistrations.map((r) => r.id)))
                }
                className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
              >
                Alle auswählen
              </button>
              <button
                type="button"
                disabled={selected.size === 0 || createDraftsBulk.isPending}
                onClick={() =>
                  createDraftsBulk.mutate({
                    courseId,
                    registrationIds: [...selected],
                  })
                }
                className="bg-primary hover:bg-primary/90 rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {createDraftsBulk.isPending
                  ? "Erstelle…"
                  : `${selected.size} Entwürfe erstellen`}
              </button>
            </div>
          </div>

          {registrations === undefined ? (
            <p className="dark:text-dark-muted text-sm text-gray-500">Lade…</p>
          ) : registrations.length === 0 ? (
            <p className="dark:text-dark-muted text-sm text-gray-500">
              Für diesen Kurs gibt es noch keine Anmeldungen.
            </p>
          ) : (
            <ul className="dark:divide-dark-border divide-y divide-gray-200">
              {registrations.map((registration) => {
                const existing = registration.invoices[0];
                return (
                  <li
                    key={registration.id}
                    className="flex flex-wrap items-center gap-3 py-2.5"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(registration.id)}
                      disabled={registration.hasOpenInvoice}
                      onChange={() => toggle(registration.id)}
                      className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300 disabled:opacity-40"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="dark:text-dark-text truncate text-sm font-medium text-gray-900">
                        {registration.registrantFirstName}{" "}
                        {registration.registrantLastName}
                      </p>
                      <p className="dark:text-dark-muted truncate text-xs text-gray-500">
                        {registration.participants.length} Teilnehmer:in
                        {registration.participants.length === 1
                          ? ""
                          : "nen"} · {formatEuro(registration.totalPrice)}
                      </p>
                    </div>
                    {existing ? (
                      <span className="dark:text-dark-muted text-xs text-gray-500">
                        {existing.status === InvoiceStatus.DRAFT
                          ? "Entwurf vorhanden"
                          : `Rechnung ${existing.invoiceNumber ?? ""}`}
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={createDraft.isPending}
                        onClick={() =>
                          createDraft.mutate({
                            courseId,
                            registrationId: registration.id,
                          })
                        }
                        className="text-primary text-sm font-medium hover:underline disabled:opacity-50"
                      >
                        Einzeln erstellen
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Invoice list */}
      <DataTable
        data={invoices}
        columns={invoiceColumns}
        getRowId={(invoice) => invoice.id}
        isLoading={invoicesLoading}
        rowNoun={["Rechnung", "Rechnungen"]}
        searchPlaceholder="Nummer, Empfänger oder Anmeldung"
        initialSorting={[{ id: "invoiceDate", desc: true }]}
        onRowClick={(invoice) =>
          router.push(`/dashboard/courses/${courseId}/invoices/${invoice.id}`)
        }
        emptyState={
          <>
            <ReceiptTextIcon className="mx-auto h-10 w-10 text-gray-300" />
            <p className="dark:text-dark-text mt-3 font-medium text-gray-900">
              Noch keine Rechnungen
            </p>
            <p className="dark:text-dark-muted mt-1 text-sm text-gray-500">
              Erstelle den ersten Entwurf aus einer Anmeldung.
            </p>
          </>
        }
      />

      {summary.published.length > 0 && (
        <div className="dark:bg-dark-surface mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-4 shadow">
          <div className="flex items-center gap-2">
            <FileTextIcon className="text-primary h-5 w-5" />
            <p className="dark:text-dark-text text-sm text-gray-700">
              {summary.published.length} ausgestellte Rechnung
              {summary.published.length === 1 ? "" : "en"} können den
              Anmelder:innen per Mail zugeschickt werden.
            </p>
          </div>
          <Link
            href={`/dashboard/courses/${courseId}/mail`}
            className="dark:border-dark-border dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700"
          >
            <MailIcon className="h-4 w-4" />
            Nachricht schreiben
          </Link>
        </div>
      )}

      {finalizeOpen && (
        <ScrollableModal>
          <ScrollableModalCard maxW="md">
            <ScrollableModalBody>
              <h2 className="dark:text-dark-text text-xl font-semibold text-gray-900">
                Alle Entwürfe ausstellen
              </h2>
              <p className="dark:text-dark-muted mt-2 text-sm text-gray-600">
                {summary.drafts === 1
                  ? "1 Entwurf wird"
                  : `${summary.drafts} Entwürfe werden`}{" "}
                jetzt ausgestellt: Jede Rechnung bekommt eine fortlaufende
                Nummer, das PDF wird archiviert und ist danach unveränderlich.
                Korrekturen sind nur noch per Storno und Nachfolgerechnung
                möglich.
              </p>

              <div className="mt-4 sm:w-60">
                <label
                  className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700"
                  htmlFor="bulkDueDate"
                >
                  Gemeinsames Zahlungsziel (optional)
                </label>
                <input
                  id="bulkDueDate"
                  type="date"
                  value={bulkDueDate}
                  onChange={(e) => setBulkDueDate(e.target.value)}
                  className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:ring-1 focus:outline-none"
                />
                <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                  Leer lassen, damit jede Rechnung ihr eigenes Zahlungsziel
                  behält.
                </p>
              </div>

              <div className="dark:border-dark-border mt-4 rounded-lg border border-gray-200 p-4">
                <p className="dark:text-dark-text text-sm font-medium text-gray-700">
                  Unterschrift (optional)
                </p>
                <p className="dark:text-dark-muted mt-0.5 text-xs text-gray-500">
                  Wird identisch in jedes PDF dieser Ausstellung eingebettet und
                  nicht gespeichert.
                </p>
                {bulkSignatureMode === "none" && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBulkSignatureMode("upload")}
                      className="dark:border-dark-border dark:hover:bg-dark-background-secondary flex flex-1 flex-col items-center gap-1.5 rounded-md border-2 border-dashed border-gray-300 px-4 py-3 transition-colors hover:border-blue-400 hover:bg-blue-50"
                    >
                      <UploadIcon className="h-5 w-5 text-gray-400" />
                      <span className="dark:text-dark-text text-sm text-gray-600">
                        Hochladen
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkSignatureMode("draw")}
                      className="dark:border-dark-border dark:hover:bg-dark-background-secondary flex flex-1 flex-col items-center gap-1.5 rounded-md border-2 border-dashed border-gray-300 px-4 py-3 transition-colors hover:border-blue-400 hover:bg-blue-50"
                    >
                      <PencilIcon className="h-5 w-5 text-gray-400" />
                      <span className="dark:text-dark-text text-sm text-gray-600">
                        Zeichnen
                      </span>
                    </button>
                  </div>
                )}

                {bulkSignatureMode === "upload" &&
                  (bulkSignatureBase64 ? (
                    <div className="dark:border-dark-border dark:bg-dark-background-secondary mt-2 flex items-center gap-3 rounded-md border border-gray-300 bg-gray-50 p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={bulkSignatureBase64}
                        alt="Vorschau der Unterschrift"
                        className="h-10 max-w-[120px] object-contain"
                      />
                      <span className="dark:text-dark-text flex-1 truncate text-sm text-gray-600">
                        {bulkSignatureFileName}
                      </span>
                      <button
                        type="button"
                        onClick={resetBulkSignature}
                        aria-label="Unterschrift entfernen"
                        className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => bulkSignatureInputRef.current?.click()}
                        className="dark:border-dark-border flex w-full flex-col items-center gap-1 rounded-md border-2 border-dashed border-gray-300 px-4 py-5 transition-colors hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10"
                      >
                        <UploadIcon className="h-6 w-6 text-gray-400" />
                        <span className="dark:text-dark-text text-sm text-gray-600">
                          Bild auswählen
                        </span>
                        <span className="text-xs text-gray-400">
                          PNG oder JPG, max. 2 MB
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={resetBulkSignature}
                        className="dark:text-dark-muted mt-2 text-sm text-gray-500 hover:text-gray-700"
                      >
                        ← Ohne Unterschrift
                      </button>
                    </div>
                  ))}

                {bulkSignatureMode === "draw" && (
                  <div className="mt-2">
                    <SignatureCanvas
                      onSignatureChange={setBulkSignatureBase64}
                    />
                    <button
                      type="button"
                      onClick={resetBulkSignature}
                      className="dark:text-dark-muted mt-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                      ← Ohne Unterschrift
                    </button>
                  </div>
                )}

                <input
                  ref={bulkSignatureInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleBulkSignatureUpload}
                  className="hidden"
                />

                <div className="dark:border-dark-border mt-3 border-t border-gray-200 pt-3">
                  <label
                    className="dark:text-dark-text block text-sm font-medium text-gray-700"
                    htmlFor="bulkSignatureName"
                  >
                    Name des Unterzeichners (optional)
                  </label>
                  <input
                    id="bulkSignatureName"
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:outline-none"
                    placeholder="Ihr Team vom Posaunenwerk Rheinland"
                    value={bulkSignatureName}
                    onChange={(e) => setBulkSignatureName(e.target.value)}
                  />
                  <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                    Steht auf jedem PDF dieser Ausstellung unter der
                    Unterschrift. Leer lassen, damit jede Rechnung ihren eigenen
                    Unterzeichner-Namen behält.
                  </p>
                </div>
              </div>

              <label className="mt-4 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={notifyRegistrants}
                  onChange={(e) => setNotifyRegistrants(e.target.checked)}
                  className="text-primary focus:ring-primary mt-0.5 h-4 w-4 rounded border-gray-300"
                />
                <span className="dark:text-dark-text text-sm text-gray-700">
                  Anmelder:innen benachrichtigen
                  <span className="dark:text-dark-muted block text-xs text-gray-500">
                    Erzeugt je eine Mitteilung im Konto; die Rechnung erscheint
                    unter „Meine Anmeldungen“ zum Download.
                  </span>
                </span>
              </label>
              <label className="dark:border-dark-border mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3">
                <input
                  type="checkbox"
                  checked={reviewedConfirmed}
                  onChange={(e) => setReviewedConfirmed(e.target.checked)}
                  className="text-primary focus:ring-primary mt-0.5 h-4 w-4 rounded border-gray-300"
                />
                <span className="dark:text-dark-text text-sm font-medium text-gray-700">
                  Ich habe alle Entwürfe geprüft und es gibt keine Fehler in den
                  Rechnungen.
                </span>
              </label>
            </ScrollableModalBody>
            <ScrollableModalFooter>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setFinalizeOpen(false);
                    resetFinalizeForm();
                  }}
                  disabled={publishAllDrafts.isPending}
                  className="dark:border-dark-border dark:text-dark-text flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={() =>
                    publishAllDrafts.mutate({
                      courseId,
                      notifyRegistrant: notifyRegistrants,
                      dueDate: bulkDueDate ? new Date(bulkDueDate) : undefined,
                      signatureBase64: bulkSignatureBase64 ?? undefined,
                      signatureName: bulkSignatureName.trim()
                        ? bulkSignatureName
                        : undefined,
                    })
                  }
                  disabled={!reviewedConfirmed || publishAllDrafts.isPending}
                  className="bg-primary hover:bg-primary/90 flex-1 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {publishAllDrafts.isPending
                    ? "Stelle aus…"
                    : "Alle ausstellen"}
                </button>
              </div>
            </ScrollableModalFooter>
          </ScrollableModalCard>
        </ScrollableModal>
      )}
    </DashboardPage>
  );
}
