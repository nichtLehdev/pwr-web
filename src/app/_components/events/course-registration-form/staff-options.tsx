"use client";

import type { Dispatch, SetStateAction } from "react";
import { AlertTriangle } from "lucide-react";
import { Select } from "@/app/_components/ui";
import { formatEuro } from "@/lib/invoice-document";
import type { CourseWithRelations, StaffRegistrationOptions } from "./types";
import { Heading } from "@/app/_components/programmheft/section-head";
import { Note } from "@/app/_components/programmheft/note";

interface StaffOptionsProps {
  course: CourseWithRelations;
  options: StaffRegistrationOptions;
  setOptions: Dispatch<SetStateAction<StaffRegistrationOptions>>;
  /** Not enough free seats left for the participants entered here. */
  seatsShort: boolean;
  /** What the selected status actually becomes on the server. */
  resolvedStatus: "CONFIRMED" | "WAITLIST";
  /** Down payment of the entered participants, `null` when none is due. */
  downPaymentAmount: number | null;
}

const CHECKBOX_CLASS =
  "border-ink dark:border-night-text mt-1 h-4 w-4 shrink-0 rounded-none";

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
  downPaymentAmount,
}: StaffOptionsProps) {
  // Only a confirmed entry can overbook; a waiting-list entry never does.
  const needsOverbookingConsent = seatsShort && resolvedStatus === "CONFIRMED";
  const autoBecomesWaitlist =
    options.registrationStatus === "AUTO" && resolvedStatus === "WAITLIST";

  return (
    <div className="border-rule dark:border-night-rule space-y-4 border-t pt-8">
      <Heading as="h4" size="list" className="text-[1.375rem]">
        Erfassung durch das Team
      </Heading>

      <div className="space-y-2">
        <label
          htmlFor="staff-registration-status"
          className="text-ink dark:text-night-text block text-sm font-semibold"
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
          className="border-ink! dark:border-night-text! text-ink! dark:text-night-text! bg-paper! dark:bg-night! w-full rounded-none! border-2! px-3 py-2 text-sm"
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
        <Note tone="important">
          <p>
            Es sind nicht genügend Plätze frei — die Anmeldung wird auf die
            Warteliste gesetzt.
          </p>
        </Note>
      )}

      {needsOverbookingConsent && (
        <Note tone="important">
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
              className={CHECKBOX_CLASS}
            />
            <span>
              <span className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                Nicht genug freie Plätze
              </span>
              Überbuchung zulassen und die Anmeldung trotzdem bestätigen. Ohne
              Häkchen bitte den Status auf „Warteliste“ setzen.
            </span>
          </label>
        </Note>
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
          className={CHECKBOX_CLASS}
        />
        <span className="text-ink dark:text-night-text text-sm">
          Bestätigungsmail an den Anmelder senden
          <span className="text-dark dark:text-night-muted mt-0.5 block text-xs">
            Abwählen, wenn die Anmeldung nur nachträglich dokumentiert wird.
          </span>
        </span>
      </label>

      {downPaymentAmount !== null && (
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={options.downPaymentAlreadyPaid}
            onChange={(e) =>
              setOptions((prev) => ({
                ...prev,
                downPaymentAlreadyPaid: e.target.checked,
              }))
            }
            className={CHECKBOX_CLASS}
          />
          <span className="text-ink dark:text-night-text text-sm">
            Anzahlung von {formatEuro(downPaymentAmount)} ist bereits
            eingegangen
            <span className="text-dark dark:text-night-muted mt-0.5 block text-xs">
              Wird direkt als bezahlt verbucht, z. B. bei einem Papierformular
              mit Überweisungsbeleg.
            </span>
          </span>
        </label>
      )}
    </div>
  );
}
