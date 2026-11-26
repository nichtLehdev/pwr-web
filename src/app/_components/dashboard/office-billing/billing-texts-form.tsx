"use client";

import { useState, type ReactNode } from "react";
import { Button, Card, Input, Label, Textarea } from "@/app/_components/ui";
import { officePaymentReference } from "@/lib/office-billing";

const TEXT_FIELDS = [
  { key: "introText", label: "Einleitung auf der Rechnung", rows: 5 },
  { key: "closingText", label: "Schlusssatz auf der Rechnung", rows: 2 },
  { key: "signatureName", label: "Unterzeichnet von", rows: 1 },
  { key: "emailSubject", label: "Betreff der E-Mail", rows: 1 },
  { key: "emailBody", label: "Text der E-Mail", rows: 12 },
] as const;

export type BillingTextKey = (typeof TEXT_FIELDS)[number]["key"];
export type BillingTexts = Record<BillingTextKey, string>;

export interface BillingTextsPayload {
  paymentReferencePrefix: string;
  introText: string | null;
  closingText: string | null;
  signatureName: string | null;
  emailSubject: string | null;
  emailBody: string | null;
}

/**
 * Verwendungszweck und die fünf Texte einer Abrechnung. Was dem Standard
 * entspricht, wird als null gespeichert — so wandert eine spätere Verbesserung
 * des Standardtexts automatisch mit.
 */
export function BillingTextsForm({
  settings,
  defaults,
  placeholders,
  extraFields,
  extraValid = true,
  saving,
  onSave,
}: {
  settings: BillingTexts & { paymentReferencePrefix: string };
  defaults: BillingTexts;
  placeholders: readonly { key: string; label: string }[];
  /** Weitere Felder neben dem Verwendungszweck, z.B. der Steuersatz. */
  extraFields?: ReactNode;
  extraValid?: boolean;
  saving: boolean;
  onSave: (payload: BillingTextsPayload) => void;
}) {
  const [prefix, setPrefix] = useState(settings.paymentReferencePrefix);
  const [texts, setTexts] = useState<BillingTexts>({
    introText: settings.introText,
    closingText: settings.closingText,
    signatureName: settings.signatureName,
    emailSubject: settings.emailSubject,
    emailBody: settings.emailBody,
  });
  const setText = (key: BillingTextKey, value: string) =>
    setTexts((current) => ({ ...current, [key]: value }));

  return (
    <form
      className="space-y-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (!extraValid) return;
        const textOrNull = (key: BillingTextKey) =>
          texts[key].trim() === defaults[key].trim() ? null : texts[key];
        onSave({
          paymentReferencePrefix: prefix,
          introText: textOrNull("introText"),
          closingText: textOrNull("closingText"),
          signatureName: textOrNull("signatureName"),
          emailSubject: textOrNull("emailSubject"),
          emailBody: textOrNull("emailBody"),
        });
      }}
    >
      <Card>
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          {extraFields}
          <div>
            <Label htmlFor="prefix">Kennung im Verwendungszweck</Label>
            <Input
              id="prefix"
              value={prefix}
              onChange={(event) => setPrefix(event.target.value)}
            />
            <p className="text-dark dark:text-night-muted mt-1 text-xs">
              Beispiel: {officePaymentReference(prefix, "02-07")}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-5 p-6">
          <div>
            <h2 className="text-ink dark:text-night-text text-lg font-semibold">
              Texte
            </h2>
            <p className="text-dark dark:text-night-muted mt-1 text-sm">
              Platzhalter werden je Chor ersetzt:{" "}
              {placeholders.map((placeholder, index) => (
                <span key={placeholder.key}>
                  {index > 0 && ", "}
                  <code>{`{${placeholder.key}}`}</code> ({placeholder.label})
                </span>
              ))}
              . Texte auf der Rechnung gelten für Entwürfe und neue
              Abrechnungen; der E-Mail-Text gilt sofort für jeden Versand.
            </p>
          </div>
          {TEXT_FIELDS.map((field) => (
            <div key={field.key}>
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                {texts[field.key].trim() !== defaults[field.key].trim() && (
                  <button
                    type="button"
                    className="text-dark hover:text-ink dark:text-night-muted dark:hover:text-night-text text-xs font-semibold underline-offset-4 hover:underline"
                    onClick={() => setText(field.key, defaults[field.key])}
                  >
                    Standard wiederherstellen
                  </button>
                )}
              </div>
              {field.rows === 1 ? (
                <Input
                  id={field.key}
                  value={texts[field.key]}
                  onChange={(event) => setText(field.key, event.target.value)}
                />
              ) : (
                <Textarea
                  id={field.key}
                  rows={field.rows}
                  value={texts[field.key]}
                  onChange={(event) => setText(field.key, event.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      </Card>

      <Button type="submit" disabled={!extraValid} isLoading={saving}>
        Einstellungen speichern
      </Button>
    </form>
  );
}
