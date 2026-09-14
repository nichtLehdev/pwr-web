import { Img, Section, Text } from "@react-email/components";
import { DOWN_PAYMENT_QR_CID, type DownPaymentMailInfo } from "../down-payment";

interface DownPaymentSectionProps {
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
    <Section style={box}>
      <Text style={title}>Anzahlung</Text>
      <Text style={row}>
        <strong>Gesamtpreis:</strong> {formatPrice(totalPrice)}
      </Text>
      <Text style={row}>
        <strong>Anzahlung{payNow ? " (jetzt fällig)" : ""}:</strong>{" "}
        {formatPrice(info.amount)}
      </Text>
      <Text style={row}>
        <strong>Restbetrag (nach Erhalt der Rechnung):</strong>{" "}
        {formatPrice(remainder)}
      </Text>

      {info.alreadyPaid ? (
        <Text style={paragraph}>
          Deine Anzahlung ist bereits bei uns eingegangen — vielen Dank!
        </Text>
      ) : payNow ? (
        <>
          <Text style={paragraph}>
            Bitte überweise die Anzahlung zeitnah auf folgendes Konto:
          </Text>
          <Text style={row}>
            <strong>Empfänger:</strong> {info.beneficiary}
          </Text>
          <Text style={row}>
            <strong>IBAN:</strong> {info.iban}
          </Text>
          <Text style={row}>
            <strong>BIC:</strong> {info.bic} ({info.bankName})
          </Text>
          <Text style={row}>
            <strong>Betrag:</strong> {formatPrice(info.amount)}
          </Text>
          <Text style={row}>
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
              <Text style={hint}>
                Mit der Banking-App scannen — Empfänger, Betrag und
                Verwendungszweck werden übernommen.
              </Text>
            </>
          )}
        </>
      ) : (
        <Text style={paragraph}>
          Die Anzahlung wird erst fällig, wenn dein Platz bestätigt ist. Die
          Überweisungsdaten erhältst du dann mit der Bestätigung.
        </Text>
      )}

      {info.refundNotice ? <Text style={hint}>{info.refundNotice}</Text> : null}
    </Section>
  );
}

const box = {
  backgroundColor: "#fff7e8",
  padding: "20px",
  borderRadius: "8px",
  margin: "24px 0",
  border: "1px solid #fcd9a0",
};

const title = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#58595b",
  margin: "0 0 12px 0",
};

const row = {
  fontSize: "15px",
  lineHeight: "22px",
  color: "#58595b",
  margin: "0 0 6px 0",
};

const paragraph = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#58595b",
  margin: "12px 0 8px 0",
};

const qr = {
  margin: "12px 0 4px 0",
};

const hint = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#6b7280",
  margin: "8px 0 0 0",
};
