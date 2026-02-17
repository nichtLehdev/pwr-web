/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/app/_components/ui/toast";
import { X, AlertTriangle } from "lucide-react";
import { isParticipantUnder18 } from "@/lib/participant-utils";
import type { RegistrationData, Step, CourseRegistrationFormProps } from "./course-registration-form/types";
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
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    return () => {
      document.body.style.overflow = "unset";
      document.body.classList.remove("modal-open");
    };
  }, []);

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
              if (
                !fieldValue ||
                (typeof fieldValue === "string" && !fieldValue.trim())
              ) {
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
    return validateStepUtil(step, registrationData, course, validationErrors, termsAccepted);
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
      },
      {
        onSuccess: () => {
          toast.success(
            isWaitlist
              ? "Sie wurden auf die Warteliste gesetzt."
              : "Ihre Anmeldung war erfolgreich.",
          );
          onSuccess();
          onClose();
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


  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        className="dark:bg-dark-surface dark:shadow-dark-border pointer-events-auto my-8 max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          ref={headerRef}
          className="bg-primary sticky top-0 z-10 rounded-t-xl p-6 text-white"
        >
          <div className="mb-4 flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="mb-1 text-2xl font-bold">
                {isWaitlist ? "Warteliste" : "Anmeldung"}
              </h2>
              <p className="truncate text-sm opacity-90">{course.title}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 transition-colors hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-start justify-between">
            {[
              { num: 1, label: "Anmelder" },
              { num: 2, label: "Teilnehmer" },
              { num: 3, label: "Übersicht" },
            ].map((step, index) => (
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

        {/* Beta Disclaimer */}
        <div className="mx-6 mt-4 border-l-4 border-yellow-400 bg-yellow-50 p-4 dark:bg-yellow-900/20">
          <div className="flex">
            <div className="shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>Hinweis:</strong> Dies ist eine Beta-Version der
                Website. Anmeldungen und Buchungen sind noch nicht gültig und
                werden nicht bearbeitet.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Registrant Info */}
          {currentStep === 1 && (
            <Step1RegistrantInfo
              registrationData={registrationData}
              setRegistrationData={setRegistrationData}
            />
          )}

          {/* Step 2: Participants */}
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
            />
          )}

          {/* Step 3: Summary */}
          {currentStep === 3 && (
            <Step3Summary
              course={course}
              registrationData={registrationData}
              termsAccepted={termsAccepted}
              setTermsAccepted={setTermsAccepted}
              isWaitlist={isWaitlist}
            />
          )}
        </div>

        {/* Footer / Navigation */}
        <div className="dark:border-dark-border dark:bg-dark-background-secondary sticky bottom-0 flex flex-col items-stretch justify-between gap-3 rounded-b-xl border-t border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-6">
          <button
            onClick={() =>
              currentStep > 1 && setCurrentStep((currentStep - 1) as Step)
            }
            disabled={currentStep === 1}
            className="text-dark dark:text-dark-text dark:border-dark-border dark:hover:bg-dark-background order-2 rounded-lg border-2 border-gray-300 px-6 py-2 font-semibold transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:order-1"
          >
            Zurück
          </button>

          <div className="order-1 text-center text-sm whitespace-nowrap text-gray-600 sm:order-2 sm:flex-1 dark:text-gray-400">
            Schritt {currentStep} von 3
          </div>

          {currentStep < 3 ? (
            <button
              onClick={() => {
                if (
                  currentStep === 2 &&
                  Object.keys(validationErrors).length > 0
                ) {
                  return;
                }
                setCurrentStep((currentStep + 1) as Step);
              }}
              disabled={
                !canProceed ||
                (currentStep === 2 && Object.keys(validationErrors).length > 0)
              }
              className="bg-primary hover:bg-primary-dark order-3 rounded-lg px-6 py-2 font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {currentStep === 1
                ? "Weiter zu Teilnehmern"
                : "Weiter zur Übersicht"}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={registrationMutation.isPending || !termsAccepted}
              className="order-3 rounded-lg bg-green-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {registrationMutation.isPending
                ? "Wird gesendet..."
                : "Verbindlich anmelden"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
