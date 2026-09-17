"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/app/_components/ui/toast";
import { registrationSeatShortage } from "@/lib/registration-seat-shortage";
import {
  defaultSeatSelection,
  SEAT_SELECTION_OUTDATED_MESSAGE,
  seatSelectionProblem,
  type SeatAvailability,
} from "@/lib/registration-split";
import {
  SeatSplitChoice,
  type SplitChoiceParticipant,
} from "./course-registration-form/seat-split-choice";
import type { ShortageCourse } from "./course-registration-form/seat-shortage-notice";
import { Note } from "@/app/_components/programmheft/note";

/**
 * Schaltflächen-Stimmen des Programmhefts, wie auf der Anmeldungsseite, die
 * diese Karte trägt (`registrations/[id]/page.tsx`).
 */
const BTN_BASE =
  "semi-condensed inline-flex min-h-12 items-center justify-center gap-2 px-6 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
const BTN_PRIMARY = `bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper ${BTN_BASE}`;
const BTN_OUTLINE = `border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night border-2 ${BTN_BASE}`;
/** Rot wie „Verwerfen“ im Anmeldeformular: gibt die Plätze unwiderruflich ab. */
const BTN_DESTRUCTIVE = `bg-red-700 text-paper hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-700 ${BTN_BASE}`;

const formatDateTime = (date: Date) =>
  new Date(date).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

interface PromotionOfferCardProps {
  registrationId: string;
  accessToken?: string;
  course: ShortageCourse;
  participants: Array<SplitChoiceParticipant & { id: string }>;
  offer: { expiresAt: Date; availability: SeatAvailability };
  /** After an answer, or when the free seats changed meanwhile. */
  onChanged: () => void;
}

/**
 * Nachrück-Angebot auf der Detailseite: Es sind Plätze frei, aber nicht für
 * alle. Die Anmeldenden wählen, wer nachrückt — oder lehnen ab, dann gehen
 * die Plätze an die Nächsten und die Anmeldung behält ihren Platz.
 */
export function PromotionOfferCard({
  registrationId,
  accessToken,
  course,
  participants,
  offer,
  onChanged,
}: PromotionOfferCardProps) {
  const toast = useToast();
  const priceOptionIds = participants.map((p) => p.priceOptionId);
  const [selectedIndexes, setSelectedIndexes] = useState(() =>
    defaultSeatSelection(priceOptionIds, offer.availability),
  );
  const [confirmDecline, setConfirmDecline] = useState(false);

  const shortage = registrationSeatShortage({
    participantPriceOptionIds: priceOptionIds,
    ...offer.availability,
  });
  // Inzwischen genug Plätze für alle: dann rücken alle nach.
  const indexes = shortage ? selectedIndexes : participants.map((_, i) => i);
  const problem = shortage
    ? seatSelectionProblem(priceOptionIds, indexes, offer.availability)
    : null;

  const handleError = (error: { message: string }) => {
    toast.error(error.message);
    if (error.message === SEAT_SELECTION_OUTDATED_MESSAGE) onChanged();
  };

  const accept = api.registrations.acceptPromotionOffer.useMutation({
    onSuccess: (result) => {
      toast.success(
        result.waitlistRegistrationId
          ? `${indexes.length} Teilnehmer sind nachgerückt, die übrigen bleiben auf der Warteliste.`
          : "Alle Teilnehmer sind nachgerückt – die Anmeldung ist bestätigt.",
      );
      onChanged();
    },
    onError: handleError,
  });

  const decline = api.registrations.declinePromotionOffer.useMutation({
    onSuccess: () => {
      toast.success(
        "Angebot abgelehnt. Die Anmeldung bleibt auf der Warteliste.",
      );
      onChanged();
    },
    onError: handleError,
  });

  const pending = accept.isPending || decline.isPending;

  return (
    <div className="space-y-6">
      {/* Die Frist ist der Handlungsbedarf — sie steht auf der orangen Fläche,
          die Auswahl darunter auf Papier wie im Anmeldeformular. */}
      <Note tone="important" title="Plätze frei geworden" titleAs="h2">
        <p>
          Bis <strong>{formatDateTime(offer.expiresAt)} Uhr</strong> kannst du
          wählen, wer nachrückt. Die Gewählten sind dann bestätigt, die übrigen
          bleiben auf der Warteliste. Lehnst du ab oder verstreicht die Frist,
          gehen die Plätze an die Nächsten – deine Anmeldung behält ihren Platz.
        </p>
      </Note>

      {shortage ? (
        <SeatSplitChoice
          course={course}
          participants={participants}
          shortage={shortage}
          availability={offer.availability}
          showModeChoice={false}
          waiting
          splitting
          onSplittingChange={() => undefined}
          selectedIndexes={selectedIndexes}
          onSelectedIndexesChange={setSelectedIndexes}
          problem={problem}
        />
      ) : (
        <p className="text-ink dark:text-night-text font-semibold">
          Inzwischen sind genug Plätze für alle Teilnehmer frei.
        </p>
      )}

      {confirmDecline ? (
        <div className="border-ink dark:border-night-text border-t-2 pt-4">
          <p className="text-ink dark:text-night-text">
            Angebot wirklich ablehnen? Die freien Plätze gehen dann an die
            Nächsten auf der Warteliste.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                decline.mutate({ id: registrationId, accessToken })
              }
              disabled={pending}
              className={BTN_DESTRUCTIVE}
            >
              {decline.isPending ? "Wird abgelehnt…" : "Ja, ablehnen"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDecline(false)}
              disabled={pending}
              className={BTN_OUTLINE}
            >
              Zurück
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              accept.mutate({
                id: registrationId,
                accessToken,
                participantIds: indexes.map((i) => participants[i]!.id),
              })
            }
            disabled={pending || problem !== null}
            className={BTN_PRIMARY}
          >
            {accept.isPending
              ? "Wird bestätigt…"
              : shortage
                ? `${indexes.length} ${indexes.length === 1 ? "Teilnehmer" : "Teilnehmer"} nachrücken lassen`
                : "Alle nachrücken lassen"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDecline(true)}
            disabled={pending}
            className={BTN_OUTLINE}
          >
            Angebot ablehnen
          </button>
        </div>
      )}
    </div>
  );
}
