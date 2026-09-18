"use client";

import { useEffect, useId, useRef, useState, type Ref } from "react";
import Link from "next/link";
import { api, type RouterOutputs } from "@/trpc/react";
import { Note } from "@/app/_components/programmheft/note";
import {
  ScrollableModal,
  ScrollableModalBody,
  ScrollableModalCard,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import { PROMOTION_OFFER_DAYS, promotionHaltText } from "@/lib/waitlist-offer";
import { formatBerlin } from "@/lib/berlin-time";

type PromotionSummary = RouterOutputs["registrations"]["promoteWaitlist"];

/** Knöpfe wie in der Kopfzeile der Teilnehmerseite. */
const BTN_PRIMARY =
  "bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const BTN_OUTLINE =
  "border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 items-center justify-center gap-2 border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const formatDateTime = (date: Date) =>
  `${formatBerlin(date, "datumUhrzeit")} Uhr`;

function seatsLabel(free: number): string {
  if (!Number.isFinite(free)) return "Plätze frei (unbegrenzt)";
  if (free <= 0) return "Kein Platz frei";
  return free === 1 ? "1 Platz frei" : `${free} Plätze frei`;
}

const registrationsLabel = (count: number) =>
  count === 1 ? "1 Anmeldung wartet" : `${count} Anmeldungen warten`;

const participantsLabel = (count: number) =>
  `${count} ${count === 1 ? "Teilnehmer" : "Teilnehmer"}`;

/** Bis zum Knopfdruck reservieren die Wartenden, was sie nutzen könnten; Neue bekommen den Rest. */
function reservationText(free: number, openToNew: number): string {
  const manual = "Automatisch rückt niemand nach – das löst du hier aus.";
  if (!Number.isFinite(free) || free <= 0) return manual;
  const reserved = free - openToNew;
  if (reserved <= 0) {
    return `${manual} Die Wartenden können keinen der freien Plätze nutzen; sie stehen neuen Anmeldungen offen.`;
  }
  return `${manual} ${reserved === 1 ? "1 freier Platz bleibt" : `${reserved} freie Plätze bleiben`} bis dahin den Wartenden vorbehalten, ${openToNew === 0 ? "neue Anmeldungen kommen auf die Warteliste" : `neue Anmeldungen bekommen nur ${openToNew === 1 ? "den übrigen" : `die übrigen ${openToNew}`}`}.`;
}

/**
 * Niemand rückt automatisch nach: frei werdende Plätze sind oft nur ein Zwischenstand des
 * Teams. Bis zum Knopfdruck haben Wartende Vorrang (`@/lib/waitlist-priority`).
 */
export function WaitlistPromotionPanel({
  courseId,
  onPromoted,
}: {
  courseId: string;
  /** Nach dem Nachrücken, etwa um die Teilnehmerliste neu zu laden. */
  onPromoted?: () => void;
}) {
  const utils = api.useUtils();
  // Immer frisch beim Öffnen der Seite: Statuswechsel auf der Detailseite
  // ändern freie Plätze und Warteliste, ohne diese Abfrage zu kennen.
  const { data: overview } = api.registrations.getWaitlistOverview.useQuery(
    { courseId },
    { retry: false, staleTime: 0 },
  );
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<PromotionSummary | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const dialogTitleId = useId();

  const promote = api.registrations.promoteWaitlist.useMutation({
    onSuccess: (summary) => {
      setResult(summary);
      setConfirming(false);
      void utils.registrations.getWaitlistOverview.invalidate({ courseId });
      void utils.courses.getAvailableSlots.invalidate();
      onPromoted?.();
    },
  });

  // Fokus erst in den Dialog (wird vorgelesen), dann ans Ergebnis — der Knopf kann dann fehlen.
  useEffect(() => {
    if (confirming) dialogRef.current?.focus();
  }, [confirming]);
  useEffect(() => {
    if (result) resultRef.current?.focus();
  }, [result]);

  if (!overview?.allowWaitingList) return null;
  if (overview.waitingRegistrations === 0 && !result) return null;

  const free = overview.seats.availableSlots;
  const offer = overview.runningOffer;

  const closeDialog = () => {
    if (promote.isPending) return;
    setConfirming(false);
    promote.reset();
    triggerRef.current?.focus();
  };

  return (
    <section aria-labelledby={titleId} className="mb-6">
      <Note tone="info">
        <h2
          id={titleId}
          className="condensed text-ink dark:text-night-text text-[1.375rem] leading-tight font-bold"
        >
          Warteliste
        </h2>
        <p className="semi-condensed mt-1 font-semibold">
          {seatsLabel(free)} ·{" "}
          {overview.waitingRegistrations === 0
            ? "Niemand wartet"
            : `${registrationsLabel(overview.waitingRegistrations)} (${participantsLabel(overview.waitingParticipants)})`}
        </p>
        <p className="text-dark dark:text-night-muted mt-2 text-sm">
          {reservationText(
            free,
            overview.seatsForNewRegistrations.availableSlots,
          )}
        </p>

        <div className="mt-4">
          {offer ? (
            <p>
              Angebot an <strong>{offer.registrantName}</strong> läuft bis{" "}
              <time dateTime={new Date(offer.expiresAt).toISOString()}>
                {formatDateTime(offer.expiresAt)}
              </time>
              . Bis dahin hält die Warteliste an.{" "}
              <Link
                href={`/dashboard/courses/${courseId}/participants/${offer.registrationId}`}
                className="link-ink inline-flex min-h-11 items-center"
              >
                Zur Anmeldung
              </Link>
            </p>
          ) : overview.courseStarted ? (
            <p>
              Der Kurs hat begonnen – von der Warteliste wird nicht mehr
              nachgerückt.
            </p>
          ) : overview.waitingRegistrations > 0 && free > 0 ? (
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setConfirming(true)}
              className={BTN_PRIMARY}
            >
              Warteliste nachrücken lassen
            </button>
          ) : overview.waitingRegistrations > 0 ? (
            <p className="text-dark dark:text-night-muted text-sm">
              Sobald Plätze frei werden, kannst du die Warteliste hier
              nachrücken lassen.
            </p>
          ) : null}
        </div>

        {result && <PromotionResult ref={resultRef} result={result} />}
      </Note>

      {confirming && (
        <ScrollableModal onClose={closeDialog}>
          <ScrollableModalCard maxW="lg">
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={dialogTitleId}
              tabIndex={-1}
              className="flex min-h-0 flex-1 flex-col outline-none"
            >
              <ScrollableModalBody>
                <h2
                  id={dialogTitleId}
                  className="condensed text-ink dark:text-night-text text-[1.375rem] leading-tight font-bold"
                >
                  Warteliste nachrücken lassen?
                </h2>
                <p className="text-ink dark:text-night-text mt-3">
                  {seatsLabel(free)},{" "}
                  {registrationsLabel(overview.waitingRegistrations)}. Die
                  Warteliste wird streng in der Reihenfolge der Anmeldung
                  durchgegangen:
                </p>
                <ul className="text-ink dark:text-night-text mt-3 list-disc space-y-2 pl-5">
                  <li>
                    Passt eine Anmeldung ganz in die freien Plätze, wird sie
                    bestätigt und bekommt eine Bestätigungsmail.
                  </li>
                  <li>
                    Passt sie nur teilweise, bekommt sie ein Angebot: Die
                    Anmeldenden wählen innerhalb von {PROMOTION_OFFER_DAYS}{" "}
                    Tagen (höchstens bis Kursbeginn), wer nachrückt. Bis dahin
                    hält die Warteliste an.
                  </li>
                  <li>
                    Passt von ihr niemand, etwa weil ihre Preiskategorie voll
                    ist, bleibt alles stehen – auch die Anmeldungen dahinter.
                  </li>
                </ul>
                {promote.error && (
                  <Note tone="error" className="mt-4">
                    <p>{promote.error.message}</p>
                  </Note>
                )}
              </ScrollableModalBody>
              <ScrollableModalFooter>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeDialog}
                    disabled={promote.isPending}
                    className={BTN_OUTLINE}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={() => promote.mutate({ courseId })}
                    disabled={promote.isPending}
                    className={BTN_PRIMARY}
                  >
                    {promote.isPending ? "Rückt nach …" : "Nachrücken lassen"}
                  </button>
                </div>
              </ScrollableModalFooter>
            </div>
          </ScrollableModalCard>
        </ScrollableModal>
      )}
    </section>
  );
}

/** Was der letzte Durchgang bewirkt hat — und warum er dort aufhörte. */
function PromotionResult({
  result,
  ref,
}: {
  result: PromotionSummary;
  ref: Ref<HTMLDivElement>;
}) {
  const anyoneMoved = result.promoted.length + result.offered.length > 0;
  const reason = promotionHaltText(result.halt, anyoneMoved, formatDateTime);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="border-ink dark:border-night-text mt-5 border-t-2 pt-4 outline-none"
    >
      <h3 className="condensed text-ink dark:text-night-text text-lg leading-tight font-bold">
        {anyoneMoved ? "Nachgerückt" : "Niemand ist nachgerückt"}
      </h3>
      {anyoneMoved && (
        <ul className="mt-2 space-y-2">
          {result.promoted.map((r) => (
            <li key={r.id}>
              <strong>{r.registrantName}</strong>
              {` (${participantsLabel(r.participants)}) ist bestätigt und bekommt eine Bestätigungsmail.`}
            </li>
          ))}
          {result.offered.map((r) => (
            <li key={r.id}>
              <strong>{r.registrantName}</strong>
              {` bekommt ein Angebot: ${r.seats} von ${r.participants} Teilnehmern ${r.seats === 1 ? "kann" : "können"} nachrücken, Antwort bis ${formatDateTime(r.expiresAt)}. Die Anmeldenden bekommen dazu eine Mail.`}
            </li>
          ))}
        </ul>
      )}
      {result.expired.length > 0 && (
        <p className="text-dark dark:text-night-muted mt-2 text-sm">
          Abgelaufen und geschlossen:{" "}
          {result.expired.map((r) => r.registrantName).join(", ")}.
        </p>
      )}
      {reason && <p className="mt-2">{reason}</p>}
    </div>
  );
}
