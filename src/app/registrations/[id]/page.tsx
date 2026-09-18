"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useRegistrationAccessToken,
  withAccessToken,
} from "@/lib/registration-access";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { RegistrationStatus } from "~/generated/prisma/enums";
import { useToast } from "@/app/_components/ui/toast";
import { coursePath } from "@/lib/slug";
import {
  ArrowLeftIcon,
  CircleXIcon,
  DownloadIcon,
  EditIcon,
} from "lucide-react";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import LocationNavigationLink from "@/app/_components/general/location-navigation-link";
import { participantPriceOptionLabel } from "@/lib/course-price-options";
import { registrantMayCancelDownPayment } from "@/lib/course-down-payment";
import { RegistrationDownPaymentCard } from "@/app/_components/events/registration-down-payment-card";
import { PromotionOfferCard } from "@/app/_components/events/promotion-offer-card";
import PublicPage from "@/app/_components/general/public-page";
import { headMeta } from "@/app/_components/programmheft/page-head";
import { PageSection } from "@/app/_components/programmheft/page-section";
import {
  Heading,
  ArrowLink,
} from "@/app/_components/programmheft/section-head";
import { Note } from "@/app/_components/programmheft/note";
import { Tag, type TagTone } from "@/app/_components/programmheft/tag";
import { ValueTable } from "@/app/_components/programmheft/value-table";
import { formatEuro } from "@/lib/invoice-document";
import { cn } from "@/lib/utils";
import { formatBerlin } from "@/lib/berlin-time";

const BTN_PRIMARY =
  "bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper semi-condensed inline-flex min-h-12 items-center justify-center gap-2 px-6 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
const BTN_OUTLINE =
  "border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night semi-condensed inline-flex min-h-12 items-center justify-center gap-2 border-2 px-6 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const STATUS_TAG: Record<RegistrationStatus, { label: string; tone: TagTone }> =
  {
    CONFIRMED: { label: "Teilnahme Bestätigt", tone: "inverse" },
    WAITLIST: { label: "Auf Warteliste", tone: "orange" },
    CANCELLED: { label: "Storniert", tone: "cancelled" },
  };

/** Bezeichnung über einem schreibgeschützten Wert. */
function InfoField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <p className={headMeta.label}>{label}</p>
      <p className="text-ink dark:text-night-text mt-1">{children}</p>
    </div>
  );
}

export default function ViewRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const registrationId = params.id as string;
  const utils = api.useUtils();
  const toast = useToast();
  const accessToken = useRegistrationAccessToken();
  // Magic-link visitors have no account area to return to.
  const isGuestAccess = !!accessToken;

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const { data: registration, isLoading: registrationLoading } =
    api.registrations.getById.useQuery(
      { id: registrationId, accessToken },
      { enabled: !!registrationId },
    );

  const { data: myInvoices } = api.invoices.myInvoices.useQuery(undefined, {
    enabled: !!session?.user,
  });

  // All of them, not just the current one: an earlier invoice that was
  // superseded still belongs in the recipient's own records.
  const invoices = (myInvoices ?? []).filter(
    (invoice) => invoice.registrationId === registrationId,
  );

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

  const cancelMutation = api.registrations.cancel.useMutation({
    onSuccess: () => {
      setCancelModalOpen(false);
      setCancelError("");
      toast.success("Anmeldung erfolgreich storniert");
      void utils.registrations.getMyRegistrations.invalidate();
      void utils.registrations.getById.invalidate({ id: registrationId });
    },
    onError: (err) => {
      setCancelError(err.message || "Ein Fehler ist aufgetreten.");
      toast.error(err.message || "Ein Fehler ist aufgetreten.");
    },
  });

  useEffect(() => {
    if (!isGuestAccess && !sessionLoading && !session?.user) {
      router.push("/login");
    }
  }, [session, sessionLoading, router, isGuestAccess]);

  // With a magic link the server already verified ownership before returning
  // anything, so having the record in hand is the proof.
  const isOwner =
    isGuestAccess || registration?.registrantEmail === session?.user?.email;

  const canEdit = () => {
    if (!registration) return false;
    const now = new Date();
    const courseStart = new Date(registration.course.startDate);
    const deadline = registration.course.registrationDeadline
      ? new Date(registration.course.registrationDeadline)
      : null;

    if (courseStart <= now) return false;
    if (deadline && deadline <= now) return false;
    if (registration.registrationStatus === RegistrationStatus.CANCELLED)
      return false;

    return true;
  };

  const canCancel = () => {
    if (!registration) return false;
    if (registration.registrationStatus === RegistrationStatus.CANCELLED)
      return false;
    // Mit Anzahlung storniert nur das Kursteam.
    if (!registrantMayCancelDownPayment(registration)) return false;

    const now = new Date();
    const deadline = registration.course.registrationDeadline
      ? new Date(registration.course.registrationDeadline)
      : null;

    if (deadline && deadline <= now) return false;

    return true;
  };

  const confirmCancel = () => {
    cancelMutation.mutate({ id: registrationId, accessToken });
  };

  const formatDate = (date: Date) => {
    return formatBerlin(date, "datumZweistellig");
  };

  const formatDateTime = (date: Date) => {
    return formatBerlin(date, "datumUhrzeit");
  };

  if (sessionLoading || registrationLoading) {
    return (
      <div className="bg-paper dark:bg-night text-ink dark:text-night-text flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="semi-condensed text-lg font-semibold">Lädt...</p>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="bg-paper dark:bg-night text-ink dark:text-night-text flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="condensed text-[1.75rem] leading-none font-extrabold">
            Anmeldung nicht gefunden
          </h1>
          {isGuestAccess ? (
            <>
              <p className="text-dark dark:text-night-muted mt-4">
                Dieser Zugangslink ist ungültig oder abgelaufen. Du kannst dir
                jederzeit einen neuen Link schicken lassen.
              </p>
              <Link
                href="/anmeldung-verwalten"
                className="link-ink mt-4 inline-block"
              >
                Neuen Zugangslink anfordern
              </Link>
            </>
          ) : (
            <Link href="/registrations" className="link-ink mt-4 inline-block">
              Zurück zur Übersicht
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="bg-paper dark:bg-night text-ink dark:text-night-text flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="condensed text-[1.75rem] leading-none font-extrabold">
            Keine Berechtigung
          </h1>
          <p className="text-dark dark:text-night-muted mt-4">
            Du kannst nur deine eigenen Anmeldungen einsehen.
          </p>
          <Link href="/registrations" className="link-ink mt-4 inline-block">
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const statusTag = STATUS_TAG[registration.registrationStatus];
  /** Storniert heißt: Die Rabattfrage ist erledigt, egal wie sie stand. */
  const storniert =
    registration.registrationStatus === RegistrationStatus.CANCELLED;

  const priceRows: { label: ReactNode; value: ReactNode }[] = [];
  const hasDiscountBreakdown =
    registration.siblingDiscountApplied &&
    registration.originalTotalPrice &&
    registration.siblingDiscountAmount;
  if (hasDiscountBreakdown) {
    priceRows.push({
      label: "Zwischensumme",
      value: formatEuro(registration.originalTotalPrice!),
    });
    priceRows.push({
      label: "Geschwisterkindrabatt (20% pro weiteres Kind)",
      value: `- ${formatEuro(registration.siblingDiscountAmount!)}`,
    });
  }
  priceRows.push({
    label: hasDiscountBreakdown ? "Gesamtpreis" : "Betrag",
    value: formatEuro(registration.totalPrice),
  });

  return (
    <PublicPage
      title="Anmeldung"
      heroTitle={registration.course.title}
      breadcrumbs={
        isGuestAccess
          ? [
              { label: "Start", href: "/" },
              { label: "Meine Anmeldung" },
              { label: "Details" },
            ]
          : [
              { label: "Start", href: "/" },
              { label: "Meine Anmeldungen", href: "/registrations" },
              { label: "Details" },
            ]
      }
      heroSize="compact"
      description={
        <div className="flex flex-wrap items-center gap-3">
          <Tag tone={statusTag.tone}>{statusTag.label}</Tag>
          {canEdit() && (
            <Link
              href={withAccessToken(
                `/registrations/${registration.id}/edit`,
                accessToken,
              )}
              className={headMeta.action}
            >
              <EditIcon className="h-4 w-4 shrink-0" aria-hidden />
              Bearbeiten
            </Link>
          )}
          {canCancel() && (
            <button
              type="button"
              onClick={() => setCancelModalOpen(true)}
              className={headMeta.action}
            >
              <CircleXIcon className="h-4 w-4 shrink-0" aria-hidden />
              Stornieren
            </button>
          )}
        </div>
      }
    >
      <PageSection>
        <div className="space-y-10">
          {registration.promotionOffer && (
            <PromotionOfferCard
              registrationId={registration.id}
              accessToken={accessToken ?? undefined}
              course={registration.course}
              participants={registration.participants}
              offer={registration.promotionOffer}
              onChanged={() => {
                void utils.registrations.getById.invalidate({
                  id: registrationId,
                });
                void utils.registrations.getMyRegistrations.invalidate();
              }}
            />
          )}

          {registration.groupParts.length > 0 && (
            <Note tone="important" title="Aufgeteilte Anmeldung">
              <p>
                Es waren nicht genug Plätze für alle frei. Die übrigen
                Teilnehmer stehen in einer eigenen Anmeldung:
              </p>
              <ul className="mt-3 space-y-2">
                {registration.groupParts.map((part) => (
                  <li
                    key={part.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1"
                  >
                    <Tag tone="ink">
                      {STATUS_TAG[part.registrationStatus].label}
                    </Tag>
                    <span>
                      {part.participants
                        .map((p) => `${p.firstName} ${p.lastName}`)
                        .join(", ")}
                    </span>
                    <Link
                      href={withAccessToken(
                        `/registrations/${part.id}`,
                        part.accessToken ?? undefined,
                      )}
                      className="link-ink"
                    >
                      Ansehen
                    </Link>
                  </li>
                ))}
              </ul>
            </Note>
          )}

          <div>
            <Heading as="h2" size="list" rule>
              Kursdetails
            </Heading>
            <div className="mt-4 grid gap-6 text-sm sm:grid-cols-2">
              <InfoField label="Zeitraum">
                {formatDate(registration.course.startDate)} –{" "}
                {formatDate(registration.course.endDate)}
              </InfoField>
              {registration.course.location && (
                <InfoField label="Ort">
                  {registration.course.location.name},{" "}
                  {registration.course.location.city}
                  {/* Eigener Block, sonst wirkt `mt-1` nicht. */}
                  <span className="mt-1 block">
                    <LocationNavigationLink
                      location={registration.course.location}
                      variant="inline"
                    />
                  </span>
                </InfoField>
              )}
              {registration.course.registrationDeadline && (
                <InfoField label="Anmeldefrist">
                  {formatDate(registration.course.registrationDeadline)}
                </InfoField>
              )}
              <InfoField label="Angemeldet am">
                {formatDateTime(registration.createdAt)}
              </InfoField>
            </div>
            <ArrowLink href={coursePath(registration.course)} className="mt-5">
              Zur Kursseite
            </ArrowLink>
          </div>

          <div>
            <Heading as="h2" size="list" rule>
              Anmelder
            </Heading>
            <div className="mt-4 grid gap-6 text-sm sm:grid-cols-2">
              <InfoField label="Name">
                {registration.registrantFirstName}{" "}
                {registration.registrantLastName}
              </InfoField>
              <InfoField label="E-Mail">
                {registration.registrantEmail}
              </InfoField>
              {registration.registrantPhone && (
                <InfoField label="Telefon">
                  {registration.registrantPhone}
                </InfoField>
              )}
            </div>
          </div>

          {registration.useSeparateBilling && (
            <div>
              <Heading as="h2" size="list" rule>
                Rechnungsadresse
              </Heading>
              <div className="mt-4 grid gap-6 text-sm sm:grid-cols-2">
                {registration.billingCompany && (
                  <InfoField label="Firma/Organisation">
                    {registration.billingCompany}
                  </InfoField>
                )}
                {(registration.billingFirstName ||
                  registration.billingLastName) && (
                  <InfoField label="Name">
                    {registration.billingFirstName}{" "}
                    {registration.billingLastName}
                  </InfoField>
                )}
                {registration.billingEmail && (
                  <InfoField label="E-Mail">
                    {registration.billingEmail}
                  </InfoField>
                )}
                {(registration.billingStreet || registration.billingCity) && (
                  <InfoField label="Adresse" className="sm:col-span-2">
                    {registration.billingStreet && (
                      <>
                        {registration.billingStreet}
                        <br />
                      </>
                    )}
                    {registration.billingZipCode} {registration.billingCity}
                  </InfoField>
                )}
              </div>
            </div>
          )}

          <div>
            <Heading as="h2" size="list" rule>
              Teilnehmer ({registration.participants.length})
            </Heading>
            <ul className="border-rule dark:border-night-rule mt-4 border-t">
              {registration.participants.map((participant, index) => {
                const siblingGroup = registration.participants.filter(
                  (p) =>
                    p.siblingGroupId &&
                    p.siblingGroupId === participant.siblingGroupId,
                );
                const isInGroup = siblingGroup.length > 1;
                const groupMembers = siblingGroup
                  .map((p) => {
                    const idx = registration.participants.indexOf(p);
                    return idx !== index ? idx + 1 : null;
                  })
                  .filter((idx) => idx !== null);

                return (
                  <li
                    key={participant.id}
                    className="border-rule dark:border-night-rule border-b py-6 first:pt-0"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-ink dark:text-night-text font-semibold">
                          {participant.firstName} {participant.lastName}
                        </h3>
                        {isInGroup && (
                          <Tag tone="inverse">Geschwistergruppe</Tag>
                        )}
                      </div>
                      <Tag tone="inverse">
                        {getParticipantDisplayName(
                          participant.firstName,
                          participant.lastName,
                          participant.id,
                        )}
                      </Tag>
                    </div>
                    {isInGroup && groupMembers.length > 0 && (
                      <p className="text-dark dark:text-night-muted mt-2 text-xs">
                        Geschwister mit:{" "}
                        {siblingGroup
                          .filter((p) => p.id !== participant.id)
                          .map((p) =>
                            getParticipantDisplayName(
                              p.firstName,
                              p.lastName,
                              p.id,
                            ),
                          )
                          .join(", ")}
                      </p>
                    )}
                    <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
                      <InfoField label="Geburtsdatum">
                        {formatDate(participant.birthDate)}
                      </InfoField>
                      <InfoField label="Wohnort">{participant.city}</InfoField>
                      {participant.instrument && (
                        <InfoField label="Instrument">
                          {participant.instrument}
                        </InfoField>
                      )}
                      {participant.priceOption && (
                        <InfoField label="Preisoption">
                          {participantPriceOptionLabel(
                            participant,
                            registration.course.priceOptions,
                          )}
                        </InfoField>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <RegistrationDownPaymentCard
            registration={registration}
            course={registration.course}
          />

          <div>
            <Heading as="h2" size="list" rule>
              Preisübersicht
            </Heading>
            <p className="text-dark dark:text-night-muted mt-3 text-sm">
              {registration.participants.length} Teilnehmer
              {registration.participants.length !== 1 && ""}
            </p>
            <ValueTable className="mt-4" rows={priceRows} />
            {hasDiscountBreakdown &&
              !storniert &&
              registration.siblingDiscountStatus === "PENDING" && (
                <Note tone="info" className="mt-4">
                  <p>
                    ⏳ Ihr Rabattantrag wird derzeit geprüft. Sie erhalten eine
                    Benachrichtigung, sobald eine Entscheidung getroffen wurde.
                  </p>
                </Note>
              )}
            {hasDiscountBreakdown &&
              !storniert &&
              registration.siblingDiscountStatus === "APPROVED" && (
                <Note tone="info" className="mt-4">
                  <p>✓ Ihr Rabattantrag wurde genehmigt.</p>
                </Note>
              )}
            {hasDiscountBreakdown &&
              !storniert &&
              registration.siblingDiscountStatus === "REJECTED" && (
                <Note tone="error" className="mt-4">
                  <p>
                    ✗ Ihr Rabattantrag wurde leider abgelehnt. Der Preis wurde
                    auf den vollen Betrag angepasst.
                  </p>
                </Note>
              )}

            {registration.invoiceGenerated && registration.invoiceId && (
              <div className="border-rule dark:border-night-rule mt-4 border-t pt-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-dark dark:text-night-muted">
                    Rechnungsnummer
                  </span>
                  <span className="text-ink dark:text-night-text font-mono font-semibold">
                    {registration.invoiceId}
                  </span>
                </div>
                {registration.invoiceDate && (
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-dark dark:text-night-muted">
                      Rechnungsdatum
                    </span>
                    <span className="text-ink dark:text-night-text">
                      {formatBerlin(
                        registration.invoiceDate,
                        "datumZweistellig",
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}

            {invoices.length > 0 && (
              <ul className="border-rule dark:border-night-rule mt-4 border-t">
                {invoices.map((invoice) => (
                  <li
                    key={invoice.id}
                    className="border-rule dark:border-night-rule border-b py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-ink dark:text-night-text text-sm font-semibold">
                          Rechnung {invoice.invoiceNumber}
                        </p>
                        {invoice.dueDate && (
                          <p className="text-dark dark:text-night-muted text-xs">
                            zahlbar bis {formatBerlin(invoice.dueDate)}
                          </p>
                        )}
                      </div>
                      <a
                        href={`/api/invoices/${invoice.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="link-ink inline-flex shrink-0 items-center gap-1.5 text-sm"
                      >
                        <DownloadIcon className="h-4 w-4" aria-hidden />
                        PDF
                        <span className="sr-only">
                          {" "}
                          (PDF, öffnet in neuem Tab)
                        </span>
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {registration.notes && (
            <div>
              <Heading as="h2" size="list" rule>
                Anmerkungen
              </Heading>
              <p className="text-ink dark:text-night-text mt-4 whitespace-pre-wrap">
                {registration.notes}
              </p>
            </div>
          )}

          <div>
            <Link
              href={
                isGuestAccess
                  ? coursePath(registration.course)
                  : "/registrations"
              }
              className="semi-condensed text-primary-ink dark:text-primary inline-flex min-h-11 items-center gap-2 text-lg font-semibold underline-offset-4 hover:underline"
            >
              <ArrowLeftIcon className="h-5 w-5" aria-hidden />
              {isGuestAccess ? "Zur Kursseite" : "Zurück zur Übersicht"}
            </Link>
          </div>
        </div>

        {cancelModalOpen && (
          <ScrollableModal>
            <ScrollableModalCard
              maxW="md"
              className="border-ink dark:border-night-text rounded-none! border-2 shadow-none!"
            >
              <ScrollableModalBody>
                <Heading as="h2" size="list" className="text-[1.375rem]">
                  Anmeldung stornieren?
                </Heading>
                <p className="text-ink dark:text-night-text mt-4">
                  Bist du sicher, dass du diese Anmeldung stornieren möchtest?
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
                {cancelError && (
                  <Note tone="error" className="mt-4">
                    <p>{cancelError}</p>
                  </Note>
                )}
              </ScrollableModalBody>
              <ScrollableModalFooter className="border-rule dark:border-night-rule">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCancelModalOpen(false);
                      setCancelError("");
                    }}
                    className={cn(BTN_OUTLINE, "flex-1")}
                  >
                    Zurück
                  </button>
                  <button
                    type="button"
                    onClick={confirmCancel}
                    disabled={cancelMutation.isPending}
                    className={cn(BTN_PRIMARY, "flex-1")}
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
      </PageSection>
    </PublicPage>
  );
}
