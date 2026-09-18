"use client";

import Link from "next/link";
import { useId, type Dispatch, type SetStateAction } from "react";
import type {
  RegistrationData,
  CourseWithRelations,
  StaffRegistrationOptions,
} from "./types";
import { StaffOptions } from "./staff-options";
import { DownPaymentSummary } from "./down-payment-summary";
import { SeatShortageNotice } from "./seat-shortage-notice";
import { SeatSplitChoice } from "./seat-split-choice";
import type { SeatShortage } from "@/lib/registration-seat-shortage";
import {
  planRegistrationParts,
  type SeatAvailability,
  type SeatSelectionProblem,
} from "@/lib/registration-split";
import {
  calculateTotalPrice,
  calculateOriginalPrice,
  calculateDiscountAmount,
  calculateDownPayment,
  type FormProblem,
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
import { RADIO_INPUT_CLASS } from "@/app/_components/programmheft/field";

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
  /** Too few free seats for the participants entered, if so. */
  seatShortage: SeatShortage | null;
  /** Who gets the free seats when the registration is split. */
  seatSplit: {
    availability: SeatAvailability;
    /** Seats are short, some participants fit, and a waiting list exists. */
    canSplit: boolean;
    splitting: boolean;
    setSplitting: (splitting: boolean) => void;
    selectedIndexes: number[];
    setSelectedIndexes: (indexes: number[]) => void;
    problem: SeatSelectionProblem | null;
  };
  /** Sprungziel für den Fokus beim Wechsel in diesen Schritt. */
  headingId: string;
  /**
   * Was vor dem Absenden noch fehlt — erst nach einem Klick auf „Verbindlich
   * anmelden“ übergeben, dann am jeweiligen Feld gemeldet.
   */
  problems?: readonly FormProblem[];
  /** Set when the course team records the registration itself. */
  staff?: {
    options: StaffRegistrationOptions;
    setOptions: Dispatch<SetStateAction<StaffRegistrationOptions>>;
    /** Not enough free seats for the participants entered here. */
    seatsShort: boolean;
    /** What the selected status actually becomes on the server. */
    resolvedStatus: "CONFIRMED" | "WAITLIST" | "SPLIT";
  };
}

/** Kopf einer Zwischengruppe innerhalb der Zusammenfassung. */
function GroupHeading({
  id,
  children,
}: {
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <Heading as="h4" size="list" id={id} className="text-[1.375rem]">
      {children}
    </Heading>
  );
}

/** Meldung direkt unter einem Feld der Übersicht. */
function FieldProblem({ id, children }: { id: string; children: string }) {
  return (
    <p
      id={id}
      className="mt-1 text-sm font-medium text-red-700 dark:text-red-400"
    >
      {children}
    </p>
  );
}

/**
 * Kontrollkästchen mit Text, Trefferfläche über die ganze Beschriftung und
 * mindestens 44px hoch — das Kästchen selbst bleibt optisch klein.
 */
const CONSENT_LABEL_CLASS = "flex min-h-11 cursor-pointer items-start gap-3";

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
  seatShortage,
  seatSplit,
  headingId,
  problems = [],
  staff,
}: Step3SummaryProps) {
  const uid = useId();
  const downPaymentAmount = calculateDownPayment(registrationData, course);
  const problemFor = (field: string) =>
    problems.find((p) => p.field === field)?.message;
  const paymentProblem = problemFor("paymentMethod");
  const termsProblem = problemFor("termsAccepted");
  const paymentHeadingId = `${uid}-zahlungsweise`;
  const paymentProblemId = `${uid}-zahlungsweise-fehler`;
  const termsProblemId = `${uid}-zustimmung-fehler`;

  // Aufgeteilt gilt der Anzahlungsblock den bestätigten Teilnehmern; die
  // wartenden zahlen erst nach ihrer Platzbestätigung.
  const splitPlan =
    seatSplit.splitting && !seatSplit.problem
      ? planRegistrationParts(
          registrationData.participants,
          (participant) =>
            course.priceOptions.find(
              (po) => po.id === participant.priceOptionId,
            )?.price ?? 0,
          {
            status: "WAITLIST",
            confirmedIndexes: seatSplit.selectedIndexes,
            withSiblingDiscount:
              !!registrationData.siblingDiscountApplied &&
              !!course.allowSiblingDiscount,
          },
        )
      : null;
  const partDownPayment = (
    participants: typeof registrationData.participants,
  ) => calculateDownPayment({ ...registrationData, participants }, course);
  const confirmedDownPayment = splitPlan
    ? partDownPayment(splitPlan.primary.participants)
    : null;
  const waitlistDownPayment = splitPlan?.waitlist
    ? partDownPayment(splitPlan.waitlist.participants)
    : null;
  const downPaymentView = !splitPlan
    ? {
        amount: downPaymentAmount ?? 0,
        totalPrice: calculateTotalPrice(registrationData, course),
        isWaitlist: staff ? staff.resolvedStatus === "WAITLIST" : isWaitlist,
        waitlistAmount: null,
      }
    : confirmedDownPayment !== null
      ? {
          amount: confirmedDownPayment,
          totalPrice: splitPlan.primary.totalPrice,
          isWaitlist: false,
          waitlistAmount: waitlistDownPayment,
        }
      : {
          // Nur wartende Teilnehmer tragen eine Anzahlung.
          amount: waitlistDownPayment ?? 0,
          totalPrice: splitPlan.waitlist?.totalPrice ?? 0,
          isWaitlist: true,
          waitlistAmount: null,
        };

  return (
    <div className="space-y-8">
      <Heading as="h3" size="list" id={headingId} tabIndex={-1} rule>
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

      {/* Seats: before prices and down payment, which follow the choice. */}
      {seatShortage &&
        (seatSplit.canSplit && (!staff || seatSplit.splitting) ? (
          <SeatSplitChoice
            course={course}
            participants={registrationData.participants}
            shortage={seatShortage}
            availability={seatSplit.availability}
            showModeChoice={!staff}
            splitting={seatSplit.splitting}
            onSplittingChange={seatSplit.setSplitting}
            selectedIndexes={seatSplit.selectedIndexes}
            onSelectedIndexesChange={seatSplit.setSelectedIndexes}
            problem={seatSplit.problem}
          />
        ) : (
          !staff && (
            <SeatShortageNotice
              course={course}
              shortage={seatShortage}
              participantCount={registrationData.participants.length}
            />
          )
        ))}

      {registrationNeedsPaymentMethod(course) && (
        <div className="border-rule dark:border-night-rule border-t pt-8">
          <GroupHeading id={paymentHeadingId}>Zahlungsweise</GroupHeading>
          {courseRequiresPaymentMethodChoice(course) ? (
            <div className="mt-2 space-y-3">
              <p className="text-dark dark:text-night-muted text-sm">
                Bitte wählen Sie, wie Sie die Teilnahmegebühr begleichen
                möchten.
              </p>
              <div
                role="radiogroup"
                aria-labelledby={paymentHeadingId}
                aria-required
                aria-invalid={paymentProblem ? true : undefined}
                aria-describedby={paymentProblem ? paymentProblemId : undefined}
                className="space-y-1"
              >
                {courseAcceptsCash(course) && (
                  <label className="border-rule dark:border-night-rule flex min-h-11 cursor-pointer items-center gap-3 border-b py-2">
                    <input
                      type="radio"
                      name="course-payment-method"
                      data-focus-key="paymentMethod"
                      className={RADIO_INPUT_CLASS}
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
                      // Ohne Barzahlung ist dies der erste Knopf der Gruppe.
                      data-focus-key={
                        courseAcceptsCash(course) ? undefined : "paymentMethod"
                      }
                      className={RADIO_INPUT_CLASS}
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
              {paymentProblem ? (
                <FieldProblem id={paymentProblemId}>
                  {paymentProblem}
                </FieldProblem>
              ) : null}
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
          amount={downPaymentView.amount}
          totalPrice={downPaymentView.totalPrice}
          isWaitlist={downPaymentView.isWaitlist}
          waitlistAmount={downPaymentView.waitlistAmount}
          acknowledgement={
            staff
              ? undefined
              : {
                  checked: downPaymentAcknowledged,
                  onChange: setDownPaymentAcknowledged,
                  problem: problemFor("downPaymentAcknowledged"),
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
            canSplit={seatSplit.canSplit}
            // Aufgeteilt verbucht „bereits eingegangen“ nur beim bestätigten Teil.
            downPaymentAmount={
              splitPlan ? confirmedDownPayment : downPaymentAmount
            }
          />
          <div>
            <label className={CONSENT_LABEL_CLASS}>
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                required
                data-focus-key="termsAccepted"
                aria-invalid={termsProblem ? true : undefined}
                aria-describedby={termsProblem ? termsProblemId : undefined}
                className="border-ink dark:border-night-text mt-1 h-4 w-4 shrink-0 rounded-none"
              />
              <span className="text-ink dark:text-night-text text-sm">
                Der Anmelder hat dieser Anmeldung zugestimmt (z. B. per E-Mail,
                telefonisch oder auf einem Papierformular) und die
                Teilnahmebedingungen zur Kenntnis genommen.
              </span>
            </label>
            {termsProblem ? (
              <FieldProblem id={termsProblemId}>{termsProblem}</FieldProblem>
            ) : null}
          </div>
        </>
      ) : (
        /* Terms */
        <div>
          <label className={CONSENT_LABEL_CLASS}>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              required
              data-focus-key="termsAccepted"
              aria-invalid={termsProblem ? true : undefined}
              aria-describedby={termsProblem ? termsProblemId : undefined}
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
          {termsProblem ? (
            <FieldProblem id={termsProblemId}>{termsProblem}</FieldProblem>
          ) : null}
        </div>
      )}
    </div>
  );
}
