"use client";
import { Select } from "@/app/_components/ui";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { BulkInvoiceModal } from "./_components/BulkInvoiceModal";
import {
  CourseCollaboratorRole,
  RegistrationStatus,
  PaymentStatus,
  SiblingDiscountStatus,
} from "~/generated/prisma/enums";
import { ArrowLeftIcon, DownloadIcon, SearchIcon } from "lucide-react";
import { FileIcon, UserIcon } from "lucide-react";

const registrationStatusLabels: Record<RegistrationStatus, string> = {
  CONFIRMED: "Bestätigt",
  WAITLIST: "Warteliste",
  CANCELLED: "Storniert",
};

const registrationStatusColors: Record<RegistrationStatus, string> = {
  CONFIRMED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  WAITLIST:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "Ausstehend",
  PAID: "Bezahlt",
  REFUNDED: "Erstattet",
};

const paymentStatusColors: Record<PaymentStatus, string> = {
  PENDING:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  PAID: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REFUNDED: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

const siblingDiscountStatusLabels: Record<SiblingDiscountStatus, string> = {
  NONE: "",
  PENDING: "Rabatt prüfen",
  APPROVED: "Rabatt genehmigt",
  REJECTED: "Rabatt abgelehnt",
};

const siblingDiscountStatusColors: Record<SiblingDiscountStatus, string> = {
  NONE: "",
  PENDING:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  APPROVED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
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

  const value = fields[fieldName];
  if (value === undefined || value === null || value === "") {
    return "–";
  }
  if (typeof value === "boolean") {
    return value ? "Ja" : "Nein";
  }
  return String(value);
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
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "ALL">(
    "ALL",
  );
  const [searchQuery, setSearchQuery] = useState("");

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showBulkInvoiceModal, setShowBulkInvoiceModal] = useState(false);
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

  const { data: userPermissions } = api.permissions.getMyPermissions.useQuery(
    undefined,
    { enabled: !!session?.user?.id },
  );

  const hasDashboardAccess =
    Array.isArray(userPermissions) && userPermissions.length > 0;
  const hasApprovePermission =
    Array.isArray(userPermissions) &&
    userPermissions.some(
      (perm: string) => perm === "courses.approve" || perm === "courses.manage",
    );
  const hasViewParticipantsPermission =
    Array.isArray(userPermissions) &&
    userPermissions.some(
      (perm: string) =>
        perm === "courses.view" ||
        perm === "courses.approve" ||
        perm === "courses.manage",
    );

  const { data: course, isLoading: courseLoading } =
    api.courses.getById.useQuery(
      { id: courseId },
      { enabled: !!courseId && !!session?.user },
    );

  const { data: registrationsData, isLoading: registrationsLoading } =
    api.courses.getRegistrations.useQuery(
      { courseId, page: 1, limit: 100 },
      { enabled: !!courseId && !!session?.user },
    );

  useEffect(() => {
    if (!sessionLoading && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(
        `/login?callbackUrl=/dashboard/courses/${courseId}/participants`,
      );
    }
  }, [session, sessionLoading, router, courseId]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !hasDashboardAccess &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/");
    }
  }, [profile, profileLoading, hasDashboardAccess, router]);

  if (sessionLoading || profileLoading || courseLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !course) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Kurs nicht gefunden
          </h1>
          <Link
            href="/dashboard/courses"
            className="text-primary mt-4 inline-block hover:underline"
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

  if (!canViewParticipants) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Keine Berechtigung
          </h1>
          <p className="dark:text-dark-muted mt-2 text-gray-600">
            Du hast keine Berechtigung, die Teilnehmer dieses Kurses zu sehen.
          </p>
          <Link
            href="/dashboard/courses"
            className="text-primary mt-4 inline-block hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const filteredRegistrations =
    registrationsData?.registrations.filter((registration) => {
      if (statusFilter === "ACTIVE") {
        if (registration.registrationStatus === RegistrationStatus.CANCELLED) {
          return false;
        }
      } else if (
        statusFilter !== "ALL" &&
        registration.registrationStatus !== statusFilter
      ) {
        return false;
      }

      if (
        paymentFilter !== "ALL" &&
        registration.paymentStatus !== paymentFilter
      ) {
        return false;
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
    }) ?? [];

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
  const totalRevenue =
    registrationsData?.registrations
      .filter((r) => r.registrationStatus === RegistrationStatus.CONFIRMED)
      .reduce((sum, r) => sum + r.totalPrice, 0) ?? 0;
  const paidRevenue =
    registrationsData?.registrations
      .filter((r) => r.paymentStatus === PaymentStatus.PAID)
      .reduce((sum, r) => sum + r.totalPrice, 0) ?? 0;

  const hasPendingDiscounts =
    registrationsData?.registrations.some(
      (r) => r.siblingDiscountStatus === SiblingDiscountStatus.PENDING,
    ) ?? false;

  const handleExport = (format: ExportFormat) => {
    setShowExportMenu(false);

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

        const priceOption = course.priceOptions?.find(
          (p) => p.label === participant.priceOption,
        );
        const participantPrice = priceOption?.price ?? 0;

        return {
          vorname: participant.firstName,
          nachname: participant.lastName,
          ort: participant.city || "",
          instrument: participant.instrument || "",
          preiskategorie: participant.priceOption || "",
          preis: participantPrice.toFixed(2),
          ...customFieldValues,
          status: registrationStatusLabels[registration.registrationStatus],
          anmelder_vorname: registration.registrantFirstName,
          anmelder_nachname: registration.registrantLastName,
          anmelder_email: registration.registrantEmail,
          anmelder_telefon: registration.registrantPhone || "",
          gesamtpreis: registration.totalPrice.toFixed(2),
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
    } else if (format === "excel") {
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
      ].join("\r\n");

      const bom = "\uFEFF";
      const blob = new Blob([bom + csvContent], {
        type: "application/vnd.ms-excel;charset=utf-8",
      });
      downloadBlob(blob, `${filename}.xls`);
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
    <main className="dark:bg-dark-background min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm">
          <ol className="flex items-center gap-2">
            <li>
              <Link
                href="/dashboard"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Dashboard
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li>
              <Link
                href="/dashboard/courses"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Kurse
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li>
              <Link
                href={`/dashboard/courses/${courseId}`}
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary max-w-[150px] truncate text-gray-500"
              >
                {course.title}
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">Teilnehmer</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="dark:text-dark-text text-2xl font-bold text-gray-900 sm:text-3xl">
              Teilnehmer
            </h1>
            <p className="dark:text-dark-muted mt-1 truncate text-gray-600">
              {course.title}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Export Button */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={filteredRegistrations.length === 0}
                className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
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
                <div className="dark:border-dark-border dark:bg-dark-surface absolute right-0 z-10 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={() => handleExport("csv")}
                    className="dark:text-dark-text dark:hover:bg-dark-background-secondary flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <DownloadIcon className="h-4 w-4 text-green-600" />
                    CSV (.csv)
                  </button>
                  <button
                    onClick={() => handleExport("excel")}
                    className="dark:text-dark-text dark:hover:bg-dark-background-secondary flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <DownloadIcon className="h-4 w-4 text-green-700" />
                    Excel (.xls)
                  </button>
                  <button
                    onClick={() => handleExport("json")}
                    className="dark:text-dark-text dark:hover:bg-dark-background-secondary flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <DownloadIcon className="h-4 w-4 text-yellow-600" />
                    JSON (.json)
                  </button>
                  {canCreateInvoices && (
                    <>
                      <div className="dark:border-dark-border my-1 border-t border-gray-200"></div>
                      <button
                        onClick={() => {
                          setShowExportMenu(false);
                          setShowBulkInvoiceModal(true);
                        }}
                        disabled={hasPendingDiscounts}
                        className="dark:text-dark-text dark:hover:bg-dark-background-secondary flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                        title={
                          hasPendingDiscounts
                            ? "Rechnungen können nicht generiert werden, solange noch Geschwisterkindrabatte zur Prüfung ausstehen."
                            : undefined
                        }
                      >
                        <DownloadIcon
                          className="h-4 w-4 text-blue-600"
                          fill="none"
                        />
                        Alle Rechnungen (ZIP)
                      </button>
                      {hasPendingDiscounts && (
                        <div className="px-4 py-2 text-xs text-yellow-600 dark:text-yellow-400">
                          ⚠️ Es gibt noch ausstehende Geschwisterkindrabatte
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            {/* Back Button */}
            <Link
              href={`/dashboard/courses/${courseId}`}
              className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Zurück zum Kurs
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {confirmedCount}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Bestätigt
            </div>
          </div>
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {waitlistCount}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Warteliste
            </div>
          </div>
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {cancelledCount}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Storniert
            </div>
          </div>
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totalRevenue.toFixed(2)} €
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Gesamtumsatz
            </div>
          </div>
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {paidRevenue.toFixed(2)} €
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Bezahlt
            </div>
          </div>
        </div>

        {/* View Mode Toggle & Filters */}
        <div className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="dark:border-dark-border mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
            <div className="flex items-center gap-4">
              <span className="dark:text-dark-text text-sm font-medium text-gray-700">
                Ansicht:
              </span>
              <div className="dark:bg-dark-background-secondary inline-flex rounded-lg bg-gray-100 p-1">
                <button
                  onClick={() => setViewMode("participants")}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === "participants"
                      ? "dark:bg-dark-surface dark:text-dark-text bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    Teilnehmer
                  </span>
                </button>
                <button
                  onClick={() => setViewMode("registrations")}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === "registrations"
                      ? "dark:bg-dark-surface dark:text-dark-text bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
                  className="text-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary h-4 w-4 rounded border-gray-300"
                />
                <span className="dark:text-dark-text text-sm text-gray-700">
                  Zusatzfelder anzeigen
                </span>
              </label>
            )}
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <SearchIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Suche nach Name, E-Mail, Ort, Instrument, Rechnungsnummer…"
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white py-2 pr-4 pl-10 text-sm text-gray-900 focus:ring-1 focus:outline-none"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <label className="dark:text-dark-text text-sm font-medium text-gray-700">
                Status:
              </label>
              <Select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as RegistrationStatus | "ALL" | "ACTIVE",
                  )
                }
                className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:outline-none"
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
              <label className="dark:text-dark-text text-sm font-medium text-gray-700">
                Zahlung:
              </label>
              <Select
                value={paymentFilter}
                onChange={(e) =>
                  setPaymentFilter(e.target.value as PaymentStatus | "ALL")
                }
                className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:outline-none"
              >
                <option value="ALL">Alle</option>
                <option value={PaymentStatus.PENDING}>Ausstehend</option>
                <option value={PaymentStatus.PAID}>Bezahlt</option>
                <option value={PaymentStatus.REFUNDED}>Erstattet</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Content based on view mode */}
        <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white shadow-sm">
          {registrationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="py-12 text-center">
              <SearchIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="dark:text-dark-text mt-4 text-lg font-medium text-gray-900">
                Keine Anmeldungen gefunden
              </h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                {searchQuery ||
                statusFilter !== "ALL" ||
                paymentFilter !== "ALL"
                  ? "Versuche andere Filtereinstellungen."
                  : "Noch keine Anmeldungen für diesen Kurs vorhanden."}
              </p>
            </div>
          ) : viewMode === "participants" ? (
            /* Participants Table View */
            <div className="overflow-x-auto">
              <table className="dark:divide-dark-border w-full divide-y divide-gray-200">
                <thead className="dark:bg-dark-background-secondary bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Ort
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Instrument
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Preiskategorie
                    </th>
                    {/* Custom Fields Headers */}
                    {showCustomFields &&
                      course.customFields?.map((field) => (
                        <th
                          key={field.id}
                          className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
                        >
                          {field.fieldName}
                        </th>
                      ))}
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Anmelder
                    </th>
                  </tr>
                </thead>
                <tbody className="dark:divide-dark-border dark:bg-dark-surface divide-y divide-gray-200 bg-white">
                  {filteredRegistrations.flatMap((registration) =>
                    registration.participants.map((participant) => (
                      <tr
                        key={participant.id}
                        className="dark:hover:bg-dark-background-secondary hover:bg-gray-50"
                      >
                        <td className="dark:text-dark-text px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                          {participant.firstName} {participant.lastName}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {participant.city || "–"}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {participant.instrument || "–"}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {participant.priceOption || "–"}
                        </td>
                        {/* Custom Fields Values */}
                        {showCustomFields &&
                          course.customFields?.map((field) => (
                            <td
                              key={field.id}
                              className="px-6 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400"
                            >
                              {getCustomFieldValue(
                                participant,
                                field.fieldName,
                              )}
                            </td>
                          ))}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${registrationStatusColors[registration.registrationStatus]}`}
                          >
                            {
                              registrationStatusLabels[
                                registration.registrationStatus
                              ]
                            }
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {registration.registrantFirstName}{" "}
                          {registration.registrantLastName}
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Registrations List View */
            <div className="dark:divide-dark-border divide-y divide-gray-200">
              {filteredRegistrations.map((registration) => (
                <div key={registration.id} className="p-4 sm:p-6">
                  {/* Registration Header */}
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/dashboard/courses/${courseId}/participants/${registration.id}`}
                        className="dark:text-dark-text hover:text-primary text-lg font-medium text-gray-900 transition-colors"
                      >
                        {registration.registrantFirstName}{" "}
                        {registration.registrantLastName}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                        <a
                          href={`mailto:${registration.registrantEmail}`}
                          className="hover:text-primary"
                        >
                          {registration.registrantEmail}
                        </a>
                        {registration.registrantPhone && (
                          <a
                            href={`tel:${registration.registrantPhone}`}
                            className="hover:text-primary"
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${registrationStatusColors[registration.registrationStatus]}`}
                      >
                        {
                          registrationStatusLabels[
                            registration.registrationStatus
                          ]
                        }
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${paymentStatusColors[registration.paymentStatus]}`}
                      >
                        {paymentStatusLabels[registration.paymentStatus]}
                      </span>
                      {registration.siblingDiscountStatus &&
                        registration.siblingDiscountStatus !==
                          SiblingDiscountStatus.NONE && (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${siblingDiscountStatusColors[registration.siblingDiscountStatus]}`}
                          >
                            {
                              siblingDiscountStatusLabels[
                                registration.siblingDiscountStatus
                              ]
                            }
                          </span>
                        )}
                    </div>
                  </div>

                  {/* Participants Table */}
                  {registration.participants.length > 0 && (
                    <div className="dark:border-dark-border overflow-x-auto rounded-lg border border-gray-200">
                      <table className="dark:divide-dark-border w-full divide-y divide-gray-200">
                        <thead className="dark:bg-dark-background-secondary bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                              Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                              Ort
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                              Instrument
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                              Preiskategorie
                            </th>
                            {/* Custom Fields Headers */}
                            {showCustomFields &&
                              course.customFields?.map((field) => (
                                <th
                                  key={field.id}
                                  className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
                                >
                                  {field.fieldName}
                                </th>
                              ))}
                          </tr>
                        </thead>
                        <tbody className="dark:divide-dark-border dark:bg-dark-surface divide-y divide-gray-200 bg-white">
                          {registration.participants.map((participant) => (
                            <tr key={participant.id}>
                              <td className="dark:text-dark-text px-4 py-3 text-sm font-medium whitespace-nowrap text-gray-900">
                                {participant.firstName} {participant.lastName}
                              </td>
                              <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                                {participant.city || "–"}
                              </td>
                              <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                                {participant.instrument || "–"}
                              </td>
                              <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                                {participant.priceOption || "–"}
                              </td>
                              {/* Custom Fields Values */}
                              {showCustomFields &&
                                course.customFields?.map((field) => (
                                  <td
                                    key={field.id}
                                    className="px-4 py-3 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400"
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
                    <span className="text-gray-500 dark:text-gray-400">
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
                        <span className="text-gray-600 dark:text-gray-400">
                          Rechnungsnr.:{" "}
                          <span className="font-mono">
                            {registration.invoiceId}
                          </span>
                        </span>
                      )}
                      <span className="dark:text-dark-text font-semibold text-gray-900">
                        Gesamt: {registration.totalPrice.toFixed(2)} €
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
                  {registration.notes && (
                    <div className="dark:bg-dark-background-secondary mt-3 rounded-lg bg-gray-50 p-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Anmerkungen:</span>{" "}
                        {registration.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Results count */}
        {filteredRegistrations.length > 0 && (
          <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
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

      {/* Bulk Invoice Modal */}
      <BulkInvoiceModal
        isOpen={showBulkInvoiceModal}
        onClose={() => setShowBulkInvoiceModal(false)}
        courseId={courseId}
        course={course}
        registrations={filteredRegistrations}
      />
    </main>
  );
}
