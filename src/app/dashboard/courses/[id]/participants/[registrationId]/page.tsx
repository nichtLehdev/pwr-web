"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import {
  RegistrationStatus,
  PaymentStatus,
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
} from "lucide-react";
import { isParticipantUnder18 } from "@/lib/participant-utils";

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
  NONE: "Kein Rabatt",
  PENDING: "Rabatt prüfen",
  APPROVED: "Rabatt genehmigt",
  REJECTED: "Rabatt abgelehnt",
};

const siblingDiscountStatusColors: Record<SiblingDiscountStatus, string> = {
  NONE: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  PENDING:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
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
  const value = fields[fieldName];
  if (value === null || value === undefined) return "–";
  if (typeof value === "boolean") {
    return value ? "Ja" : "Nein";
  }
  return String(value);
}

export default function RegistrationDetailPage() {
  const params = useParams();
  const courseId = params.id as string;
  const registrationId = params.registrationId as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const toast = useToast();

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

  const utils = api.useUtils();

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

  const { data: userPermissions } = api.permissions.getMyPermissions.useQuery(
    undefined,
    { enabled: !!session?.user?.id },
  );

  const hasApprovePermission =
    Array.isArray(userPermissions) &&
    userPermissions.some(
      (perm: string) => perm === "courses.approve" || perm === "courses.manage",
    );

  const canApproveDiscount =
    profile &&
    hasApprovePermission &&
    registration?.siblingDiscountStatus === SiblingDiscountStatus.PENDING;

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
      <main className="dark:bg-dark-background min-h-screen bg-gray-50">
        <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
          </div>
        </div>
      </main>
    );
  }

  if (!registration || !course) {
    return (
      <main className="dark:bg-dark-background min-h-screen bg-gray-50">
        <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="py-12 text-center">
            <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
              Anmeldung nicht gefunden
            </h1>
            <p className="dark:text-dark-muted mt-2 text-gray-600">
              Die angeforderte Anmeldung konnte nicht gefunden werden.
            </p>
            <Link
              href={`/dashboard/courses/${courseId}/participants`}
              className="text-primary mt-4 inline-block hover:underline"
            >
              Zurück zur Teilnehmerliste
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="dark:bg-dark-background min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm">
          <ol className="flex items-center gap-2">
            <li>
              <Link
                href="/dashboard"
                className="dark:text-dark-muted dark:hover:text-primary hover:text-primary text-gray-500"
              >
                Dashboard
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li>
              <Link
                href="/dashboard/courses"
                className="dark:text-dark-muted dark:hover:text-primary hover:text-primary text-gray-500"
              >
                Kurse
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li>
              <Link
                href={`/dashboard/courses/${courseId}`}
                className="dark:text-dark-muted dark:hover:text-primary hover:text-primary text-gray-500"
              >
                {course.title}
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li>
              <Link
                href={`/dashboard/courses/${courseId}/participants`}
                className="dark:text-dark-muted dark:hover:text-primary hover:text-primary text-gray-500"
              >
                Teilnehmer
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">
              Anmeldung Details
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
              Anmeldung Details
            </h1>
            <p className="dark:text-dark-muted mt-2 text-gray-600">
              {registration.registrantFirstName}{" "}
              {registration.registrantLastName}
              {" • "}
              {course.title}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${registrationStatusColors[registration.registrationStatus]}`}
            >
              {registrationStatusLabels[registration.registrationStatus]}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${paymentStatusColors[registration.paymentStatus]}`}
            >
              {paymentStatusLabels[registration.paymentStatus]}
            </span>
          </div>
        </div>

        {/* Registrant Info */}
        <div className="dark:bg-dark-surface dark:border-dark-border mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-6 dark:border-gray-700">
            <h2 className="text-dark dark:text-dark-text flex items-center gap-2 text-lg font-semibold">
              <UserIcon className="text-primary h-5 w-5" />
              Anmelder
            </h2>
          </div>
          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name
                </p>
                <p className="text-dark dark:text-dark-text mt-1">
                  {registration.registrantFirstName}{" "}
                  {registration.registrantLastName}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  E-Mail
                </p>
                <a
                  href={`mailto:${registration.registrantEmail}`}
                  className="text-primary mt-1 inline-flex items-center gap-1 hover:underline"
                >
                  <MailIcon className="h-4 w-4" />
                  {registration.registrantEmail}
                </a>
              </div>
              {registration.registrantPhone && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Telefon
                  </p>
                  <a
                    href={`tel:${registration.registrantPhone}`}
                    className="text-primary mt-1 inline-flex items-center gap-1 hover:underline"
                  >
                    <PhoneIcon className="h-4 w-4" />
                    {registration.registrantPhone}
                  </a>
                </div>
              )}
              {registration.registrantStreet && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Adresse
                  </p>
                  <p className="text-dark dark:text-dark-text mt-1">
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
        <div className="dark:bg-dark-surface dark:border-dark-border mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-6 dark:border-gray-700">
            <h2 className="text-dark dark:text-dark-text flex items-center gap-2 text-lg font-semibold">
              <WalletIcon className="text-primary h-5 w-5" />
              Preisübersicht
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {registration.siblingDiscountApplied &&
                registration.originalTotalPrice &&
                registration.siblingDiscountAmount && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Zwischensumme:
                      </span>
                      <span className="text-gray-900 line-through dark:text-gray-100">
                        {registration.originalTotalPrice.toFixed(2)} €
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-green-600 dark:text-green-400">
                        Geschwisterkindrabatt (20%):
                      </span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        -{registration.siblingDiscountAmount.toFixed(2)} €
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
                      <span className="text-dark dark:text-dark-text font-semibold">
                        Gesamtbetrag:
                      </span>
                      <span className="text-primary text-xl font-bold">
                        {registration.totalPrice.toFixed(2)} €
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Rabattstatus:
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${siblingDiscountStatusColors[registration.siblingDiscountStatus]}`}
                      >
                        {
                          siblingDiscountStatusLabels[
                            registration.siblingDiscountStatus
                          ]
                        }
                      </span>
                    </div>
                    {canApproveDiscount && (
                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() =>
                            approveDiscountMutation.mutate({
                              registrationId: registration.id,
                            })
                          }
                          disabled={approveDiscountMutation.isPending}
                          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
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
                          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          Rabatt ablehnen
                        </button>
                      </div>
                    )}
                  </div>
                )}
              {!registration.siblingDiscountApplied && (
                <div className="flex items-center justify-between">
                  <span className="text-dark dark:text-dark-text font-semibold">
                    Gesamtbetrag:
                  </span>
                  <span className="text-primary text-xl font-bold">
                    {registration.totalPrice.toFixed(2)} €
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-6 dark:border-gray-700">
            <h2 className="text-dark dark:text-dark-text flex items-center gap-2 text-lg font-semibold">
              <UsersIcon className="text-primary h-5 w-5" />
              Teilnehmer ({registration.participants.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {registration.participants.map((participant) => {
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

              // Check if this group is eligible for discount
              const eligibleParticipants = siblingGroup.filter(
                (p) => p.birthDate && isParticipantUnder18(p.birthDate),
              );
              const isEligibleForDiscount = eligibleParticipants.length > 1;

              return (
                <div
                  key={participant.id}
                  className={`p-6 ${
                    isInGroup ? "bg-green-50 dark:bg-green-900/10" : ""
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-dark dark:text-dark-text font-semibold">
                        {participant.firstName} {participant.lastName}
                      </h3>
                      {isInGroup && (
                        <span className="rounded-full bg-green-600 px-2 py-1 text-xs font-medium text-white dark:bg-green-700">
                          Geschwistergruppe
                        </span>
                      )}
                      {isInGroup && course.allowSiblingDiscount && (
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            isEligibleForDiscount
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}
                        >
                          {isEligibleForDiscount
                            ? "Rabatt berechtigt"
                            : "Rabatt nicht berechtigt"}
                        </span>
                      )}
                    </div>
                    <span className="dark:bg-dark-background-secondary rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                      {getParticipantDisplayName(
                        participant.firstName,
                        participant.lastName,
                        participant.id,
                      )}
                    </span>
                  </div>
                  {isInGroup && groupMembers.length > 0 && (
                    <div className="mb-3 space-y-1">
                      <div className="text-xs text-green-700 dark:text-green-400">
                        Geschwister mit: {groupMembers.join(", ")}
                      </div>
                      {course.allowSiblingDiscount && (
                        <div
                          className={`text-xs ${
                            isEligibleForDiscount
                              ? "text-green-700 dark:text-green-400"
                              : "text-yellow-700 dark:text-yellow-400"
                          }`}
                        >
                          {isEligibleForDiscount
                            ? `✓ Gruppe berechtigt für Geschwisterkindrabatt (${eligibleParticipants.length} Minderjährige)`
                            : "⚠ Gruppe nicht berechtigt für Geschwisterkindrabatt (mindestens 2 Minderjährige erforderlich)"}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="grid gap-4 text-sm md:grid-cols-2">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Geburtsdatum:
                      </span>
                      <p className="text-gray-600 dark:text-gray-400">
                        {formatDate(participant.birthDate)}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Wohnort:
                      </span>
                      <p className="text-gray-600 dark:text-gray-400">
                        {participant.city}
                      </p>
                    </div>
                    {participant.instrument && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          Instrument:
                        </span>
                        <p className="text-gray-600 dark:text-gray-400">
                          {participant.instrument}
                        </p>
                      </div>
                    )}
                    {participant.priceOption && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          Preiskategorie:
                        </span>
                        <p className="text-gray-600 dark:text-gray-400">
                          {participant.priceOption}
                        </p>
                      </div>
                    )}
                    {course.customFields?.map((field) => (
                      <div key={field.id}>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {field.fieldName}:
                        </span>
                        <p className="text-gray-600 dark:text-gray-400">
                          {getCustomFieldValue(participant, field.fieldName)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
