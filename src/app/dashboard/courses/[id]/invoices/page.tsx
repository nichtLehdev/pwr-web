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
  DOWN_PAYMENT_LINE_DESCRIPTION,
  formatDate,
  formatEuro,
} from "@/lib/invoice-document";
import { downPaymentCredit } from "@/lib/course-down-payment";
import { DownPaymentBadge } from "@/app/_components/dashboard/down-payment-panel";
import { downloadResponseAsFile } from "@/lib/download-file";
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

/**
 * Anzahlung als eingegangen verbucht, auf der Rechnung aber nicht abgezogen —
 * etwa weil der Entwurf vor dem Zahlungseingang angelegt wurde.
 */
function lacksDownPaymentCredit(invoice: CourseInvoice): boolean {
  if (invoice.status === InvoiceStatus.CANCELLED || !invoice.registration) {
    return false;
  }
  if (downPaymentCredit(invoice.registration) <= 0) return false;
  const items = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
  return !items.some(
    (item) =>
      (item as { description?: unknown } | null)?.description ===
      DOWN_PAYMENT_LINE_DESCRIPTION,
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
  const [exporting, setExporting] = useState(false);
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
                  className="dark:text-night-text text-ink font-medium hover:underline"
                >
                  {row.original.invoiceNumber ?? "Entwurf"}
                </Link>
                {row.original.replaces?.invoiceNumber && (
                  <span className="dark:text-night-muted text-dark block text-xs">
                    ersetzt {row.original.replaces.invoiceNumber}
                  </span>
                )}
                {row.original.replacedBy?.invoiceNumber && (
                  <span className="dark:text-night-muted text-dark block text-xs">
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
                <span className="dark:text-night-muted text-dark block text-xs">
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
              <span className="dark:text-night-muted text-dark">
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
          cell: ({ row, getValue }) => (
            <>
              {formatEuro(getValue())}
              {lacksDownPaymentCredit(row.original) && (
                <span className="mt-0.5 block text-xs font-medium whitespace-nowrap text-amber-600 dark:text-amber-400">
                  Anzahlung nicht abgezogen
                </span>
              )}
            </>
          ),
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

  const handleExportXlsx = async () => {
    setExporting(true);
    try {
      const response = await fetch(
        `/api/courses/${courseId}/exports/invoices`,
        {
          method: "GET",
        },
      );
      if (!response.ok) {
        throw new Error(String(response.status));
      }
      await downloadResponseAsFile(response, "rechnungen.xlsx");
    } catch {
      toast.error("Die Rechnungsübersicht konnte nicht erstellt werden.");
    } finally {
      setExporting(false);
    }
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
      <div className="dark:bg-night bg-paper flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <DashboardPage title="Rechnungen" description="Keine Berechtigung">
        <div className="border-rule dark:border-night-rule border p-8 text-center">
          <p className="dark:text-night-muted text-dark">
            Du hast keine Berechtigung, für diesen Kurs Rechnungen zu erstellen.
            Das dürfen Kurs-Organisator:innen sowie Landesposaunenwarte und
            Administratoren.
          </p>
          <Link
            href={`/dashboard/courses/${courseId}`}
            className="link-ink mt-4 inline-block"
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
            className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised hidden min-h-11 items-center gap-2 border px-4 py-2 text-sm font-medium sm:inline-flex"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Zurück zum Kurs
          </Link>
          <button
            type="button"
            onClick={handleExportXlsx}
            disabled={exportableInvoices.length === 0 || exporting}
            className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 items-center gap-2 border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            <DownloadIcon className="h-4 w-4" />
            {exporting ? "Wird erstellt …" : "Excel exportieren"}
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
              className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 items-center gap-2 border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
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
            className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlusIcon className="h-4 w-4" />
            Rechnung erstellen
          </button>
        </>
      }
    >
      {!access?.invoicingEnabled && (
        <div className="mb-6 border-2 border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/50 dark:bg-yellow-900/20">
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
            className="border-rule dark:border-night-rule border p-4"
          >
            <p className="dark:text-night-muted text-dark text-xs">
              {tile.label}
            </p>
            <p className="dark:text-night-text text-ink mt-1 text-2xl font-semibold">
              {tile.value}
            </p>
          </div>
        ))}
      </div>

      {/* Registration picker */}
      {showPicker && (
        <div className="border-rule dark:border-night-rule mb-6 border p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="dark:text-night-text text-ink text-lg font-semibold">
                Anmeldungen auswählen
              </h2>
              <p className="dark:text-night-muted text-dark text-sm">
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
                className="border-rule dark:border-night-rule text-ink dark:text-night-text min-h-9 border px-3 py-1.5 text-sm"
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
                className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink min-h-9 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              >
                {createDraftsBulk.isPending
                  ? "Erstelle…"
                  : `${selected.size} Entwürfe erstellen`}
              </button>
            </div>
          </div>

          {registrations === undefined ? (
            <p className="dark:text-night-muted text-dark text-sm">Lade…</p>
          ) : registrations.length === 0 ? (
            <p className="dark:text-night-muted text-dark text-sm">
              Für diesen Kurs gibt es noch keine Anmeldungen.
            </p>
          ) : (
            <ul className="dark:divide-night-rule divide-rule divide-y">
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
                      className="text-primary border-rule dark:border-night-text h-4 w-4 disabled:opacity-40"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="dark:text-night-text text-ink truncate text-sm font-medium">
                        {registration.registrantFirstName}{" "}
                        {registration.registrantLastName}
                      </p>
                      <p className="dark:text-night-muted text-dark truncate text-xs">
                        {registration.participants.length} Teilnehmer:in
                        {registration.participants.length === 1
                          ? ""
                          : "nen"} · {formatEuro(registration.totalPrice)}
                      </p>
                      <DownPaymentBadge
                        registration={registration}
                        className="mt-1"
                      />
                    </div>
                    {existing ? (
                      <span className="dark:text-night-muted text-dark text-xs">
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
                        className="text-primary-ink dark:text-primary text-sm font-medium hover:underline disabled:opacity-50"
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
            <ReceiptTextIcon className="text-dark dark:text-night-muted mx-auto h-10 w-10" />
            <p className="dark:text-night-text text-ink mt-3 font-medium">
              Noch keine Rechnungen
            </p>
            <p className="dark:text-night-muted text-dark mt-1 text-sm">
              Erstelle den ersten Entwurf aus einer Anmeldung.
            </p>
          </>
        }
      />

      {summary.published.length > 0 && (
        <div className="border-rule dark:border-night-rule mt-6 flex flex-wrap items-center justify-between gap-3 border p-4">
          <div className="flex items-center gap-2">
            <FileTextIcon className="text-primary-ink dark:text-primary h-5 w-5" />
            <p className="dark:text-night-text text-ink text-sm">
              {summary.published.length} ausgestellte Rechnung
              {summary.published.length === 1 ? "" : "en"} können den
              Anmelder:innen per Mail zugeschickt werden.
            </p>
          </div>
          <Link
            href={`/dashboard/courses/${courseId}/mail`}
            className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-9 items-center gap-2 border px-3 py-1.5 text-sm font-medium"
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
              <h2 className="dark:text-night-text text-ink text-xl font-semibold">
                Alle Entwürfe ausstellen
              </h2>
              <p className="dark:text-night-muted text-dark mt-2 text-sm">
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
                  className="dark:text-night-text text-ink mb-1 block text-sm font-medium"
                  htmlFor="bulkDueDate"
                >
                  Gemeinsames Zahlungsziel (optional)
                </label>
                <input
                  id="bulkDueDate"
                  type="date"
                  value={bulkDueDate}
                  onChange={(e) => setBulkDueDate(e.target.value)}
                  className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper w-full border px-3 py-2 text-sm"
                />
                <p className="dark:text-night-muted text-dark mt-1 text-xs">
                  Leer lassen, damit jede Rechnung ihr eigenes Zahlungsziel
                  behält.
                </p>
              </div>

              <div className="dark:border-night-rule border-rule mt-4 border p-4">
                <p className="dark:text-night-text text-ink text-sm font-medium">
                  Unterschrift (optional)
                </p>
                <p className="dark:text-night-muted text-dark mt-0.5 text-xs">
                  Wird identisch in jedes PDF dieser Ausstellung eingebettet und
                  nicht gespeichert.
                </p>
                {bulkSignatureMode === "none" && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBulkSignatureMode("upload")}
                      className="dark:border-night-rule dark:hover:bg-night-raised border-rule flex flex-1 flex-col items-center gap-1.5 border-2 border-dashed px-4 py-3 transition-colors hover:border-blue-400 hover:bg-blue-50"
                    >
                      <UploadIcon className="text-dark dark:text-night-muted h-5 w-5" />
                      <span className="dark:text-night-text text-dark text-sm">
                        Hochladen
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkSignatureMode("draw")}
                      className="dark:border-night-rule dark:hover:bg-night-raised border-rule flex flex-1 flex-col items-center gap-1.5 border-2 border-dashed px-4 py-3 transition-colors hover:border-blue-400 hover:bg-blue-50"
                    >
                      <PencilIcon className="text-dark dark:text-night-muted h-5 w-5" />
                      <span className="dark:text-night-text text-dark text-sm">
                        Zeichnen
                      </span>
                    </button>
                  </div>
                )}

                {bulkSignatureMode === "upload" &&
                  (bulkSignatureBase64 ? (
                    <div className="dark:border-night-rule dark:bg-night-raised border-rule bg-rule/25 mt-2 flex items-center gap-3 border p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={bulkSignatureBase64}
                        alt="Vorschau der Unterschrift"
                        className="h-10 max-w-[120px] object-contain"
                      />
                      <span className="dark:text-night-text text-dark flex-1 truncate text-sm">
                        {bulkSignatureFileName}
                      </span>
                      <button
                        type="button"
                        onClick={resetBulkSignature}
                        aria-label="Unterschrift entfernen"
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => bulkSignatureInputRef.current?.click()}
                        className="dark:border-night-rule border-rule flex w-full flex-col items-center gap-1 border-2 border-dashed px-4 py-5 transition-colors hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10"
                      >
                        <UploadIcon className="text-dark dark:text-night-muted h-6 w-6" />
                        <span className="dark:text-night-text text-dark text-sm">
                          Bild auswählen
                        </span>
                        <span className="text-dark dark:text-night-muted text-xs">
                          PNG oder JPG, max. 2 MB
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={resetBulkSignature}
                        className="dark:text-night-muted text-dark hover:text-ink dark:hover:text-night-text mt-2 text-sm"
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
                      className="dark:text-night-muted text-dark hover:text-ink dark:hover:text-night-text mt-2 text-sm"
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

                <div className="dark:border-night-rule border-rule mt-3 border-t pt-3">
                  <label
                    className="dark:text-night-text text-ink block text-sm font-medium"
                    htmlFor="bulkSignatureName"
                  >
                    Name des Unterzeichners (optional)
                  </label>
                  <input
                    id="bulkSignatureName"
                    className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper text-ink mt-1 w-full border px-3 py-2 text-sm"
                    placeholder="Ihr Team vom Posaunenwerk Rheinland"
                    value={bulkSignatureName}
                    onChange={(e) => setBulkSignatureName(e.target.value)}
                  />
                  <p className="dark:text-night-muted text-dark mt-1 text-xs">
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
                  className="text-primary border-rule dark:border-night-text mt-0.5 h-4 w-4"
                />
                <span className="dark:text-night-text text-ink text-sm">
                  Anmelder:innen benachrichtigen
                  <span className="dark:text-night-muted text-dark block text-xs">
                    Erzeugt je eine Mitteilung im Konto; die Rechnung erscheint
                    unter „Meine Anmeldungen“ zum Download.
                  </span>
                </span>
              </label>
              <label className="dark:border-night-rule border-rule mt-4 flex cursor-pointer items-start gap-3 border p-3">
                <input
                  type="checkbox"
                  checked={reviewedConfirmed}
                  onChange={(e) => setReviewedConfirmed(e.target.checked)}
                  className="text-primary border-rule dark:border-night-text mt-0.5 h-4 w-4"
                />
                <span className="dark:text-night-text text-ink text-sm font-medium">
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
                  className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised min-h-11 flex-1 border px-4 py-2 text-sm font-medium disabled:opacity-50"
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
                  className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink min-h-11 flex-1 px-4 py-2 text-sm font-medium disabled:opacity-50"
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
