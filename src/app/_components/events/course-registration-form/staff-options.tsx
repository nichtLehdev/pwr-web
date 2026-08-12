"use client";

import type { Dispatch, SetStateAction } from "react";
import { AlertTriangle, ClipboardList } from "lucide-react";
import { Select } from "@/app/_components/ui";
import type { CourseWithRelations, StaffRegistrationOptions } from "./types";

interface StaffOptionsProps {
  course: CourseWithRelations;
  options: StaffRegistrationOptions;
  setOptions: Dispatch<SetStateAction<StaffRegistrationOptions>>;
  /** Not enough free seats left for the participants entered here. */
  seatsShort: boolean;
  /** What the selected status actually becomes on the server. */
  resolvedStatus: "CONFIRMED" | "WAITLIST";
}

/**
 * Step-3 block that replaces the public terms checkbox when the course team
 * records a registration itself.
 */
export function StaffOptions({
  course,
  options,
  setOptions,
  seatsShort,
  resolvedStatus,
}: StaffOptionsProps) {
  // Only a confirmed entry can overbook; a waiting-list entry never does.
  const needsOverbookingConsent = seatsShort && resolvedStatus === "CONFIRMED";
  const autoBecomesWaitlist =
    options.registrationStatus === "AUTO" && resolvedStatus === "WAITLIST";

  return (
    <div className="dark:border-dark-border dark:bg-dark-background-secondary space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
      <h4 className="text-dark dark:text-dark-text flex items-center gap-2 font-bold">
        <ClipboardList className="text-primary h-5 w-5" aria-hidden />
        Erfassung durch das Team
      </h4>

      <div className="space-y-2">
        <label
          htmlFor="staff-registration-status"
          className="dark:text-dark-text block text-sm font-medium text-gray-700"
        >
          Status der Anmeldung
        </label>
        <Select
          id="staff-registration-status"
          value={options.registrationStatus}
          onChange={(e) =>
            setOptions((prev) => ({
              ...prev,
              registrationStatus: e.target
                .value as StaffRegistrationOptions["registrationStatus"],
              // A waiting-list entry never overbooks anything.
              allowOverbooking:
                e.target.value === "WAITLIST" ? false : prev.allowOverbooking,
            }))
          }
          className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:outline-none"
        >
          <option value="AUTO">
            Automatisch (bestätigt, solange Plätze frei sind)
          </option>
          <option value="CONFIRMED">Bestätigt</option>
          {course.allowWaitingList && (
            <option value="WAITLIST">Warteliste</option>
          )}
        </Select>
      </div>

      {autoBecomesWaitlist && (
        <p className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-300">
          Es sind nicht genügend Plätze frei — die Anmeldung wird auf die
          Warteliste gesetzt.
        </p>
      )}

      {needsOverbookingConsent && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={options.allowOverbooking}
              onChange={(e) =>
                setOptions((prev) => ({
                  ...prev,
                  allowOverbooking: e.target.checked,
                }))
              }
              className="text-primary focus:ring-primary mt-1 h-4 w-4"
            />
            <span className="text-sm text-orange-800 dark:text-orange-300">
              <span className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                Nicht genug freie Plätze
              </span>
              Überbuchung zulassen und die Anmeldung trotzdem bestätigen. Ohne
              Häkchen bitte den Status auf „Warteliste“ setzen.
            </span>
          </label>
        </div>
      )}

      {!course.isFree && (
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={options.markAsPaid}
            onChange={(e) =>
              setOptions((prev) => ({ ...prev, markAsPaid: e.target.checked }))
            }
            className="text-primary focus:ring-primary mt-1 h-4 w-4"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Teilnahmegebühr ist bereits bezahlt
            <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
              Setzt den Zahlungsstatus direkt auf „Bezahlt“.
            </span>
          </span>
        </label>
      )}

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={options.sendConfirmationEmail}
          onChange={(e) =>
            setOptions((prev) => ({
              ...prev,
              sendConfirmationEmail: e.target.checked,
            }))
          }
          className="text-primary focus:ring-primary mt-1 h-4 w-4"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Bestätigungsmail an den Anmelder senden
          <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
            Abwählen, wenn die Anmeldung nur nachträglich dokumentiert wird.
          </span>
        </span>
      </label>
    </div>
  );
}
