"use client";

import { useId } from "react";
import { AlertCircle, Save, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  priceOptionDisplayLabel,
  resolveParticipantPriceOption,
} from "@/lib/course-price-options";
import type { ParticipantFields } from "./types";
import { participantAge } from "./utils";
import type { PriceOptionChoice } from "./participant-price-option-field";
import { formatEuro } from "@/lib/invoice-document";
import { Tag } from "@/app/_components/programmheft/tag";

interface ParticipantCardProps {
  participant: ParticipantFields;
  index: number;
  priceOptions: PriceOptionChoice[];
  /** Set when the form's validation pass found something wrong with this one. */
  validationError?: string;
  /** Number of participants sharing this one's sibling group, 1 when ungrouped. */
  siblingGroupSize: number;
  /** Omitted on read-only surfaces; the summary is then not interactive. */
  onEdit?: () => void;
  onRemove?: () => void;
  /** False keeps the row but disables removal, e.g. the last one on an edit. */
  canRemove?: boolean;
  /** Short marker next to the name, e.g. "Neu" for an unsaved participant. */
  badge?: string;
  /** Further chips after the built-in ones, e.g. discount eligibility. */
  extraBadges?: React.ReactNode;
  /** Detail block under the summary, for surfaces that show more than a line. */
  children?: React.ReactNode;
  /** Only offered to signed-in registrants, who have a participant library. */
  onSaveToLibrary?: () => void;
  saveToLibraryPending?: boolean;
  /**
   * Schlüssel (`data-focus-key`) des Bearbeiten-Knopfs, damit das Formular
   * den Fokus nach dem Schließen des Fensters oder bei fehlenden Angaben
   * hierher zurückholen kann.
   */
  focusKey?: string;
}

/**
 * Collapsed summary of one participant. Tapping it opens the full field set in
 * a sheet.
 *
 * The list of these is what a phone shows instead of every participant's form
 * at once: four participants are four rows rather than four screens, so the
 * step's own navigation stays reachable without scrolling past all of them.
 */
export function ParticipantCard({
  participant,
  index,
  priceOptions,
  validationError,
  siblingGroupSize,
  onEdit,
  onRemove,
  canRemove = true,
  badge,
  extraBadges,
  children,
  onSaveToLibrary,
  saveToLibraryPending,
  focusKey,
}: ParticipantCardProps) {
  const errorId = useId();
  const isInGroup = siblingGroupSize > 1;
  const hasError = !!validationError;

  const fullName = [participant.firstName, participant.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  const age = participantAge(participant.birthDate);
  // By id first, falling back to the stored label: registrations from before
  // ids were saved would otherwise show no price category at all.
  const priceOption = resolveParticipantPriceOption(participant, priceOptions);
  const priceLabel = priceOption
    ? priceOptionDisplayLabel(priceOption, priceOptions)
    : (participant.priceOption?.trim() ?? null);

  // Only the parts that are actually filled in, so a fresh participant shows a
  // short hint instead of a line of separators with nothing between them.
  const summaryParts = [
    age !== null ? `${age} Jahre` : null,
    participant.city?.trim() || null,
    participant.instrument?.trim() || null,
  ].filter(Boolean);

  const canSaveToLibrary =
    !!onSaveToLibrary &&
    !!participant.firstName &&
    !!participant.lastName &&
    !!participant.birthDate;

  const hasActions = !!onSaveToLibrary || !!onRemove;
  // Rechts Platz für die 44px-Knöpfe (6px Rand), damit der Name nicht
  // darunter läuft.
  const summaryLayout = cn(
    "flex w-full items-start gap-3 p-4 text-left",
    hasActions && (onSaveToLibrary ? "pr-24" : "pr-14"),
  );

  const summary = (
    <>
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center text-xs font-bold",
          isInGroup
            ? "bg-ink text-paper dark:bg-night-text dark:text-night"
            : "bg-rule dark:bg-night-rule text-ink dark:text-night-text",
        )}
        aria-hidden
      >
        {index + 1}
      </span>

      <span className="min-w-0 flex-1">
        <span className="text-ink dark:text-night-text block truncate leading-7 font-semibold">
          {fullName || `Teilnehmer ${index + 1}`}
        </span>

        {/* Wraps rather than truncates: on a phone a single clipped line
            turned "Trompete" into "Tro…", which is worse than a second row. */}
        {summaryParts.length > 0 ? (
          <span className="text-dark dark:text-night-muted mt-0.5 line-clamp-2 block text-sm">
            {summaryParts.join(" · ")}
          </span>
        ) : null}

        {priceLabel ? (
          <span className="text-dark dark:text-night-muted mt-0.5 line-clamp-2 block text-sm">
            {priceLabel}
            {priceOption ? ` · ${formatEuro(priceOption.price)}` : ""}
          </span>
        ) : null}

        <span className="mt-2 flex flex-wrap items-center gap-1.5 empty:mt-0">
          {badge ? <Tag tone="inverse">{badge}</Tag> : null}
          {isInGroup ? (
            <Tag tone="ink">Geschwister ({siblingGroupSize})</Tag>
          ) : null}
          {hasError ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-400">
              <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
              Angaben fehlen
            </span>
          ) : null}
          {extraBadges}
        </span>
      </span>
    </>
  );

  return (
    <div
      className={cn(
        "relative border-2 transition-colors",
        hasError
          ? "border-red-700 bg-red-50 dark:border-red-400 dark:bg-red-900/10"
          : isInGroup
            ? "border-ink bg-rule/20 dark:border-night-text dark:bg-night-rule/20"
            : "border-rule dark:border-night-rule bg-paper dark:bg-night",
      )}
    >
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          data-focus-key={focusKey}
          aria-label={`Teilnehmer ${index + 1}${fullName ? ` — ${fullName}` : ""} bearbeiten`}
          // Der Name aus aria-label überdeckt den Inhalt — „Angaben fehlen“
          // wäre sonst nicht zu hören.
          aria-describedby={hasError ? errorId : undefined}
          className={summaryLayout}
        >
          {summary}
        </button>
      ) : (
        <div className={summaryLayout}>{summary}</div>
      )}

      {/* Outside the button: nesting these would be invalid markup and would
          swallow taps meant for the card. Pinned to the name's line so the
          card has one right-hand cluster instead of three loose elements. */}
      {hasError ? (
        <span id={errorId} className="sr-only">
          {validationError}
        </span>
      ) : null}

      {/* 44px Trefferfläche bei gleicher Symbolgröße; der Rand ist um die
          Hälfte des Zuwachses kleiner, damit die Symbole dort bleiben, wo sie
          waren. */}
      {hasActions ? (
        <div className="absolute top-1.5 right-1.5 flex items-center">
          {onSaveToLibrary ? (
            <button
              type="button"
              onClick={onSaveToLibrary}
              disabled={!canSaveToLibrary || saveToLibraryPending}
              title="Teilnehmer in Bibliothek speichern"
              aria-label="Teilnehmer in Bibliothek speichern"
              className="text-dark hover:bg-ink hover:text-paper dark:text-night-muted dark:hover:bg-night-text dark:hover:text-night flex h-11 w-11 items-center justify-center transition-colors disabled:opacity-40"
            >
              <Save className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
          {onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              disabled={!canRemove}
              title={
                canRemove
                  ? "Teilnehmer entfernen"
                  : "Mindestens ein Teilnehmer muss bleiben"
              }
              aria-label={`Teilnehmer ${index + 1} entfernen`}
              className="hover:text-paper dark:hover:text-night flex h-11 w-11 items-center justify-center text-red-700 transition-colors hover:bg-red-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-red-700 dark:text-red-400 dark:hover:bg-red-400 dark:disabled:hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}

      {children ? (
        <div className="border-rule dark:border-night-rule border-t px-4 py-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}
