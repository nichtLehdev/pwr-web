"use client";

import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import { FileText, ExternalLink, Wallet } from "lucide-react";
import type {
  RegistrationData,
  CourseWithRelations,
  StaffRegistrationOptions,
} from "./types";
import { StaffOptions } from "./staff-options";
import {
  calculateTotalPrice,
  calculateOriginalPrice,
  calculateDiscountAmount,
} from "./utils";
import {
  COURSE_PAYMENT_METHOD_LABELS,
  courseAcceptsCash,
  courseAcceptsInvoice,
  courseRequiresPaymentMethodChoice,
  registrationNeedsPaymentMethod,
} from "@/lib/course-payment-methods";
import { priceOptionDisplayLabel } from "@/lib/course-price-options";

interface Step3SummaryProps {
  course: CourseWithRelations;
  registrationData: RegistrationData;
  setRegistrationData: Dispatch<SetStateAction<RegistrationData>>;
  termsAccepted: boolean;
  setTermsAccepted: (accepted: boolean) => void;
  isWaitlist: boolean;
  /** Set when the course team records the registration itself. */
  staff?: {
    options: StaffRegistrationOptions;
    setOptions: Dispatch<SetStateAction<StaffRegistrationOptions>>;
    /** Not enough free seats for the participants entered here. */
    seatsShort: boolean;
    /** What the selected status actually becomes on the server. */
    resolvedStatus: "CONFIRMED" | "WAITLIST";
  };
}

export function Step3Summary({
  course,
  registrationData,
  setRegistrationData,
  termsAccepted,
  setTermsAccepted,
  isWaitlist,
  staff,
}: Step3SummaryProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-dark dark:text-dark-text mb-4 text-xl font-bold">
        Zusammenfassung
      </h3>

      {/* Course Info */}
      <div className="dark:border-dark-border dark:bg-dark-background-secondary rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h4 className="text-dark dark:text-dark-text mb-3 font-bold">
          Lehrgang
        </h4>
        <p className="text-dark dark:text-dark-text text-lg font-semibold">
          {course.title}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(course.startDate).toLocaleDateString("de-DE")} -{" "}
          {new Date(course.endDate).toLocaleDateString("de-DE")}
        </p>
        {course.location && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {course.location.name}, {course.location.city}
          </p>
        )}
      </div>

      {/* Registrant Info */}
      <div className="dark:border-dark-border dark:bg-dark-background-secondary rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h4 className="text-dark dark:text-dark-text mb-3 font-bold">
          Anmelder
        </h4>
        <p className="text-dark dark:text-dark-text font-semibold">
          {registrationData.registrantFirstName}{" "}
          {registrationData.registrantLastName}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {registrationData.registrantEmail}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {registrationData.registrantPhone}
        </p>
      </div>

      {/* Billing Address */}
      {registrationData.useSeparateBilling && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20">
          <h4 className="text-dark dark:text-dark-text mb-3 flex items-center gap-2 font-bold">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Rechnungsadresse
          </h4>
          {registrationData.billingCompany && (
            <p className="text-dark dark:text-dark-text font-semibold">
              {registrationData.billingCompany}
            </p>
          )}
          {(registrationData.billingFirstName ||
            registrationData.billingLastName) && (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {registrationData.billingFirstName}{" "}
              {registrationData.billingLastName}
            </p>
          )}
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {registrationData.billingStreet}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {registrationData.billingZipCode} {registrationData.billingCity}
          </p>
          {registrationData.billingEmail && (
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              Rechnung an: {registrationData.billingEmail}
            </p>
          )}
        </div>
      )}

      {/* Participants List */}
      <div className="dark:border-dark-border dark:bg-dark-background-secondary rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h4 className="text-dark dark:text-dark-text mb-3 font-bold">
          Teilnehmer ({registrationData.participants.length})
        </h4>
        <div className="space-y-3">
          {registrationData.participants.map((participant, index) => {
            const priceOption = course.priceOptions.find(
              (p) => p.id === participant.priceOptionId,
            );
            return (
              <div
                key={index}
                className="dark:border-dark-border flex items-start justify-between gap-3 border-b border-gray-200 pb-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-dark dark:text-dark-text font-semibold">
                    {participant.firstName} {participant.lastName}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(participant.birthDate).toLocaleDateString(
                      "de-DE",
                    )}
                    {participant.instrument && ` • ${participant.instrument}`}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {priceOption
                      ? priceOptionDisplayLabel(
                          priceOption,
                          course.priceOptions,
                        )
                      : null}
                  </p>
                </div>
                <p className="text-primary shrink-0 font-bold">
                  {priceOption?.price.toFixed(2)} €
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {registrationNeedsPaymentMethod(course) && (
        <div className="dark:border-dark-border rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50">
          <h4 className="text-dark dark:text-dark-text mb-3 flex items-center gap-2 font-bold">
            <Wallet className="text-primary h-5 w-5" aria-hidden />
            Zahlungsweise
          </h4>
          {courseRequiresPaymentMethodChoice(course) ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Bitte wählen Sie, wie Sie die Teilnahmegebühr begleichen
                möchten.
              </p>
              <div className="space-y-2">
                {courseAcceptsCash(course) && (
                  <label className="dark:border-dark-border dark:bg-dark-background flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-600">
                    <input
                      type="radio"
                      name="course-payment-method"
                      className="text-primary focus:ring-primary mt-0.5 h-4 w-4"
                      checked={registrationData.paymentMethod === "CASH"}
                      onChange={() =>
                        setRegistrationData((d) => ({
                          ...d,
                          paymentMethod: "CASH",
                        }))
                      }
                    />
                    <span className="text-dark dark:text-dark-text text-sm">
                      {COURSE_PAYMENT_METHOD_LABELS.CASH}
                    </span>
                  </label>
                )}
                {courseAcceptsInvoice(course) && (
                  <label className="dark:border-dark-border dark:bg-dark-background flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-600">
                    <input
                      type="radio"
                      name="course-payment-method"
                      className="text-primary focus:ring-primary mt-0.5 h-4 w-4"
                      checked={registrationData.paymentMethod === "INVOICE"}
                      onChange={() =>
                        setRegistrationData((d) => ({
                          ...d,
                          paymentMethod: "INVOICE",
                        }))
                      }
                    />
                    <span className="text-dark dark:text-dark-text text-sm">
                      {COURSE_PAYMENT_METHOD_LABELS.INVOICE}
                    </span>
                  </label>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Bei Überweisung erhalten Sie nach Bestätigung der Anmeldung eine
                Rechnung mit den Zahlungsdaten.
              </p>
            </div>
          ) : (
            <p className="text-dark dark:text-dark-text text-sm">
              {(() => {
                const fixed =
                  registrationData.paymentMethod ??
                  (courseAcceptsCash(course) ? "CASH" : "INVOICE");
                const detail =
                  fixed === "INVOICE"
                    ? "Sie erhalten nach Bestätigung eine Rechnung mit den Bankdaten."
                    : "Die Gebühr wird vor Ort vor Beginn des Kurses in bar fällig.";
                return (
                  <>
                    <span className="font-semibold">
                      {COURSE_PAYMENT_METHOD_LABELS[fixed]}
                    </span>
                    {" — "}
                    {detail}
                  </>
                );
              })()}
            </p>
          )}
        </div>
      )}

      {/* Price Breakdown */}
      {registrationData.siblingDiscountApplied &&
      course.allowSiblingDiscount &&
      calculateDiscountAmount(registrationData, course) > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Zwischensumme
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {calculateOriginalPrice(registrationData, course).toFixed(2)} €
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <span className="text-sm text-green-700 dark:text-green-300">
              Geschwisterkindrabatt (20% pro weiteres Kind)
            </span>
            <span className="text-sm font-semibold text-green-700 dark:text-green-300">
              -{calculateDiscountAmount(registrationData, course).toFixed(2)} €
            </span>
          </div>
          <div className="bg-primary rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Gesamtpreis</span>
              <span className="text-3xl font-bold">
                {calculateTotalPrice(registrationData, course).toFixed(2)} €
              </span>
            </div>
            <p className="mt-2 text-xs opacity-90">
              * Der Rabatt muss noch bestätigt werden
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-primary rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Gesamtpreis</span>
            <span className="text-3xl font-bold">
              {calculateTotalPrice(registrationData, course).toFixed(2)} €
            </span>
          </div>
        </div>
      )}

      {staff ? (
        <>
          <StaffOptions
            course={course}
            options={staff.options}
            setOptions={staff.setOptions}
            seatsShort={staff.seatsShort}
            resolvedStatus={staff.resolvedStatus}
          />
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                required
                className="text-primary focus:ring-primary mt-1 h-4 w-4"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Der Anmelder hat dieser Anmeldung zugestimmt (z. B. per E-Mail,
                telefonisch oder auf einem Papierformular) und die
                Teilnahmebedingungen zur Kenntnis genommen.
              </span>
            </label>
          </div>
        </>
      ) : (
        /* Terms */
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              required
              className="text-primary focus:ring-primary mt-1 h-4 w-4"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Ich akzeptiere die{" "}
              <Link
                href="/impressum"
                className="text-primary inline-flex items-center gap-1 font-semibold hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Allgemeinen Geschäftsbedingungen
                <ExternalLink className="h-3 w-3" />
              </Link>{" "}
              und die{" "}
              <Link
                href="/datenschutz"
                className="text-primary inline-flex items-center gap-1 font-semibold hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Datenschutzerklärung
                <ExternalLink className="h-3 w-3" />
              </Link>
              .
            </span>
          </label>
        </div>
      )}

      {isWaitlist && !staff && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
          <p className="text-sm text-orange-800 dark:text-orange-300">
            <strong>Hinweis:</strong> Der Kurs ist bereits ausgebucht. Sie
            werden auf die Warteliste gesetzt und bei einem freigewordenen Platz
            benachrichtigt.
          </p>
        </div>
      )}
    </div>
  );
}
