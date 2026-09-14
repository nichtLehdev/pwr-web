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
  "focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:bg-gray-800";

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
    <div className="dark:border-dark-border space-y-4 rounded-lg border border-gray-200 p-4">
      <div>
        <p className="dark:text-dark-text text-sm font-medium text-gray-700">
          Anzahlung
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Wird bei der Anmeldung per Überweisung fällig; der Restbetrag folgt
          mit der Rechnung. Anmeldungen mit Anzahlung kann nur das Kursteam
          stornieren oder um Teilnehmer ändern.
        </p>
      </div>

      {(locked || !canEdit) && (
        <p className="flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800/50 dark:text-gray-400">
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
            className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
          >
            <input
              type="radio"
              name="downPaymentMode"
              checked={mode === value}
              onChange={() => onModeChange(value)}
              disabled={disabled}
              className="text-primary focus:ring-primary h-4 w-4 border-gray-300"
            />
            {DOWN_PAYMENT_MODE_LABELS[value]}
          </label>
        ))}
      </div>

      {mode === "COURSE" && (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
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
            <span className="text-sm text-gray-500">€</span>
          </span>
        </label>
      )}

      {mode === "TICKET" &&
        (priceOptions.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Lege zuerst Preiskategorien an.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Leer lassen, wenn für eine Kategorie keine Anzahlung fällig wird.
            </p>
            {priceOptions.map((option) => (
              <div
                key={option.id}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {option.label || "Ohne Bezeichnung"}{" "}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
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
                  <span className="text-sm text-gray-500">€</span>
                </span>
              </div>
            ))}
          </div>
        ))}

      {mode !== "NONE" && (
        <>
          <fieldset className="space-y-2">
            <legend className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              Hinweis zur Erstattung (bestätigen Anmeldende)
            </legend>
            {POLICIES.map((value) => (
              <label
                key={value}
                className="flex cursor-pointer items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <input
                  type="radio"
                  name="downPaymentRefundPolicy"
                  checked={refundPolicy === value}
                  onChange={() => onRefundPolicyChange(value)}
                  disabled={disabled}
                  className="text-primary focus:ring-primary mt-0.5 h-4 w-4 border-gray-300"
                />
                <span>
                  {DOWN_PAYMENT_REFUND_POLICY_LABELS[value]}
                  {value !== "CUSTOM" && (
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
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

          <p className="text-xs text-gray-500 dark:text-gray-400">
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
