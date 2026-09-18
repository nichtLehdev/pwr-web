"use client";

import { useEffect } from "react";
import type { Holiday } from "@/lib/holidays";
import { X, CheckCircle } from "lucide-react";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import { Note } from "@/app/_components/programmheft/note";
import { formatBerlin } from "@/lib/berlin-time";

interface HolidayModalProps {
  holiday: Holiday;
  onClose: () => void;
}

export default function HolidayModal({ holiday, onClose }: HolidayModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <ScrollableModal zIndex="z-100" onBackdropClick={onClose}>
      <ScrollableModalCard
        maxW="md"
        className="border-ink dark:border-night-text relative rounded-none! border-2 shadow-none!"
      >
        <ScrollableModalBody>
          {/* Close button */}
          <button
            onClick={onClose}
            className="text-ink hover:bg-ink hover:text-paper dark:text-night-text dark:hover:bg-night-text dark:hover:text-night absolute top-3 right-3 flex h-9 w-9 items-center justify-center transition-colors"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>

          {/* Holiday Icon */}
          <div className="mb-4 flex items-center gap-3">
            <span className="text-primary-ink dark:text-primary">
              {/* Scale up the icon */}
              <div className="scale-[2]">{holiday.icon}</div>
            </span>
            <h2 className="condensed text-ink dark:text-night-text ml-4 text-2xl font-extrabold">
              {holiday.name}
            </h2>
          </div>

          {/* Date */}
          <div className="mb-4">
            <p className="text-dark dark:text-night-muted">
              {formatBerlin(holiday.date, "datumMitWochentag")}
            </p>
          </div>

          {/* Description */}
          {holiday.description && (
            <div className="mb-4">
              <p className="text-ink dark:text-night-text text-sm">
                {holiday.description}
              </p>
            </div>
          )}

          {/* Validity */}
          <Note
            tone="info"
            title={
              holiday.isLegalHoliday === false
                ? "Kirchlicher Feiertag"
                : "Gesetzlicher Feiertag"
            }
            titleAs="h3"
          >
            {holiday.isNationwide ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 shrink-0" aria-hidden />
                <span>
                  {holiday.isLegalHoliday === false
                    ? "Bundesweit"
                    : "Bundesweiter Feiertag"}
                </span>
              </div>
            ) : (
              <div>
                <p className="text-sm">
                  {holiday.isLegalHoliday === false
                    ? "Kirchlicher Feiertag (kein arbeitsfreier Tag)"
                    : "Gesetzlicher Feiertag in folgenden Bundesländern:"}
                </p>
                {holiday.states && (
                  <ul className="mt-2 ml-4 space-y-1">
                    {holiday.states.map((state) => (
                      <li key={state} className="text-sm">
                        • {state}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Note>
        </ScrollableModalBody>

        <ScrollableModalFooter className="border-ink dark:border-night-text border-t-2">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper semi-condensed inline-flex h-10 items-center px-4 text-sm font-semibold transition-colors"
            >
              Schließen
            </button>
          </div>
        </ScrollableModalFooter>
      </ScrollableModalCard>
    </ScrollableModal>
  );
}
