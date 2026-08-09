"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import DashboardPage from "@/app/_components/dashboard/dashboard-page";
import {
  InvoiceStatusBadge,
  INVOICE_STATUS_LABELS,
} from "@/app/_components/dashboard/invoice-status-badge";
import { useToast } from "@/app/_components/ui/toast";
import { formatDate, formatEuro } from "@/lib/invoice-document";
import { InvoiceStatus } from "~/generated/prisma/enums";
import {
  ArrowLeftIcon,
  FileTextIcon,
  MailIcon,
  PlusIcon,
  ReceiptTextIcon,
} from "lucide-react";

export default function CourseInvoicesPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const courseId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const utils = api.useUtils();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showPicker, setShowPicker] = useState(false);

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
      <div className="dark:bg-dark-surface overflow-hidden rounded-lg bg-white shadow">
        {invoicesLoading ? (
          <p className="dark:text-dark-muted p-6 text-sm text-gray-500">
            Lade…
          </p>
        ) : (invoices?.length ?? 0) === 0 ? (
          <div className="p-10 text-center">
            <ReceiptTextIcon className="mx-auto h-10 w-10 text-gray-300" />
            <p className="dark:text-dark-text mt-3 font-medium text-gray-900">
              Noch keine Rechnungen
            </p>
            <p className="dark:text-dark-muted mt-1 text-sm text-gray-500">
              Erstelle den ersten Entwurf aus einer Anmeldung.
            </p>
          </div>
        ) : (
          <ul className="dark:divide-dark-border divide-y divide-gray-200">
            {invoices?.map((invoice) => (
              <li key={invoice.id}>
                <Link
                  href={`/dashboard/courses/${courseId}/invoices/${invoice.id}`}
                  className="dark:hover:bg-dark-background-secondary flex flex-wrap items-center gap-4 p-4 hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="dark:text-dark-text font-medium text-gray-900">
                        {invoice.invoiceNumber ?? "Entwurf"}
                      </span>
                      <InvoiceStatusBadge status={invoice.status} />
                      {invoice.replaces?.invoiceNumber && (
                        <span className="dark:text-dark-muted text-xs text-gray-500">
                          ersetzt {invoice.replaces.invoiceNumber}
                        </span>
                      )}
                      {invoice.replacedBy?.invoiceNumber && (
                        <span className="dark:text-dark-muted text-xs text-gray-500">
                          ersetzt durch {invoice.replacedBy.invoiceNumber}
                        </span>
                      )}
                    </div>
                    <p className="dark:text-dark-muted mt-0.5 truncate text-sm text-gray-500">
                      {[
                        invoice.recipientCompany,
                        `${invoice.recipientFirstName ?? ""} ${invoice.recipientLastName ?? ""}`.trim(),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      {invoice.invoiceDate
                        ? ` · ${formatDate(invoice.invoiceDate)}`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="dark:text-dark-text font-semibold text-gray-900">
                      {formatEuro(invoice.totalAmount)}
                    </p>
                    <p className="dark:text-dark-muted text-xs text-gray-500">
                      {INVOICE_STATUS_LABELS[invoice.status]}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

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
    </DashboardPage>
  );
}
