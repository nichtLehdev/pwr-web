"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import DashboardPage from "@/app/_components/dashboard/dashboard-page";
import { InvoiceStatusBadge } from "@/app/_components/dashboard/invoice-status-badge";
import { SignatureCanvas } from "@/app/_components/dashboard/signature-canvas";
import { useToast } from "@/app/_components/ui/toast";
import { useBeforeUnload } from "@/lib/useBeforeUnload";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import {
  formatDate,
  formatEuro,
  invoiceTotal,
  lineItemTotal,
  type InvoiceLineItem,
} from "@/lib/invoice-document";
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
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <DashboardPage title="Rechnung">
        <div className="dark:bg-dark-surface rounded-lg bg-white p-8 text-center shadow">
          <p className="dark:text-dark-muted text-gray-600">
            {error?.message ?? "Rechnung nicht gefunden."}
          </p>
          <Link
            href={`/dashboard/courses/${courseId}/invoices`}
            className="text-primary mt-4 inline-block hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </DashboardPage>
    );
  }

  const inputClass =
    "dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none disabled:bg-gray-100 dark:disabled:bg-gray-800";
  const labelClass =
    "dark:text-dark-text mb-1 block text-sm font-medium text-gray-700";

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
          className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Übersicht
        </Link>
      }
    >
      {/* Status strip */}
      <div className="dark:bg-dark-surface mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-white p-4 shadow">
        <div className="flex flex-wrap items-center gap-3">
          <InvoiceStatusBadge status={invoice.status} />
          {invoice.invoiceDate && (
            <span className="dark:text-dark-muted text-sm text-gray-500">
              Rechnungsdatum {formatDate(invoice.invoiceDate)}
            </span>
          )}
          {invoice.replaces?.invoiceNumber && (
            <span className="dark:text-dark-muted text-sm text-gray-500">
              ersetzt {invoice.replaces.invoiceNumber}
            </span>
          )}
          {invoice.replacedBy?.invoiceNumber && (
            <Link
              href={`/dashboard/courses/${courseId}/invoices/${invoice.replacedBy.id}`}
              className="text-primary text-sm hover:underline"
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
            className="dark:border-dark-border dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700"
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
                className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
              >
                <Trash2Icon className="h-4 w-4" />
                Entwurf löschen
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={updateInvoice.isPending}
                className="dark:border-dark-border dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:opacity-50"
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
                className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
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
              className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
            >
              <BanIcon className="h-4 w-4" />
              Stornieren
            </button>
          )}
        </div>
      </div>

      {invoice.status === InvoiceStatus.DRAFT && !canManage && (
        <div className="dark:border-dark-border dark:bg-dark-background-secondary mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="dark:text-dark-text text-sm font-medium text-gray-700">
            Nur-Lese-Ansicht
          </p>
          <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
            Du kannst dieses Rechnungsarchiv einsehen, aber Rechnungen dieses
            Kurses nur als Kurs-Organisator:in bearbeiten.
          </p>
        </div>
      )}

      {invoice.status !== InvoiceStatus.DRAFT && (
        <div className="dark:border-dark-border dark:bg-dark-background-secondary mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="dark:text-dark-text text-sm font-medium text-gray-700">
            {invoice.status === InvoiceStatus.PUBLISHED
              ? "Diese Rechnung ist ausgestellt und kann nicht mehr geändert werden."
              : "Diese Rechnung wurde storniert."}
          </p>
          <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
            {invoice.status === InvoiceStatus.PUBLISHED
              ? "Für Korrekturen stornierst du sie und stellst eine Nachfolgerechnung aus — die ursprüngliche bleibt im Archiv erhalten."
              : (invoice.cancelReason ?? "")}
          </p>
        </div>
      )}

      <fieldset disabled={!isEditable} className="space-y-6">
        {/* Recipient */}
        <section className="dark:bg-dark-surface rounded-lg bg-white p-6 shadow">
          <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
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
        <section className="dark:bg-dark-surface rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="dark:text-dark-text text-lg font-semibold text-gray-900">
                Positionen
              </h2>
              <p className="dark:text-dark-muted text-sm text-gray-500">
                Negative Einzelpreise sind erlaubt — so bildest du Rabatte,
                Zuschüsse oder eine bereits geleistete Anzahlung ab.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                mutateLines((current) => [...current, emptyLine()])
              }
              className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
            >
              <PlusIcon className="h-4 w-4" />
              Position hinzufügen
            </button>
          </div>

          {lines.length === 0 ? (
            <p className="dark:text-dark-muted text-sm text-gray-500">
              Noch keine Positionen.
            </p>
          ) : (
            <div className="space-y-3">
              {lines.map((line, index) => (
                <div
                  key={line.key}
                  className="dark:border-dark-border rounded-lg border border-gray-200 p-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col pt-2">
                      <button
                        type="button"
                        onClick={() => moveLine(index, -1)}
                        disabled={index === 0}
                        aria-label="Position nach oben"
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
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
                        <span className="dark:text-dark-text pt-2 text-sm font-medium whitespace-nowrap text-gray-900 sm:hidden">
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
                  <p className="dark:text-dark-muted mt-2 hidden text-right text-sm text-gray-600 sm:block">
                    Zeilensumme:{" "}
                    <span className="dark:text-dark-text font-medium text-gray-900">
                      {formatEuro(lineItemTotal(line))}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="dark:border-dark-border mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
            <span className="dark:text-dark-text text-base font-semibold text-gray-900">
              Gesamtbetrag
            </span>
            <span className="dark:text-dark-text text-xl font-bold text-gray-900">
              {formatEuro(total)}
            </span>
          </div>
        </section>

        {/* Texts and dates */}
        <section className="dark:bg-dark-surface rounded-lg bg-white p-6 shadow">
          <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
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
            <div className="sm:w-80">
              <label className={labelClass} htmlFor="signatureName">
                Name des Unterzeichners (optional)
              </label>
              <input
                id="signatureName"
                className={inputClass}
                value={signatureName}
                onChange={(e) => {
                  setSignatureName(e.target.value);
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
              <h2 className="dark:text-dark-text text-xl font-semibold text-gray-900">
                Rechnung ausstellen
              </h2>
              <p className="dark:text-dark-muted mt-2 text-sm text-gray-600">
                Die Rechnung bekommt jetzt eine fortlaufende Nummer, das PDF
                wird archiviert und ist danach unveränderlich. Korrekturen sind
                nur noch per Storno und Nachfolgerechnung möglich.
              </p>
              <dl className="dark:border-dark-border mt-4 space-y-2 rounded-lg border border-gray-200 p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="dark:text-dark-muted text-gray-500">
                    Empfänger
                  </dt>
                  <dd className="dark:text-dark-text text-right font-medium text-gray-900">
                    {[company, `${firstName} ${lastName}`.trim()]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="dark:text-dark-muted text-gray-500">
                    Positionen
                  </dt>
                  <dd className="dark:text-dark-text font-medium text-gray-900">
                    {lines.length}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="dark:text-dark-muted text-gray-500">
                    Gesamtbetrag
                  </dt>
                  <dd className="dark:text-dark-text font-medium text-gray-900">
                    {formatEuro(total)}
                  </dd>
                </div>
              </dl>
              <div className="dark:border-dark-border mt-4 rounded-lg border border-gray-200 p-4">
                <p className="dark:text-dark-text text-sm font-medium text-gray-700">
                  Unterschrift (optional)
                </p>
                <p className="dark:text-dark-muted mt-0.5 text-xs text-gray-500">
                  Wird nur in dieses PDF eingebettet und nicht gespeichert.
                </p>
                {signatureMode === "none" && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSignatureMode("upload")}
                      className="dark:border-dark-border dark:hover:bg-dark-background-secondary flex flex-1 flex-col items-center gap-1.5 rounded-md border-2 border-dashed border-gray-300 px-4 py-3 transition-colors hover:border-blue-400 hover:bg-blue-50"
                    >
                      <UploadIcon className="h-5 w-5 text-gray-400" />
                      <span className="dark:text-dark-text text-sm text-gray-600">
                        Hochladen
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureMode("draw")}
                      className="dark:border-dark-border dark:hover:bg-dark-background-secondary flex flex-1 flex-col items-center gap-1.5 rounded-md border-2 border-dashed border-gray-300 px-4 py-3 transition-colors hover:border-blue-400 hover:bg-blue-50"
                    >
                      <PencilIcon className="h-5 w-5 text-gray-400" />
                      <span className="dark:text-dark-text text-sm text-gray-600">
                        Zeichnen
                      </span>
                    </button>
                  </div>
                )}

                {signatureMode === "upload" &&
                  (signatureBase64 ? (
                    <div className="dark:border-dark-border dark:bg-dark-background-secondary mt-2 flex items-center gap-3 rounded-md border border-gray-300 bg-gray-50 p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={signatureBase64}
                        alt="Vorschau der Unterschrift"
                        className="h-10 max-w-[120px] object-contain"
                      />
                      <span className="dark:text-dark-text flex-1 truncate text-sm text-gray-600">
                        {signatureFileName}
                      </span>
                      <button
                        type="button"
                        onClick={resetSignature}
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
                        onClick={() => signatureInputRef.current?.click()}
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
                        onClick={resetSignature}
                        className="dark:text-dark-muted mt-2 text-sm text-gray-500 hover:text-gray-700"
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
                      className="dark:text-dark-muted mt-2 text-sm text-gray-500 hover:text-gray-700"
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
              </div>
              <label className="mt-4 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={notifyRegistrant}
                  onChange={(e) => setNotifyRegistrant(e.target.checked)}
                  className="text-primary focus:ring-primary mt-0.5 h-4 w-4 rounded border-gray-300"
                />
                <span className="dark:text-dark-text text-sm text-gray-700">
                  Anmelder:in benachrichtigen
                  <span className="dark:text-dark-muted block text-xs text-gray-500">
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
                  className="dark:border-dark-border dark:text-dark-text flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
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
                    })
                  }
                  disabled={publishInvoice.isPending}
                  className="bg-primary hover:bg-primary/90 flex-1 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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
              <h2 className="dark:text-dark-text text-xl font-semibold text-gray-900">
                Rechnung stornieren
              </h2>
              <p className="dark:text-dark-muted mt-2 text-sm text-gray-600">
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
                  className="bg-primary hover:bg-primary/90 w-full rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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
                  className="w-full rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
                >
                  Nur stornieren
                </button>
                <button
                  type="button"
                  onClick={() => setCancelOpen(false)}
                  className="dark:text-dark-muted w-full px-4 py-2 text-sm text-gray-500"
                >
                  Abbrechen
                </button>
              </div>
            </ScrollableModalFooter>
          </ScrollableModalCard>
        </ScrollableModal>
      )}
    </DashboardPage>
  );
}
