"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/app/_components/ui/toast";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import { formatEuro } from "@/lib/invoice-document";
import { bookedAmountFor } from "@/lib/invoice-payment";

/** Was der Dialog von einer Rechnung braucht — mehr lädt er nicht nach. */
export type PayableInvoice = {
  id: string;
  invoiceNumber: string | null;
  totalAmount: number;
};

const inputClass =
  "border-ink dark:border-night-text dark:bg-night dark:text-night-text w-full border px-3 py-2 text-sm";
const labelClass =
  "text-dark dark:text-night-muted mb-1 block text-sm font-medium";

/** Heute als YYYY-MM-DD in lokaler Zeit — `<input type="date">` will kein ISO-Instant. */
export function todayInputValue(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/** Lokale Mitternacht des gewählten Tages. `new Date("2026-08-26")` wäre UTC. */
export function dateFromInput(value: string): Date | undefined {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

/**
 * Zahlung an einer Rechnung verbuchen — mit Betrag, Wertstellung und Notiz.
 *
 * Der Ein-Klick-Weg ("voller Betrag, heute") bleibt daneben bestehen; dieser
 * Dialog ist für alles, was davon abweicht: Teilzahlungen und Überweisungen,
 * die vor Tagen eingegangen sind.
 */
export function InvoicePaymentDialog({
  invoice,
  onClose,
  onBooked,
}: {
  invoice: PayableInvoice;
  onClose: () => void;
  onBooked?: () => void;
}) {
  const toast = useToast();
  const [amount, setAmount] = useState(invoice.totalAmount.toFixed(2));
  const [paidOn, setPaidOn] = useState(todayInputValue());
  const [note, setNote] = useState("");

  const markPaid = api.invoices.markPaid.useMutation({
    onSuccess: () => {
      toast.success("Zahlung verbucht");
      onBooked?.();
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "Zahlung konnte nicht verbucht werden");
    },
  });

  const parsedAmount = Number(amount.replace(",", "."));
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const isPartial = amountValid && parsedAmount < invoice.totalAmount;

  const submit = () => {
    if (!amountValid || markPaid.isPending) return;
    markPaid.mutate({
      id: invoice.id,
      paidAt: dateFromInput(paidOn),
      paidAmount: bookedAmountFor(parsedAmount, invoice.totalAmount),
      note: note.trim() || undefined,
    });
  };

  return (
    <ScrollableModal onBackdropClick={onClose}>
      <ScrollableModalCard maxW="md">
        <ScrollableModalBody>
          <h2 className="text-ink dark:text-night-text text-lg font-semibold">
            Zahlung verbuchen
          </h2>
          <p className="text-dark dark:text-night-muted mt-1 text-sm">
            {invoice.invoiceNumber ?? "Rechnung ohne Nummer"} ·{" "}
            {formatEuro(invoice.totalAmount)}
          </p>

          <label className={`${labelClass} mt-4`} htmlFor="paymentAmount">
            Betrag
          </label>
          <input
            id="paymentAmount"
            type="number"
            step="0.01"
            min="0"
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <p className="text-dark dark:text-night-muted mt-1 text-xs">
            {isPartial
              ? `Teilzahlung — offen bleiben ${formatEuro(invoice.totalAmount - parsedAmount)}.`
              : "Voreingestellt ist der volle Rechnungsbetrag."}
          </p>

          <label className={`${labelClass} mt-4`} htmlFor="paymentDate">
            Wertstellung
          </label>
          <input
            id="paymentDate"
            type="date"
            className={inputClass}
            value={paidOn}
            onChange={(e) => setPaidOn(e.target.value)}
          />

          <label className={`${labelClass} mt-4`} htmlFor="paymentNote">
            Notiz{" "}
            <span className="text-dark dark:text-night-muted font-normal">
              (optional)
            </span>
          </label>
          <input
            id="paymentNote"
            type="text"
            maxLength={500}
            className={inputClass}
            placeholder="z.B. Überweisung, Verwendungszweck weicht ab"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <p className="text-dark dark:text-night-muted mt-1 text-xs">
            Interne Notiz — erscheint nicht auf dem PDF.
          </p>
        </ScrollableModalBody>
        <ScrollableModalFooter>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={!amountValid || markPaid.isPending}
              className="bg-primary hover:bg-primary/90 text-ink min-h-11 w-full px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {markPaid.isPending ? "Verbuche…" : "Zahlung verbuchen"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-dark dark:text-night-muted min-h-11 w-full px-4 py-2 text-sm"
            >
              Abbrechen
            </button>
          </div>
        </ScrollableModalFooter>
      </ScrollableModalCard>
    </ScrollableModal>
  );
}
