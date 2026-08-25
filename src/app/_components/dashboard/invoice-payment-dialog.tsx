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
  "dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none";
const labelClass =
  "dark:text-dark-text mb-1 block text-sm font-medium text-gray-700";

/** Heute als YYYY-MM-DD in lokaler Zeit — `<input type="date">` will kein ISO-Instant. */
function todayInputValue(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/** Lokale Mitternacht des gewählten Tages. `new Date("2026-08-26")` wäre UTC. */
function dateFromInput(value: string): Date | undefined {
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
          <h2 className="dark:text-dark-text text-lg font-semibold text-gray-900">
            Zahlung verbuchen
          </h2>
          <p className="dark:text-dark-muted mt-1 text-sm text-gray-500">
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
          <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
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
            Notiz <span className="font-normal text-gray-400">(optional)</span>
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
          <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
            Interne Notiz — erscheint nicht auf dem PDF.
          </p>
        </ScrollableModalBody>
        <ScrollableModalFooter>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={!amountValid || markPaid.isPending}
              className="bg-primary hover:bg-primary/90 w-full rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {markPaid.isPending ? "Verbuche…" : "Zahlung verbuchen"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="dark:text-dark-muted w-full px-4 py-2 text-sm text-gray-500"
            >
              Abbrechen
            </button>
          </div>
        </ScrollableModalFooter>
      </ScrollableModalCard>
    </ScrollableModal>
  );
}
