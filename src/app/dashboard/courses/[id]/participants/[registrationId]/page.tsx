"use client";
import { Select } from "@/app/_components/ui";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { formatCustomFieldValueForDisplay } from "@/lib/course-custom-fields";
import { usePermissions } from "@/lib/use-permissions";
import {
  InvoicePaymentDialog,
  type PayableInvoice,
} from "@/app/_components/dashboard/invoice-payment-dialog";
import { PERMISSIONS } from "@/lib/permissions";
import {
  InvoiceStatus,
  RegistrationStatus,
  SiblingDiscountStatus,
} from "~/generated/prisma/enums";
import { useToast } from "@/app/_components/ui/toast";
import {
  CheckCircle,
  XCircle,
  UsersIcon,
  UserIcon,
  WalletIcon,
  MailIcon,
  PhoneIcon,
  PencilIcon,
  CircleXIcon,
} from "lucide-react";
import {
  CourseInvoicesButton,
  DashboardOverflowMenu,
} from "@/app/_components/dashboard";
import { hasDiscountEligibleSiblingGroup } from "@/lib/sibling-discount";
import { COURSE_PAYMENT_METHOD_LABELS } from "@/lib/course-payment-methods";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import {
  InvoicePaymentBadge,
  RegistrationPaymentBadge,
} from "@/app/_components/dashboard/invoice-payment-badge";
import { formatEuro } from "@/lib/invoice-document";
import { ParticipantCard } from "@/app/_components/events/course-registration-form/participant-card";
import {
  DownPaymentBadge,
  DownPaymentPanel,
} from "@/app/_components/dashboard/down-payment-panel";
import { Tag, type TagTone } from "@/app/_components/programmheft/tag";

const registrationStatusLabels: Record<RegistrationStatus, string> = {
  CONFIRMED: "Bestätigt",
  WAITLIST: "Warteliste",
  CANCELLED: "Storniert",
};

const registrationStatusTones: Record<RegistrationStatus, TagTone> = {
  CONFIRMED: "inverse",
  WAITLIST: "orange",
  CANCELLED: "cancelled",
};

const siblingDiscountStatusLabels: Record<SiblingDiscountStatus, string> = {
  NONE: "Kein Rabatt",
  PENDING: "Rabatt prüfen",
  APPROVED: "Rabatt genehmigt",
  REJECTED: "Rabatt abgelehnt",
};

const siblingDiscountStatusTones: Record<SiblingDiscountStatus, TagTone> = {
  NONE: "inverse",
  PENDING: "orange",
  APPROVED: "inverse",
  REJECTED: "ink",
};

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getCustomFieldValue(
  participant: { customFields?: unknown },
  fieldName: string,
): string {
  if (!participant.customFields) return "–";
  const fields = participant.customFields as Record<string, unknown>;
  return formatCustomFieldValueForDisplay(fields[fieldName]);
}

export default function RegistrationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const registrationId = params.registrationId as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const toast = useToast();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [editingStatus, setEditingStatus] = useState(false);
  const [statusDraft, setStatusDraft] = useState<
    (typeof RegistrationStatus)[keyof typeof RegistrationStatus] | null
  >(null);

  const { data: profile } = api.users.getMyProfile.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const { data: course } = api.courses.getById.useQuery(
    { id: courseId },
    { enabled: !!courseId && !!session?.user },
  );

  const { data: registration, isLoading: registrationLoading } =
    api.registrations.getById.useQuery(
      { id: registrationId },
      { enabled: !!registrationId && !!session?.user },
    );

  const { data: management } = api.registrations.canManageRegistration.useQuery(
    { id: registrationId },
    { enabled: !!session?.user && !!registrationId },
  );

  const utils = api.useUtils();

  const cancelMutation = api.registrations.cancel.useMutation({
    onSuccess: () => {
      setCancelModalOpen(false);
      setCancelError("");
      toast.success("Anmeldung erfolgreich storniert");
      void utils.registrations.getById.invalidate({ id: registrationId });
      void utils.courses.getRegistrations.invalidate({ courseId });
      router.push(`/dashboard/courses/${courseId}/participants`);
    },
    onError: (err) => {
      setCancelError(err.message || "Ein Fehler ist aufgetreten.");
      toast.error(err.message || "Ein Fehler ist aufgetreten.");
    },
  });

  const approveDiscountMutation =
    api.registrations.approveSiblingDiscount.useMutation({
      onSuccess: () => {
        toast.success("Geschwisterkindrabatt genehmigt");
        void utils.registrations.getById.invalidate({ id: registrationId });
        void utils.courses.getRegistrations.invalidate({ courseId });
      },
      onError: (error) => {
        toast.error(error.message || "Fehler beim Genehmigen des Rabatts");
      },
    });

  const rejectDiscountMutation =
    api.registrations.rejectSiblingDiscount.useMutation({
      onSuccess: () => {
        toast.success("Geschwisterkindrabatt abgelehnt");
        void utils.registrations.getById.invalidate({ id: registrationId });
        void utils.courses.getRegistrations.invalidate({ courseId });
      },
      onError: (error) => {
        toast.error(error.message || "Fehler beim Ablehnen des Rabatts");
      },
    });

  const applyDiscountMutation =
    api.registrations.applySiblingDiscount.useMutation({
      onSuccess: (updated) => {
        toast.success(
          updated.siblingDiscountStatus === SiblingDiscountStatus.APPROVED
            ? "Geschwisterkindrabatt gewährt"
            : "Geschwisterkindrabatt beantragt — er muss noch geprüft werden",
        );
        void utils.registrations.getById.invalidate({ id: registrationId });
        void utils.courses.getRegistrations.invalidate({ courseId });
      },
      onError: (error) => {
        toast.error(error.message || "Fehler beim Gewähren des Rabatts");
      },
    });

  const removeDiscountMutation =
    api.registrations.removeSiblingDiscount.useMutation({
      onSuccess: () => {
        toast.success("Geschwisterkindrabatt entfernt");
        void utils.registrations.getById.invalidate({ id: registrationId });
        void utils.courses.getRegistrations.invalidate({ courseId });
      },
      onError: (error) => {
        toast.error(error.message || "Fehler beim Entfernen des Rabatts");
      },
    });

  const invalidatePayment = () => {
    void utils.registrations.getById.invalidate({ id: registrationId });
    void utils.courses.getRegistrations.invalidate({ courseId });
    void utils.invoices.listForCourse.invalidate({ courseId });
  };

  /** Rechnung, für die der Dialog offen ist — null heißt geschlossen. */
  const [paymentInvoice, setPaymentInvoice] = useState<PayableInvoice | null>(
    null,
  );

  const markPaidMutation = api.invoices.markPaid.useMutation({
    onSuccess: () => {
      toast.success("Zahlung verbucht");
      invalidatePayment();
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Verbuchen der Zahlung");
    },
  });

  const markUnpaidMutation = api.invoices.markUnpaid.useMutation({
    onSuccess: () => {
      toast.success("Zahlung zurückgenommen");
      invalidatePayment();
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Zurücknehmen der Zahlung");
    },
  });

  const updateStatusMutation = api.registrations.updateStatus.useMutation({
    onSuccess: (updated) => {
      setEditingStatus(false);
      setStatusDraft(null);
      toast.success(
        updated.registrationStatus === RegistrationStatus.CONFIRMED
          ? "Anmeldung bestätigt"
          : "Anmeldestatus aktualisiert",
      );
      void utils.registrations.getById.invalidate({ id: registrationId });
      void utils.courses.getRegistrations.invalidate({ courseId });
    },
    onError: (error) => {
      toast.error(
        error.message || "Fehler beim Aktualisieren des Anmeldestatus",
      );
    },
  });

  const { hasPermission } = usePermissions();

  /** Nur ausgestellte Rechnungen tragen einen Zahlungsstand. */
  const publishedInvoices =
    registration?.invoices.filter(
      (invoice) => invoice.status === InvoiceStatus.PUBLISHED,
    ) ?? [];

  // Zahlungen werden an der Rechnung verbucht und folgen deren Rechteregel:
  // Kursverwaltung oder Kassenführung. Die Antwort kommt vom Server, weil
  // "Kursverwaltung" die Organisator:innen des Kurses einschließt — clientseitig
  // ist davon nichts zu sehen, und genau daran ist die frühere Prüfung hier
  // vorbeigelaufen: Organisator:innen sahen den Knopf nicht, obwohl die Mutation
  // sie durchgelassen hätte.
  const canBookPayments = management?.canBookPayments ?? false;

  // Dieselbe Berechtigung, die auch die Mutation verlangt — die frühere
  // Prüfung auf courses.approve zeigte die Knöpfe Leuten, die der Server
  // abgewiesen hätte.
  const canDecideDiscount = hasPermission(
    PERMISSIONS.REGISTRATIONS_MANAGE_SIBLING_DISCOUNT,
  );

  const canApproveDiscount =
    profile &&
    canDecideDiscount &&
    registration?.siblingDiscountStatus === SiblingDiscountStatus.PENDING;

  /** Rabattzeilen erscheinen, sobald ein Rabatt beziffert ist. */
  const hasDiscountLines = Boolean(
    registration?.siblingDiscountApplied &&
    registration.originalTotalPrice &&
    registration.siblingDiscountAmount,
  );

  /**
   * Rücknahme eines gewährten Rabatts. Für einen noch anhängigen Antrag stehen
   * stattdessen "genehmigen"/"ablehnen" bereit — die beantworten ihn begründet.
   */
  const canRemoveDiscount =
    (management?.canManageSiblingDiscount ?? false) &&
    registration?.siblingDiscountStatus === SiblingDiscountStatus.APPROVED;

  /**
   * Nachträglich gewähren: nur solange kein Rabatt anhängig oder gewährt ist
   * und die Teilnehmer überhaupt eine Geschwistergruppe bilden. Ob der Aufrufer
   * darf, beantwortet der Server — die Kursverantwortung ist hier nicht sichtbar.
   */
  const canApplyDiscount =
    (management?.canManageSiblingDiscount ?? false) &&
    (course?.allowSiblingDiscount ?? false) &&
    registration?.registrationStatus !== RegistrationStatus.CANCELLED &&
    registration?.siblingDiscountStatus !== SiblingDiscountStatus.PENDING &&
    registration?.siblingDiscountStatus !== SiblingDiscountStatus.APPROVED &&
    hasDiscountEligibleSiblingGroup(registration?.participants ?? []);

  const getParticipantDisplayName = (
    firstName: string,
    lastName: string,
    participantId?: string,
  ) => {
    if (!registration?.participants) return `${firstName} ${lastName}`;

    const firstLetter = lastName.charAt(0).toUpperCase();
    const hasDuplicate = registration.participants.some(
      (p) =>
        p.id !== participantId &&
        p.firstName === firstName &&
        p.lastName.charAt(0).toUpperCase() === firstLetter,
    );

    if (hasDuplicate) {
      return `${firstName} ${lastName}`;
    }
    return `${firstName} ${firstLetter}.`;
  };

  if (sessionLoading || registrationLoading) {
    return (
      <main className="programm font-programm dark:bg-night dark:text-night-text bg-paper text-ink min-h-screen">
        <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
          </div>
        </div>
      </main>
    );
  }

  if (!registration || !course) {
    return (
      <main className="programm font-programm dark:bg-night dark:text-night-text bg-paper text-ink min-h-screen">
        <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="py-12 text-center">
            <h1 className="dark:text-night-text text-ink text-xl font-semibold">
              Anmeldung nicht gefunden
            </h1>
            <p className="dark:text-night-muted text-dark mt-2">
              Die angeforderte Anmeldung konnte nicht gefunden werden.
            </p>
            <Link
              href={`/dashboard/courses/${courseId}/participants`}
              className="link-ink mt-4 inline-block"
            >
              Zurück zur Teilnehmerliste
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const canEdit = management?.canEdit ?? false;
  const canCancel = management?.canCancel ?? false;

  return (
    <main className="programm font-programm dark:bg-night dark:text-night-text bg-paper text-ink min-h-screen">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Brotkrumen" className="mb-4">
          <ol className="semi-condensed text-dark dark:text-night-muted -ml-1 flex flex-wrap items-center text-sm font-semibold">
            <li>
              <Link
                href="/dashboard"
                className="hover:text-ink dark:hover:text-night-text inline-flex min-h-9 items-center px-1 underline-offset-4 hover:underline"
              >
                Dashboard
              </Link>
            </li>
            <li aria-hidden className="px-0.5">
              /
            </li>
            <li>
              <Link
                href="/dashboard/courses"
                className="hover:text-ink dark:hover:text-night-text inline-flex min-h-9 items-center px-1 underline-offset-4 hover:underline"
              >
                Kurse
              </Link>
            </li>
            <li aria-hidden className="px-0.5">
              /
            </li>
            <li>
              <Link
                href={`/dashboard/courses/${courseId}`}
                className="hover:text-ink dark:hover:text-night-text inline-flex min-h-9 max-w-[150px] items-center truncate px-1 underline-offset-4 hover:underline"
              >
                {course.title}
              </Link>
            </li>
            <li aria-hidden className="px-0.5">
              /
            </li>
            <li>
              <Link
                href={`/dashboard/courses/${courseId}/participants`}
                className="hover:text-ink dark:hover:text-night-text inline-flex min-h-9 items-center px-1 underline-offset-4 hover:underline"
              >
                Teilnehmer
              </Link>
            </li>
            <li aria-hidden className="px-0.5">
              /
            </li>
            <li>
              <span
                aria-current="page"
                className="text-ink dark:text-night-text inline-flex min-h-9 items-center px-1"
              >
                Anmeldung Details
              </span>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="condensed dark:text-night-text text-ink text-2xl leading-tight font-bold sm:text-[1.75rem]">
              Anmeldung Details
            </h1>
            <p className="dark:text-night-muted text-dark mt-1 text-sm">
              {registration.registrantFirstName}{" "}
              {registration.registrantLastName}
              {" • "}
              {course.title}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CourseInvoicesButton courseId={courseId} short />
            {canEdit && editingStatus ? (
              <div className="flex items-center gap-2">
                <Select
                  value={statusDraft ?? registration.registrationStatus}
                  onChange={(e) =>
                    setStatusDraft(
                      e.target
                        .value as (typeof RegistrationStatus)[keyof typeof RegistrationStatus],
                    )
                  }
                  className="dark:bg-night dark:border-night-text dark:text-night-text border-ink bg-paper border px-3 py-2 text-sm font-medium"
                >
                  <option value={RegistrationStatus.CONFIRMED}>
                    {registrationStatusLabels[RegistrationStatus.CONFIRMED]}
                  </option>
                  <option value={RegistrationStatus.WAITLIST}>
                    {registrationStatusLabels[RegistrationStatus.WAITLIST]}
                  </option>
                  <option value={RegistrationStatus.CANCELLED}>
                    {registrationStatusLabels[RegistrationStatus.CANCELLED]}
                  </option>
                </Select>
                <button
                  type="button"
                  onClick={() =>
                    updateStatusMutation.mutate({
                      id: registrationId,
                      registrationStatus:
                        statusDraft ?? registration.registrationStatus,
                    })
                  }
                  disabled={updateStatusMutation.isPending}
                  className="on-orange bg-primary text-ink hover:bg-primary-dark min-h-11 px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {updateStatusMutation.isPending ? "Speichert…" : "Speichern"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingStatus(false);
                    setStatusDraft(null);
                  }}
                  disabled={updateStatusMutation.isPending}
                  className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised min-h-11 border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Abbrechen
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Tag
                  tone={
                    registrationStatusTones[registration.registrationStatus]
                  }
                >
                  {registrationStatusLabels[registration.registrationStatus]}
                </Tag>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setEditingStatus(true)}
                    className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised hidden min-h-9 items-center gap-1 border px-2.5 py-1.5 text-sm font-medium transition-colors sm:inline-flex"
                    aria-label="Anmeldestatus bearbeiten"
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                    Status
                  </button>
                )}
                {canEdit &&
                  registration.registrationStatus ===
                    RegistrationStatus.WAITLIST && (
                    <button
                      type="button"
                      onClick={() =>
                        updateStatusMutation.mutate({
                          id: registrationId,
                          registrationStatus: RegistrationStatus.CONFIRMED,
                        })
                      }
                      disabled={updateStatusMutation.isPending}
                      className="hidden min-h-9 items-center gap-1 bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50 sm:inline-flex"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      {updateStatusMutation.isPending
                        ? "Bestätigt…"
                        : "Von Warteliste bestätigen"}
                    </button>
                  )}
              </div>
            )}
            <RegistrationPaymentBadge
              invoices={registration.invoices}
              className="px-3 py-1"
            />
            <DownPaymentBadge
              registration={registration}
              className="px-3 py-1"
            />
            {/* Phones keep only the primary action; everything else moves into
                the "…" menu, so the header stays one short row instead of three
                stacked rows of buttons. From sm up the full row is shown. */}
            {(canEdit || canCancel) && (
              // `w-full` keeps the actions on their own row below sm so the
              // status badges above them stay intact; `sm:contents` dissolves
              // the wrapper again so the desktop row is unchanged.
              <div className="flex w-full items-center gap-2 sm:contents">
                <Link
                  href={`/dashboard/courses/${courseId}/participants`}
                  className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised hidden min-h-11 border px-4 py-2 text-sm font-semibold transition-colors sm:inline-block"
                >
                  Zurück zur Liste
                </Link>
                {canEdit && (
                  <Link
                    href={`/registrations/${registrationId}/edit?returnTo=${encodeURIComponent(`/dashboard/courses/${courseId}/participants/${registrationId}`)}`}
                    className="on-orange bg-primary text-ink hover:bg-primary-dark inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors"
                  >
                    <PencilIcon className="h-4 w-4" />
                    Bearbeiten
                  </Link>
                )}
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => setCancelModalOpen(true)}
                    className="hidden min-h-11 items-center gap-2 border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 sm:inline-flex dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <CircleXIcon className="h-4 w-4" />
                    Stornieren
                  </button>
                )}

                <DashboardOverflowMenu
                  className="ml-auto sm:hidden"
                  items={[
                    ...(canEdit && !editingStatus
                      ? [
                          {
                            label: "Status ändern",
                            icon: PencilIcon,
                            onSelect: () => setEditingStatus(true),
                          },
                        ]
                      : []),
                    ...(canEdit &&
                    registration.registrationStatus ===
                      RegistrationStatus.WAITLIST
                      ? [
                          {
                            label: "Von Warteliste bestätigen",
                            icon: CheckCircle,
                            disabled: updateStatusMutation.isPending,
                            onSelect: () =>
                              updateStatusMutation.mutate({
                                id: registrationId,
                                registrationStatus:
                                  RegistrationStatus.CONFIRMED,
                              }),
                          },
                        ]
                      : []),
                    {
                      label: "Zurück zur Liste",
                      icon: UsersIcon,
                      href: `/dashboard/courses/${courseId}/participants`,
                    },
                    ...(canCancel
                      ? [
                          {
                            label: "Stornieren",
                            icon: CircleXIcon,
                            destructive: true,
                            onSelect: () => setCancelModalOpen(true),
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
            )}
          </div>
        </div>

        {/* Registrant Info */}
        <div className="dark:border-night-rule border-rule mb-6 border">
          <div className="dark:border-night-rule border-rule border-b p-6">
            <h2 className="text-dark dark:text-night-text flex items-center gap-2 text-lg font-semibold">
              <UserIcon className="text-primary-ink dark:text-primary h-5 w-5" />
              Anmelder
            </h2>
          </div>
          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="dark:text-night-text text-ink text-sm font-medium">
                  Name
                </p>
                <p className="text-dark dark:text-night-text mt-1">
                  {registration.registrantFirstName}{" "}
                  {registration.registrantLastName}
                </p>
              </div>
              <div>
                <p className="dark:text-night-text text-ink text-sm font-medium">
                  E-Mail
                </p>
                <a
                  href={`mailto:${registration.registrantEmail}`}
                  className="link-ink mt-1 inline-flex items-center gap-1"
                >
                  <MailIcon className="h-4 w-4" />
                  {registration.registrantEmail}
                </a>
              </div>
              {registration.registrantPhone && (
                <div>
                  <p className="dark:text-night-text text-ink text-sm font-medium">
                    Telefon
                  </p>
                  <a
                    href={`tel:${registration.registrantPhone}`}
                    className="link-ink mt-1 inline-flex items-center gap-1"
                  >
                    <PhoneIcon className="h-4 w-4" />
                    {registration.registrantPhone}
                  </a>
                </div>
              )}
              {registration.registrantStreet && (
                <div>
                  <p className="dark:text-night-text text-ink text-sm font-medium">
                    Adresse
                  </p>
                  <p className="text-dark dark:text-night-text mt-1">
                    {registration.registrantStreet}
                    {registration.registrantZipCode &&
                      `, ${registration.registrantZipCode}`}
                    {registration.registrantCity &&
                      ` ${registration.registrantCity}`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Price Summary */}
        <div className="dark:border-night-rule border-rule mb-6 border">
          <div className="dark:border-night-rule border-rule border-b p-6">
            <h2 className="text-dark dark:text-night-text flex items-center gap-2 text-lg font-semibold">
              <WalletIcon className="text-primary-ink dark:text-primary h-5 w-5" />
              Preisübersicht
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {hasDiscountLines && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-dark dark:text-night-muted">
                      Zwischensumme:
                    </span>
                    <span className="text-ink dark:text-night-text line-through">
                      {(registration.originalTotalPrice ?? 0).toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-green-600 dark:text-green-400">
                      Geschwisterkindrabatt (20% pro weiteres Kind):
                    </span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      -{(registration.siblingDiscountAmount ?? 0).toFixed(2)} €
                    </span>
                  </div>
                  <div className="dark:border-night-rule border-rule flex items-center justify-between border-t pt-2">
                    <span className="text-dark dark:text-night-text font-semibold">
                      Gesamtbetrag:
                    </span>
                    <span className="text-primary-ink dark:text-primary text-xl font-bold">
                      {registration.totalPrice.toFixed(2)} €
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="dark:text-night-text text-ink text-sm font-medium">
                      Rabattstatus:
                    </span>
                    <Tag
                      tone={
                        siblingDiscountStatusTones[
                          registration.siblingDiscountStatus
                        ]
                      }
                    >
                      {
                        siblingDiscountStatusLabels[
                          registration.siblingDiscountStatus
                        ]
                      }
                    </Tag>
                  </div>
                  {canRemoveDiscount && (
                    <div className="mt-4">
                      <button
                        onClick={() =>
                          removeDiscountMutation.mutate({
                            registrationId: registration.id,
                          })
                        }
                        disabled={removeDiscountMutation.isPending}
                        className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 items-center gap-2 border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                        Rabatt entfernen
                      </button>
                      <p className="text-dark dark:text-night-muted mt-2 text-xs">
                        Der Anmelder wird über den vollen Preis informiert.
                      </p>
                    </div>
                  )}
                  {canApproveDiscount && (
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() =>
                          approveDiscountMutation.mutate({
                            registrationId: registration.id,
                          })
                        }
                        disabled={approveDiscountMutation.isPending}
                        className="inline-flex min-h-11 items-center gap-2 bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Rabatt genehmigen
                      </button>
                      <button
                        onClick={() =>
                          rejectDiscountMutation.mutate({
                            registrationId: registration.id,
                          })
                        }
                        disabled={rejectDiscountMutation.isPending}
                        className="inline-flex min-h-11 items-center gap-2 bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                        Rabatt ablehnen
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!hasDiscountLines && (
                <div className="flex items-center justify-between">
                  <span className="text-dark dark:text-night-text font-semibold">
                    Gesamtbetrag:
                  </span>
                  <span className="text-primary-ink dark:text-primary text-xl font-bold">
                    {registration.totalPrice.toFixed(2)} €
                  </span>
                </div>
              )}
              {canApplyDiscount && (
                <div className="border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <p className="dark:text-night-text text-ink mb-3 text-sm">
                    Die Teilnehmer bilden eine Geschwistergruppe. Der
                    Geschwisterkindrabatt (20% auf jedes weitere Geschwister)
                    kann nachträglich gewährt werden.
                  </p>
                  <button
                    onClick={() =>
                      applyDiscountMutation.mutate({
                        registrationId: registration.id,
                      })
                    }
                    disabled={applyDiscountMutation.isPending}
                    className="inline-flex min-h-11 items-center gap-2 bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Geschwisterkindrabatt gewähren
                  </button>
                </div>
              )}
              {course?.isFree === false && (
                <div className="dark:border-night-rule border-rule flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <span className="dark:text-night-text text-ink text-sm font-medium">
                    Zahlungsweise:
                  </span>
                  <span className="text-ink dark:text-night-text text-sm">
                    {registration.paymentMethod
                      ? COURSE_PAYMENT_METHOD_LABELS[registration.paymentMethod]
                      : "–"}
                  </span>
                </div>
              )}
              <div className="dark:border-night-rule border-rule space-y-3 border-t pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="dark:text-night-text text-ink text-sm font-medium">
                    Zahlungsstatus:
                  </span>
                  <RegistrationPaymentBadge
                    invoices={registration.invoices}
                    className="px-3 py-1"
                  />
                </div>

                {/* Gezahlt wird auf eine Rechnung, nicht auf eine Anmeldung —
                    darum steht hier eine Zeile je ausgestellter Rechnung statt
                    eines einzelnen Status am Datensatz. */}
                {publishedInvoices.length === 0 ? (
                  <p className="text-dark dark:text-night-muted text-sm">
                    Für diese Anmeldung wurde noch keine Rechnung ausgestellt.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {publishedInvoices.map((invoice) => (
                      <li
                        key={invoice.id}
                        className="dark:border-night-rule dark:bg-night-raised border-rule bg-rule/25 flex flex-wrap items-center justify-between gap-3 border px-3 py-2"
                      >
                        <div className="min-w-0">
                          <span className="dark:text-night-text text-ink text-sm font-medium">
                            {invoice.invoiceNumber ?? "Ohne Nummer"} ·{" "}
                            {formatEuro(invoice.totalAmount)}
                          </span>
                          {invoice.paidAt && (
                            <span className="text-dark dark:text-night-muted block text-xs">
                              Verbucht am{" "}
                              {new Date(invoice.paidAt).toLocaleDateString(
                                "de-DE",
                              )}
                              {invoice.paidAmount !== null &&
                                ` · ${formatEuro(invoice.paidAmount)}`}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <InvoicePaymentBadge invoice={invoice} />
                          {canBookPayments &&
                            (invoice.paidAt ? (
                              <button
                                type="button"
                                onClick={() =>
                                  markUnpaidMutation.mutate({ id: invoice.id })
                                }
                                disabled={markUnpaidMutation.isPending}
                                className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised min-h-9 border px-2.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
                              >
                                Zahlung zurücknehmen
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPaymentInvoice({
                                      id: invoice.id,
                                      invoiceNumber: invoice.invoiceNumber,
                                      totalAmount: invoice.totalAmount,
                                    })
                                  }
                                  title="Teilzahlung, abweichende Wertstellung oder Notiz erfassen"
                                  className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised min-h-9 border px-2.5 py-1.5 text-sm font-medium transition-colors"
                                >
                                  Abweichend…
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    markPaidMutation.mutate({ id: invoice.id })
                                  }
                                  disabled={markPaidMutation.isPending}
                                  className="on-orange bg-primary text-ink hover:bg-primary-dark min-h-9 px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                  {markPaidMutation.isPending
                                    ? "Speichert…"
                                    : "Als bezahlt markieren"}
                                </button>
                              </>
                            ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {registration.invoiceGenerated && registration.invoiceId && (
                <div className="dark:border-night-rule border-rule flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <span className="dark:text-night-text text-ink text-sm font-medium">
                    Rechnungsnummer:
                  </span>
                  <span className="text-dark dark:text-night-text font-mono text-sm">
                    {registration.invoiceId}
                  </span>
                </div>
              )}
              {registration.invoiceGenerated &&
                registration.invoiceDate &&
                registration.invoiceId && (
                  <div className="dark:border-night-rule border-rule flex flex-wrap items-center justify-between gap-3 border-t pt-2">
                    <span className="dark:text-night-text text-ink text-sm font-medium">
                      Rechnungsdatum:
                    </span>
                    <span className="text-dark dark:text-night-text text-sm">
                      {new Date(registration.invoiceDate).toLocaleDateString(
                        "de-DE",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        },
                      )}
                    </span>
                  </div>
                )}
            </div>
          </div>
        </div>

        <DownPaymentPanel
          registration={registration}
          courseNumber={registration.course.courseNumber}
          canBook={canBookPayments}
          onChanged={invalidatePayment}
        />

        {/* Participants */}
        <div className="dark:border-night-rule border-rule border p-4 sm:p-6">
          <h2 className="text-dark dark:text-night-text mb-4 flex items-center gap-2 text-lg font-semibold">
            <UsersIcon className="text-primary-ink dark:text-primary h-5 w-5" />
            Teilnehmer ({registration.participants.length})
          </h2>

          <div className="space-y-3">
            {registration.participants.map((participant, index) => {
              const siblingGroup = registration.participants.filter(
                (p) =>
                  p.siblingGroupId &&
                  p.siblingGroupId === participant.siblingGroupId,
              );
              const isInGroup = siblingGroup.length > 1;
              const groupMembers = siblingGroup
                .filter((p) => p.id !== participant.id)
                .map((p) =>
                  getParticipantDisplayName(p.firstName, p.lastName, p.id),
                );
              const isEligibleForDiscount =
                hasDiscountEligibleSiblingGroup(siblingGroup);

              // Only what the card summary does not already carry: it shows the
              // age, city, instrument and price category, so repeating those
              // here would be the same line twice.
              const details: { label: string; value: string }[] = [
                {
                  label: "Geburtsdatum",
                  value: formatDate(participant.birthDate),
                },
                ...(isInGroup && groupMembers.length > 0
                  ? [
                      {
                        label: "Geschwister mit",
                        value: groupMembers.join(", "),
                      },
                    ]
                  : []),
                ...(course.customFields ?? []).map((field) => ({
                  label: field.fieldName,
                  value: getCustomFieldValue(participant, field.fieldName),
                })),
              ];

              return (
                <ParticipantCard
                  key={participant.id}
                  participant={participant}
                  index={index}
                  priceOptions={course.priceOptions}
                  siblingGroupSize={siblingGroup.length || 1}
                  extraBadges={
                    isInGroup && course.allowSiblingDiscount ? (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          isEligibleForDiscount
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}
                      >
                        {isEligibleForDiscount
                          ? "Rabatt berechtigt"
                          : "Rabatt nicht berechtigt"}
                      </span>
                    ) : null
                  }
                >
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    {details.map((detail) => (
                      <div key={detail.label}>
                        <dt className="dark:text-night-text text-ink font-medium">
                          {detail.label}
                        </dt>
                        <dd className="text-dark dark:text-night-muted">
                          {detail.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </ParticipantCard>
              );
            })}
          </div>
        </div>

        {/* Cancel confirmation modal */}
        {cancelModalOpen && (
          <ScrollableModal>
            <ScrollableModalCard maxW="md">
              <ScrollableModalBody>
                <h3 className="text-dark dark:text-night-text mb-4 text-lg font-bold">
                  Anmeldung stornieren?
                </h3>
                <p className="text-dark dark:text-night-muted mb-6">
                  Diese Anmeldung wird storniert. Der/die Anmelder:in erhält
                  eine Bestätigung per E-Mail. Diese Aktion kann nicht
                  rückgängig gemacht werden.
                </p>
                {registration.downPaymentStatus === "PAID" && (
                  <p className="mb-6 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                    Die Anzahlung ist bereits eingegangen. Ob sie erstattet oder
                    einbehalten wird, bitte mit der Kasse klären und
                    anschließend unter „Anzahlung“ vermerken.
                  </p>
                )}
                {cancelError && (
                  <div className="mb-4 border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                    <p className="text-sm text-red-800 dark:text-red-300">
                      {cancelError}
                    </p>
                  </div>
                )}
              </ScrollableModalBody>
              <ScrollableModalFooter>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCancelModalOpen(false);
                      setCancelError("");
                    }}
                    className="border-rule dark:border-night-rule dark:bg-night-raised dark:text-night-text text-ink hover:bg-rule/25 bg-paper min-h-11 flex-1 border px-4 py-2 font-semibold transition-colors"
                  >
                    Zurück
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      cancelMutation.mutate({ id: registrationId })
                    }
                    disabled={cancelMutation.isPending}
                    className="min-h-11 flex-1 bg-red-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {cancelMutation.isPending
                      ? "Wird storniert..."
                      : "Stornieren"}
                  </button>
                </div>
              </ScrollableModalFooter>
            </ScrollableModalCard>
          </ScrollableModal>
        )}

        {paymentInvoice && (
          <InvoicePaymentDialog
            invoice={paymentInvoice}
            onClose={() => setPaymentInvoice(null)}
            onBooked={invalidatePayment}
          />
        )}
      </div>
    </main>
  );
}
