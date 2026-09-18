/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useId, useRef, useMemo } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/app/_components/ui/toast";
import { cn } from "@/lib/utils";
import { hasDiscountEligibleSiblingGroup } from "@/lib/sibling-discount";
import { isRequiredCustomFieldEmpty } from "@/lib/course-custom-fields";
import {
  ageOnDate,
  priceOptionAgeMismatchMessage,
  priceOptionAgeReferenceDate,
} from "@/lib/course-price-option-age";
import type {
  RegistrationData,
  Step,
  CourseRegistrationFormProps,
  StaffRegistrationOptions,
} from "./course-registration-form/types";
import { Step1RegistrantInfo } from "./course-registration-form/step-1-registrant-info";
import {
  ADD_PARTICIPANT_FOCUS_KEY,
  participantFocusKey,
  Step2Participants,
} from "./course-registration-form/step-2-participants";
import { Step3Summary } from "./course-registration-form/step-3-summary";
import {
  problemSummary,
  registrantProblems,
  summaryProblems,
  validateStep as validateStepUtil,
  type FormProblem,
} from "./course-registration-form/utils";
import { registrationErrorMessage } from "@/lib/registration-error-message";
import { registrationSeatShortage } from "@/lib/registration-seat-shortage";
import {
  defaultSeatSelection,
  SEAT_SELECTION_OUTDATED_MESSAGE,
  seatSelectionProblem,
} from "@/lib/registration-split";
import { useRouter } from "next/navigation";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import { Heading } from "@/app/_components/programmheft/section-head";
import { Note } from "@/app/_components/programmheft/note";

/** Höhe der festen Leisten oben; als `scroll-margin-top` gesetzt, damit der Browser die CSS-Variablen auflöst. */
const FOCUS_TARGET_MARGIN =
  "[&_:is([data-focus-key],h3)]:scroll-mt-[calc(var(--main-padding-top,5rem)+var(--kolumnentitel-hoehe,0px))]";

/**
 * Fokus setzen und nur scrollen, wenn das Element unter den festen Leisten läge.
 * Sofort statt weich: ein noch laufendes weiches Scrollen setzte sich sonst gegen den Sprung durch.
 */
function focusVisibly(
  element: HTMLElement,
  footer: HTMLElement | null,
  align: "start" | "center",
) {
  element.focus({ preventScroll: true });
  const rect = element.getBoundingClientRect();
  const top = parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
  const bottom =
    window.innerHeight - (footer?.getBoundingClientRect().height ?? 0);
  const margin = 16;
  const visible = rect.top >= top + margin && rect.bottom <= bottom - margin;
  const shift = visible
    ? 0
    : align === "start"
      ? rect.top - top - margin
      : rect.top + rect.height / 2 - (top + bottom) / 2;
  window.scrollTo({ top: window.scrollY + shift, behavior: "instant" });
}

export default function CourseRegistrationForm({
  course,
  onClose,
  onSuccess,
  isWaitlist,
  currentUser,
  staffMode = false,
  availableSlots,
  capacityByPriceOption,
}: CourseRegistrationFormProps) {
  const toast = useToast();
  const registrationMutation = api.registrations.create.useMutation();
  const staffRegistrationMutation =
    api.registrations.createByStaff.useMutation();
  const submitMutation = staffMode
    ? staffRegistrationMutation
    : registrationMutation;
  const savedParticipantsQuery = api.savedParticipants.getAll.useQuery(
    undefined,
    { enabled: !!currentUser },
  );
  const saveParticipantMutation = api.savedParticipants.create.useMutation({
    onSuccess: () => {
      toast.success(
        "Teilnehmer gespeichert. Sie können gespeicherte Teilnehmer in den Einstellungen verwalten.",
      );
      void savedParticipantsQuery.refetch();
    },
  });

  const [currentStep, setCurrentStep] = useState<Step>(1);
  /**
   * Letzter Versuch, mit Lücken weiterzugehen. Markiert nur die dabei fehlenden `fields`;
   * `count` hängt die Meldung neu ein, damit sie auch unverändert wieder vorgelesen wird.
   */
  const [attempt, setAttempt] = useState<{
    step: Step;
    count: number;
    fields: string[];
  } | null>(null);
  const stepHeadingId = useId();
  const problemSummaryId = useId();
  const formRootRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  /** Feld, in das der Fokus nach dem nächsten Rendern springt. */
  const pendingProblemFocus = useRef<string | null>(null);
  const previousStepRef = useRef<Step>(1);
  const groupIdCounterRef = useRef(0);
  const [validationErrors, setValidationErrors] = useState<
    Record<number, string>
  >({});
  const [missingFields, setMissingFields] = useState<Record<number, string[]>>(
    {},
  );
  const [showParticipantLibrary, setShowParticipantLibrary] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [downPaymentAcknowledged, setDownPaymentAcknowledged] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const router = useRouter();
  const utils = api.useUtils();
  /** Who gets the free seats, for the participant list it was chosen on. */
  const [seatSplit, setSeatSplit] = useState<{
    participants: RegistrationData["participants"];
    splitting: boolean;
    indexes: number[];
  } | null>(null);
  const [staffOptions, setStaffOptions] = useState<StaffRegistrationOptions>({
    registrationStatus: "AUTO",
    sendConfirmationEmail: true,
    allowOverbooking: false,
    downPaymentAlreadyPaid: false,
  });
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    registrantEmail: currentUser?.email || "",
    registrantFirstName: currentUser?.firstName || "",
    registrantLastName: currentUser?.lastName || "",
    registrantPhone: currentUser?.phone || "",
    registrantStreet: currentUser?.street || "",
    registrantZipCode: currentUser?.zipCode || "",
    registrantCity: currentUser?.city || "",
    useSeparateBilling: false,
    billingStreet: "",
    billingZipCode: "",
    billingCity: "",
    billingCompany: "",
    billingFirstName: "",
    billingLastName: "",
    billingEmail: "",
    participants: [],
    siblingDiscountApplied: false,
    paymentMethod: undefined,
  });

  useEffect(() => {
    if (course.isFree) return;
    const cash = course.paymentCashAllowed !== false;
    const inv = course.paymentInvoiceAllowed !== false;
    if (cash && !inv) {
      // Lässt der Kurs nur eine Zahlungsweise zu, wird sie hier vorbelegt.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRegistrationData((d) =>
        d.paymentMethod === "CASH" ? d : { ...d, paymentMethod: "CASH" },
      );
    } else if (!cash && inv) {
      setRegistrationData((d) =>
        d.paymentMethod === "INVOICE" ? d : { ...d, paymentMethod: "INVOICE" },
      );
    }
  }, [
    course.id,
    course.isFree,
    course.paymentCashAllowed,
    course.paymentInvoiceAllowed,
  ]);

  // Escape/Abbrechen with entered participants (or past step 1) asks first.
  const hasUnsavedWork =
    currentStep > 1 || registrationData.participants.length > 0;

  const requestClose = () => {
    if (hasUnsavedWork) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showParticipantLibrary) {
          setShowParticipantLibrary(false);
        } else if (showDiscardConfirm) {
          setShowDiscardConfirm(false);
        } else if (
          currentStep > 1 ||
          registrationData.participants.length > 0
        ) {
          setShowDiscardConfirm(true);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [
    onClose,
    showParticipantLibrary,
    showDiscardConfirm,
    currentStep,
    registrationData.participants.length,
  ]);

  useEffect(() => {
    if (currentStep === 2) {
      const errors: Record<number, string> = {};
      const missing: Record<number, string[]> = {};
      registrationData.participants.forEach((p, index) => {
        const fieldErrors: string[] = [];
        const missingFieldKeys: string[] = [];

        if (!p.firstName?.trim()) {
          fieldErrors.push("Vorname");
          missingFieldKeys.push("firstName");
        }
        if (!p.lastName?.trim()) {
          fieldErrors.push("Nachname");
          missingFieldKeys.push("lastName");
        }
        if (!p.birthDate) {
          fieldErrors.push("Geburtsdatum");
          missingFieldKeys.push("birthDate");
        } else {
          const birthDate = new Date(p.birthDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Reset time to compare dates only
          const oneYearAgo = new Date(today);
          oneYearAgo.setFullYear(today.getFullYear() - 1);
          const maxAge = new Date(today);
          maxAge.setFullYear(today.getFullYear() - 120); // Reasonable maximum age

          if (birthDate >= today) {
            errors[index] =
              "Geburtsdatum darf nicht heute oder in der Zukunft liegen";
            missingFieldKeys.push("birthDate");
          } else if (birthDate > oneYearAgo) {
            errors[index] = "Teilnehmer muss mindestens 1 Jahr alt sein";
            missingFieldKeys.push("birthDate");
          } else if (birthDate < maxAge) {
            errors[index] = "Geburtsdatum ist nicht gültig";
            missingFieldKeys.push("birthDate");
          }
        }
        if (!p.city?.trim()) {
          fieldErrors.push("Stadt");
          missingFieldKeys.push("city");
        }
        if (!p.priceOptionId) {
          fieldErrors.push("Preisoption");
          missingFieldKeys.push("priceOptionId");
        }

        if (course.customFields) {
          for (const field of course.customFields) {
            if (field.isRequired) {
              const customFields = p.customFields as
                Record<string, any> | undefined;
              const fieldValue = customFields?.[field.fieldName];
              if (isRequiredCustomFieldEmpty(field.fieldType, fieldValue)) {
                fieldErrors.push(field.fieldName);
                missingFieldKeys.push(`customField:${field.fieldName}`);
              }
            }
          }
        }

        if (fieldErrors.length > 0) {
          errors[index] = `Fehlende Pflichtfelder: ${fieldErrors.join(", ")}`;
        }

        // Altersgrenze zuletzt: fehlt Geburtsdatum oder Kategorie, ist das die nähere Ursache.
        if (!staffMode && !errors[index] && p.birthDate && p.priceOptionId) {
          const option = course.priceOptions.find(
            (po) => po.id === p.priceOptionId,
          );
          const mismatch = option
            ? priceOptionAgeMismatchMessage(
                option,
                ageOnDate(p.birthDate, priceOptionAgeReferenceDate(course)),
              )
            : null;
          if (mismatch) {
            errors[index] = mismatch;
            missingFieldKeys.push("priceOptionId");
          }
        }

        if (missingFieldKeys.length > 0) {
          missing[index] = missingFieldKeys;
        }
      });
      requestAnimationFrame(() => {
        setValidationErrors(errors);
        setMissingFields(missing);
      });
    } else {
      requestAnimationFrame(() => {
        setValidationErrors({});
        setMissingFields({});
      });
    }
  }, [currentStep, registrationData.participants, course, staffMode]);

  const siblingDiscountError = useMemo(() => {
    if (
      !registrationData.siblingDiscountApplied ||
      !course.allowSiblingDiscount ||
      registrationData.participants.length === 0
    ) {
      return "";
    }

    const hasAnySiblingGroup = registrationData.participants.some(
      (p) => p.siblingGroupId,
    );
    if (
      hasAnySiblingGroup &&
      !hasDiscountEligibleSiblingGroup(registrationData.participants)
    ) {
      return "Für den Geschwisterkindrabatt müssen mindestens zwei Geschwister in einer Geschwistergruppe zusammengefasst sein.";
    }

    return "";
  }, [
    registrationData.siblingDiscountApplied,
    registrationData.participants,
    course.allowSiblingDiscount,
  ]);

  const validateStep = (step: Step): boolean => {
    return validateStepUtil(
      step,
      registrationData,
      course,
      validationErrors,
      termsAccepted,
      staffMode,
      downPaymentAcknowledged,
    );
  };

  // Beim Schrittwechsel Fokus auf die neue Überschrift, sonst fällt er auf `BODY`
  // (der gedrückte Knopf verschwindet) und Vorlesegeräte beginnen oben.
  useEffect(() => {
    if (previousStepRef.current === currentStep) return;
    previousStepRef.current = currentStep;
    const heading = document.getElementById(stepHeadingId);
    if (heading) focusVisibly(heading, footerRef.current, "start");
  }, [currentStep, stepHeadingId]);

  useEffect(() => {
    const key = pendingProblemFocus.current;
    if (!key) return;
    pendingProblemFocus.current = null;
    const field = formRootRef.current?.querySelector<HTMLElement>(
      `[data-focus-key="${key}"]`,
    );
    if (field) focusVisibly(field, footerRef.current, "center");
  });

  const participantPriceOptionIds = registrationData.participants.map(
    (p) => p.priceOptionId,
  );
  const seatAvailability = {
    availableSlots,
    priceOptions: course.priceOptions,
    capacityByPriceOption,
  };

  // Why the entered participants won't all get a seat: too few free seats in
  // the course or in one of the chosen price options.
  const seatShortage = registrationSeatShortage({
    participantPriceOptionIds,
    ...seatAvailability,
  });

  // From here the staff mutation requires overbooking consent; `isWaitlist`
  // covers a free-seat count that was not passed in.
  const staffSeatsShort = isWaitlist || seatShortage !== null;

  // Splitting needs a waiting list for the rest and at least one participant
  // who fits right now.
  const defaultSelection = defaultSeatSelection(
    participantPriceOptionIds,
    seatAvailability,
  );
  const canSplit =
    !!course.allowWaitingList &&
    seatShortage !== null &&
    registrationData.participants.length > 1 &&
    defaultSelection.length > 0;

  // A selection belongs to the participant list it was made for — changing
  // the list in step 2 starts over from the default.
  const currentSplit =
    seatSplit?.participants === registrationData.participants
      ? seatSplit
      : null;
  const staffStatus =
    staffOptions.registrationStatus === "SPLIT" && !canSplit
      ? "AUTO"
      : staffOptions.registrationStatus;
  const splitting =
    canSplit &&
    (staffMode ? staffStatus === "SPLIT" : (currentSplit?.splitting ?? false));
  const selectedIndexes = currentSplit?.indexes ?? defaultSelection;
  const seatSelectionIssue = splitting
    ? seatSelectionProblem(
        participantPriceOptionIds,
        selectedIndexes,
        seatAvailability,
      )
    : null;
  const updateSeatSplit = (change: {
    splitting?: boolean;
    indexes?: number[];
  }) =>
    setSeatSplit({
      participants: registrationData.participants,
      splitting: change.splitting ?? currentSplit?.splitting ?? false,
      indexes: change.indexes ?? selectedIndexes,
    });

  // Mirrors the server: "AUTO" only becomes a waiting-list entry when the
  // course actually offers one, otherwise it confirms.
  const staffResolvedStatus =
    staffStatus !== "AUTO"
      ? staffStatus
      : staffSeatsShort && course.allowWaitingList
        ? "WAITLIST"
        : "CONFIRMED";

  const expectsWaitlist = splitting
    ? false
    : staffMode
      ? staffResolvedStatus === "WAITLIST"
      : !!course.allowWaitingList && staffSeatsShort;

  // Same rule the staff mutation enforces server-side: confirming beyond the
  // capacity needs the acknowledgement.
  const blockedByFull =
    staffMode &&
    staffSeatsShort &&
    staffResolvedStatus === "CONFIRMED" &&
    !staffOptions.allowOverbooking;

  /**
   * Was dem aktuellen Schritt fehlt, in der Reihenfolge der Seite. Leer heißt:
   * es darf weitergehen. Dieselben Regeln wie `validateStep`.
   */
  const stepProblems = (step: Step): FormProblem[] => {
    if (step === 1) return registrantProblems(registrationData, staffMode);
    if (step === 2) {
      if (registrationData.participants.length === 0) {
        return [
          {
            field: ADD_PARTICIPANT_FOCUS_KEY,
            label: "mindestens ein Teilnehmer",
            message: "",
          },
        ];
      }
      const problems = registrationData.participants.flatMap(
        (participant, index): FormProblem[] => {
          const error = validationErrors[index];
          if (!error) return [];
          const name =
            [participant.firstName, participant.lastName]
              .map((part) => part?.trim())
              .filter(Boolean)
              .join(" ") || `Teilnehmer ${index + 1}`;
          return [
            {
              field: participantFocusKey(index),
              label: `Angaben zu ${name}`,
              message: error,
            },
          ];
        },
      );
      // Die Prüfung der Karten läuft einen Bildaufbau später; bis dahin
      // bleibt es bei der allgemeinen Nennung.
      return problems.length > 0 || validateStep(2)
        ? problems
        : [{ field: "", label: "Angaben zu den Teilnehmern", message: "" }];
    }
    const summary = summaryProblems(registrationData, course, {
      termsAccepted,
      staffMode,
      downPaymentAcknowledged,
    });
    const terms = summary.filter((p) => p.field === "termsAccepted");
    return [
      ...(seatSelectionIssue
        ? [
            {
              field: "seatSelection",
              label: "Auswahl für die freien Plätze",
              message: "",
            },
          ]
        : []),
      ...summary.filter((p) => p.field !== "termsAccepted"),
      ...(blockedByFull
        ? [
            {
              field: "allowOverbooking",
              label: "Überbuchung zulassen oder Status ändern",
              message: "",
            },
          ]
        : []),
      ...terms,
    ];
  };

  const currentProblems = stepProblems(currentStep);
  const shownProblems =
    attempt?.step === currentStep
      ? currentProblems.filter((p) => attempt.fields.includes(p.field))
      : [];
  const showProblems = shownProblems.length > 0;

  const goToStep = (step: Step) => {
    setAttempt(null);
    setCurrentStep(step);
  };

  /** Weiter bzw. Absenden; mit Lücken nennt er sie, markiert die Felder und springt ins erste. */
  const advance = (proceed: () => void) => {
    if (currentProblems.length > 0) {
      setAttempt((prev) => ({
        step: currentStep,
        count: (prev?.count ?? 0) + 1,
        fields: currentProblems.map((p) => p.field),
      }));
      pendingProblemFocus.current = currentProblems[0]?.field || null;
      return;
    }
    proceed();
  };

  const handleSubmit = async () => {
    setSubmitError("");

    const payload = {
      courseId: course.id,
      registrantFirstName:
        registrationData.registrantFirstName || currentUser?.firstName || "",
      registrantLastName:
        registrationData.registrantLastName || currentUser?.lastName || "",
      registrantEmail:
        registrationData.registrantEmail || currentUser?.email || "",
      // Sent only when filled: the empty string fails the phone-format
      // check, and staff entries may legitimately have no phone number.
      ...((registrationData.registrantPhone || currentUser?.phone) && {
        registrantPhone:
          registrationData.registrantPhone || currentUser?.phone || undefined,
      }),
      ...(registrationData.registrantStreet && {
        registrantStreet: registrationData.registrantStreet,
      }),
      ...(registrationData.registrantZipCode && {
        registrantZipCode: registrationData.registrantZipCode,
      }),
      ...(registrationData.registrantCity && {
        registrantCity: registrationData.registrantCity,
      }),
      ...(registrationData.useSeparateBilling !== undefined && {
        useSeparateBilling: registrationData.useSeparateBilling,
      }),
      ...(registrationData.billingCompany && {
        billingCompany: registrationData.billingCompany,
      }),
      ...(registrationData.billingFirstName && {
        billingFirstName: registrationData.billingFirstName,
      }),
      ...(registrationData.billingLastName && {
        billingLastName: registrationData.billingLastName,
      }),
      ...(registrationData.billingStreet && {
        billingStreet: registrationData.billingStreet,
      }),
      ...(registrationData.billingZipCode && {
        billingZipCode: registrationData.billingZipCode,
      }),
      ...(registrationData.billingCity && {
        billingCity: registrationData.billingCity,
      }),
      ...(registrationData.billingEmail && {
        billingEmail: registrationData.billingEmail,
      }),
      participants: registrationData.participants.map((p) => ({
        firstName: p.firstName,
        lastName: p.lastName,
        birthDate: p.birthDate,
        city: p.city,
        ...(p.instrument && { instrument: p.instrument }),
        priceOptionId: p.priceOptionId,
        ...(p.customFields && { customFields: p.customFields }),
        ...(p.siblingGroupId && { siblingGroupId: p.siblingGroupId }),
      })),
      siblingDiscountApplied: registrationData.siblingDiscountApplied,
      ...(!course.isFree &&
        registrationData.paymentMethod && {
          paymentMethod: registrationData.paymentMethod,
        }),
    };

    const handlers = {
      // Use the status the server assigned: seats may have been taken since the page loaded.
      onSuccess: (registration: {
        registrationStatus: string;
        participants: unknown[];
        waitlistPart: { participantCount: number } | null;
      }) => {
        const waitlisted = registration.registrationStatus === "WAITLIST";
        const split = registration.waitlistPart
          ? `${registration.participants.length} Teilnehmer bestätigt, ${registration.waitlistPart.participantCount} auf der Warteliste`
          : null;
        toast.success(
          staffMode
            ? split
              ? `Die Anmeldung wurde aufgeteilt erfasst: ${split}.`
              : waitlisted
                ? "Die Anmeldung wurde auf der Warteliste erfasst."
                : "Die Anmeldung wurde erfasst."
            : split
              ? `Ihre Anmeldung wurde aufgeteilt: ${split}.`
              : waitlisted
                ? "Sie wurden auf die Warteliste gesetzt."
                : "Ihre Anmeldung war erfolgreich.",
        );
        onSuccess();
      },
      onError: (error: { message: string }) => {
        // Surface the real cause (course full, deadline passed, duplicate) — retrying
        // can't fix those. Zod issues arrive as a JSON array and are named too.
        const message = registrationErrorMessage(error.message);
        setSubmitError(message);
        toast.error(message);
        console.error("Registration error:", error);
        // Seats behind the chosen split were taken meanwhile: reload the free
        // seats so the selection can be adjusted right here.
        if (error.message === SEAT_SELECTION_OUTDATED_MESSAGE) {
          router.refresh();
          void utils.courses.getAvailableSlots.invalidate({ id: course.id });
        }
      },
    };

    const splitPayload = splitting
      ? { confirmedParticipantIndexes: selectedIndexes }
      : {};

    if (staffMode) {
      staffRegistrationMutation.mutate(
        {
          ...payload,
          ...splitPayload,
          ...(staffStatus !== "AUTO" &&
            staffStatus !== "SPLIT" && {
              registrationStatus: staffStatus,
            }),
          allowOverbooking: staffOptions.allowOverbooking,
          sendConfirmationEmail: staffOptions.sendConfirmationEmail,
          downPaymentAlreadyPaid: staffOptions.downPaymentAlreadyPaid,
        },
        handlers,
      );
      return;
    }

    // `splitPayload` auch hier, sonst landet trotz Auswahl die ganze Gruppe auf der Warteliste.
    registrationMutation.mutate(
      { ...payload, ...splitPayload, downPaymentAcknowledged },
      handlers,
    );
  };

  const discardConfirm = showDiscardConfirm ? (
    <ScrollableModal>
      <ScrollableModalCard
        maxW="md"
        className="border-ink dark:border-night-text rounded-none! border-2 shadow-none!"
      >
        <ScrollableModalBody>
          <Heading as="h3" size="list" className="text-lg">
            Anmeldung verwerfen?
          </Heading>
          <p className="text-dark dark:text-night-muted mt-2">
            Ihre bisherigen Eingaben
            {registrationData.participants.length > 0
              ? ` (${registrationData.participants.length} Teilnehmer)`
              : ""}{" "}
            gehen dabei verloren.
          </p>
        </ScrollableModalBody>
        <ScrollableModalFooter className="border-ink dark:border-night-text border-t-2">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowDiscardConfirm(false)}
              className="border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night semi-condensed min-h-11 flex-1 border-2 px-4 py-2 font-semibold transition-colors"
            >
              Weiter ausfüllen
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDiscardConfirm(false);
                onClose();
              }}
              className="semi-condensed min-h-11 flex-1 bg-red-700 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-700"
            >
              Verwerfen
            </button>
          </div>
        </ScrollableModalFooter>
      </ScrollableModalCard>
    </ScrollableModal>
  ) : null;

  const stepsMeta = [
    { num: 1 as const, label: "Anmelder" },
    { num: 2 as const, label: "Teilnehmer" },
    { num: 3 as const, label: "Übersicht" },
  ];

  const stepBody = (
    <>
      {currentStep === 1 && (
        <Step1RegistrantInfo
          registrationData={registrationData}
          setRegistrationData={setRegistrationData}
          staffMode={staffMode}
          headingId={stepHeadingId}
          problems={shownProblems}
        />
      )}
      {currentStep === 2 && (
        <Step2Participants
          course={course}
          registrationData={registrationData}
          setRegistrationData={setRegistrationData}
          validationErrors={validationErrors}
          missingFields={missingFields}
          currentUser={currentUser}
          savedParticipantsQuery={savedParticipantsQuery}
          saveParticipantMutation={saveParticipantMutation}
          showParticipantLibrary={showParticipantLibrary}
          setShowParticipantLibrary={setShowParticipantLibrary}
          groupIdCounterRef={groupIdCounterRef}
          siblingDiscountError={siblingDiscountError}
          staffMode={staffMode}
          headingId={stepHeadingId}
          capacityByPriceOption={capacityByPriceOption}
        />
      )}
      {currentStep === 3 && (
        <Step3Summary
          course={course}
          registrationData={registrationData}
          setRegistrationData={setRegistrationData}
          termsAccepted={termsAccepted}
          setTermsAccepted={setTermsAccepted}
          downPaymentAcknowledged={downPaymentAcknowledged}
          setDownPaymentAcknowledged={setDownPaymentAcknowledged}
          // "Meine Anmeldungen" finds registrations by the account's e-mail,
          // not by who was signed in when submitting.
          listedInMyRegistrations={
            !!currentUser?.email &&
            registrationData.registrantEmail.trim().toLowerCase() ===
              currentUser.email.toLowerCase()
          }
          isWaitlist={expectsWaitlist}
          seatShortage={seatShortage}
          headingId={stepHeadingId}
          problems={shownProblems}
          seatSplit={{
            availability: seatAvailability,
            canSplit,
            splitting,
            setSplitting: (next) => updateSeatSplit({ splitting: next }),
            selectedIndexes,
            setSelectedIndexes: (indexes) => updateSeatSplit({ indexes }),
            problem: seatSelectionIssue,
          }}
          staff={
            staffMode
              ? {
                  options: staffOptions,
                  setOptions: setStaffOptions,
                  seatsShort: staffSeatsShort,
                  resolvedStatus: staffResolvedStatus,
                }
              : undefined
          }
        />
      )}
      {currentStep === 3 && submitError && (
        <Note tone="error" className="mt-4">
          <p>{submitError}</p>
        </Note>
      )}
    </>
  );

  const footerButtons = (
    <>
      <button
        type="button"
        onClick={() => currentStep > 1 && goToStep((currentStep - 1) as Step)}
        disabled={currentStep === 1}
        className="border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night semi-condensed order-2 min-h-11 border-2 px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:order-1 sm:px-5"
      >
        Zurück
      </button>
      <div className="text-dark dark:text-night-muted order-1 text-center text-xs whitespace-nowrap sm:order-2 sm:flex-1 sm:text-sm">
        Schritt {currentStep} von 3
      </div>
      {currentStep < 3 ? (
        <button
          type="button"
          onClick={() => advance(() => goToStep((currentStep + 1) as Step))}
          aria-describedby={showProblems ? problemSummaryId : undefined}
          className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper semi-condensed order-3 min-h-11 px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
        >
          {currentStep === 1 ? "Weiter zu Teilnehmern" : "Weiter zur Übersicht"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => advance(() => void handleSubmit())}
          // Gesperrt nur, solange die Anmeldung unterwegs ist — ein zweiter
          // Klick würde sie doppelt absenden.
          disabled={submitMutation.isPending}
          aria-describedby={showProblems ? problemSummaryId : undefined}
          className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper semi-condensed order-3 min-h-11 px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
        >
          {submitMutation.isPending
            ? staffMode
              ? "Wird erfasst..."
              : "Wird gesendet..."
            : staffMode
              ? "Anmeldung erfassen"
              : "Verbindlich anmelden"}
        </button>
      )}
    </>
  );

  return (
    <div ref={formRootRef} className={cn("w-full", FOCUS_TARGET_MARGIN)}>
      <div className="border-ink dark:border-night-text bg-paper dark:bg-night border-b-2">
        <div className="sheet max-w-3xl py-4 sm:py-5">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="semi-condensed text-dark dark:text-night-muted text-xs font-semibold">
                {staffMode
                  ? "Anmeldung erfassen"
                  : isWaitlist
                    ? "Warteliste"
                    : "Anmeldung"}
              </p>
              <p className="text-ink dark:text-night-text mt-1 max-w-xl text-sm">
                {staffMode
                  ? "Anmeldung im Namen des Anmelders erfassen — Anmeldeschluss und Anmeldestatus des Kurses werden dabei nicht geprüft. Adresse und Telefon sind optional, für Rechnungen aber nötig."
                  : "Bitte alle Schritte vollständig ausfüllen. Ihre Daten werden nur für diese Anmeldung verwendet."}
              </p>
            </div>
            <button
              type="button"
              onClick={requestClose}
              className="border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night semi-condensed min-h-11 self-start border-2 px-3 py-1.5 text-sm font-semibold transition-colors sm:mt-1"
            >
              Abbrechen
            </button>
          </div>
          <nav aria-label="Formularschritte">
            <ol className="grid grid-cols-3 gap-2 sm:gap-4">
              {stepsMeta.map((step) => {
                const done = currentStep > step.num;
                const active = currentStep === step.num;
                return (
                  <li key={step.num} className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center border-2 text-sm font-bold transition-colors",
                        done &&
                          "border-ink bg-ink text-paper dark:border-night-text dark:bg-night-text dark:text-night",
                        active &&
                          !done &&
                          "border-ink text-ink dark:border-night-text dark:text-night-text",
                        !active &&
                          !done &&
                          "border-rule text-dark dark:border-night-rule dark:text-night-muted",
                      )}
                    >
                      {step.num}
                    </div>
                    <span
                      className={cn(
                        "semi-condensed mt-2 text-center text-[11px] leading-tight font-semibold sm:text-xs",
                        active || done
                          ? "text-ink dark:text-night-text"
                          : "text-dark dark:text-night-muted",
                      )}
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </div>

      <div className="sheet max-w-3xl py-5 pb-20 md:py-6 md:pb-24">
        {stepBody}
      </div>

      <div
        ref={footerRef}
        className="border-ink dark:border-night-text bg-paper/95 dark:bg-night/95 sticky bottom-0 z-20 border-t-2 px-4 py-2.5 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:py-3"
      >
        <div className="container mx-auto max-w-3xl">
          {/* Am gedrückten Knopf: was noch fehlt. */}
          {showProblems ? (
            <p
              key={attempt?.count}
              id={problemSummaryId}
              role="alert"
              className="mb-2 text-sm font-semibold text-red-700 dark:text-red-400"
            >
              {problemSummary(shownProblems)}
            </p>
          ) : null}
          <div className="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center sm:gap-3">
            {footerButtons}
          </div>
        </div>
      </div>
      {discardConfirm}
    </div>
  );
}
