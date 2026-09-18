"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import {
  RegistrationStatus,
  SiblingDiscountStatus,
} from "~/generated/prisma/enums";
import { useToast } from "@/app/_components/ui/toast";
import {
  DOWN_PAYMENT_STATE_LABELS,
  downPaymentState,
  registrantMayCancelDownPayment,
} from "@/lib/course-down-payment";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Eye,
  Edit,
  X,
  Download,
} from "lucide-react";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import PublicPage from "@/app/_components/general/public-page";
import { headMeta } from "@/app/_components/programmheft/page-head";
import { PageSection } from "@/app/_components/programmheft/page-section";
import { formatEuro } from "@/lib/invoice-document";
import { Heading } from "@/app/_components/programmheft/section-head";
import { Note } from "@/app/_components/programmheft/note";
import { Tag, type TagTone } from "@/app/_components/programmheft/tag";
import { ValueTable } from "@/app/_components/programmheft/value-table";
import { ButtonLink } from "@/app/_components/programmheft/button-link";
import { cn } from "@/lib/utils";

/**
 * Schaltflächen-Stimmen des Programmhefts, lokal wiederholt wie auf den
 * übrigen öffentlichen Formularseiten (z. B. /anmeldung-verwalten).
 */
const BTN_PRIMARY =
  "bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper semi-condensed inline-flex min-h-12 items-center justify-center gap-2 px-6 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
const BTN_OUTLINE =
  "border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night semi-condensed inline-flex min-h-12 items-center justify-center gap-2 border-2 px-6 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
/** Reihen-Aktionen wie im kompakten Seitenkopf (`headMeta.action`), 40px hoch. */
const BTN_ROW = headMeta.action;

const META_LINE =
  "flex flex-col gap-2 text-[0.9375rem] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1 sm:gap-y-2";

const STATUS_TAG: Record<RegistrationStatus, { label: string; tone: TagTone }> =
  {
    CONFIRMED: { label: "Teilnahme Bestätigt", tone: "inverse" },
    WAITLIST: { label: "Auf Warteliste", tone: "orange" },
    CANCELLED: { label: "Storniert", tone: "cancelled" },
  };

/**
 * Aus Sicht der Anmeldenden, nicht des Teams: Hier ist nichts zu prüfen,
 * sondern etwas wird geprüft. „Rabatt prüfen“ steht weiterhin im Dashboard,
 * wo es tatsächlich eine Aufgabe ist.
 */
const DISCOUNT_TAG: Partial<
  Record<SiblingDiscountStatus, { label: string; tone: TagTone }>
> = {
  PENDING: { label: "Rabatt wird geprüft", tone: "orange" },
  APPROVED: { label: "Rabatt genehmigt", tone: "inverse" },
  REJECTED: { label: "Rabatt abgelehnt", tone: "ink" },
};

/** Auswahl-Schaltfläche wie die Register-Reihe im Filter: gefüllt, wenn aktiv. */
/**
 * Statusfilter als Register, wie die Bereichswahl in den Einstellungen: Beide
 * tun dasselbe — eins aus N über einer einzigen Liste wählen — und sahen
 * bisher völlig verschieden aus (Kasten mit 2px-Rahmen gegen Register mit
 * Unterstrich). Die Kastenform bleibt den Werkzeugleisten auf Termine und
 * Aktuelles vorbehalten, wo ungleichartige Bedienelemente nebeneinander
 * stehen und sich voneinander absetzen müssen.
 *
 * `aria-pressed` bleibt: Hier wird gefiltert, nicht navigiert — nur das
 * Aussehen wird angeglichen, nicht die Bedeutung.
 */
function choiceButtonClass(active: boolean) {
  return cn(
    "semi-condensed inline-flex shrink-0 items-center gap-2 border-b-[3px] px-3 py-3 text-[1.0625rem] font-semibold whitespace-nowrap transition-colors",
    active
      ? "border-primary text-ink dark:text-night-text"
      : "text-dark hover:border-ink hover:text-ink dark:text-night-muted dark:hover:border-night-text dark:hover:text-night-text border-transparent",
  );
}

export default function MyRegistrationsPage() {
  const router = useRouter();
  const toast = useToast();
  const { data: session, isPending: sessionLoading } = useSession();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<
    RegistrationStatus | undefined
  >(undefined);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [registrationToCancel, setRegistrationToCancel] = useState<
    string | null
  >(null);
  const [cancelError, setCancelError] = useState("");
  const utils = api.useUtils();

  const cancelMutation = api.registrations.cancel.useMutation({
    onSuccess: () => {
      setCancelModalOpen(false);
      setRegistrationToCancel(null);
      setCancelError("");
      toast.success("Anmeldung erfolgreich storniert");
      void utils.registrations.getMyRegistrations.invalidate();
    },
    onError: (err) => {
      setCancelError(err.message || "Ein Fehler ist aufgetreten.");
      toast.error(err.message || "Ein Fehler ist aufgetreten.");
    },
  });

  const confirmAtFullPriceMutation =
    api.registrations.confirmAtFullPrice.useMutation({
      onSuccess: () => {
        toast.success("Anmeldung zum vollen Preis bestätigt");
        void utils.registrations.getMyRegistrations.invalidate();
      },
      onError: (err) => {
        toast.error(err.message || "Fehler beim Bestätigen der Anmeldung");
      },
    });

  const handleCancelClick = (registrationId: string) => {
    setRegistrationToCancel(registrationId);
    setCancelModalOpen(true);
    setCancelError("");
  };

  const confirmCancel = () => {
    if (registrationToCancel) {
      cancelMutation.mutate({ id: registrationToCancel });
    }
  };

  const { data, isLoading } = api.registrations.getMyRegistrations.useQuery(
    {
      page,
      limit: 10,
      status: statusFilter,
    },
    {
      enabled: !!session?.user,
    },
  );

  const { data: myInvoices } = api.invoices.myInvoices.useQuery(undefined, {
    enabled: !!session?.user,
  });

  // Newest first from the server, so the first hit per registration is the one
  // currently in force (a storno's successor supersedes its predecessor).
  const invoiceByRegistration = new Map(
    (myInvoices ?? [])
      .filter((invoice) => invoice.registrationId)
      .reverse()
      .map((invoice) => [invoice.registrationId!, invoice] as const),
  );

  if (!sessionLoading && !session?.user) {
    router.push("/login?redirect=%2Fregistrations");
    return null;
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getEditDeadlineInfo = (
    registration: NonNullable<typeof data>["registrations"][0],
  ) => {
    const now = new Date();
    const courseStart = new Date(registration.course.startDate);
    const deadline = registration.course.registrationDeadline
      ? new Date(registration.course.registrationDeadline)
      : null;

    if (registration.registrationStatus === RegistrationStatus.CANCELLED) {
      return { canEdit: false, message: "Stornierte Anmeldung", urgent: false };
    }

    if (courseStart <= now) {
      return {
        canEdit: false,
        message: "Kurs hat bereits begonnen",
        urgent: false,
      };
    }

    if (deadline && deadline <= now) {
      return {
        canEdit: false,
        message: "Anmeldefrist abgelaufen",
        urgent: false,
      };
    }

    const editUntil = deadline || courseStart;
    const daysUntil = Math.ceil(
      (editUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntil <= 3) {
      return {
        canEdit: true,
        message: `Noch ${daysUntil} Tag${daysUntil === 1 ? "" : "e"} bearbeitbar`,
        urgent: true,
      };
    }

    if (daysUntil <= 7) {
      return {
        canEdit: true,
        message: `Bearbeitbar bis ${formatDate(editUntil)}`,
        urgent: true,
      };
    }

    return {
      canEdit: true,
      message: `Bearbeitbar bis ${formatDate(editUntil)}`,
      urgent: false,
    };
  };

  if (sessionLoading || isLoading) {
    return (
      <div className="bg-paper dark:bg-night text-ink dark:text-night-text flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="semi-condensed text-lg font-semibold">Lädt...</p>
      </div>
    );
  }

  return (
    <PublicPage
      title="Meine Anmeldungen"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Dashboard", href: "/dashboard" },
        { label: "Meine Anmeldungen" },
      ]}
      heroSize="compact"
      description={<p>Übersicht über alle deine Anmeldungen.</p>}
    >
      <PageSection>
        <div
          role="group"
          aria-label="Nach Status filtern"
          className="border-ink dark:border-night-text -mx-1 flex gap-1 overflow-x-auto border-b-2 px-1 sm:gap-2"
        >
          <button
            type="button"
            onClick={() => setStatusFilter(undefined)}
            aria-pressed={statusFilter === undefined}
            className={choiceButtonClass(statusFilter === undefined)}
          >
            Alle
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter(RegistrationStatus.CONFIRMED)}
            aria-pressed={statusFilter === RegistrationStatus.CONFIRMED}
            className={choiceButtonClass(
              statusFilter === RegistrationStatus.CONFIRMED,
            )}
          >
            Bestätigt
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter(RegistrationStatus.WAITLIST)}
            aria-pressed={statusFilter === RegistrationStatus.WAITLIST}
            className={choiceButtonClass(
              statusFilter === RegistrationStatus.WAITLIST,
            )}
          >
            Warteliste
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter(RegistrationStatus.CANCELLED)}
            aria-pressed={statusFilter === RegistrationStatus.CANCELLED}
            className={choiceButtonClass(
              statusFilter === RegistrationStatus.CANCELLED,
            )}
          >
            Storniert
          </button>
        </div>

        {data?.registrations && data.registrations.length > 0 ? (
          <ul className="border-ink dark:border-night-text mt-10 border-t-2">
            {data.registrations.map((registration) => {
              const editInfo = getEditDeadlineInfo(registration);
              const statusTag = STATUS_TAG[registration.registrationStatus];
              // Bei einer stornierten Anmeldung gibt es keinen Rabatt mehr:
              // Ein „wird geprüft“ daneben verspricht eine Entscheidung, die
              // nicht mehr kommt.
              const cancelled =
                registration.registrationStatus ===
                RegistrationStatus.CANCELLED;
              const discountTag =
                !cancelled &&
                registration.siblingDiscountStatus &&
                registration.siblingDiscountStatus !==
                  SiblingDiscountStatus.NONE
                  ? DISCOUNT_TAG[registration.siblingDiscountStatus]
                  : null;
              const invoice = invoiceByRegistration.get(registration.id);
              const mayCancelDownPayment =
                registrantMayCancelDownPayment(registration);

              const priceRows: { label: ReactNode; value: ReactNode }[] = [];
              if (
                registration.siblingDiscountStatus ===
                  SiblingDiscountStatus.APPROVED &&
                registration.siblingDiscountApplied &&
                registration.originalTotalPrice &&
                registration.siblingDiscountAmount
              ) {
                priceRows.push({
                  label: "Zwischensumme",
                  value: (
                    <span className="line-through decoration-2">
                      {formatEuro(registration.originalTotalPrice)}
                    </span>
                  ),
                });
                priceRows.push({
                  label: "Geschwisterkindrabatt (20% pro weiteres Kind)",
                  value: `- ${formatEuro(registration.siblingDiscountAmount)}`,
                });
              }
              priceRows.push({
                label: "Gesamtpreis",
                value: formatEuro(registration.totalPrice),
              });

              return (
                <li
                  key={registration.id}
                  className="border-rule dark:border-night-rule border-b py-8"
                >
                  <div className="lg:flex lg:items-start lg:justify-between lg:gap-10">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="condensed text-ink dark:text-night-text text-[1.5rem] leading-tight font-bold">
                          {registration.course.title}
                        </h2>
                        <Tag tone={statusTag.tone}>{statusTag.label}</Tag>
                        {discountTag ? (
                          <Tag tone={discountTag.tone}>{discountTag.label}</Tag>
                        ) : null}
                        {/* Umrandet: nur der Stand. Was „aufgeteilt“ heißt,
                            erklärt die Detailseite mit Verweis auf den
                            anderen Teil. */}
                        {registration.registrationGroupId ? (
                          <Tag tone="muted">Aufgeteilt</Tag>
                        ) : null}
                        {registration.registrationStatus ===
                          RegistrationStatus.WAITLIST &&
                        registration.promotionOfferExpiresAt &&
                        new Date(registration.promotionOfferExpiresAt) >
                          new Date() ? (
                          <Tag tone="orange">Nachrücken möglich</Tag>
                        ) : null}
                      </div>

                      <div className={cn(META_LINE, "mt-3")}>
                        <span className="inline-flex items-center gap-2">
                          <Calendar className={headMeta.icon} aria-hidden />
                          {formatDate(registration.course.startDate)} –{" "}
                          {formatDate(registration.course.endDate)}
                        </span>
                        {registration.course.location && (
                          <>
                            <span className={headMeta.separator} aria-hidden>
                              ·
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <MapPin className={headMeta.icon} aria-hidden />
                              {registration.course.location.name},{" "}
                              {registration.course.location.city}
                            </span>
                          </>
                        )}
                        <span className={headMeta.separator} aria-hidden>
                          ·
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <Users className={headMeta.icon} aria-hidden />
                          {registration.participants.length} Teilnehmer
                        </span>
                      </div>

                      <p
                        className={cn(
                          "mt-3 inline-flex items-center gap-2 text-sm font-semibold",
                          editInfo.urgent
                            ? "on-orange bg-primary text-ink px-1.5 py-0.5"
                            : "text-dark dark:text-night-muted",
                        )}
                      >
                        <Clock className="h-4 w-4 shrink-0" aria-hidden />
                        {editInfo.message}
                      </p>

                      {/* Teilnehmer */}
                      <div className="mt-6">
                        <h3 className="semi-condensed text-ink dark:text-night-text text-sm font-semibold">
                          Teilnehmer:
                        </h3>
                        <ul className="mt-2 space-y-1">
                          {registration.participants.map((participant) => (
                            <li
                              key={participant.id}
                              className="text-dark dark:text-night-muted text-sm"
                            >
                              {participant.firstName} {participant.lastName}
                              {participant.instrument
                                ? ` (${participant.instrument})`
                                : ""}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {invoice ? (
                        <p className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                          <span className="text-dark dark:text-night-muted">
                            Rechnungsnr.{" "}
                            <span className="tabular-nums">
                              {invoice.invoiceNumber}
                            </span>
                          </span>
                          <a
                            href={`/api/invoices/${invoice.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="link-ink inline-flex items-center gap-1.5"
                          >
                            <Download className="h-4 w-4" aria-hidden />
                            Rechnung herunterladen
                            <span className="sr-only">
                              {" "}
                              (PDF, öffnet in neuem Tab)
                            </span>
                          </a>
                        </p>
                      ) : null}

                      {/* Rabatt abgelehnt */}
                      {registration.siblingDiscountStatus ===
                        SiblingDiscountStatus.REJECTED && (
                        <Note tone="error" className="mt-6">
                          <p>
                            Dein Antrag auf Geschwisterkindrabatt wurde
                            abgelehnt. Du kannst die Anmeldung zum vollen Preis
                            bestätigen oder stornieren.
                          </p>
                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                confirmAtFullPriceMutation.mutate({
                                  registrationId: registration.id,
                                })
                              }
                              disabled={confirmAtFullPriceMutation.isPending}
                              className={BTN_PRIMARY}
                            >
                              {confirmAtFullPriceMutation.isPending
                                ? "Wird bestätigt..."
                                : "Zum vollen Preis bestätigen"}
                            </button>
                            {mayCancelDownPayment && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleCancelClick(registration.id)
                                }
                                className={BTN_OUTLINE}
                              >
                                <X className="h-4 w-4" aria-hidden />
                                Stornieren
                              </button>
                            )}
                          </div>
                        </Note>
                      )}
                    </div>

                    {/* Preis und Aktionen stehen zusammen in der rechten
                        Spalte. Vorher klebte der Preis links unter dem Text
                        und die Schaltflächen weit rechts — dazwischen blieb
                        die halbe Zeile leer. */}
                    <div className="mt-6 flex shrink-0 flex-col gap-2 lg:mt-0 lg:w-80 lg:items-stretch">
                      <ValueTable rows={priceRows} />
                      {registration.downPaymentAmount ? (
                        <p className="text-dark dark:text-night-muted mb-2 text-xs">
                          davon Anzahlung{" "}
                          {formatEuro(registration.downPaymentAmount)} ·{" "}
                          {
                            DOWN_PAYMENT_STATE_LABELS[
                              downPaymentState(registration)
                            ]
                          }
                        </p>
                      ) : null}
                      <Link
                        href={`/registrations/${registration.id}`}
                        className={BTN_ROW}
                      >
                        <Eye className="h-4 w-4" aria-hidden />
                        Details
                      </Link>
                      {editInfo.canEdit && (
                        <Link
                          href={`/registrations/${registration.id}/edit`}
                          className={BTN_ROW}
                        >
                          <Edit className="h-4 w-4" aria-hidden />
                          Bearbeiten
                        </Link>
                      )}
                      {editInfo.canEdit && !mayCancelDownPayment && (
                        <p className="text-dark dark:text-night-muted text-center text-xs">
                          Stornierung über das Kursteam
                        </p>
                      )}
                      {editInfo.canEdit && mayCancelDownPayment && (
                        <button
                          type="button"
                          onClick={() => handleCancelClick(registration.id)}
                          className={BTN_ROW}
                        >
                          <X className="h-4 w-4" aria-hidden />
                          Stornieren
                        </button>
                      )}

                      <p className="text-dark dark:text-night-muted mt-1 text-center text-xs">
                        Angemeldet am {formatDate(registration.createdAt)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="border-ink dark:border-night-text mt-10 border-t-2 pt-10 text-center">
            <h2 className="condensed text-ink dark:text-night-text text-[1.75rem] leading-none font-extrabold">
              Keine Anmeldungen gefunden
            </h2>
            {statusFilter !== undefined ? (
              <>
                <p className="text-dark dark:text-night-muted mx-auto mt-3 max-w-md text-base">
                  Für diesen Filter gibt es keine Anmeldungen.
                </p>
                <button
                  type="button"
                  onClick={() => setStatusFilter(undefined)}
                  className={cn(BTN_PRIMARY, "mt-6")}
                >
                  Filter zurücksetzen
                </button>
              </>
            ) : (
              <>
                <p className="text-dark dark:text-night-muted mx-auto mt-3 max-w-md text-base">
                  Du hast dich noch nicht für einen Kurs angemeldet.
                </p>
                <ButtonLink href="/termine" className="mt-6">
                  Kurse entdecken
                </ButtonLink>
              </>
            )}
          </div>
        )}

        {/* Cancel Confirmation Modal */}
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
                      setRegistrationToCancel(null);
                      setCancelError("");
                    }}
                    className={cn(BTN_OUTLINE, "flex-1")}
                  >
                    Abbrechen
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

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={BTN_OUTLINE}
            >
              Zurück
            </button>
            <span className="text-ink dark:text-night-text semi-condensed px-2 text-sm font-semibold">
              Seite {page} von {data.pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
              disabled={page === data.pages}
              className={BTN_OUTLINE}
            >
              Weiter
            </button>
          </div>
        )}
      </PageSection>
    </PublicPage>
  );
}
