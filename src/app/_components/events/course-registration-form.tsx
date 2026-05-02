/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/app/_components/ui/toast";
import { X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { isParticipantUnder18 } from "@/lib/participant-utils";
import { isRequiredCustomFieldEmpty } from "@/lib/course-custom-fields";
import type {
  RegistrationData,
  Step,
  CourseRegistrationFormProps,
} from "./course-registration-form/types";
import { Step1RegistrantInfo } from "./course-registration-form/step-1-registrant-info";
import { Step2Participants } from "./course-registration-form/step-2-participants";
import { Step3Summary } from "./course-registration-form/step-3-summary";
import { validateStep as validateStepUtil } from "./course-registration-form/utils";

export default function CourseRegistrationForm({
  course,
  onClose,
  onSuccess,
  isWaitlist,
  currentUser,
  variant = "modal",
}: CourseRegistrationFormProps) {
  const toast = useToast();
  const registrationMutation = api.registrations.create.useMutation();
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
        d.paymentMethod === "INVOICE"
          ? d
          : { ...d, paymentMethod: "INVOICE" },
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

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showParticipantLibrary) {
          setShowParticipantLibrary(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose, showParticipantLibrary]);

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
                | Record<string, any>
                | undefined;
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
    );
  };

  const canProceed = validateStep(currentStep);

  const handleSubmit = async () => {
    registrationMutation.mutate(
      {
        courseId: course.id,
        registrantFirstName:
          registrationData.registrantFirstName || currentUser?.firstName || "",
        registrantLastName:
          registrationData.registrantLastName || currentUser?.lastName || "",
        registrantEmail:
          registrationData.registrantEmail || currentUser?.email || "",
        registrantPhone:
          registrationData.registrantPhone || currentUser?.phone || "",
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
      },
      {
        onSuccess: () => {
          toast.success(
            isWaitlist
              ? "Sie wurden auf die Warteliste gesetzt."
              : "Ihre Anmeldung war erfolgreich.",
          );
          onSuccess();
        },
        onError: (error) => {
          toast.error(
            "Fehler bei der Anmeldung. Bitte versuchen Sie es erneut.",
          );
          console.error("Registration error:", error);
        },
      },
    );
  };

  const isModal = variant === "modal";

  const stepsMeta = [
    { num: 1 as const, label: "Anmelder" },
    { num: 2 as const, label: "Teilnehmer" },
    { num: 3 as const, label: "Übersicht" },
  ];

  const betaDisclaimer = (
    <div className="rounded-r-lg border-l-4 border-yellow-400 bg-yellow-50 p-4 dark:bg-yellow-900/20">
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-500 dark:text-yellow-400" />
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Hinweis:</strong> Dies ist eine Beta-Version der Website.
          Anmeldungen und Buchungen sind noch nicht gültig und werden nicht
          bearbeitet.
        </p>
      </div>
    </div>
  );

  const stepBody = (
    <>
      {currentStep === 1 && (
        <Step1RegistrantInfo
          registrationData={registrationData}
          setRegistrationData={setRegistrationData}
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
        />
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
          disabled={registrationMutation.isPending || !termsAccepted}
          className="order-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
        >
          {registrationMutation.isPending
            ? "Wird gesendet..."
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
                  {isWaitlist ? "Warteliste" : "Anmeldung"}
                </h2>
                <p className="truncate text-sm opacity-90">{course.title}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
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
            <div className="mx-4 mt-4 sm:mx-6">{betaDisclaimer}</div>
            <div className="p-5 sm:p-6">{stepBody}</div>
          </div>
          <div className="dark:border-dark-border dark:bg-dark-background-secondary flex shrink-0 flex-col items-stretch justify-between gap-2 rounded-none border-t border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center sm:gap-3 sm:rounded-b-xl sm:p-4">
            {footerButtons}
          </div>
        </div>
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
                {isWaitlist ? "Warteliste" : "Anmeldung"}
              </p>
              <p className="text-dark dark:text-dark-text mt-1 max-w-xl text-sm text-gray-600 dark:text-gray-400">
                Bitte alle Schritte vollständig ausfüllen. Ihre Daten werden nur
                für diese Anmeldung verwendet.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
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
        <div className="dark:bg-dark-surface dark:shadow-dark-border space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-md sm:p-6">
          {betaDisclaimer}
          <div className="dark:border-dark-border border-t border-gray-200 pt-4">
            {stepBody}
          </div>
        </div>
      </div>

      <div className="dark:border-dark-border dark:bg-dark-background-secondary sticky bottom-0 z-20 border-t border-gray-200 bg-gray-50/90 px-4 py-2.5 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:py-3">
        <div className="container mx-auto flex max-w-3xl flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center sm:gap-3">
          {footerButtons}
        </div>
      </div>
    </div>
  );
}
