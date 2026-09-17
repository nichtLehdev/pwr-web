"use client";
import { Select } from "@/app/_components/ui";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api, type RouterOutputs } from "@/trpc/react";
import { formatCustomFieldValueForDisplay } from "@/lib/course-custom-fields";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions";
import { useToast } from "@/app/_components/ui/toast";
import { downloadResponseAsFile } from "@/lib/download-file";
import {
  CourseCollaboratorRole,
  InvoiceStatus,
  RegistrationStatus,
  SiblingDiscountStatus,
} from "~/generated/prisma/enums";
import {
  ArrowLeftIcon,
  DownloadIcon,
  PencilIcon,
  PlusIcon,
  MailIcon,
  SearchIcon,
} from "lucide-react";
import { FileIcon, UserIcon } from "lucide-react";
import { CourseInvoicesButton } from "@/app/_components/dashboard";
import {
  DataTable,
  createDataTableColumnHelper,
  type DataTableColumn,
} from "@/app/_components/ui/data-table";
import { RegistrationPaymentBadge } from "@/app/_components/dashboard/invoice-payment-badge";
import { DownPaymentBadge } from "@/app/_components/dashboard/down-payment-panel";
import {
  DOWN_PAYMENT_STATE_LABELS,
  downPaymentReceived,
  downPaymentState,
} from "@/lib/course-down-payment";
import {
  registrationOpenAmount,
  registrationPaymentState,
} from "@/lib/invoice-payment";
import {
  participantPriceOptionLabel,
  resolveParticipantPriceOption,
} from "@/lib/course-price-options";
import { Tag, type TagTone } from "@/app/_components/programmheft/tag";

type CourseRegistrationRow =
  RouterOutputs["courses"]["getRegistrations"]["registrations"][number];

/** Eine Tabellenzeile der Teilnehmer-Ansicht: Person plus ihre Anmeldung. */
type ParticipantRow = {
  participant: CourseRegistrationRow["participants"][number];
  registration: CourseRegistrationRow;
};

const participantColumn = createDataTableColumnHelper<ParticipantRow>();

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

/**
 * Filterwerte der Zahlungsspalte — abgeleitet aus den Rechnungen, bei Kursen
 * mit Anzahlung zusätzlich aus deren Stand.
 */
type PaymentFilter =
  "ALL" | "OPEN" | "PAID" | "NONE" | "DOWN_PAYMENT_OPEN" | "REFUND_PENDING";

const siblingDiscountStatusLabels: Record<SiblingDiscountStatus, string> = {
  NONE: "",
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

// Dashboard access is now controlled by permissions

type ExportFormat = "csv" | "excel" | "json";

function escapeCSVValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function getCustomFieldValue(
  participant: { customFields?: unknown },
  fieldName: string,
): string {
  if (!participant.customFields) {
    return "–";
  }

  let fields: Record<string, unknown>;
  if (typeof participant.customFields === "string") {
    try {
      fields = JSON.parse(participant.customFields) as Record<string, unknown>;
    } catch {
      return "–";
    }
  } else if (typeof participant.customFields === "object") {
    fields = participant.customFields as Record<string, unknown>;
  } else {
    return "–";
  }

  return formatCustomFieldValueForDisplay(fields[fieldName]);
}

function formatBirthDate(birthDate: Date | string | null | undefined): string {
  if (!birthDate) return "–";
  return new Date(birthDate).toLocaleDateString("de-DE");
}

function formatBirthYear(birthDate: Date | string | null | undefined): string {
  if (!birthDate) return "–";
  return String(new Date(birthDate).getFullYear());
}

export default function CourseParticipantsPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const hasRedirected = useRef(false);

  const [viewMode, setViewMode] = useState<"participants" | "registrations">(
    "participants",
  );
  const [showCustomFields, setShowCustomFields] = useState(true);

  const [statusFilter, setStatusFilter] = useState<
    RegistrationStatus | "ALL" | "ACTIVE"
  >("ACTIVE");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<null | "paid" | "confirm">(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, { enabled: !!session?.user });

  const {
    hasDashboardAccess,
    hasPermission,
    hasAnyPermission,
    isLoading: permissionsLoading,
  } = usePermissions();

  const hasApprovePermission =
    hasPermission("courses.approve" as PermissionKey) ||
    hasPermission("courses.manage" as PermissionKey);
  const hasViewParticipantsPermission = hasAnyPermission([
    "courses.view" as PermissionKey,
    "courses.approve" as PermissionKey,
    "courses.manage" as PermissionKey,
  ]);
  const hasManageRegistrationsPermission = hasPermission(
    PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
  );

  const { data: course, isLoading: courseLoading } =
    api.courses.getById.useQuery(
      { id: courseId },
      { enabled: !!courseId && !!session?.user },
    );

  const { data: registrationsData, isLoading: registrationsLoading } =
    api.courses.getRegistrations.useQuery(
      { courseId, all: true },
      { enabled: !!courseId && !!session?.user },
    );

  // Asked of the server rather than re-derived here: the mailing rule also
  // covers Bezirk-wide access, which the client can't see.
  const { data: canMailRegistrants } = api.courseMail.canSend.useQuery(
    { courseId },
    { enabled: !!courseId && !!session?.user },
  );

  const { data: invoiceAccess } = api.invoices.canManageCourseInvoices.useQuery(
    { courseId },
    { enabled: !!courseId && !!session?.user },
  );

  const toast = useToast();
  const utils = api.useUtils();
  const bulkPaymentMutation = api.invoices.markPaid.useMutation();
  const bulkStatusMutation = api.registrations.updateStatus.useMutation();

  const runBulkAction = async (action: "paid" | "confirm") => {
    const ids = [...selectedIds];
    if (ids.length === 0 || bulkAction) return;
    setBulkAction(action);
    let succeeded = 0;
    let firstError = "";
    // Sequential on purpose: confirming waitlist entries re-checks capacity
    // in a serializable transaction per registration.
    for (const id of ids) {
      try {
        if (action === "paid") {
          // Eine Anmeldung kann mehrere ausgestellte Rechnungen haben
          // (Storno-Kette, Teilrechnungen) — verbucht werden alle noch offenen.
          const open =
            registrationsData?.registrations
              .find((r) => r.id === id)
              ?.invoices.filter(
                (invoice) =>
                  invoice.status === InvoiceStatus.PUBLISHED && !invoice.paidAt,
              ) ?? [];
          for (const invoice of open) {
            await bulkPaymentMutation.mutateAsync({ id: invoice.id });
          }
        } else {
          await bulkStatusMutation.mutateAsync({
            id,
            registrationStatus: RegistrationStatus.CONFIRMED,
          });
        }
        succeeded++;
      } catch (error) {
        if (!firstError) {
          firstError = error instanceof Error ? error.message : String(error);
        }
      }
    }
    setBulkAction(null);
    setSelectedIds(new Set());
    void utils.courses.getRegistrations.invalidate({ courseId });
    const failed = ids.length - succeeded;
    if (failed === 0) {
      toast.success(
        action === "paid"
          ? `${succeeded} Anmeldungen als bezahlt markiert`
          : `${succeeded} Anmeldungen bestätigt`,
      );
    } else {
      toast.error(
        `${succeeded} erfolgreich, ${failed} fehlgeschlagen${firstError ? `: ${firstError}` : ""}`,
      );
    }
  };

  useEffect(() => {
    if (!sessionLoading && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(
        `/login?callbackUrl=/dashboard/courses/${courseId}/participants`,
      );
    }
  }, [session, sessionLoading, router, courseId]);

  useEffect(() => {
    if (!permissionsLoading && !hasDashboardAccess && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/");
    }
  }, [permissionsLoading, hasDashboardAccess, router]);

  const filteredRegistrations = useMemo(
    () =>
      registrationsData?.registrations.filter((registration) => {
        if (statusFilter === "ACTIVE") {
          if (
            registration.registrationStatus === RegistrationStatus.CANCELLED
          ) {
            return false;
          }
        } else if (
          statusFilter !== "ALL" &&
          registration.registrationStatus !== statusFilter
        ) {
          return false;
        }

        if (
          paymentFilter === "DOWN_PAYMENT_OPEN" ||
          paymentFilter === "REFUND_PENDING"
        ) {
          const state = downPaymentState(registration);
          const matches =
            paymentFilter === "REFUND_PENDING"
              ? state === "REFUND_PENDING"
              : state === "OPEN" || state === "PARTIAL";
          if (!matches) return false;
        } else if (paymentFilter !== "ALL") {
          const state = registrationPaymentState(registration.invoices);
          const matches =
            paymentFilter === "PAID"
              ? state === "PAID"
              : paymentFilter === "NONE"
                ? state === "NOT_APPLICABLE"
                : state === "OPEN" || state === "PARTIAL";
          if (!matches) return false;
        }

        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const registrantMatch =
            registration.registrantFirstName.toLowerCase().includes(query) ||
            registration.registrantLastName.toLowerCase().includes(query) ||
            registration.registrantEmail.toLowerCase().includes(query);
          const participantMatch = registration.participants.some(
            (p) =>
              p.firstName.toLowerCase().includes(query) ||
              p.lastName.toLowerCase().includes(query) ||
              p.city?.toLowerCase().includes(query) ||
              p.instrument?.toLowerCase().includes(query),
          );
          const invoiceMatch =
            registration.invoiceId?.toLowerCase().includes(query) ?? false;
          return registrantMatch || participantMatch || invoiceMatch;
        }
        return true;
      }) ?? [],
    [registrationsData, statusFilter, paymentFilter, searchQuery],
  );

  /**
   * Die Teilnehmer-Ansicht zeigt eine Zeile je Teilnehmer:in — die Anmeldung
   * bleibt an der Zeile hängen, damit Status, Anmelder:in und der Link zur
   * Anmeldung als eigene Spalten sortierbar und filterbar sind.
   */
  const participantRows = useMemo<ParticipantRow[]>(
    () =>
      filteredRegistrations.flatMap((registration) =>
        registration.participants.map((participant) => ({
          participant,
          registration,
        })),
      ),
    [filteredRegistrations],
  );

  const participantColumns = useMemo<DataTableColumn<ParticipantRow>[]>(() => {
    const base = [
      participantColumn.accessor(
        ({ participant }) =>
          `${participant.firstName} ${participant.lastName}`.trim(),
        {
          id: "name",
          header: "Name",
          meta: {
            alwaysVisible: true,
            cellClassName: "font-medium whitespace-nowrap",
          },
          cell: ({ row }) => (
            <Link
              href={`/dashboard/courses/${courseId}/participants/${row.original.registration.id}`}
              className="hover:text-primary-ink dark:hover:text-primary dark:text-night-text text-ink transition-colors"
              title="Zur Anmeldung"
            >
              {row.original.participant.firstName}{" "}
              {row.original.participant.lastName}
            </Link>
          ),
        },
      ),
      participantColumn.accessor(
        ({ participant }) => formatBirthYear(participant.birthDate),
        {
          id: "birthYear",
          header: "Geburtsjahr",
          meta: { filterVariant: "set", cellClassName: "whitespace-nowrap" },
        },
      ),
      participantColumn.accessor(({ participant }) => participant.city ?? "", {
        id: "city",
        header: "Ort",
        meta: { filterVariant: "set", cellClassName: "whitespace-nowrap" },
        cell: ({ getValue }) => getValue() || "–",
      }),
      participantColumn.accessor(
        ({ participant }) => participant.instrument ?? "",
        {
          id: "instrument",
          header: "Instrument",
          meta: { filterVariant: "set", cellClassName: "whitespace-nowrap" },
          cell: ({ getValue }) => getValue() || "–",
        },
      ),
      participantColumn.accessor(
        ({ participant }) =>
          participantPriceOptionLabel(
            participant,
            course?.priceOptions ?? [],
          ) ?? "",
        {
          id: "priceOption",
          header: "Preiskategorie",
          meta: { filterVariant: "set", cellClassName: "whitespace-nowrap" },
          cell: ({ getValue }) => getValue() || "–",
        },
      ),
    ];

    const customColumns = showCustomFields
      ? (course?.customFields ?? []).map((field) =>
          participantColumn.accessor(
            ({ participant }) =>
              getCustomFieldValue(participant, field.fieldName),
            {
              id: `custom-${field.id}`,
              header: field.fieldName,
              meta: {
                filterVariant: "set",
                label: field.fieldName,
                cellClassName: "whitespace-nowrap",
              },
            },
          ),
        )
      : [];

    const tail = [
      participantColumn.accessor(
        ({ registration }) =>
          registrationStatusLabels[registration.registrationStatus],
        {
          id: "status",
          header: "Status",
          meta: { filterVariant: "set" },
          cell: ({ row }) => (
            <Tag
              tone={
                registrationStatusTones[
                  row.original.registration.registrationStatus
                ]
              }
            >
              {
                registrationStatusLabels[
                  row.original.registration.registrationStatus
                ]
              }
            </Tag>
          ),
        },
      ),
      participantColumn.accessor(
        ({ registration }) =>
          `${registration.registrantFirstName} ${registration.registrantLastName}`.trim(),
        {
          id: "registrant",
          header: "Anmelder",
          meta: { cellClassName: "whitespace-nowrap" },
          cell: ({ row }) => (
            <Link
              href={`/dashboard/courses/${courseId}/participants/${row.original.registration.id}`}
              className="hover:text-primary-ink dark:hover:text-primary transition-colors"
            >
              {row.original.registration.registrantFirstName}{" "}
              {row.original.registration.registrantLastName}
            </Link>
          ),
        },
      ),
    ];

    const downPaymentColumns =
      course?.downPaymentMode && course.downPaymentMode !== "NONE"
        ? [
            participantColumn.accessor(
              ({ registration }) =>
                DOWN_PAYMENT_STATE_LABELS[downPaymentState(registration)],
              {
                id: "downPayment",
                header: "Anzahlung",
                meta: {
                  filterVariant: "set",
                  cellClassName: "whitespace-nowrap",
                },
                cell: ({ row }) => (
                  <DownPaymentBadge
                    registration={row.original.registration}
                    withPrefix={false}
                  />
                ),
              },
            ),
          ]
        : [];

    return participantColumn.columns([
      ...base,
      ...customColumns,
      ...downPaymentColumns,
      ...tail,
    ]);
  }, [
    courseId,
    course?.priceOptions,
    course?.customFields,
    course?.downPaymentMode,
    showCustomFields,
  ]);

  if (sessionLoading || profileLoading || permissionsLoading || courseLoading) {
    return (
      <div className="dark:bg-night bg-paper flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !course) {
    return (
      <div className="dark:bg-night bg-paper flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="dark:text-night-text text-ink text-xl font-semibold">
            Kurs nicht gefunden
          </h1>
          <Link
            href="/dashboard/courses"
            className="link-ink mt-4 inline-block"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = course.createdById === session.user.id;
  const hasCourseTeamAccess =
    course.viewerCollaboratorRole === CourseCollaboratorRole.STAFF ||
    course.viewerCollaboratorRole === CourseCollaboratorRole.ORGANIZER;
  const canViewParticipants =
    isOwner || hasViewParticipantsPermission || hasCourseTeamAccess;

  const canCreateInvoices = hasApprovePermission || hasCourseTeamAccess;
  // Same rule as registrations.createByStaff / updateMyRegistration server-side:
  // the course team and registration managers may add and edit registrations
  // regardless of the public deadline.
  const canManageRegistrations =
    isOwner || hasCourseTeamAccess || hasManageRegistrationsPermission;

  if (!canViewParticipants) {
    return (
      <div className="dark:bg-night bg-paper flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="dark:text-night-text text-ink text-xl font-semibold">
            Keine Berechtigung
          </h1>
          <p className="dark:text-night-muted text-dark mt-2">
            Du hast keine Berechtigung, die Teilnehmer dieses Kurses zu sehen.
          </p>
          <Link
            href="/dashboard/courses"
            className="link-ink mt-4 inline-block"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const selectedRegistrations = filteredRegistrations.filter((r) =>
    selectedIds.has(r.id),
  );
  const selectedWaitlisted = selectedRegistrations.filter(
    (r) => r.registrationStatus === RegistrationStatus.WAITLIST,
  ).length;
  // Sammelaktion greift nur, wo es eine offene ausgestellte Rechnung gibt —
  // ohne Rechnung gibt es nichts zu verbuchen.
  const selectedUnpaid = selectedRegistrations.filter((r) =>
    ["OPEN", "PARTIAL"].includes(registrationPaymentState(r.invoices)),
  ).length;
  const allFilteredSelected =
    filteredRegistrations.length > 0 &&
    filteredRegistrations.every((r) => selectedIds.has(r.id));

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(
      allFilteredSelected
        ? new Set()
        : new Set(filteredRegistrations.map((r) => r.id)),
    );
  };

  const confirmedCount =
    registrationsData?.registrations
      .filter((r) => r.registrationStatus === RegistrationStatus.CONFIRMED)
      .reduce((sum, r) => sum + r.participants.length, 0) ?? 0;
  const waitlistCount =
    registrationsData?.registrations
      .filter((r) => r.registrationStatus === RegistrationStatus.WAITLIST)
      .reduce((sum, r) => sum + r.participants.length, 0) ?? 0;
  const cancelledCount =
    registrationsData?.registrations
      .filter((r) => r.registrationStatus === RegistrationStatus.CANCELLED)
      .reduce((sum, r) => sum + r.participants.length, 0) ?? 0;
  const paidRevenue =
    registrationsData?.registrations
      .filter((r) => registrationPaymentState(r.invoices) === "PAID")
      .reduce((sum, r) => sum + r.totalPrice, 0) ?? 0;
  const openInvoiceAmount =
    registrationsData?.registrations.reduce(
      (sum, r) => sum + registrationOpenAmount(r.invoices),
      0,
    ) ?? 0;

  const hasPendingDiscounts =
    registrationsData?.registrations.some(
      (r) => r.siblingDiscountStatus === SiblingDiscountStatus.PENDING,
    ) ?? false;

  /**
   * Excel entsteht auf dem Server: exceljs gehört nicht ins Browser-Bundle,
   * und derselbe Baustein schreibt die Liste, die nach Anmeldeschluss per
   * E-Mail herausgeht. Mitgeschickt wird nur die gefilterte Auswahl.
   */
  const handleXlsxExport = async () => {
    setExportingXlsx(true);
    try {
      const response = await fetch(
        `/api/courses/${courseId}/exports/participants`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            registrationIds: filteredRegistrations.map((r) => r.id),
          }),
        },
      );
      if (!response.ok) {
        throw new Error(String(response.status));
      }
      await downloadResponseAsFile(response, "teilnehmer.xlsx");
    } catch {
      toast.error("Die Teilnehmerliste konnte nicht erstellt werden.");
    } finally {
      setExportingXlsx(false);
    }
  };

  const handleExport = (format: ExportFormat) => {
    setShowExportMenu(false);

    if (format === "excel") {
      void handleXlsxExport();
      return;
    }

    const customFieldNames = course.customFields?.map((f) => f.fieldName) ?? [];

    const exportData = filteredRegistrations.flatMap((registration) =>
      registration.participants.map((participant) => {
        const customFieldValues: Record<string, string> = {};
        customFieldNames.forEach((fieldName) => {
          customFieldValues[fieldName] = getCustomFieldValue(
            participant,
            fieldName,
          );
        });

        const priceOption = resolveParticipantPriceOption(
          participant,
          course.priceOptions,
        );
        const participantPrice = priceOption?.price ?? 0;

        return {
          vorname: participant.firstName,
          nachname: participant.lastName,
          geburtsdatum: formatBirthDate(participant.birthDate),
          ort: participant.city || "",
          instrument: participant.instrument || "",
          preiskategorie: participantPriceOptionLabel(
            participant,
            course.priceOptions,
          ),
          preis: participantPrice.toFixed(2),
          ...customFieldValues,
          status: registrationStatusLabels[registration.registrationStatus],
          anmelder_vorname: registration.registrantFirstName,
          anmelder_nachname: registration.registrantLastName,
          anmelder_email: registration.registrantEmail,
          anmelder_telefon: registration.registrantPhone || "",
          gesamtpreis: registration.totalPrice.toFixed(2),
          ...(course.downPaymentMode !== "NONE" && {
            anzahlung: registration.downPaymentAmount?.toFixed(2) ?? "",
            anzahlung_eingegangen: registration.downPaymentAmount
              ? downPaymentReceived(registration).toFixed(2)
              : "",
            anzahlung_status: registration.downPaymentAmount
              ? DOWN_PAYMENT_STATE_LABELS[downPaymentState(registration)]
              : "",
          }),
          anmeldedatum: new Date(registration.createdAt).toLocaleDateString(
            "de-DE",
          ),
          anmerkungen: registration.notes || "",
        };
      }),
    );

    const filename = `${course.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")}_teilnehmer_${new Date().toISOString().split("T")[0]}`;

    if (format === "json") {
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      downloadBlob(blob, `${filename}.json`);
    } else if (format === "csv") {
      const headers = Object.keys(exportData[0] ?? {});
      const csvContent = [
        headers.map(escapeCSVValue).join(";"),
        ...exportData.map((row) =>
          headers
            .map((header) =>
              escapeCSVValue(String(row[header as keyof typeof row] ?? "")),
            )
            .join(";"),
        ),
      ].join("\n");

      const bom = "\uFEFF";
      const blob = new Blob([bom + csvContent], {
        type: "text/csv;charset=utf-8",
      });
      downloadBlob(blob, `${filename}.csv`);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
              <span
                aria-current="page"
                className="text-ink dark:text-night-text inline-flex min-h-9 items-center px-1"
              >
                Teilnehmer
              </span>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="condensed dark:text-night-text text-ink text-2xl leading-tight font-bold sm:text-[1.75rem]">
              Teilnehmer
            </h1>
            <p className="dark:text-night-muted text-dark mt-1 truncate text-sm">
              {course.title}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CourseInvoicesButton courseId={courseId} short />
            {/* Add a registration the team received outside the public form */}
            {canManageRegistrations && (
              <Link
                href={`/dashboard/courses/${courseId}/participants/new`}
                className="inline-flex min-h-11 items-center gap-2 bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
              >
                <PlusIcon className="h-4 w-4" />
                Anmeldung hinzufügen
              </Link>
            )}
            {/* Mail all registrants */}
            {canMailRegistrants && (
              <Link
                href={`/dashboard/courses/${courseId}/mail`}
                className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm font-medium transition-colors"
              >
                <MailIcon className="h-4 w-4" />
                Anschreiben
              </Link>
            )}
            {/* Export Button */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={filteredRegistrations.length === 0}
                className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 items-center gap-2 border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <DownloadIcon
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                />
                Exportieren
              </button>
              {showExportMenu && (
                <div className="border-ink bg-paper dark:border-night-text dark:bg-night-raised absolute right-0 z-10 mt-2 w-48 border-2 py-1">
                  <button
                    onClick={() => handleExport("csv")}
                    className="text-ink hover:bg-rule/60 dark:text-night-text dark:hover:bg-night-rule flex w-full items-center gap-3 px-4 py-2 text-left text-sm"
                  >
                    <DownloadIcon className="h-4 w-4 text-green-600" />
                    CSV (.csv)
                  </button>
                  <button
                    onClick={() => handleExport("excel")}
                    disabled={exportingXlsx}
                    className="text-ink hover:bg-rule/60 dark:text-night-text dark:hover:bg-night-rule flex w-full items-center gap-3 px-4 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <DownloadIcon className="h-4 w-4 text-green-700" />
                    {exportingXlsx ? "Wird erstellt …" : "Excel (.xlsx)"}
                  </button>
                  <button
                    onClick={() => handleExport("json")}
                    className="text-ink hover:bg-rule/60 dark:text-night-text dark:hover:bg-night-rule flex w-full items-center gap-3 px-4 py-2 text-left text-sm"
                  >
                    <DownloadIcon className="h-4 w-4 text-yellow-600" />
                    JSON (.json)
                  </button>
                  {canCreateInvoices &&
                    invoiceAccess?.canManage &&
                    hasPendingDiscounts && (
                      <>
                        <div className="border-rule dark:border-night-rule my-1 border-t"></div>
                        <div className="px-4 py-2 text-xs text-yellow-600 dark:text-yellow-400">
                          ⚠️ Es gibt noch ausstehende Geschwisterkindrabatte
                        </div>
                      </>
                    )}
                </div>
              )}
            </div>
            {/* Back Button — redundant on phones: the breadcrumb above already
                links to the course, so this only cost a second row of buttons. */}
            <Link
              href={`/dashboard/courses/${courseId}`}
              className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised hidden min-h-11 items-center gap-2 border px-4 py-2 text-sm font-medium transition-colors sm:inline-flex"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Zurück zum Kurs
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="bg-rule/25 dark:bg-night-raised p-4">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {confirmedCount}
            </div>
            <div className="text-dark dark:text-night-muted text-sm">
              Bestätigt
            </div>
          </div>
          <div className="bg-rule/25 dark:bg-night-raised p-4">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {waitlistCount}
            </div>
            <div className="text-dark dark:text-night-muted text-sm">
              Warteliste
            </div>
          </div>
          <div className="bg-rule/25 dark:bg-night-raised p-4">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {cancelledCount}
            </div>
            <div className="text-dark dark:text-night-muted text-sm">
              Storniert
            </div>
          </div>
          <div className="bg-rule/25 dark:bg-night-raised p-4">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {paidRevenue.toFixed(2)} €
            </div>
            <div className="text-dark dark:text-night-muted text-sm">
              Bezahlt
            </div>
          </div>
          <div className="bg-rule/25 dark:bg-night-raised p-4">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {openInvoiceAmount.toFixed(2)} €
            </div>
            <div className="text-dark dark:text-night-muted text-sm">
              Offene Rechnungen
            </div>
          </div>
        </div>

        {/* View Mode Toggle & Filters */}
        <div className="border-rule dark:border-night-rule mb-6 border p-4">
          <div className="dark:border-night-rule border-rule mb-4 flex flex-wrap items-center justify-between gap-4 border-b pb-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="dark:text-night-text text-ink text-sm font-medium">
                Ansicht:
              </span>
              <div className="border-rule dark:border-night-rule inline-flex border">
                <button
                  onClick={() => setViewMode("participants")}
                  className={`min-h-11 px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === "participants"
                      ? "on-orange bg-primary text-ink"
                      : "text-dark hover:bg-rule/25 dark:text-night-muted dark:hover:bg-night-raised hover:text-ink dark:hover:text-night-text"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    Teilnehmer
                  </span>
                </button>
                <button
                  onClick={() => setViewMode("registrations")}
                  className={`min-h-11 px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === "registrations"
                      ? "on-orange bg-primary text-ink"
                      : "text-dark hover:bg-rule/25 dark:text-night-muted dark:hover:bg-night-raised hover:text-ink dark:hover:text-night-text"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FileIcon className="h-4 w-4" />
                    Anmeldungen
                  </span>
                </button>
              </div>
            </div>
            {/* Custom Fields Toggle */}
            {course.customFields && course.customFields.length > 0 && (
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={showCustomFields}
                  onChange={(e) => setShowCustomFields(e.target.checked)}
                  className="text-primary border-rule dark:border-night-text dark:bg-night-raised h-4 w-4"
                />
                <span className="dark:text-night-text text-ink text-sm">
                  Zusatzfelder anzeigen
                </span>
              </label>
            )}
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <SearchIcon className="text-dark dark:text-night-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Suche nach Name, E-Mail, Ort, Instrument, Rechnungsnummer…"
                  className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper text-ink w-full border py-2 pr-4 pl-10 text-sm"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <label className="dark:text-night-text text-ink text-sm font-medium">
                Status:
              </label>
              <Select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as RegistrationStatus | "ALL" | "ACTIVE",
                  )
                }
                className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper text-ink border px-3 py-2 text-sm"
              >
                <option value="ACTIVE">Aktiv (ohne Stornierte)</option>
                <option value="ALL">Alle</option>
                <option value={RegistrationStatus.CONFIRMED}>Bestätigt</option>
                <option value={RegistrationStatus.WAITLIST}>Warteliste</option>
                <option value={RegistrationStatus.CANCELLED}>Storniert</option>
              </Select>
            </div>

            {/* Payment Filter */}
            <div className="flex items-center gap-2">
              <label className="dark:text-night-text text-ink text-sm font-medium">
                Zahlung:
              </label>
              <Select
                value={paymentFilter}
                onChange={(e) =>
                  setPaymentFilter(e.target.value as PaymentFilter)
                }
                className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper text-ink border px-3 py-2 text-sm"
              >
                <option value="ALL">Alle</option>
                <option value="OPEN">Offen</option>
                <option value="PAID">Bezahlt</option>
                <option value="NONE">Ohne Rechnung</option>
                {course.downPaymentMode !== "NONE" && (
                  <>
                    <option value="DOWN_PAYMENT_OPEN">Anzahlung offen</option>
                    <option value="REFUND_PENDING">
                      Anzahlung: Erstattung klären
                    </option>
                  </>
                )}
              </Select>
            </div>
          </div>
        </div>

        {/* Content based on view mode */}
        <div className="border-rule dark:border-night-rule border">
          {registrationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="py-12 text-center">
              <SearchIcon className="text-dark dark:text-night-muted mx-auto h-12 w-12" />
              <h3 className="dark:text-night-text text-ink mt-4 text-lg font-medium">
                Keine Anmeldungen gefunden
              </h3>
              <p className="text-dark dark:text-night-muted mt-2">
                {searchQuery ||
                statusFilter !== "ALL" ||
                paymentFilter !== "ALL"
                  ? "Versuche andere Filtereinstellungen."
                  : "Noch keine Anmeldungen für diesen Kurs vorhanden."}
              </p>
            </div>
          ) : viewMode === "participants" ? (
            /* Participants Table View — eine Zeile je Teilnehmer:in, quer über
               alle Anmeldungen, mit Sortierung und Spaltenfiltern. Die Suche
               bleibt oben in der Leiste: sie gilt für beide Ansichten. */
            <DataTable
              data={participantRows}
              columns={participantColumns}
              getRowId={(row) => row.participant.id}
              searchable={false}
              rowNoun={["Teilnehmer:in", "Teilnehmer:innen"]}
              pageSize={50}
              pageSizeOptions={[25, 50, 100, 250]}
              initialSorting={[{ id: "name", desc: false }]}
              className="p-4 sm:p-6"
            />
          ) : (
            /* Registrations List View */
            <div>
              {/* Selection toolbar */}
              <div className="dark:border-night-rule dark:bg-night-raised bg-rule/25 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
                <label className="dark:text-night-text text-ink flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    className="text-primary border-rule dark:border-night-text h-4 w-4"
                  />
                  {selectedIds.size > 0
                    ? `${selectedIds.size} ausgewählt`
                    : "Alle auswählen"}
                </label>
                {selectedIds.size > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void runBulkAction("paid")}
                      disabled={bulkAction !== null || selectedUnpaid === 0}
                      className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink min-h-11 px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {bulkAction === "paid"
                        ? "Wird gespeichert..."
                        : `Als bezahlt markieren (${selectedUnpaid})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => void runBulkAction("confirm")}
                      disabled={bulkAction !== null || selectedWaitlisted === 0}
                      className="min-h-11 bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {bulkAction === "confirm"
                        ? "Wird bestätigt..."
                        : `Von Warteliste bestätigen (${selectedWaitlisted})`}
                    </button>
                    {canMailRegistrants && (
                      <Link
                        href={`/dashboard/courses/${courseId}/mail?registrationIds=${[...selectedIds].join(",")}`}
                        className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised bg-paper inline-flex min-h-11 items-center gap-1.5 border px-3 py-1.5 text-sm font-medium transition-colors"
                      >
                        <MailIcon className="h-4 w-4" />
                        Auswahl anschreiben ({selectedIds.size})
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                      disabled={bulkAction !== null}
                      className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised bg-paper min-h-11 border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      Auswahl aufheben
                    </button>
                  </div>
                )}
              </div>
              <div className="dark:divide-night-rule divide-rule divide-y">
                {filteredRegistrations.map((registration) => (
                  <div key={registration.id} className="p-4 sm:p-6">
                    {/* Registration Header */}
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(registration.id)}
                          onChange={() => toggleSelected(registration.id)}
                          aria-label={`${registration.registrantFirstName} ${registration.registrantLastName} auswählen`}
                          className="text-primary border-rule dark:border-night-text mt-1.5 h-4 w-4"
                        />
                        <div>
                          <Link
                            href={`/dashboard/courses/${courseId}/participants/${registration.id}`}
                            className="dark:text-night-text hover:text-primary-ink dark:hover:text-primary text-ink text-lg font-medium transition-colors"
                          >
                            {registration.registrantFirstName}{" "}
                            {registration.registrantLastName}
                          </Link>
                          <div className="text-dark dark:text-night-muted mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                            <a
                              href={`mailto:${registration.registrantEmail}`}
                              className="hover:text-primary-ink dark:hover:text-primary"
                            >
                              {registration.registrantEmail}
                            </a>
                            {registration.registrantPhone && (
                              <a
                                href={`tel:${registration.registrantPhone}`}
                                className="hover:text-primary-ink dark:hover:text-primary"
                              >
                                {registration.registrantPhone}
                              </a>
                            )}
                            {registration.invoiceId && (
                              <span className="font-mono">
                                Rechnungsnr.: {registration.invoiceId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/dashboard/courses/${courseId}/participants/${registration.id}`}
                          className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-9 items-center gap-1.5 border px-2.5 py-1 text-xs font-medium transition-colors"
                        >
                          Details
                        </Link>
                        {canManageRegistrations &&
                          registration.registrationStatus !==
                            RegistrationStatus.CANCELLED && (
                            <Link
                              href={`/registrations/${registration.id}/edit?returnTo=${encodeURIComponent(
                                `/dashboard/courses/${courseId}/participants`,
                              )}`}
                              className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-9 items-center gap-1.5 border px-2.5 py-1 text-xs font-medium transition-colors"
                            >
                              <PencilIcon className="h-3.5 w-3.5" />
                              Bearbeiten
                            </Link>
                          )}
                        <Tag
                          tone={
                            registrationStatusTones[
                              registration.registrationStatus
                            ]
                          }
                        >
                          {
                            registrationStatusLabels[
                              registration.registrationStatus
                            ]
                          }
                        </Tag>
                        <RegistrationPaymentBadge
                          invoices={registration.invoices}
                          className="px-3 py-1"
                        />
                        <DownPaymentBadge
                          registration={registration}
                          className="px-3 py-1"
                        />
                        {registration.siblingDiscountStatus &&
                          registration.siblingDiscountStatus !==
                            SiblingDiscountStatus.NONE && (
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
                          )}
                      </div>
                    </div>

                    {/* Participants Table */}
                    {registration.participants.length > 0 && (
                      <div className="dark:border-night-rule border-rule overflow-x-auto border">
                        <table className="dark:divide-night-rule divide-rule w-full divide-y">
                          <thead className="dark:bg-night-raised bg-rule/25">
                            <tr>
                              <th className="text-dark dark:text-night-muted px-4 py-3 text-left text-xs font-medium tracking-wider uppercase">
                                Name
                              </th>
                              <th className="text-dark dark:text-night-muted px-4 py-3 text-left text-xs font-medium tracking-wider uppercase">
                                Geburtsjahr
                              </th>
                              <th className="text-dark dark:text-night-muted px-4 py-3 text-left text-xs font-medium tracking-wider uppercase">
                                Ort
                              </th>
                              <th className="text-dark dark:text-night-muted px-4 py-3 text-left text-xs font-medium tracking-wider uppercase">
                                Instrument
                              </th>
                              <th className="text-dark dark:text-night-muted px-4 py-3 text-left text-xs font-medium tracking-wider uppercase">
                                Preiskategorie
                              </th>
                              {/* Custom Fields Headers */}
                              {showCustomFields &&
                                course.customFields?.map((field) => (
                                  <th
                                    key={field.id}
                                    className="text-dark dark:text-night-muted px-4 py-3 text-left text-xs font-medium tracking-wider uppercase"
                                  >
                                    {field.fieldName}
                                  </th>
                                ))}
                            </tr>
                          </thead>
                          <tbody className="dark:divide-night-rule divide-rule divide-y">
                            {registration.participants.map((participant) => (
                              <tr key={participant.id}>
                                <td className="dark:text-night-text text-ink px-4 py-3 text-sm font-medium whitespace-nowrap">
                                  {participant.firstName} {participant.lastName}
                                </td>
                                <td className="text-dark dark:text-night-muted px-4 py-3 text-sm whitespace-nowrap">
                                  {formatBirthYear(participant.birthDate)}
                                </td>
                                <td className="text-dark dark:text-night-muted px-4 py-3 text-sm whitespace-nowrap">
                                  {participant.city || "–"}
                                </td>
                                <td className="text-dark dark:text-night-muted px-4 py-3 text-sm whitespace-nowrap">
                                  {participant.instrument || "–"}
                                </td>
                                <td className="text-dark dark:text-night-muted px-4 py-3 text-sm whitespace-nowrap">
                                  {participantPriceOptionLabel(
                                    participant,
                                    course.priceOptions,
                                  ) || "–"}
                                </td>
                                {/* Custom Fields Values */}
                                {showCustomFields &&
                                  course.customFields?.map((field) => (
                                    <td
                                      key={field.id}
                                      className="text-dark dark:text-night-muted px-4 py-3 text-sm whitespace-nowrap"
                                    >
                                      {getCustomFieldValue(
                                        participant,
                                        field.fieldName,
                                      )}
                                    </td>
                                  ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Registration Footer */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-dark dark:text-night-muted">
                        Angemeldet am{" "}
                        {new Date(registration.createdAt).toLocaleDateString(
                          "de-DE",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </span>
                      <div className="flex flex-wrap items-center gap-3">
                        {registration.invoiceId && (
                          <span className="text-dark dark:text-night-muted">
                            Rechnungsnr.:{" "}
                            <span className="font-mono">
                              {registration.invoiceId}
                            </span>
                          </span>
                        )}
                        <span className="dark:text-night-text text-ink font-semibold">
                          Gesamt: {registration.totalPrice.toFixed(2)} €
                        </span>
                      </div>
                    </div>

                    {/* Notes */}
                    {registration.notes && (
                      <div className="dark:bg-night-raised bg-rule/25 mt-3 p-3">
                        <p className="text-dark dark:text-night-muted text-sm">
                          <span className="font-medium">Anmerkungen:</span>{" "}
                          {registration.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results count */}
        {filteredRegistrations.length > 0 && (
          <div className="text-dark dark:text-night-muted mt-4 text-center text-sm">
            {filteredRegistrations.length} von{" "}
            {registrationsData?.registrations.length ?? 0} Anmeldungen
            {" • "}
            {filteredRegistrations.reduce(
              (sum, r) => sum + r.participants.length,
              0,
            )}{" "}
            Teilnehmer
          </div>
        )}
      </div>
    </main>
  );
}
