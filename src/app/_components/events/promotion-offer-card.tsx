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
    <div className="border-primary bg-primary/5 dark:bg-primary/10 mb-6 rounded-lg border-2 p-5">
      <h2 className="text-dark dark:text-dark-text text-lg font-semibold">
        Plätze frei geworden
      </h2>
      <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
        Bis <strong>{formatDateTime(offer.expiresAt)} Uhr</strong> kannst du
        wählen, wer nachrückt. Die Gewählten sind dann bestätigt, die übrigen
        bleiben auf der Warteliste. Lehnst du ab oder verstreicht die Frist,
        gehen die Plätze an die Nächsten – deine Anmeldung behält ihren Platz.
      </p>

      <div className="mt-4">
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
          <p className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
            Inzwischen sind genug Plätze für alle Teilnehmer frei.
          </p>
        )}
      </div>

      {confirmDecline ? (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Angebot wirklich ablehnen? Die freien Plätze gehen dann an die
            Nächsten auf der Warteliste.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                decline.mutate({ id: registrationId, accessToken })
              }
              disabled={pending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {decline.isPending ? "Wird abgelehnt…" : "Ja, ablehnen"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDecline(false)}
              disabled={pending}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Zurück
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
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
            className="bg-primary hover:bg-primary-dark rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Angebot ablehnen
          </button>
        </div>
      )}
    </div>
  );
}
