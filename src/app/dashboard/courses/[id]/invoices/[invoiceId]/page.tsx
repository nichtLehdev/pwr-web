"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import DashboardPage from "@/app/_components/dashboard/dashboard-page";
import { InvoiceStatusBadge } from "@/app/_components/dashboard/invoice-status-badge";
import { InvoicePaymentBadge } from "@/app/_components/dashboard/invoice-payment-badge";
import { InvoicePaymentDialog } from "@/app/_components/dashboard/invoice-payment-dialog";
import { SignatureCanvas } from "@/app/_components/dashboard/signature-canvas";
import { useToast } from "@/app/_components/ui/toast";
import { useBeforeUnload } from "@/lib/useBeforeUnload";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import { invoiceOpenAmount } from "@/lib/invoice-payment";
import {
  DOWN_PAYMENT_LINE_DESCRIPTION,
  formatDate,
  formatEuro,
  invoiceTotal,
  lineItemTotal,
  type InvoiceLineItem,
} from "@/lib/invoice-document";
import { downPaymentCredit } from "@/lib/course-down-payment";
import { InvoiceStatus } from "~/generated/prisma/enums";
import {
  ArrowLeftIcon,
  BanIcon,
  DownloadIcon,
  GripVerticalIcon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  SendIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";

type SignatureMode = "none" | "upload" | "draw";

/** Mirrors the signature cap in the publish input on the server. */
const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

/** A line item plus a stable key, so React keeps inputs focused while editing. */
type EditableLineItem = InvoiceLineItem & { key: string };

let keyCounter = 0;
const nextKey = () => `line-${keyCounter++}`;

const emptyLine = (): EditableLineItem => ({
  key: nextKey(),
  description: "",
  detail: "",
  quantity: 1,
  unitPrice: 0,
});

/** `<input type="date">` wants YYYY-MM-DD in local time, not an ISO instant. */
function toDateInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export default function InvoiceEditorPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const courseId = params.id as string;
  const invoiceId = params.invoiceId as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const utils = api.useUtils();

  const {
    data: invoice,
    isLoading,
    error,
  } = api.invoices.getById.useQuery(
    { id: invoiceId },
    { enabled: !!invoiceId && !!session?.user, retry: false },
  );

  const [company, setCompany] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [street, setStreet] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [lines, setLines] = useState<EditableLineItem[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [introText, setIntroText] = useState("");
  const [closingText, setClosingText] = useState("");
  const [signatureName, setSignatureName] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  const [publishOpen, setPublishOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [notifyRegistrant, setNotifyRegistrant] = useState(true);
  // Only ever held in memory and handed to the publish call — the signature is
  // baked into the PDF, never stored as a reusable signature on its own.
  const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
  const [signatureMode, setSignatureMode] = useState<SignatureMode>("none");
  const [signatureFileName, setSignatureFileName] = useState<string | null>(
    null,
  );
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const canManage = invoice?.canManage ?? false;
  const isEditable = invoice?.status === InvoiceStatus.DRAFT && canManage;

  // Eine Anzahlung, die erst nach dem Anlegen des Entwurfs verbucht wurde,
  // fehlt in dessen Positionen: der Entwurf ist eine Kopie der Anmeldung, kein
  // Spiegel. Stornierte Dokumente fordern nichts mehr.
  const receivedDownPayment = invoice?.registration
    ? downPaymentCredit(invoice.registration)
    : 0;
  const missingDownPaymentCredit =
    receivedDownPayment > 0 &&
    invoice?.status !== InvoiceStatus.CANCELLED &&
    !lines.some((line) => line.description === DOWN_PAYMENT_LINE_DESCRIPTION);

  // Load the record into the form once; later refetches must not stomp on
  // edits the organizer is in the middle of making.
  useEffect(() => {
    if (!invoice) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing form state from async query data
    setCompany(invoice.recipientCompany ?? "");
    setFirstName(invoice.recipientFirstName ?? "");
    setLastName(invoice.recipientLastName ?? "");
    setStreet(invoice.recipientStreet ?? "");
    setZipCode(invoice.recipientZipCode ?? "");
    setCity(invoice.recipientCity ?? "");
    setEmail(invoice.recipientEmail ?? "");
    setDueDate(toDateInputValue(invoice.dueDate));
    setIntroText(invoice.introText ?? "");
    setClosingText(invoice.closingText ?? "");
    setSignatureName(invoice.signatureName ?? "");
    setInternalNote(invoice.internalNote ?? "");
    setLines(
      (Array.isArray(invoice.lineItems) ? invoice.lineItems : []).map((raw) => {
        const item = raw as Partial<InvoiceLineItem>;
        return {
          key: nextKey(),
          description: item.description ?? "",
          detail: item.detail ?? "",
          quantity: Number(item.quantity ?? 1),
          unitPrice: Number(item.unitPrice ?? 0),
        };
      }),
    );
    setIsDirty(false);
  }, [invoice]);

  useBeforeUnload(isDirty && isEditable);

  const total = useMemo(() => invoiceTotal(lines), [lines]);

  const updateInvoice = api.invoices.update.useMutation({
    onSuccess: () => {
      setIsDirty(false);
      void utils.invoices.getById.invalidate({ id: invoiceId });
      void utils.invoices.listForCourse.invalidate({ courseId });
      toast.success("Entwurf gespeichert");
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  const publishInvoice = api.invoices.publish.useMutation({
    onSuccess: (published) => {
      setPublishOpen(false);
      resetSignature();
      void utils.invoices.getById.invalidate({ id: invoiceId });
      void utils.invoices.listForCourse.invalidate({ courseId });
      toast.success(`Rechnung ${published.invoiceNumber} ausgestellt`);
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  const cancelAndReplace = api.invoices.cancelAndReplace.useMutation({
    onSuccess: (successor) => {
      setCancelOpen(false);
      void utils.invoices.listForCourse.invalidate({ courseId });
      toast.success("Rechnung storniert — Nachfolgeentwurf angelegt");
      router.push(`/dashboard/courses/${courseId}/invoices/${successor.id}`);
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  const cancelInvoice = api.invoices.cancel.useMutation({
    onSuccess: () => {
      setCancelOpen(false);
      void utils.invoices.getById.invalidate({ id: invoiceId });
      void utils.invoices.listForCourse.invalidate({ courseId });
      toast.success("Rechnung storniert");
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  /** Der Normalfall: voller Betrag, heute. Abweichungen laufen über den Dialog. */
  const markPaid = api.invoices.markPaid.useMutation({
    onSuccess: () => {
      void utils.invoices.getById.invalidate({ id: invoiceId });
      void utils.invoices.listForCourse.invalidate({ courseId });
      toast.success("Zahlung verbucht");
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  const markUnpaid = api.invoices.markUnpaid.useMutation({
    onSuccess: () => {
      void utils.invoices.getById.invalidate({ id: invoiceId });
      void utils.invoices.listForCourse.invalidate({ courseId });
      toast.success("Zahlung zurückgenommen");
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  const deleteDraft = api.invoices.deleteDraft.useMutation({
    onSuccess: () => {
      void utils.invoices.listForCourse.invalidate({ courseId });
      toast.success("Entwurf gelöscht");
      router.push(`/dashboard/courses/${courseId}/invoices`);
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  const mutateLines = (
    updater: (current: EditableLineItem[]) => EditableLineItem[],
  ) => {
    setLines(updater);
    setIsDirty(true);
  };

  const patchLine = (key: string, patch: Partial<EditableLineItem>) =>
    mutateLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );

  const moveLine = (index: number, direction: -1 | 1) =>
    mutateLines((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      if (moved) next.splice(target, 0, moved);
      return next;
    });

  const resetSignature = () => {
    setSignatureBase64(null);
    setSignatureFileName(null);
    setSignatureMode("none");
    if (signatureInputRef.current) signatureInputRef.current.value = "";
  };

  const handleSignatureUpload = (
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
      setSignatureBase64(reader.result as string);
      setSignatureFileName(file.name);
    };
    reader.onerror = () =>
      toast.error("Die Datei konnte nicht gelesen werden.");
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (lines.length === 0) {
      toast.error("Bitte mindestens eine Position anlegen.");
      return;
    }
    if (lines.some((line) => !line.description.trim())) {
      toast.error("Jede Position braucht eine Bezeichnung.");
      return;
    }
    updateInvoice.mutate({
      id: invoiceId,
      recipientCompany: company,
      recipientFirstName: firstName,
      recipientLastName: lastName,
      recipientStreet: street,
      recipientZipCode: zipCode,
      recipientCity: city,
      recipientEmail: email,
      lineItems: lines.map((line) => ({
        description: line.description.trim(),
        detail: line.detail?.trim() ?? null,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })),
      dueDate: dueDate ? new Date(dueDate) : null,
      introText,
      closingText,
      signatureName,
      internalNote,
    });
  };

  if (sessionLoading || isLoading) {
    return (
      <div className="dark:bg-night bg-paper flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <DashboardPage title="Rechnung">
        <div className="border-rule dark:border-night-rule border p-8 text-center">
          <p className="dark:text-night-muted text-dark">
            {error?.message ?? "Rechnung nicht gefunden."}
          </p>
          <Link
            href={`/dashboard/courses/${courseId}/invoices`}
            className="link-ink mt-4 inline-block"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </DashboardPage>
    );
  }

  const inputClass =
    "border-ink dark:border-night-text dark:bg-night dark:text-night-text w-full border bg-paper px-3 py-2 text-sm disabled:bg-rule/40 dark:disabled:bg-night-raised";
  const labelClass =
    "dark:text-night-text mb-1 block text-sm font-medium text-ink";

  return (
    <DashboardPage
      title={invoice.invoiceNumber ?? "Rechnungsentwurf"}
      description={invoice.course.title}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Kurse", href: "/dashboard/courses" },
        {
          label: invoice.course.title,
          href: `/dashboard/courses/${courseId}`,
        },
        {
          label: "Rechnungen",
          href: `/dashboard/courses/${courseId}/invoices`,
        },
        { label: invoice.invoiceNumber ?? "Entwurf" },
      ]}
      maxWidth="4xl"
      actions={
        <Link
          href={`/dashboard/courses/${courseId}/invoices`}
          className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 items-center gap-2 border px-4 py-2 text-sm font-medium"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Übersicht
        </Link>
      }
    >
      {/* Status strip */}
      <div className="border-rule dark:border-night-rule mb-6 flex flex-wrap items-center justify-between gap-4 border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <InvoiceStatusBadge status={invoice.status} />
          <InvoicePaymentBadge invoice={invoice} />
          {invoice.paidAt && (
            <span className="dark:text-night-muted text-dark text-sm">
              verbucht am {formatDate(invoice.paidAt)}
              {invoice.paidAmount !== null &&
                ` · ${formatEuro(invoice.paidAmount)}`}
              {invoiceOpenAmount(invoice) > 0 &&
                ` · offen ${formatEuro(invoiceOpenAmount(invoice))}`}
            </span>
          )}
          {invoice.invoiceDate && (
            <span className="dark:text-night-muted text-dark text-sm">
              Rechnungsdatum {formatDate(invoice.invoiceDate)}
            </span>
          )}
          {invoice.replaces?.invoiceNumber && (
            <span className="dark:text-night-muted text-dark text-sm">
              ersetzt {invoice.replaces.invoiceNumber}
            </span>
          )}
          {invoice.replacedBy?.invoiceNumber && (
            <Link
              href={`/dashboard/courses/${courseId}/invoices/${invoice.replacedBy.id}`}
              className="text-primary-ink dark:text-primary text-sm hover:underline"
            >
              ersetzt durch {invoice.replacedBy.invoiceNumber}
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-9 items-center gap-2 border px-3 py-1.5 text-sm font-medium"
          >
            <DownloadIcon className="h-4 w-4" />
            {invoice.pdfPath ? "PDF" : "Vorschau"}
          </a>
          {isEditable && (
            <>
              <button
                type="button"
                onClick={() => deleteDraft.mutate({ id: invoiceId })}
                disabled={deleteDraft.isPending}
                className="inline-flex min-h-9 items-center gap-2 border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
              >
                <Trash2Icon className="h-4 w-4" />
                Entwurf löschen
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={updateInvoice.isPending}
                className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-9 items-center gap-2 border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              >
                <SaveIcon className="h-4 w-4" />
                {updateInvoice.isPending ? "Speichere…" : "Speichern"}
              </button>
              <button
                type="button"
                onClick={() => setPublishOpen(true)}
                disabled={isDirty}
                title={
                  isDirty ? "Bitte zuerst die Änderungen speichern." : undefined
                }
                className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink inline-flex min-h-9 items-center gap-2 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              >
                <SendIcon className="h-4 w-4" />
                Ausstellen
              </button>
            </>
          )}
          {invoice.status === InvoiceStatus.PUBLISHED && canManage && (
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              className="inline-flex min-h-9 items-center gap-2 border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
            >
              <BanIcon className="h-4 w-4" />
              Stornieren
            </button>
          )}
          {invoice.status === InvoiceStatus.PUBLISHED &&
            invoice.canBookPayments &&
            (invoice.paidAt ? (
              <button
                type="button"
                onClick={() => markUnpaid.mutate({ id: invoiceId })}
                disabled={markUnpaid.isPending}
                className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-9 items-center gap-2 border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              >
                {markUnpaid.isPending
                  ? "Nehme zurück…"
                  : "Zahlung zurücknehmen"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setPaymentOpen(true)}
                  title="Teilzahlung, abweichende Wertstellung oder Notiz erfassen"
                  className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-9 items-center gap-2 border px-3 py-1.5 text-sm font-medium"
                >
                  <SlidersHorizontalIcon className="h-4 w-4" />
                  Abweichend verbuchen…
                </button>
                <button
                  type="button"
                  onClick={() => markPaid.mutate({ id: invoiceId })}
                  disabled={markPaid.isPending}
                  className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink inline-flex min-h-9 items-center gap-2 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                >
                  {markPaid.isPending ? "Verbuche…" : "Als bezahlt markieren"}
                </button>
              </>
            ))}
        </div>
      </div>

      {invoice.status === InvoiceStatus.DRAFT && !canManage && (
        <div className="dark:border-night-rule dark:bg-night-raised border-rule bg-rule/25 mb-6 border p-4">
          <p className="dark:text-night-text text-ink text-sm font-medium">
            Nur-Lese-Ansicht
          </p>
          <p className="dark:text-night-muted text-dark mt-1 text-xs">
            Du kannst dieses Rechnungsarchiv einsehen, aber Rechnungen dieses
            Kurses nur als Kurs-Organisator:in bearbeiten.
          </p>
        </div>
      )}

      {invoice.status !== InvoiceStatus.DRAFT && (
        <div className="dark:border-night-rule dark:bg-night-raised border-rule bg-rule/25 mb-6 border p-4">
          <p className="dark:text-night-text text-ink text-sm font-medium">
            {invoice.status === InvoiceStatus.PUBLISHED
              ? "Diese Rechnung ist ausgestellt und kann nicht mehr geändert werden."
              : "Diese Rechnung wurde storniert."}
          </p>
          <p className="dark:text-night-muted text-dark mt-1 text-xs">
            {invoice.status === InvoiceStatus.PUBLISHED
              ? "Für Korrekturen stornierst du sie und stellst eine Nachfolgerechnung aus — die ursprüngliche bleibt im Archiv erhalten."
              : (invoice.cancelReason ?? "")}
          </p>
          {/* Der Name wird beim Ausstellen erfasst und ist danach nur noch hier
              und auf dem PDF zu sehen — das Formular ist ab dann gesperrt. */}
          {invoice.signatureName && (
            <p className="dark:text-night-muted text-dark mt-2 text-xs">
              Unterzeichnet mit:{" "}
              <span className="dark:text-night-text text-ink font-medium">
                {invoice.signatureName}
              </span>
            </p>
          )}
        </div>
      )}

      <fieldset disabled={!isEditable} className="space-y-6">
        {/* Recipient */}
        <section className="border-rule dark:border-night-rule border p-6">
          <h2 className="dark:text-night-text text-ink mb-4 text-lg font-semibold">
            Rechnungsempfänger
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="company">
                Firma / Einrichtung (optional)
              </label>
              <input
                id="company"
                className={inputClass}
                value={company}
                onChange={(e) => {
                  setCompany(e.target.value);
                  setIsDirty(true);
                }}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="firstName">
                Vorname
              </label>
              <input
                id="firstName"
                className={inputClass}
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setIsDirty(true);
                }}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="lastName">
                Nachname
              </label>
              <input
                id="lastName"
                className={inputClass}
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  setIsDirty(true);
                }}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="street">
                Straße und Hausnummer
              </label>
              <input
                id="street"
                className={inputClass}
                value={street}
                onChange={(e) => {
                  setStreet(e.target.value);
                  setIsDirty(true);
                }}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="zipCode">
                PLZ
              </label>
              <input
                id="zipCode"
                className={inputClass}
                value={zipCode}
                onChange={(e) => {
                  setZipCode(e.target.value);
                  setIsDirty(true);
                }}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="city">
                Ort
              </label>
              <input
                id="city"
                className={inputClass}
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setIsDirty(true);
                }}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="email">
                E-Mail
              </label>
              <input
                id="email"
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setIsDirty(true);
                }}
              />
            </div>
          </div>
        </section>

        {/* Line items */}
        <section className="border-rule dark:border-night-rule border p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="dark:text-night-text text-ink text-lg font-semibold">
                Positionen
              </h2>
              <p className="dark:text-night-muted text-dark text-sm">
                Negative Einzelpreise sind erlaubt — so bildest du Rabatte,
                Zuschüsse oder eine bereits geleistete Anzahlung ab.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                mutateLines((current) => [...current, emptyLine()])
              }
              className="text-primary-ink dark:text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
            >
              <PlusIcon className="h-4 w-4" />
              Position hinzufügen
            </button>
          </div>

          {missingDownPaymentCredit && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Für diese Anmeldung ist eine Anzahlung von{" "}
                {formatEuro(receivedDownPayment)} eingegangen, die hier noch
                nicht abgezogen wird.
                {!isEditable &&
                  invoice?.status === InvoiceStatus.PUBLISHED &&
                  " Zum Korrigieren die Rechnung stornieren und neu ausstellen."}
              </p>
              {isEditable && (
                <button
                  type="button"
                  onClick={() =>
                    mutateLines((current) => [
                      ...current,
                      {
                        key: nextKey(),
                        description: DOWN_PAYMENT_LINE_DESCRIPTION,
                        detail: "",
                        quantity: 1,
                        unitPrice: -receivedDownPayment,
                      },
                    ])
                  }
                  className="text-primary-ink dark:text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                >
                  <PlusIcon className="h-4 w-4" />
                  Als Position abziehen
                </button>
              )}
            </div>
          )}

          {lines.length === 0 ? (
            <p className="dark:text-night-muted text-dark text-sm">
              Noch keine Positionen.
            </p>
          ) : (
            <div className="space-y-3">
              {lines.map((line, index) => (
                <div
                  key={line.key}
                  className="dark:border-night-rule border-rule border p-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col pt-2">
                      <button
                        type="button"
                        onClick={() => moveLine(index, -1)}
                        disabled={index === 0}
                        aria-label="Position nach oben"
                        className="text-dark dark:text-night-muted hover:text-ink dark:hover:text-night-text disabled:opacity-30"
                      >
                        <GripVerticalIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid flex-1 gap-3 sm:grid-cols-12">
                      <div className="sm:col-span-6">
                        <label className="sr-only" htmlFor={`desc-${line.key}`}>
                          Bezeichnung
                        </label>
                        <input
                          id={`desc-${line.key}`}
                          className={inputClass}
                          placeholder="Bezeichnung"
                          value={line.description}
                          onChange={(e) =>
                            patchLine(line.key, { description: e.target.value })
                          }
                        />
                        <input
                          className={`${inputClass} mt-2 text-xs`}
                          placeholder="Zusatz (optional), z.B. Preiskategorie"
                          value={line.detail ?? ""}
                          onChange={(e) =>
                            patchLine(line.key, { detail: e.target.value })
                          }
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="sr-only" htmlFor={`qty-${line.key}`}>
                          Menge
                        </label>
                        <input
                          id={`qty-${line.key}`}
                          type="number"
                          step="1"
                          min="0"
                          className={inputClass}
                          placeholder="Menge"
                          value={line.quantity}
                          onChange={(e) =>
                            patchLine(line.key, {
                              quantity: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label
                          className="sr-only"
                          htmlFor={`price-${line.key}`}
                        >
                          Einzelpreis
                        </label>
                        <input
                          id={`price-${line.key}`}
                          type="number"
                          step="0.01"
                          className={inputClass}
                          placeholder="Einzelpreis"
                          value={line.unitPrice}
                          onChange={(e) =>
                            patchLine(line.key, {
                              unitPrice: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="flex items-start justify-between gap-2 sm:col-span-1 sm:justify-end">
                        <span className="dark:text-night-text text-ink pt-2 text-sm font-medium whitespace-nowrap sm:hidden">
                          {formatEuro(lineItemTotal(line))}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            mutateLines((current) =>
                              current.filter((item) => item.key !== line.key),
                            )
                          }
                          aria-label="Position entfernen"
                          className="pt-2 text-red-500 hover:text-red-700"
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="dark:text-night-muted text-dark mt-2 hidden text-right text-sm sm:block">
                    Zeilensumme:{" "}
                    <span className="dark:text-night-text text-ink font-medium">
                      {formatEuro(lineItemTotal(line))}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="dark:border-night-rule border-rule mt-4 flex items-center justify-between border-t pt-4">
            <span className="dark:text-night-text text-ink text-base font-semibold">
              Gesamtbetrag
            </span>
            <span className="dark:text-night-text text-ink text-xl font-bold">
              {formatEuro(total)}
            </span>
          </div>
        </section>

        {/* Texts and dates */}
        <section className="border-rule dark:border-night-rule border p-6">
          <h2 className="dark:text-night-text text-ink mb-4 text-lg font-semibold">
            Zahlungsziel & Texte
          </h2>
          <div className="space-y-4">
            <div className="sm:w-60">
              <label className={labelClass} htmlFor="dueDate">
                Zahlungsziel
              </label>
              <input
                id="dueDate"
                type="date"
                className={inputClass}
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  setIsDirty(true);
                }}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="introText">
                Anschreiben über den Positionen (optional)
              </label>
              <textarea
                id="introText"
                rows={3}
                className={inputClass}
                value={introText}
                onChange={(e) => {
                  setIntroText(e.target.value);
                  setIsDirty(true);
                }}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="closingText">
                Schlusstext (optional)
              </label>
              <textarea
                id="closingText"
                rows={2}
                className={inputClass}
                placeholder="Wir freuen uns auf eine gemeinsame Zeit!"
                value={closingText}
                onChange={(e) => {
                  setClosingText(e.target.value);
                  setIsDirty(true);
                }}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="internalNote">
                Interne Notiz (erscheint nicht auf der Rechnung)
              </label>
              <textarea
                id="internalNote"
                rows={2}
                className={inputClass}
                value={internalNote}
                onChange={(e) => {
                  setInternalNote(e.target.value);
                  setIsDirty(true);
                }}
              />
            </div>
          </div>
        </section>
      </fieldset>

      {/* Publish confirmation */}
      {publishOpen && (
        <ScrollableModal>
          <ScrollableModalCard maxW="md">
            <ScrollableModalBody>
              <h2 className="dark:text-night-text text-ink text-xl font-semibold">
                Rechnung ausstellen
              </h2>
              <p className="dark:text-night-muted text-dark mt-2 text-sm">
                Die Rechnung bekommt jetzt eine fortlaufende Nummer, das PDF
                wird archiviert und ist danach unveränderlich. Korrekturen sind
                nur noch per Storno und Nachfolgerechnung möglich.
              </p>
              <dl className="dark:border-night-rule border-rule mt-4 space-y-2 border p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="dark:text-night-muted text-dark">Empfänger</dt>
                  <dd className="dark:text-night-text text-ink text-right font-medium">
                    {[company, `${firstName} ${lastName}`.trim()]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="dark:text-night-muted text-dark">
                    Positionen
                  </dt>
                  <dd className="dark:text-night-text text-ink font-medium">
                    {lines.length}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="dark:text-night-muted text-dark">
                    Gesamtbetrag
                  </dt>
                  <dd className="dark:text-night-text text-ink font-medium">
                    {formatEuro(total)}
                  </dd>
                </div>
              </dl>
              <div className="dark:border-night-rule border-rule mt-4 border p-4">
                <p className="dark:text-night-text text-ink text-sm font-medium">
                  Unterschrift (optional)
                </p>
                <p className="dark:text-night-muted text-dark mt-0.5 text-xs">
                  Das Bild wird nur in dieses PDF eingebettet und nicht
                  gespeichert.
                </p>
                {signatureMode === "none" && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSignatureMode("upload")}
                      className="dark:border-night-rule dark:hover:bg-night-raised border-rule flex flex-1 flex-col items-center gap-1.5 border-2 border-dashed px-4 py-3 transition-colors hover:border-blue-400 hover:bg-blue-50"
                    >
                      <UploadIcon className="text-dark dark:text-night-muted h-5 w-5" />
                      <span className="dark:text-night-text text-dark text-sm">
                        Hochladen
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureMode("draw")}
                      className="dark:border-night-rule dark:hover:bg-night-raised border-rule flex flex-1 flex-col items-center gap-1.5 border-2 border-dashed px-4 py-3 transition-colors hover:border-blue-400 hover:bg-blue-50"
                    >
                      <PencilIcon className="text-dark dark:text-night-muted h-5 w-5" />
                      <span className="dark:text-night-text text-dark text-sm">
                        Zeichnen
                      </span>
                    </button>
                  </div>
                )}

                {signatureMode === "upload" &&
                  (signatureBase64 ? (
                    <div className="dark:border-night-rule dark:bg-night-raised border-rule bg-rule/25 mt-2 flex items-center gap-3 border p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={signatureBase64}
                        alt="Vorschau der Unterschrift"
                        className="h-10 max-w-[120px] object-contain"
                      />
                      <span className="dark:text-night-text text-dark flex-1 truncate text-sm">
                        {signatureFileName}
                      </span>
                      <button
                        type="button"
                        onClick={resetSignature}
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
                        onClick={() => signatureInputRef.current?.click()}
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
                        onClick={resetSignature}
                        className="dark:text-night-muted text-dark hover:text-ink dark:hover:text-night-text mt-2 text-sm"
                      >
                        ← Ohne Unterschrift
                      </button>
                    </div>
                  ))}

                {signatureMode === "draw" && (
                  <div className="mt-2">
                    <SignatureCanvas onSignatureChange={setSignatureBase64} />
                    <button
                      type="button"
                      onClick={resetSignature}
                      className="dark:text-night-muted text-dark hover:text-ink dark:hover:text-night-text mt-2 text-sm"
                    >
                      ← Ohne Unterschrift
                    </button>
                  </div>
                )}

                <input
                  ref={signatureInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleSignatureUpload}
                  className="hidden"
                />

                <div className="dark:border-night-rule border-rule mt-3 border-t pt-3">
                  <label
                    className="dark:text-night-text text-ink block text-sm font-medium"
                    htmlFor="signatureName"
                  >
                    Name des Unterzeichners (optional)
                  </label>
                  <input
                    id="signatureName"
                    className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper text-ink mt-1 w-full border px-3 py-2 text-sm"
                    placeholder="Ihr Team vom Posaunenwerk Rheinland"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                  />
                  <p className="dark:text-night-muted text-dark mt-1 text-xs">
                    Steht auf dem PDF unter der Unterschrift. Leer lassen, um
                    mit „Ihr Team vom Posaunenwerk Rheinland“ zu zeichnen.
                  </p>
                </div>
              </div>
              <label className="mt-4 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={notifyRegistrant}
                  onChange={(e) => setNotifyRegistrant(e.target.checked)}
                  className="text-primary border-rule dark:border-night-text mt-0.5 h-4 w-4"
                />
                <span className="dark:text-night-text text-ink text-sm">
                  Anmelder:in benachrichtigen
                  <span className="dark:text-night-muted text-dark block text-xs">
                    Erzeugt eine Mitteilung im Konto; die Rechnung erscheint
                    unter „Meine Anmeldungen“ zum Download.
                  </span>
                </span>
              </label>
            </ScrollableModalBody>
            <ScrollableModalFooter>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPublishOpen(false);
                    resetSignature();
                  }}
                  disabled={publishInvoice.isPending}
                  className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised min-h-11 flex-1 border px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={() =>
                    publishInvoice.mutate({
                      id: invoiceId,
                      notifyRegistrant,
                      signatureBase64: signatureBase64 ?? undefined,
                      signatureName,
                    })
                  }
                  disabled={publishInvoice.isPending}
                  className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink min-h-11 flex-1 px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {publishInvoice.isPending ? "Stelle aus…" : "Ausstellen"}
                </button>
              </div>
            </ScrollableModalFooter>
          </ScrollableModalCard>
        </ScrollableModal>
      )}

      {/* Storno */}
      {cancelOpen && (
        <ScrollableModal>
          <ScrollableModalCard maxW="md">
            <ScrollableModalBody>
              <h2 className="dark:text-night-text text-ink text-xl font-semibold">
                Rechnung stornieren
              </h2>
              <p className="dark:text-night-muted text-dark mt-2 text-sm">
                {invoice.invoiceNumber} wird als storniert markiert und bleibt
                mit ihrem PDF im Archiv. Du kannst direkt eine Nachfolgerechnung
                als Entwurf anlegen lassen.
              </p>
              <label className={`${labelClass} mt-4`} htmlFor="cancelReason">
                Grund
              </label>
              <textarea
                id="cancelReason"
                rows={3}
                className={inputClass}
                placeholder="z.B. Falsche Rechnungsanschrift"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </ScrollableModalBody>
            <ScrollableModalFooter>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() =>
                    cancelAndReplace.mutate({
                      id: invoiceId,
                      reason: cancelReason,
                    })
                  }
                  disabled={
                    !cancelReason.trim() ||
                    cancelAndReplace.isPending ||
                    cancelInvoice.isPending
                  }
                  className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink min-h-11 w-full px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {cancelAndReplace.isPending
                    ? "Storniere…"
                    : "Stornieren und Nachfolgerechnung anlegen"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    cancelInvoice.mutate({
                      id: invoiceId,
                      reason: cancelReason,
                    })
                  }
                  disabled={
                    !cancelReason.trim() ||
                    cancelAndReplace.isPending ||
                    cancelInvoice.isPending
                  }
                  className="min-h-11 w-full border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
                >
                  Nur stornieren
                </button>
                <button
                  type="button"
                  onClick={() => setCancelOpen(false)}
                  className="dark:text-night-muted text-dark w-full px-4 py-2 text-sm"
                >
                  Abbrechen
                </button>
              </div>
            </ScrollableModalFooter>
          </ScrollableModalCard>
        </ScrollableModal>
      )}

      {paymentOpen && (
        <InvoicePaymentDialog
          invoice={{
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
          }}
          onClose={() => setPaymentOpen(false)}
          onBooked={() => {
            void utils.invoices.getById.invalidate({ id: invoiceId });
            void utils.invoices.listForCourse.invalidate({ courseId });
          }}
        />
      )}
    </DashboardPage>
  );
}
