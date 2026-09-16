"use client";

import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import type {
  RegistrationData,
  CourseWithRelations,
  StaffRegistrationOptions,
} from "./types";
import { StaffOptions } from "./staff-options";
import { DownPaymentSummary } from "./down-payment-summary";
import {
  calculateTotalPrice,
  calculateOriginalPrice,
  calculateDiscountAmount,
  calculateDownPayment,
} from "./utils";
import {
  COURSE_PAYMENT_METHOD_LABELS,
  courseAcceptsCash,
  courseAcceptsInvoice,
  courseRequiresPaymentMethodChoice,
  registrationNeedsPaymentMethod,
} from "@/lib/course-payment-methods";
import { priceOptionDisplayLabel } from "@/lib/course-price-options";
import { formatEuro } from "@/lib/invoice-document";
import { Heading } from "@/app/_components/programmheft/section-head";
import { ValueTable } from "@/app/_components/programmheft/value-table";
import { Note } from "@/app/_components/programmheft/note";

interface Step3SummaryProps {
  course: CourseWithRelations;
  registrationData: RegistrationData;
  setRegistrationData: Dispatch<SetStateAction<RegistrationData>>;
  termsAccepted: boolean;
  setTermsAccepted: (accepted: boolean) => void;
  downPaymentAcknowledged: boolean;
  setDownPaymentAcknowledged: (acknowledged: boolean) => void;
  /** Signed in with the registrant's e-mail, so "Meine Anmeldungen" lists it. */
  listedInMyRegistrations: boolean;
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

/** Kopf einer Zwischengruppe innerhalb der Zusammenfassung. */
function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <Heading as="h4" size="list" className="text-[1.375rem]">
      {children}
    </Heading>
  );
}

export function Step3Summary({
  course,
  registrationData,
  setRegistrationData,
  termsAccepted,
  setTermsAccepted,
  downPaymentAcknowledged,
  setDownPaymentAcknowledged,
  listedInMyRegistrations,
  isWaitlist,
  staff,
}: Step3SummaryProps) {
  const downPaymentAmount = calculateDownPayment(registrationData, course);

  return (
    <div className="space-y-8">
      <Heading as="h3" size="list" rule>
        Zusammenfassung
      </Heading>

      {/* Course Info */}
      <div>
        <GroupHeading>Lehrgang</GroupHeading>
        <p className="text-ink dark:text-night-text mt-2 text-lg font-semibold">
          {course.title}
        </p>
        <p className="text-dark dark:text-night-muted text-sm">
          {new Date(course.startDate).toLocaleDateString("de-DE")} -{" "}
          {new Date(course.endDate).toLocaleDateString("de-DE")}
        </p>
        {course.location && (
          <p className="text-dark dark:text-night-muted text-sm">
            {course.location.name}, {course.location.city}
          </p>
        )}
      </div>

      {/* Registrant Info */}
      <div className="border-rule dark:border-night-rule border-t pt-8">
        <GroupHeading>Anmelder</GroupHeading>
        <p className="text-ink dark:text-night-text mt-2 font-semibold">
          {registrationData.registrantFirstName}{" "}
          {registrationData.registrantLastName}
        </p>
        <p className="text-dark dark:text-night-muted text-sm">
          {registrationData.registrantEmail}
        </p>
        <p className="text-dark dark:text-night-muted text-sm">
          {registrationData.registrantPhone}
        </p>
      </div>

      {/* Billing Address */}
      {registrationData.useSeparateBilling && (
        <div className="border-rule dark:border-night-rule border-t pt-8">
          <GroupHeading>Rechnungsadresse</GroupHeading>
          <div className="mt-2">
            {registrationData.billingCompany && (
              <p className="text-ink dark:text-night-text font-semibold">
                {registrationData.billingCompany}
              </p>
            )}
            {(registrationData.billingFirstName ||
              registrationData.billingLastName) && (
              <p className="text-ink dark:text-night-text text-sm">
                {registrationData.billingFirstName}{" "}
                {registrationData.billingLastName}
              </p>
            )}
            <p className="text-ink dark:text-night-text text-sm">
              {registrationData.billingStreet}
            </p>
            <p className="text-ink dark:text-night-text text-sm">
              {registrationData.billingZipCode} {registrationData.billingCity}
            </p>
            {registrationData.billingEmail && (
              <p className="text-ink dark:text-night-text mt-2 text-sm">
                Rechnung an: {registrationData.billingEmail}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Participants List */}
      <div className="border-rule dark:border-night-rule border-t pt-8">
        <GroupHeading>
          Teilnehmer ({registrationData.participants.length})
        </GroupHeading>
        <ValueTable
          className="mt-2"
          rows={registrationData.participants.map((participant, index) => {
            const priceOption = course.priceOptions.find(
              (p) => p.id === participant.priceOptionId,
            );
            return {
              label: (
                <span key={index}>
                  <span className="text-ink dark:text-night-text block font-semibold">
                    {participant.firstName} {participant.lastName}
                  </span>
                  <span className="text-dark dark:text-night-muted block text-sm">
                    {new Date(participant.birthDate).toLocaleDateString(
                      "de-DE",
                    )}
                    {participant.instrument && ` • ${participant.instrument}`}
                  </span>
                  <span className="text-dark dark:text-night-muted block text-sm">
                    {priceOption
                      ? priceOptionDisplayLabel(
                          priceOption,
                          course.priceOptions,
                        )
                      : null}
                  </span>
                </span>
              ),
              value: priceOption ? formatEuro(priceOption.price) : "",
            };
          })}
        />
      </div>

      {registrationNeedsPaymentMethod(course) && (
        <div className="border-rule dark:border-night-rule border-t pt-8">
          <GroupHeading>Zahlungsweise</GroupHeading>
          {courseRequiresPaymentMethodChoice(course) ? (
            <div className="mt-2 space-y-3">
              <p className="text-dark dark:text-night-muted text-sm">
                Bitte wählen Sie, wie Sie die Teilnahmegebühr begleichen
                möchten.
              </p>
              <div className="space-y-1">
                {courseAcceptsCash(course) && (
                  <label className="border-rule dark:border-night-rule flex min-h-11 cursor-pointer items-center gap-3 border-b py-2">
                    <input
                      type="radio"
                      name="course-payment-method"
                      className="border-ink text-ink h-4 w-4 shrink-0"
                      checked={registrationData.paymentMethod === "CASH"}
                      onChange={() =>
                        setRegistrationData((d) => ({
                          ...d,
                          paymentMethod: "CASH",
                        }))
                      }
                    />
                    <span className="text-ink dark:text-night-text text-sm">
                      {COURSE_PAYMENT_METHOD_LABELS.CASH}
                    </span>
                  </label>
                )}
                {courseAcceptsInvoice(course) && (
                  <label className="border-rule dark:border-night-rule flex min-h-11 cursor-pointer items-center gap-3 border-b py-2">
                    <input
                      type="radio"
                      name="course-payment-method"
                      className="border-ink text-ink h-4 w-4 shrink-0"
                      checked={registrationData.paymentMethod === "INVOICE"}
                      onChange={() =>
                        setRegistrationData((d) => ({
                          ...d,
                          paymentMethod: "INVOICE",
                        }))
                      }
                    />
                    <span className="text-ink dark:text-night-text text-sm">
                      {COURSE_PAYMENT_METHOD_LABELS.INVOICE}
                    </span>
                  </label>
                )}
              </div>
              <p className="text-dark dark:text-night-muted text-xs">
                {downPaymentAmount !== null
                  ? "Die Anzahlung wird in jedem Fall vorab überwiesen; die Zahlungsweise gilt für den Restbetrag."
                  : "Bei Überweisung erhalten Sie nach Bestätigung der Anmeldung eine Rechnung mit den Zahlungsdaten."}
              </p>
            </div>
          ) : (
            <p className="text-ink dark:text-night-text mt-2 text-sm">
              {(() => {
                const fixed =
                  registrationData.paymentMethod ??
                  (courseAcceptsCash(course) ? "CASH" : "INVOICE");
                const detail =
                  downPaymentAmount !== null
                    ? fixed === "INVOICE"
                      ? "Den Restbetrag nach der Anzahlung begleichen Sie nach Erhalt der Rechnung."
                      : "Der Restbetrag nach der Anzahlung wird vor Ort vor Beginn des Kurses in bar fällig."
                    : fixed === "INVOICE"
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
      <div className="border-rule dark:border-night-rule border-t pt-8">
        {registrationData.siblingDiscountApplied &&
        course.allowSiblingDiscount &&
        calculateDiscountAmount(registrationData, course) > 0 ? (
          <>
            <ValueTable
              rows={[
                {
                  label: "Zwischensumme",
                  value: formatEuro(
                    calculateOriginalPrice(registrationData, course),
                  ),
                },
                {
                  label: "Geschwisterkindrabatt (20% pro weiteres Kind)",
                  value: `−${formatEuro(calculateDiscountAmount(registrationData, course))}`,
                },
                {
                  label: "Gesamtpreis",
                  value: formatEuro(
                    calculateTotalPrice(registrationData, course),
                  ),
                },
              ]}
            />
            <p className="text-dark dark:text-night-muted mt-2 text-xs">
              * Der Rabatt muss noch bestätigt werden
            </p>
          </>
        ) : (
          <ValueTable
            rows={[
              {
                label: "Gesamtpreis",
                value: formatEuro(
                  calculateTotalPrice(registrationData, course),
                ),
              },
            ]}
          />
        )}
      </div>

      {downPaymentAmount !== null && (
        <DownPaymentSummary
          course={course}
          registrationData={registrationData}
          amount={downPaymentAmount}
          totalPrice={calculateTotalPrice(registrationData, course)}
          isWaitlist={staff ? staff.resolvedStatus === "WAITLIST" : isWaitlist}
          acknowledgement={
            staff
              ? undefined
              : {
                  checked: downPaymentAcknowledged,
                  onChange: setDownPaymentAcknowledged,
                }
          }
          // Staff record on someone else's behalf — their own account says
          // nothing about where the registrant finds the details again.
          listedInMyRegistrations={!staff && listedInMyRegistrations}
        />
      )}

      {staff ? (
        <>
          <StaffOptions
            course={course}
            options={staff.options}
            setOptions={staff.setOptions}
            seatsShort={staff.seatsShort}
            resolvedStatus={staff.resolvedStatus}
            downPaymentAmount={downPaymentAmount}
          />
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              required
              className="border-ink dark:border-night-text mt-1 h-4 w-4 shrink-0 rounded-none"
            />
            <span className="text-ink dark:text-night-text text-sm">
              Der Anmelder hat dieser Anmeldung zugestimmt (z. B. per E-Mail,
              telefonisch oder auf einem Papierformular) und die
              Teilnahmebedingungen zur Kenntnis genommen.
            </span>
          </label>
        </>
      ) : (
        /* Terms */
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            required
            className="border-ink dark:border-night-text mt-1 h-4 w-4 shrink-0 rounded-none"
          />
          <span className="text-ink dark:text-night-text text-sm">
            Ich akzeptiere die{" "}
            <Link
              href="/impressum"
              className="link-ink"
              target="_blank"
              rel="noopener noreferrer"
            >
              Allgemeinen Geschäftsbedingungen
            </Link>{" "}
            und die{" "}
            <Link
              href="/datenschutz"
              className="link-ink"
              target="_blank"
              rel="noopener noreferrer"
            >
              Datenschutzerklärung
            </Link>
            .
          </span>
        </label>
      )}

      {isWaitlist && !staff && (
        <Note tone="important">
          <p>
            <strong>Hinweis:</strong> Der Kurs ist bereits ausgebucht. Sie
            werden auf die Warteliste gesetzt und bei einem freigewordenen Platz
            benachrichtigt.
          </p>
        </Note>
      )}
    </div>
  );
}
