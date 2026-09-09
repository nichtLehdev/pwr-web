"use client";

import { AlertCircle, Save, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  priceOptionDisplayLabel,
  resolveParticipantPriceOption,
} from "@/lib/course-price-options";
import type { ParticipantFields } from "./types";
import { participantAge } from "./utils";
import type { PriceOptionChoice } from "./participant-price-option-field";

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
}: ParticipantCardProps) {
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
  const summaryLayout = cn(
    "flex w-full items-start gap-3 rounded-lg p-4 text-left",
    hasActions && (onSaveToLibrary ? "pr-[5.5rem]" : "pr-14"),
  );

  const summary = (
    <>
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          isInGroup
            ? "bg-green-600 text-white dark:bg-green-700"
            : "bg-primary/15 text-primary dark:bg-primary/25",
        )}
        aria-hidden
      >
        {index + 1}
      </span>

      <span className="min-w-0 flex-1">
        <span className="text-dark dark:text-dark-text block truncate leading-7 font-semibold">
          {fullName || `Teilnehmer ${index + 1}`}
        </span>

        {/* Wraps rather than truncates: on a phone a single clipped line
            turned "Trompete" into "Tro…", which is worse than a second row. */}
        {summaryParts.length > 0 ? (
          <span className="mt-0.5 line-clamp-2 block text-sm text-gray-600 dark:text-gray-400">
            {summaryParts.join(" · ")}
          </span>
        ) : null}

        {priceLabel ? (
          <span className="mt-0.5 line-clamp-2 block text-sm text-gray-600 dark:text-gray-400">
            {priceLabel}
            {priceOption ? ` · ${priceOption.price.toFixed(2)} €` : ""}
          </span>
        ) : null}

        <span className="mt-2 flex flex-wrap items-center gap-1.5 empty:mt-0">
          {badge ? (
            <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              {badge}
            </span>
          ) : null}
          {isInGroup ? (
            <span className="inline-flex rounded-full bg-green-600 px-2 py-0.5 text-xs font-medium text-white dark:bg-green-700">
              Geschwister ({siblingGroupSize})
            </span>
          ) : null}
          {hasError ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300">
              <AlertCircle className="h-3 w-3 shrink-0" />
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
        "relative rounded-lg border shadow-sm transition-colors",
        hasError
          ? "border-red-300 bg-red-50/50 dark:border-red-800/70 dark:bg-red-900/10"
          : isInGroup
            ? "border-green-500 bg-green-50 dark:border-green-600 dark:bg-green-900/20"
            : "dark:border-dark-border dark:bg-dark-background-secondary border-gray-200 bg-white",
      )}
    >
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Teilnehmer ${index + 1}${fullName ? ` — ${fullName}` : ""} bearbeiten`}
          className={cn(
            summaryLayout,
            "focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none",
          )}
        >
          {summary}
        </button>
      ) : (
        <div className={summaryLayout}>{summary}</div>
      )}

      {/* Outside the button: nesting these would be invalid markup and would
          swallow taps meant for the card. Pinned to the name's line so the
          card has one right-hand cluster instead of three loose elements. */}
      {hasActions ? (
        <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5">
          {onSaveToLibrary ? (
            <button
              type="button"
              onClick={onSaveToLibrary}
              disabled={!canSaveToLibrary || saveToLibraryPending}
              title="Teilnehmer in Bibliothek speichern"
              aria-label="Teilnehmer in Bibliothek speichern"
              className="dark:hover:bg-dark-background flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Save className="h-4 w-4" />
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
              className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : null}

      {children ? (
        <div className="dark:border-dark-border border-t border-gray-100 px-4 py-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}
