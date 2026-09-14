"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  DEFAULT_INVOICE_ORGANIZATION,
  formatEuro,
} from "@/lib/invoice-document";
import { buildEpcQrPayload } from "@/lib/epc-qr";

interface DownPaymentTransferDetailsProps {
  amount: number;
  /** Verwendungszweck, siehe `downPaymentReference`. */
  reference: string;
}

/**
 * Bankverbindung, Betrag und Verwendungszweck einer Anzahlung mit GiroCode —
 * im Anmeldeformular und auf der Anmeldungsseite dieselbe Darstellung.
 */
export function DownPaymentTransferDetails({
  amount,
  reference,
}: DownPaymentTransferDetailsProps) {
  const org = DEFAULT_INVOICE_ORGANIZATION;
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(
      buildEpcQrPayload(org.name, org.iban, amount, reference, org.bic),
      { width: 360, margin: 1, errorCorrectionLevel: "M" },
    )
      .then((url) => {
        if (!cancelled) setQrCode(url);
      })
      .catch(() => {
        // Ohne GiroCode bleiben die Bankdaten als Text stehen.
        if (!cancelled) setQrCode(null);
      });
    return () => {
      cancelled = true;
    };
  }, [org.name, org.iban, org.bic, amount, reference]);

  return (
    <div className="dark:border-dark-border flex flex-col gap-4 rounded-lg border border-amber-200 bg-white p-4 sm:flex-row sm:items-start dark:bg-gray-900/40">
      {/* Auf dem Handy untereinander: nebeneinander ließ die Beschriftung
          "Verwendungszweck" dem Wert zu wenig Platz, und der Kasten lief über. */}
      <dl className="grid min-w-0 flex-1 grid-cols-1 gap-x-3 text-sm sm:grid-cols-[auto_1fr] sm:gap-y-1">
        <dt className="text-gray-500 dark:text-gray-400">Empfänger</dt>
        <dd className="mb-1.5 min-w-0 text-gray-900 sm:mb-0 dark:text-gray-100">
          {org.name}
        </dd>
        <dt className="text-gray-500 dark:text-gray-400">IBAN</dt>
        <dd className="mb-1.5 min-w-0 font-mono break-all text-gray-900 sm:mb-0 dark:text-gray-100">
          {org.iban}
        </dd>
        <dt className="text-gray-500 dark:text-gray-400">BIC</dt>
        <dd className="mb-1.5 min-w-0 font-mono text-gray-900 sm:mb-0 dark:text-gray-100">
          {org.bic}
        </dd>
        <dt className="text-gray-500 dark:text-gray-400">Betrag</dt>
        <dd className="mb-1.5 min-w-0 font-semibold text-gray-900 sm:mb-0 dark:text-gray-100">
          {formatEuro(amount)}
        </dd>
        <dt className="text-gray-500 dark:text-gray-400">Verwendungszweck</dt>
        <dd className="mb-1.5 min-w-0 break-words text-gray-900 sm:mb-0 dark:text-gray-100">
          {reference}
        </dd>
      </dl>
      {qrCode && (
        <figure className="shrink-0 self-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URL, nichts zu optimieren */}
          <img
            src={qrCode}
            alt="GiroCode für die Anzahlung"
            className="h-32 w-32 rounded bg-white p-1"
          />
          <figcaption className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Mit der Banking-App scannen
          </figcaption>
        </figure>
      )}
    </div>
  );
}
