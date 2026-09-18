"use client";

import { useState } from "react";
import { Landmark } from "lucide-react";
import { api } from "@/trpc/react";
import { useToast } from "@/app/_components/ui/toast";
import { Tag, type TagTone } from "@/app/_components/programmheft/tag";
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
import { formatBerlin } from "@/lib/berlin-time";

// Sieben Zustände auf vier Etikett-Töne: Offenes und Klärungsbedarf laut,
// Erledigtes (bezahlt, erstattet, einbehalten) teilt sich den ruhigen Ton.
const stateTones: Record<DownPaymentState, TagTone> = {
  NONE: "inverse",
  OPEN: "orange",
  PARTIAL: "ink",
  PAID: "inverse",
  REFUND_PENDING: "cancelled",
  REFUNDED: "inverse",
  RETAINED: "inverse",
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
    <Tag tone={stateTones[state]} className={className}>
      {withPrefix ? "Anzahlung: " : ""}
      {DOWN_PAYMENT_STATE_LABELS[state]}
    </Tag>
  );
}

const buttonClass =
  "border-ink dark:border-night-text dark:bg-night dark:text-night-text dark:hover:bg-night-raised min-h-11 border bg-paper px-2.5 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-rule/30 disabled:opacity-50";
const primaryButtonClass =
  "bg-primary hover:bg-primary-dark min-h-11 px-3 py-1.5 text-sm font-medium text-ink transition-colors disabled:opacity-50";
const inputClass =
  "border-ink dark:border-night-text dark:bg-night dark:text-night-text w-full border px-3 py-2 text-sm";

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
 * Anzahlung einer Anmeldung im Dashboard. Nach einer Stornierung steht eine eingegangene
 * Anzahlung auf "Erstattung klären", bis das Team über Erstattung oder Einbehalt entscheidet.
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
    <div className="border-rule dark:border-night-rule dark:bg-night bg-paper mb-6 border">
      <div className="border-rule dark:border-night-rule flex flex-wrap items-center justify-between gap-3 border-b p-6">
        <h2 className="text-ink dark:text-night-text flex items-center gap-2 text-lg font-semibold">
          <Landmark className="text-primary-ink dark:text-primary h-5 w-5" />
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
            <dt className="text-dark dark:text-night-muted">Anzahlung</dt>
            <dd className="text-ink dark:text-night-text font-semibold">
              {formatEuro(total)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-dark dark:text-night-muted">
              Restbetrag (Rechnung)
            </dt>
            <dd className="text-ink dark:text-night-text">
              {formatEuro(remainder)}
            </dd>
          </div>
          {received > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-dark dark:text-night-muted">Eingegangen</dt>
              <dd className="text-ink dark:text-night-text">
                {formatEuro(received)}
                {registration.downPaymentPaidAt &&
                  ` am ${formatBerlin(registration.downPaymentPaidAt)}`}
              </dd>
            </div>
          )}
          {open > 0 && received > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-dark dark:text-night-muted">Noch offen</dt>
              <dd className="text-ink dark:text-night-text">
                {formatEuro(open)}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-3 sm:col-span-2">
            <dt className="text-dark dark:text-night-muted">
              Verwendungszweck
            </dt>
            <dd className="text-ink dark:text-night-text text-right break-words">
              {downPaymentReference(
                courseNumber,
                registration.registrantFirstName,
                registration.registrantLastName,
              )}
            </dd>
          </div>
          {registration.downPaymentNote && (
            <div className="flex justify-between gap-3 sm:col-span-2">
              <dt className="text-dark dark:text-night-muted">Notiz</dt>
              <dd className="text-ink dark:text-night-text text-right break-words">
                {registration.downPaymentNote}
              </dd>
            </div>
          )}
        </dl>

        {state === "REFUND_PENDING" && (
          <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            Die Anmeldung ist storniert, die Anzahlung aber eingegangen. Bitte
            mit der Kasse klären, ob sie erstattet oder einbehalten wird, und
            das Ergebnis hier vermerken.
          </p>
        )}
        {state === "OPEN" && registration.registrationStatus === "WAITLIST" && (
          <p className="text-dark dark:text-night-muted text-sm">
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
          <div className="border-rule dark:border-night-rule dark:bg-night-raised bg-rule/25 space-y-3 border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-ink dark:text-night-text mb-1 block font-medium">
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
                <span className="text-ink dark:text-night-text mb-1 block font-medium">
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
              <span className="text-ink dark:text-night-text mb-1 block font-medium">
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
