"use client";

import { useEffect, useState, type ReactNode } from "react";
import QRCode from "qrcode";
import {
  DEFAULT_INVOICE_ORGANIZATION,
  formatEuro,
} from "@/lib/invoice-document";
import { buildEpcQrPayload } from "@/lib/epc-qr";

type ValueTableRow = { label: ReactNode; value: ReactNode };

/** Setzt eine `ValueTable`-Zeile von der großen Betrags-Stimme auf normalen Fließtext zurück. */
function PlainValue({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`text-ink dark:text-night-text block max-w-full text-right text-base font-normal break-words whitespace-normal normal-case ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

/** Überweisungsdaten als Zeilen derselben `ValueTable` wie Anzahlung und Restbetrag. */
export function transferDetailRows(
  amount: number,
  reference: string,
): ValueTableRow[] {
  const org = DEFAULT_INVOICE_ORGANIZATION;
  return [
    { label: "Empfänger", value: <PlainValue>{org.name}</PlainValue> },
    {
      label: "IBAN",
      value: (
        <PlainValue className="font-mono break-all">{org.iban}</PlainValue>
      ),
    },
    {
      label: "BIC",
      value: <PlainValue className="font-mono">{org.bic}</PlainValue>,
    },
    { label: "Betrag", value: formatEuro(amount) },
    {
      label: "Verwendungszweck",
      value: <PlainValue className="break-words">{reference}</PlainValue>,
    },
  ];
}

interface DownPaymentQrFigureProps {
  amount: number;
  /** Verwendungszweck, siehe `downPaymentReference`. */
  reference: string;
}

/** GiroCode zur Anzahlung, neben oder unter der `ValueTable` aus `transferDetailRows`. */
export function DownPaymentQrFigure({
  amount,
  reference,
}: DownPaymentQrFigureProps) {
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

  if (!qrCode) return null;

  return (
    <figure className="mt-4 text-center sm:mt-0 sm:self-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- data: URL, nichts zu optimieren */}
      <img
        src={qrCode}
        alt="GiroCode für die Anzahlung"
        className="h-32 w-32"
      />
      <figcaption className="text-dark dark:text-night-muted mt-1 text-xs">
        Mit der Banking-App scannen
      </figcaption>
    </figure>
  );
}
