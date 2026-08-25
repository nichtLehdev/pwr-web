/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/app/_components/ui/toast";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isParticipantUnder18 } from "@/lib/participant-utils";
import { isRequiredCustomFieldEmpty } from "@/lib/course-custom-fields";
import type {
  RegistrationData,
  Step,
  CourseRegistrationFormProps,
  StaffRegistrationOptions,
} from "./course-registration-form/types";
import { Step1RegistrantInfo } from "./course-registration-form/step-1-registrant-info";
import { Step2Participants } from "./course-registration-form/step-2-participants";
import { Step3Summary } from "./course-registration-form/step-3-summary";
import { validateStep as validateStepUtil } from "./course-registration-form/utils";
import { registrationErrorMessage } from "@/lib/registration-error-message";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";

export default function CourseRegistrationForm({
  course,
  onClose,
  onSuccess,
  isWaitlist,
  currentUser,
  variant = "modal",
  staffMode = false,
  availableSlots,
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
  const groupIdCounterRef = useRef(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(140);
  const [validationErrors, setValidationErrors] = useState<
    Record<number, string>
  >({});
  const [missingFields, setMissingFields] = useState<Record<number, string[]>>(
    {},
  );
  const [showParticipantLibrary, setShowParticipantLibrary] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [staffOptions, setStaffOptions] = useState<StaffRegistrationOptions>({
    registrationStatus: "AUTO",
    sendConfirmationEmail: true,
    allowOverbooking: false,
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

  useEffect(() => {
    if (variant !== "modal") return;
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");
    return () => {
      document.body.style.overflow = "unset";
      document.documentElement.classList.remove("modal-open");
      document.body.classList.remove("modal-open");
    };
  }, [variant]);

  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };

    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);
    return () => window.removeEventListener("resize", updateHeaderHeight);
  }, [currentStep]);

  // Escape/Abbrechen with entered participants (or past step 1) asks first —
  // it used to silently discard everything, even on the summary step.
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

        // Check required fields
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

        // Check required custom fields
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
  }, [currentStep, registrationData.participants, course.customFields]);

  // Validate sibling discount eligibility - compute error message with useMemo
  const siblingDiscountError = useMemo(() => {
    if (
      !registrationData.siblingDiscountApplied ||
      !course.allowSiblingDiscount ||
      registrationData.participants.length === 0
    ) {
      return "";
    }

    const siblingGroups = new Map<
      string,
      typeof registrationData.participants
    >();
    for (const participant of registrationData.participants) {
      if (participant.siblingGroupId) {
        if (!siblingGroups.has(participant.siblingGroupId)) {
          siblingGroups.set(participant.siblingGroupId, []);
        }
        siblingGroups.get(participant.siblingGroupId)?.push(participant);
      }
    }

    let hasEligibleParticipants = false;
    for (const [, groupParticipants] of siblingGroups) {
      if (groupParticipants.length > 1) {
        const eligibleParticipants = groupParticipants.filter(
          (p) => p.birthDate && isParticipantUnder18(p.birthDate),
        );
        if (eligibleParticipants.length > 1) {
          hasEligibleParticipants = true;
          break;
        }
      }
    }

    if (!hasEligibleParticipants && siblingGroups.size > 0) {
      return "Für den Geschwisterkindrabatt müssen mindestens zwei Minderjährige (unter 18 Jahren) in einer Geschwistergruppe vorhanden sein.";
    }

    return "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    );
  };

  const canProceed = validateStep(currentStep);

  // Seats short for what has been entered — the point at which the staff
  // mutation requires an explicit overbooking consent. Falls back to the
  // course-is-full flag when the free-seat count was not passed in.
  const staffSeatsShort =
    availableSlots != null && Number.isFinite(availableSlots)
      ? registrationData.participants.length > availableSlots
      : isWaitlist;

  // Mirrors the server: "AUTO" only becomes a waiting-list entry when the
  // course actually offers one, otherwise it confirms.
  const staffResolvedStatus =
    staffOptions.registrationStatus !== "AUTO"
      ? staffOptions.registrationStatus
      : staffSeatsShort && course.allowWaitingList
        ? "WAITLIST"
        : "CONFIRMED";

  // Same rule the staff mutation enforces server-side: confirming beyond the
  // capacity needs the acknowledgement.
  const blockedByFull =
    staffMode &&
    staffSeatsShort &&
    staffResolvedStatus === "CONFIRMED" &&
    !staffOptions.allowOverbooking;

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
      onSuccess: () => {
        toast.success(
          staffMode
            ? "Die Anmeldung wurde erfasst."
            : isWaitlist
              ? "Sie wurden auf die Warteliste gesetzt."
              : "Ihre Anmeldung war erfolgreich.",
        );
        onSuccess();
      },
      onError: (error: { message: string }) => {
        // Surface the real cause (course filled up, deadline passed,
        // duplicate registration) — a generic "try again" message hides
        // errors that retrying can never fix. Zod issues arrive as a JSON
        // array and used to collapse into that same generic text, which named
        // neither the field nor the reason; they are now named instead.
        const message = registrationErrorMessage(error.message);
        setSubmitError(message);
        toast.error(message);
        console.error("Registration error:", error);
      },
    };

    if (staffMode) {
      staffRegistrationMutation.mutate(
        {
          ...payload,
          ...(staffOptions.registrationStatus !== "AUTO" && {
            registrationStatus: staffOptions.registrationStatus,
          }),
          allowOverbooking: staffOptions.allowOverbooking,
          sendConfirmationEmail: staffOptions.sendConfirmationEmail,
        },
        handlers,
      );
      return;
    }

    registrationMutation.mutate(payload, handlers);
  };

  const isModal = variant === "modal";

  const discardConfirm = showDiscardConfirm ? (
    <ScrollableModal>
      <ScrollableModalCard maxW="md">
        <ScrollableModalBody>
          <h3 className="text-dark dark:text-dark-text mb-4 text-lg font-bold">
            Anmeldung verwerfen?
          </h3>
          <p className="mb-2 text-gray-600 dark:text-gray-400">
            Ihre bisherigen Eingaben
            {registrationData.participants.length > 0
              ? ` (${registrationData.participants.length} Teilnehmer)`
              : ""}{" "}
            gehen dabei verloren.
          </p>
        </ScrollableModalBody>
        <ScrollableModalFooter>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowDiscardConfirm(false)}
              className="dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Weiter ausfüllen
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDiscardConfirm(false);
                onClose();
              }}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-700"
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
        />
      )}
      {currentStep === 2 && (
        <Step2Participants
          course={course}
          registrationData={registrationData}
          setRegistrationData={setRegistrationData}
          validationErrors={validationErrors}
          setValidationErrors={setValidationErrors}
          missingFields={missingFields}
          setMissingFields={setMissingFields}
          currentUser={currentUser}
          savedParticipantsQuery={savedParticipantsQuery}
          saveParticipantMutation={saveParticipantMutation}
          showParticipantLibrary={showParticipantLibrary}
          setShowParticipantLibrary={setShowParticipantLibrary}
          headerHeight={headerHeight}
          groupIdCounterRef={groupIdCounterRef}
          siblingDiscountError={siblingDiscountError}
          stickyToolbar={isModal}
        />
      )}
      {currentStep === 3 && (
        <Step3Summary
          course={course}
          registrationData={registrationData}
          setRegistrationData={setRegistrationData}
          termsAccepted={termsAccepted}
          setTermsAccepted={setTermsAccepted}
          isWaitlist={isWaitlist}
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
        <div
          role="alert"
          className="mt-4 rounded-md border-l-4 border-red-500 bg-red-50 p-3 dark:border-red-400 dark:bg-red-900/20"
        >
          <p className="text-sm text-red-800 dark:text-red-300">
            {submitError}
          </p>
        </div>
      )}
    </>
  );

  const footerButtons = (
    <>
      <button
        type="button"
        onClick={() =>
          currentStep > 1 && setCurrentStep((currentStep - 1) as Step)
        }
        disabled={currentStep === 1}
        className="text-dark dark:text-dark-text dark:border-dark-border dark:hover:bg-dark-background order-2 rounded-lg border-2 border-gray-300 px-4 py-2 text-sm font-semibold transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:order-1 sm:px-5"
      >
        Zurück
      </button>
      <div className="order-1 text-center text-xs whitespace-nowrap text-gray-600 sm:order-2 sm:flex-1 sm:text-sm dark:text-gray-400">
        Schritt {currentStep} von 3
      </div>
      {currentStep < 3 ? (
        <button
          type="button"
          onClick={() => {
            if (currentStep === 2 && Object.keys(validationErrors).length > 0) {
              return;
            }
            setCurrentStep((currentStep + 1) as Step);
          }}
          disabled={
            !canProceed ||
            (currentStep === 2 && Object.keys(validationErrors).length > 0)
          }
          className="bg-primary hover:bg-primary-dark order-3 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
        >
          {currentStep === 1 ? "Weiter zu Teilnehmern" : "Weiter zur Übersicht"}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitMutation.isPending || !termsAccepted || blockedByFull}
          className="order-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
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

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex overscroll-y-contain bg-black/50 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4 sm:py-6">
        <div
          className="dark:bg-dark-surface dark:shadow-dark-border flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-none bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            ref={headerRef}
            className="bg-primary z-10 shrink-0 rounded-none p-6 text-white sm:rounded-t-xl"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="mb-1 text-2xl font-bold">
                  {staffMode
                    ? "Anmeldung erfassen"
                    : isWaitlist
                      ? "Warteliste"
                      : "Anmeldung"}
                </h2>
                <p className="truncate text-sm opacity-90">{course.title}</p>
              </div>
              <button
                type="button"
                onClick={requestClose}
                className="rounded-lg p-2 transition-colors hover:bg-white/20"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex items-start justify-between">
              {stepsMeta.map((step, index) => (
                <div key={step.num} className="flex flex-1 items-start">
                  <div className="flex w-full flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                        currentStep >= step.num
                          ? "text-primary bg-white"
                          : "bg-white/20 text-white/60"
                      }`}
                    >
                      {step.num}
                    </div>
                    <span className="mt-1 text-[10px] whitespace-nowrap opacity-90 sm:text-xs">
                      {step.label}
                    </span>
                  </div>
                  {index < 2 && (
                    <div
                      className={`mx-2 mt-4 hidden h-1 flex-1 transition-colors sm:block ${
                        currentStep > step.num ? "bg-white" : "bg-white/20"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
            <div className="p-5 sm:p-6">{stepBody}</div>
          </div>
          <div className="dark:border-dark-border dark:bg-dark-background-secondary flex shrink-0 flex-col items-stretch justify-between gap-2 rounded-none border-t border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center sm:gap-3 sm:rounded-b-xl sm:p-4">
            {footerButtons}
          </div>
        </div>
        {discardConfirm}
      </div>
    );
  }

  /* —— Full page layout (matches Lehrgang + Meine Anmeldungen surfaces) —— */
  return (
    <div className="w-full">
      <div
        ref={headerRef}
        className="dark:border-dark-border dark:bg-dark-surface border-b border-gray-200 bg-white shadow-sm"
      >
        <div className="container mx-auto max-w-3xl px-4 py-4 sm:py-5">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-dark dark:text-dark-text text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                {staffMode
                  ? "Anmeldung erfassen"
                  : isWaitlist
                    ? "Warteliste"
                    : "Anmeldung"}
              </p>
              <p className="text-dark dark:text-dark-text mt-1 max-w-xl text-sm text-gray-600 dark:text-gray-400">
                {staffMode
                  ? "Anmeldung im Namen des Anmelders erfassen — Anmeldeschluss und Anmeldestatus des Kurses werden dabei nicht geprüft. Adresse und Telefon sind optional, für Rechnungen aber nötig."
                  : "Bitte alle Schritte vollständig ausfüllen. Ihre Daten werden nur für diese Anmeldung verwendet."}
              </p>
            </div>
            <button
              type="button"
              onClick={requestClose}
              className="text-dark dark:text-dark-text dark:border-dark-border dark:hover:bg-dark-background self-start rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 sm:mt-1"
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
                        "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                        done &&
                          "border-primary bg-primary dark:border-primary dark:bg-primary text-white",
                        active &&
                          !done &&
                          "border-primary text-primary dark:border-primary dark:text-primary-light",
                        !active &&
                          !done &&
                          "dark:border-dark-border border-gray-200 text-gray-400 dark:text-gray-500",
                      )}
                    >
                      {step.num}
                    </div>
                    <span
                      className={cn(
                        "mt-2 text-center text-[11px] leading-tight font-medium sm:text-xs",
                        active || done
                          ? "text-dark dark:text-dark-text"
                          : "text-gray-500 dark:text-gray-500",
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

      <div className="container mx-auto max-w-3xl px-4 py-5 pb-20 md:py-6 md:pb-24">
        <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg border border-gray-200 bg-white p-5 shadow-md sm:p-6">
          {stepBody}
        </div>
      </div>

      <div className="dark:border-dark-border dark:bg-dark-background-secondary sticky bottom-0 z-20 border-t border-gray-200 bg-gray-50/90 px-4 py-2.5 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:py-3">
        <div className="container mx-auto flex max-w-3xl flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center sm:gap-3">
          {footerButtons}
        </div>
      </div>
      {discardConfirm}
    </div>
  );
}
