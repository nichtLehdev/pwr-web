"use client";

import { useState } from "react";
import { Landmark } from "lucide-react";
import { api } from "@/trpc/react";
import { useToast } from "@/app/_components/ui/toast";
import {
  dateFromInput,
  todayInputValue,
} from "@/app/_components/dashboard/invoice-payment-dialog";
import { formatEuro } from "@/lib/invoice-document";
import { roundMoney } from "@/lib/sibling-discount";
import {
  DOWN_PAYMENT_STATE_LABELS,
  downPaymentOpenAmount,
  downPaymentReceived,
  downPaymentReference,
  downPaymentState,
  type DownPaymentInput,
  type DownPaymentState,
  type DownPaymentStatusValue,
} from "@/lib/course-down-payment";

const stateClasses: Record<DownPaymentState, string> = {
  NONE: "bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-300",
  OPEN: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  PARTIAL: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  PAID: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  REFUND_PENDING:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  REFUNDED: "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300",
  RETAINED: "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300",
};

/** Stand der Anzahlung als Badge; ohne Anzahlung rendert er nichts. */
export function DownPaymentBadge({
  registration,
  withPrefix = true,
  className = "",
}: {
  registration: DownPaymentInput;
  /** "Anzahlung: …" — ohne Präfix, wo die Spalte schon so heißt. */
  withPrefix?: boolean;
  className?: string;
}) {
  const state = downPaymentState(registration);
  if (state === "NONE") return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${stateClasses[state]} ${className}`}
    >
      {withPrefix ? "Anzahlung: " : ""}
      {DOWN_PAYMENT_STATE_LABELS[state]}
    </span>
  );
}

const buttonClass =
  "dark:border-dark-border dark:bg-dark-surface dark:text-dark-text dark:hover:bg-dark-background-secondary rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50";
const primaryButtonClass =
  "bg-primary hover:bg-primary-dark rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-50";
const inputClass =
  "dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none";

const successMessages: Record<DownPaymentStatusValue, string> = {
  OPEN: "Anzahlung wieder auf offen gesetzt",
  PAID: "Anzahlung verbucht",
  REFUNDED: "Anzahlung als erstattet vermerkt",
  RETAINED: "Anzahlung als einbehalten vermerkt",
};

interface DownPaymentPanelProps {
  registration: DownPaymentInput & {
    id: string;
    totalPrice: number;
    registrantFirstName: string;
    registrantLastName: string;
    downPaymentPaidAt: Date | string | null;
    downPaymentNote: string | null;
  };
  courseNumber: string | null;
  /** Dieselbe Regel wie für Rechnungszahlungen, vom Server beantwortet. */
  canBook: boolean;
  onChanged: () => void;
}

/**
 * Anzahlung einer Anmeldung im Dashboard: Betrag, Stand, Verwendungszweck —
 * und die Buchungen dazu. Nach einer Stornierung bleibt eine eingegangene
 * Anzahlung als "Erstattung klären" stehen, bis das Team mit der Kasse
 * entschieden hat, ob sie erstattet oder einbehalten wird.
 */
export function DownPaymentPanel({
  registration,
  courseNumber,
  canBook,
  onChanged,
}: DownPaymentPanelProps) {
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(todayInputValue());
  const [note, setNote] = useState(registration.downPaymentNote ?? "");

  const mutation = api.registrations.setDownPaymentStatus.useMutation({
    onSuccess: (_, variables) => {
      toast.success(successMessages[variables.status]);
      setFormOpen(false);
      onChanged();
    },
    onError: (error) => {
      toast.error(error.message || "Anzahlung konnte nicht verbucht werden");
    },
  });

  const total = registration.downPaymentAmount;
  if (!total) return null;

  const state = downPaymentState(registration);
  const received = downPaymentReceived(registration);
  const open = downPaymentOpenAmount(registration);
  const remainder = Math.max(0, roundMoney(registration.totalPrice - total));
  const busy = mutation.isPending;

  const setStatus = (status: DownPaymentStatusValue) =>
    mutation.mutate({ id: registration.id, status });

  const openForm = () => {
    setAmount(total.toFixed(2));
    setPaidOn(todayInputValue());
    setNote(registration.downPaymentNote ?? "");
    setFormOpen(true);
  };

  const parsedAmount = Number(amount.replace(",", "."));
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;

  return (
    <div className="dark:bg-dark-surface dark:border-dark-border mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-6 dark:border-gray-700">
        <h2 className="text-dark dark:text-dark-text flex items-center gap-2 text-lg font-semibold">
          <Landmark className="text-primary h-5 w-5" />
          Anzahlung
        </h2>
        <DownPaymentBadge
          registration={registration}
          withPrefix={false}
          className="px-3 py-1"
        />
      </div>
      <div className="space-y-4 p-6">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-3">
            <dt className="text-gray-600 dark:text-gray-400">Anzahlung</dt>
            <dd className="font-semibold text-gray-900 dark:text-gray-100">
              {formatEuro(total)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-600 dark:text-gray-400">
              Restbetrag (Rechnung)
            </dt>
            <dd className="text-gray-900 dark:text-gray-100">
              {formatEuro(remainder)}
            </dd>
          </div>
          {received > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-gray-600 dark:text-gray-400">Eingegangen</dt>
              <dd className="text-gray-900 dark:text-gray-100">
                {formatEuro(received)}
                {registration.downPaymentPaidAt &&
                  ` am ${new Date(registration.downPaymentPaidAt).toLocaleDateString("de-DE")}`}
              </dd>
            </div>
          )}
          {open > 0 && received > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-gray-600 dark:text-gray-400">Noch offen</dt>
              <dd className="text-gray-900 dark:text-gray-100">
                {formatEuro(open)}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-3 sm:col-span-2">
            <dt className="text-gray-600 dark:text-gray-400">
              Verwendungszweck
            </dt>
            <dd className="text-right break-words text-gray-900 dark:text-gray-100">
              {downPaymentReference(
                courseNumber,
                registration.registrantFirstName,
                registration.registrantLastName,
              )}
            </dd>
          </div>
          {registration.downPaymentNote && (
            <div className="flex justify-between gap-3 sm:col-span-2">
              <dt className="text-gray-600 dark:text-gray-400">Notiz</dt>
              <dd className="text-right break-words text-gray-900 dark:text-gray-100">
                {registration.downPaymentNote}
              </dd>
            </div>
          )}
        </dl>

        {state === "REFUND_PENDING" && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            Die Anmeldung ist storniert, die Anzahlung aber eingegangen. Bitte
            mit der Kasse klären, ob sie erstattet oder einbehalten wird, und
            das Ergebnis hier vermerken.
          </p>
        )}
        {state === "OPEN" && registration.registrationStatus === "WAITLIST" && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Auf der Warteliste — die Anzahlung wird erst mit der
            Platzbestätigung fällig.
          </p>
        )}

        {canBook && !formOpen && (
          <div className="flex flex-wrap gap-2">
            {state === "OPEN" &&
              registration.registrationStatus !== "CANCELLED" && (
                <>
                  <button
                    type="button"
                    onClick={openForm}
                    title="Teilbetrag, abweichende Wertstellung oder Notiz erfassen"
                    className={buttonClass}
                  >
                    Abweichend…
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("PAID")}
                    disabled={busy}
                    className={primaryButtonClass}
                  >
                    Als eingegangen markieren
                  </button>
                </>
              )}
            {state === "PARTIAL" && (
              <button type="button" onClick={openForm} className={buttonClass}>
                Betrag korrigieren…
              </button>
            )}
            {(state === "PAID" ||
              state === "PARTIAL" ||
              state === "REFUND_PENDING") && (
              <button
                type="button"
                onClick={() => setStatus("OPEN")}
                disabled={busy}
                className={buttonClass}
              >
                Zahlung zurücknehmen
              </button>
            )}
            {state === "REFUND_PENDING" && (
              <>
                <button
                  type="button"
                  onClick={() => setStatus("RETAINED")}
                  disabled={busy}
                  className={buttonClass}
                >
                  Einbehalten
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("REFUNDED")}
                  disabled={busy}
                  className={primaryButtonClass}
                >
                  Erstattet
                </button>
              </>
            )}
            {(state === "REFUNDED" || state === "RETAINED") && (
              <button
                type="button"
                onClick={() => setStatus("PAID")}
                disabled={busy}
                className={buttonClass}
              >
                Entscheidung zurücknehmen
              </button>
            )}
          </div>
        )}

        {canBook && formOpen && (
          <div className="dark:border-dark-border dark:bg-dark-background-secondary space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="dark:text-dark-text mb-1 block font-medium text-gray-700">
                  Betrag
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputClass}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="dark:text-dark-text mb-1 block font-medium text-gray-700">
                  Wertstellung
                </span>
                <input
                  type="date"
                  className={inputClass}
                  value={paidOn}
                  onChange={(e) => setPaidOn(e.target.value)}
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="dark:text-dark-text mb-1 block font-medium text-gray-700">
                Notiz (intern)
              </span>
              <input
                type="text"
                maxLength={500}
                className={inputClass}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="z. B. Kontoauszug vom …"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className={buttonClass}
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={!amountValid || busy}
                onClick={() =>
                  mutation.mutate({
                    id: registration.id,
                    status: "PAID",
                    paidAmount: parsedAmount,
                    paidAt: dateFromInput(paidOn),
                    note: note.trim() || null,
                  })
                }
                className={primaryButtonClass}
              >
                Verbuchen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
