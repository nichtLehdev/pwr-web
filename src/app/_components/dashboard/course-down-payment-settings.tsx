"use client";

import { Lock } from "lucide-react";
import { formatEuro } from "@/lib/invoice-document";
import {
  DOWN_PAYMENT_MODE_LABELS,
  DOWN_PAYMENT_REFUND_POLICY_LABELS,
  downPaymentReference,
  downPaymentRefundNotice,
  maxDownPaymentForPrice,
  type DownPaymentModeValue,
  type DownPaymentRefundPolicyValue,
} from "@/lib/course-down-payment";

export interface CourseDownPaymentSettingsProps {
  mode: DownPaymentModeValue;
  onModeChange: (mode: DownPaymentModeValue) => void;
  /** Betrag pro Teilnehmer bei "Gleicher Betrag pro Teilnehmer". */
  amount: number | null;
  onAmountChange: (amount: number | null) => void;
  refundPolicy: DownPaymentRefundPolicyValue;
  onRefundPolicyChange: (policy: DownPaymentRefundPolicyValue) => void;
  refundText: string;
  onRefundTextChange: (text: string) => void;
  priceOptions: ReadonlyArray<{
    id: string;
    label: string;
    price: number;
    downPaymentAmount?: number | null;
  }>;
  onPriceOptionAmountChange: (id: string, amount: number | null) => void;
  /** courses.enable_down_payment — ohne sie bleibt der Block schreibgeschützt. */
  canEdit: boolean;
  /** Aktive Anmeldungen haben Betrag und Hinweise bereits bestätigt. */
  locked: boolean;
  allowSiblingDiscount: boolean;
  courseNumber: string;
}

const inputClass =
  "border-ink dark:border-night-text dark:bg-night dark:text-night-text border bg-paper px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50";

const parseAmount = (value: string): number | null => {
  const parsed = parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

const MODES: DownPaymentModeValue[] = ["NONE", "COURSE", "TICKET"];
const POLICIES: DownPaymentRefundPolicyValue[] = [
  "NON_REFUNDABLE",
  "REFUNDABLE",
  "CUSTOM",
];

/**
 * Anzahlung eines Kurses — geteilt von "Kurs anlegen" und "Kurs bearbeiten".
 * Die Prüfung beim Speichern übernimmt `validateDownPaymentSettings`; hier
 * stehen nur die Hinweise, die schon beim Ausfüllen helfen.
 */
export function CourseDownPaymentSettings({
  mode,
  onModeChange,
  amount,
  onAmountChange,
  refundPolicy,
  onRefundPolicyChange,
  refundText,
  onRefundTextChange,
  priceOptions,
  onPriceOptionAmountChange,
  canEdit,
  locked,
  allowSiblingDiscount,
  courseNumber,
}: CourseDownPaymentSettingsProps) {
  if (!canEdit && mode === "NONE") return null;
  const disabled = !canEdit || locked;

  return (
    <div className="border-rule dark:border-night-rule space-y-4 border p-4">
      <div>
        <p className="text-ink dark:text-night-text text-sm font-medium">
          Anzahlung
        </p>
        <p className="text-dark dark:text-night-muted text-xs">
          Wird bei der Anmeldung per Überweisung fällig; der Restbetrag folgt
          mit der Rechnung. Anmeldungen mit Anzahlung kann nur das Kursteam
          stornieren oder um Teilnehmer ändern.
        </p>
      </div>

      {(locked || !canEdit) && (
        <p className="bg-rule/25 dark:bg-night-raised text-dark dark:text-night-muted flex items-start gap-2 p-3 text-xs">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {locked
            ? "Es gibt aktive Anmeldungen, die Betrag und Hinweise bereits bestätigt haben — die Anzahlung lässt sich nicht mehr ändern."
            : "Nur Landes-/Regionalposaunenwarte und Administratoren können die Anzahlung ändern."}
        </p>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {MODES.map((value) => (
          <label
            key={value}
            className="text-ink dark:text-night-text flex cursor-pointer items-center gap-2 text-sm"
          >
            <input
              type="radio"
              name="downPaymentMode"
              checked={mode === value}
              onChange={() => onModeChange(value)}
              disabled={disabled}
              className="text-primary border-rule dark:border-night-rule h-4 w-4"
            />
            {DOWN_PAYMENT_MODE_LABELS[value]}
          </label>
        ))}
      </div>

      {mode === "COURSE" && (
        <label className="block">
          <span className="text-dark dark:text-night-muted mb-1 block text-xs font-medium">
            Betrag pro Teilnehmer
          </span>
          <span className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount ?? ""}
              onChange={(e) => onAmountChange(parseAmount(e.target.value))}
              disabled={disabled}
              className={`${inputClass} w-28`}
            />
            <span className="text-dark dark:text-night-muted text-sm">€</span>
          </span>
        </label>
      )}

      {mode === "TICKET" &&
        (priceOptions.length === 0 ? (
          <p className="text-dark dark:text-night-muted text-sm">
            Lege zuerst Preiskategorien an.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-dark dark:text-night-muted text-xs">
              Leer lassen, wenn für eine Kategorie keine Anzahlung fällig wird.
            </p>
            {priceOptions.map((option) => (
              <div
                key={option.id}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span className="text-ink dark:text-night-text text-sm">
                  {option.label || "Ohne Bezeichnung"}{" "}
                  <span className="text-dark dark:text-night-muted text-xs">
                    ({formatEuro(option.price)}, höchstens{" "}
                    {formatEuro(
                      maxDownPaymentForPrice(
                        option.price,
                        allowSiblingDiscount,
                      ),
                    )}
                    )
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={option.downPaymentAmount ?? ""}
                    onChange={(e) =>
                      onPriceOptionAmountChange(
                        option.id,
                        parseAmount(e.target.value),
                      )
                    }
                    disabled={disabled}
                    placeholder="keine"
                    className={`${inputClass} w-28`}
                  />
                  <span className="text-dark dark:text-night-muted text-sm">
                    €
                  </span>
                </span>
              </div>
            ))}
          </div>
        ))}

      {mode !== "NONE" && (
        <>
          <fieldset className="space-y-2">
            <legend className="text-dark dark:text-night-muted mb-1 text-xs font-medium">
              Hinweis zur Erstattung (bestätigen Anmeldende)
            </legend>
            {POLICIES.map((value) => (
              <label
                key={value}
                className="text-ink dark:text-night-text flex cursor-pointer items-start gap-2 text-sm"
              >
                <input
                  type="radio"
                  name="downPaymentRefundPolicy"
                  checked={refundPolicy === value}
                  onChange={() => onRefundPolicyChange(value)}
                  disabled={disabled}
                  className="text-primary border-rule dark:border-night-rule mt-0.5 h-4 w-4"
                />
                <span>
                  {DOWN_PAYMENT_REFUND_POLICY_LABELS[value]}
                  {value !== "CUSTOM" && (
                    <span className="text-dark dark:text-night-muted block text-xs">
                      „
                      {downPaymentRefundNotice({
                        downPaymentRefundPolicy: value,
                      })}
                      “
                    </span>
                  )}
                </span>
              </label>
            ))}
            {refundPolicy === "CUSTOM" && (
              <textarea
                value={refundText}
                onChange={(e) => onRefundTextChange(e.target.value)}
                disabled={disabled}
                rows={2}
                maxLength={1000}
                placeholder="z. B. Bis vier Wochen vor Kursbeginn wird die Anzahlung erstattet."
                className={`${inputClass} w-full`}
              />
            )}
          </fieldset>

          <p className="text-dark dark:text-night-muted text-xs">
            {courseNumber.trim() ? (
              <>
                Verwendungszweck:{" "}
                <span className="font-mono">
                  {downPaymentReference(courseNumber, "Vorname", "Nachname")}
                </span>
              </>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">
                Für eine Anzahlung braucht der Kurs eine Kursnummer — sie steht
                im Verwendungszweck.
              </span>
            )}
          </p>
        </>
      )}
    </div>
  );
}
