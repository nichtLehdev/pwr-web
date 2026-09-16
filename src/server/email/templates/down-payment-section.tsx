import { Hr, Img, Text } from "@react-email/components";
import { DOWN_PAYMENT_QR_CID, type DownPaymentMailInfo } from "../down-payment";
import {
  abschnittskopf,
  grundtext,
  haarlinie,
  kleintext,
} from "./email-layout";
import { textZeile } from "./email-text";

export interface DownPaymentSectionProps {
  info: DownPaymentMailInfo;
  /** Gesamtpreis der Anmeldung, aus dem sich der Restbetrag ergibt. */
  totalPrice: number;
  /** Ob der GiroCode als Inline-Anhang mitgeschickt wird. */
  hasQrCode: boolean;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    price,
  );

/**
 * Preisaufteilung und Überweisungsdaten der Anzahlung — geteilt von Bestätigung,
 * Warteliste und Rabatt-Prüfung, damit alle drei Mails dasselbe sagen.
 *
 * Baustein ohne eigene Hülle: läuft innerhalb der EmailLayout der
 * übergeordneten Vorlage mit, deshalb nur ein Fragment und keine eigene
 * Section-Box.
 */
export function DownPaymentSection({
  info,
  totalPrice,
  hasQrCode,
}: DownPaymentSectionProps) {
  const remainder = Math.max(
    0,
    Math.round((totalPrice - info.amount) * 100) / 100,
  );
  const payNow = info.dueNow && !info.alreadyPaid;

  return (
    <>
      <Hr style={haarlinie} />
      <Text style={titel}>Anzahlung</Text>
      <Text style={grundtext}>
        <strong>Gesamtpreis:</strong> {formatPrice(totalPrice)}
      </Text>
      <Text style={grundtext}>
        <strong>Anzahlung{payNow ? " (jetzt fällig)" : ""}:</strong>{" "}
        {formatPrice(info.amount)}
      </Text>
      <Text style={grundtext}>
        <strong>Restbetrag (nach Erhalt der Rechnung):</strong>{" "}
        {formatPrice(remainder)}
      </Text>

      {info.alreadyPaid ? (
        <Text style={grundtext}>
          Deine Anzahlung ist bereits bei uns eingegangen — vielen Dank!
        </Text>
      ) : payNow ? (
        <>
          <Text style={grundtext}>
            Bitte überweise die Anzahlung zeitnah auf folgendes Konto:
          </Text>
          <Text style={grundtext}>
            <strong>Empfänger:</strong> {info.beneficiary}
          </Text>
          <Text style={grundtext}>
            <strong>IBAN:</strong> {info.iban}
          </Text>
          <Text style={grundtext}>
            <strong>BIC:</strong> {info.bic} ({info.bankName})
          </Text>
          <Text style={grundtext}>
            <strong>Betrag:</strong> {formatPrice(info.amount)}
          </Text>
          <Text style={grundtext}>
            <strong>Verwendungszweck:</strong> {info.reference}
          </Text>
          {hasQrCode && (
            <>
              <Img
                src={`cid:${DOWN_PAYMENT_QR_CID}`}
                width="160"
                height="160"
                alt="GiroCode für die Anzahlung"
                style={qr}
              />
              <Text style={kleintext}>
                Mit der Banking-App scannen — Empfänger, Betrag und
                Verwendungszweck werden übernommen.
              </Text>
            </>
          )}
        </>
      ) : (
        <Text style={grundtext}>
          Die Anzahlung wird erst fällig, wenn dein Platz bestätigt ist. Die
          Überweisungsdaten erhältst du dann mit der Bestätigung.
        </Text>
      )}

      {info.refundNotice ? (
        <Text style={kleintext}>{info.refundNotice}</Text>
      ) : null}
    </>
  );
}

/** Sub-Überschrift innerhalb einer Mail, kleiner als der Abschnittskopf im Kopf. */
const titel = {
  ...abschnittskopf,
  fontSize: "18px",
  lineHeight: "24px",
  margin: "0 0 12px 0",
};

const qr = {
  margin: "12px 0 4px 0",
};

/**
 * Nur-Text-Fassung — Zeilen zum Einbinden in die Mail der übergeordneten
 * Vorlage (Bestätigung, Warteliste, Rabatt-Prüfung).
 */
export function downPaymentSectionText({
  info,
  totalPrice,
  hasQrCode,
}: DownPaymentSectionProps): string[] {
  const remainder = Math.max(
    0,
    Math.round((totalPrice - info.amount) * 100) / 100,
  );
  const payNow = info.dueNow && !info.alreadyPaid;

  // textZeile richtet nur bis 18 Zeichen aus — bei den längeren Beschriftungen
  // hier (Restbetrag, Anzahlung mit Zusatz) reicht das nicht für ein
  // trennendes Leerzeichen. Diese Zeilen bleiben deshalb Fließtext, wörtlich
  // wie im HTML; nur die kurzen, einheitlichen Beschriftungen (Empfänger,
  // IBAN, BIC, Betrag) nutzen die Tabellenausrichtung.
  const zeilen: string[] = [
    "",
    "ANZAHLUNG",
    `Gesamtpreis: ${formatPrice(totalPrice)}`,
    `Anzahlung${payNow ? " (jetzt fällig)" : ""}: ${formatPrice(info.amount)}`,
    `Restbetrag (nach Erhalt der Rechnung): ${formatPrice(remainder)}`,
  ];

  if (info.alreadyPaid) {
    zeilen.push(
      "",
      "Deine Anzahlung ist bereits bei uns eingegangen — vielen Dank!",
    );
  } else if (payNow) {
    zeilen.push(
      "",
      "Bitte überweise die Anzahlung zeitnah auf folgendes Konto:",
      "",
      textZeile("Empfänger", info.beneficiary),
      textZeile("IBAN", info.iban),
      textZeile("BIC", `${info.bic} (${info.bankName})`),
      textZeile("Betrag", formatPrice(info.amount)),
      textZeile("Verwendungszweck", info.reference),
    );
    if (hasQrCode) {
      zeilen.push(
        "",
        "Den GiroCode zum Scannen findest du in der HTML-Fassung dieser Mail.",
      );
    }
  } else {
    zeilen.push(
      "",
      "Die Anzahlung wird erst fällig, wenn dein Platz bestätigt ist. Die Überweisungsdaten erhältst du dann mit der Bestätigung.",
    );
  }

  if (info.refundNotice) {
    zeilen.push("", info.refundNotice);
  }

  return zeilen;
}
