/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import type { RouterInputs, RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";
import type { User } from "~/generated/prisma/client";
import { useToast } from "@/app/_components/ui/toast";
import {
  X,
  AlertTriangle,
  User as UserIcon,
  Users,
  Plus,
  Trash2,
  FileText,
  Link as LinkIcon,
} from "lucide-react";

type CourseWithRelations = RouterOutputs["courses"]["getById"];
type RegistrationData = Omit<
  RouterInputs["registrations"]["create"],
  "courseId" | "totalPrice"
>;

interface CourseRegistrationFormProps {
  course: CourseWithRelations;
  onClose: () => void;
  onSuccess: () => void;
  isWaitlist: boolean;
  currentUser?: User | null;
}

type Step = 1 | 2 | 3 | 4;

export default function CourseRegistrationForm({
  course,
  onClose,
  onSuccess,
  isWaitlist,
  currentUser,
}: CourseRegistrationFormProps) {
  const toast = useToast();
  const registrationMutation = api.registrations.create.useMutation();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const groupIdCounterRef = useRef(0);
  const [validationErrors, setValidationErrors] = useState<
    Record<number, string>
  >({});
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
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Validate birthdates when step 3 is reached
  useEffect(() => {
    if (currentStep === 3) {
      const errors: Record<number, string> = {};
      registrationData.participants.forEach((p, index) => {
        if (!p.birthDate) {
          errors[index] = "Geburtsdatum ist erforderlich";
        } else if (new Date(p.birthDate) >= new Date()) {
          errors[index] = "Geburtsdatum muss in der Vergangenheit liegen";
        }
      });

      // Batch state update to avoid cascading renders
      requestAnimationFrame(() => {
        setValidationErrors(errors);
      });
    } else {
      // Clear errors when leaving step 3
      requestAnimationFrame(() => {
        setValidationErrors({});
      });
    }
  }, [currentStep, registrationData.participants]);

  const addParticipant = () => {
    if (!course.priceOptions || course.priceOptions.length === 0) {
      console.error("Course price options are not defined.");
      return;
    }
    const firstPriceOption = course.priceOptions[0];
    if (!firstPriceOption) {
      console.error("No price options available");
      return;
    }
    setRegistrationData({
      ...registrationData,
      participants: [
        ...registrationData.participants,
        {
          firstName: "",
          lastName: "",
          birthDate: new Date(),
          city: "",
          instrument: "",
          priceOptionId: firstPriceOption.id,
          customFields: {},
          siblingGroupId: undefined,
        },
      ],
    });
  };

  const addMyselfAsParticipant = () => {
    if (!course.priceOptions || course.priceOptions.length === 0) {
      console.error("Course price options are not defined.");
      return;
    }
    const firstPriceOption = course.priceOptions[0];
    if (!firstPriceOption) {
      console.error("No price options available");
      return;
    }
    setRegistrationData({
      ...registrationData,
      participants: [
        ...registrationData.participants,
        {
          firstName: currentUser?.firstName || "",
          lastName: currentUser?.lastName || "",
          birthDate: currentUser?.birthDate
            ? new Date(currentUser.birthDate)
            : ("" as any),
          city: currentUser?.city || "",
          instrument: "",
          priceOptionId: firstPriceOption.id,
          customFields: {},
          siblingGroupId: undefined,
        },
      ],
    });
  };

  const removeParticipant = (index: number) => {
    setRegistrationData({
      ...registrationData,
      participants: registrationData.participants.filter((_, i) => i !== index),
    });
  };

  const updateParticipant = (
    index: number,
    field: string,
    value: string | Record<string, any>,
  ) => {
    const updated = [...registrationData.participants];
    if (field === "customFields") {
      if (updated[index]) {
        updated[index].customFields = value as Record<string, any>;
      }
    } else {
      (updated[index] as any)[field] = value;
    }
    setRegistrationData({ ...registrationData, participants: updated });
  };

  const calculateTotalPrice = () => {
    const basePrice = registrationData.participants.reduce(
      (sum, participant) => {
        const priceOption = course.priceOptions.find(
          (p) => p.id === participant.priceOptionId,
        );
        return sum + (priceOption?.price || 0);
      },
      0,
    );

    // Apply sibling discount if enabled and applied
    // Discount is calculated per sibling group (family), not per registration
    if (
      registrationData.siblingDiscountApplied &&
      course.allowSiblingDiscount
    ) {
      // Group participants by siblingGroupId
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

      // Calculate discount for each sibling group (20% for each sibling after the first)
      let discount = 0;
      for (const [, groupParticipants] of siblingGroups) {
        if (groupParticipants.length > 1) {
          // First participant in group gets no discount, others get 20%
          for (let i = 1; i < groupParticipants.length; i++) {
            const participant = groupParticipants[i];
            if (participant) {
              const priceOption = course.priceOptions.find(
                (p) => p.id === participant.priceOptionId,
              );
              if (priceOption) {
                discount += priceOption.price * 0.2;
              }
            }
          }
        }
      }

      return basePrice - discount;
    }

    return basePrice;
  };

  const calculateOriginalPrice = () => {
    return registrationData.participants.reduce((sum, participant) => {
      const priceOption = course.priceOptions.find(
        (p) => p.id === participant.priceOptionId,
      );
      return sum + (priceOption?.price || 0);
    }, 0);
  };

  const calculateDiscountAmount = () => {
    if (
      registrationData.siblingDiscountApplied &&
      course.allowSiblingDiscount
    ) {
      // Group participants by siblingGroupId
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

      // Calculate discount for each sibling group
      let discount = 0;
      for (const [, groupParticipants] of siblingGroups) {
        if (groupParticipants.length > 1) {
          for (let i = 1; i < groupParticipants.length; i++) {
            const participant = groupParticipants[i];
            if (participant) {
              const priceOption = course.priceOptions.find(
                (p) => p.id === participant.priceOptionId,
              );
              if (priceOption) {
                discount += priceOption.price * 0.2;
              }
            }
          }
        }
      }
      return discount;
    }
    return 0;
  };

  // Helper function to group/ungroup participants as siblings
  const toggleSiblingGroup = (index1: number, index2: number) => {
    const participant1 = registrationData.participants[index1];
    const participant2 = registrationData.participants[index2];
    if (!participant1 || !participant2) return;

    const updated = [...registrationData.participants];

    // If both are in the same group, ungroup them
    if (
      participant1.siblingGroupId &&
      participant1.siblingGroupId === participant2.siblingGroupId
    ) {
      updated[index1] = { ...participant1, siblingGroupId: undefined };
      updated[index2] = { ...participant2, siblingGroupId: undefined };
    } else {
      // Group them together (use existing group ID or create new one)
      const existingGroupId =
        participant1.siblingGroupId || participant2.siblingGroupId;
      let groupId = existingGroupId;
      if (!groupId) {
        groupIdCounterRef.current = (groupIdCounterRef.current || 0) + 1;
        groupId = `group-${groupIdCounterRef.current}`;
      }
      updated[index1] = { ...participant1, siblingGroupId: groupId };
      updated[index2] = { ...participant2, siblingGroupId: groupId };
    }

    setRegistrationData({ ...registrationData, participants: updated });
  };

  const validateStep = (step: Step): boolean => {
    switch (step) {
      case 1:
        const {
          registrantFirstName,
          registrantLastName,
          registrantEmail,
          registrantPhone,
          registrantStreet,
          registrantZipCode,
          registrantCity,
        } = registrationData;

        const basicValid = !!(
          registrantFirstName &&
          registrantLastName &&
          registrantEmail &&
          registrantPhone
        );

        if (registrationData.useSeparateBilling) {
          const { billingStreet, billingZipCode, billingCity } =
            registrationData;
          return (
            basicValid && !!(billingStreet && billingZipCode && billingCity)
          );
        }

        return (
          basicValid &&
          !!(registrantStreet && registrantZipCode && registrantCity)
        );
      case 2:
        return registrationData.participants.length > 0;
      case 3:
        // Only check if required fields are filled, not if they're valid
        // Validity is checked in real-time and shown as errors
        return registrationData.participants.every(
          (p) =>
            p.firstName &&
            p.lastName &&
            p.birthDate &&
            p.city &&
            p.priceOptionId,
        );
      case 4:
        return true;
      default:
        return false;
    }
  };

  const canProceed = validateStep(currentStep);

  const handleSubmit = async () => {
    console.debug("Registration submitted:", {
      course: course.id,
      ...registrationData,
      totalPrice: calculateTotalPrice(),
      isWaitlist,
    });

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="dark:bg-dark-surface dark:shadow-dark-border my-8 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-primary sticky top-0 z-10 rounded-t-xl p-6 text-white">
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
              { num: 3, label: "Details" },
              { num: 4, label: "Übersicht" },
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
                {index < 3 && (
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
            <div className="flex-shrink-0">
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
            <div className="space-y-4">
              <h3 className="text-dark dark:text-dark-text mb-4 text-xl font-bold">
                Ihre Kontaktdaten
              </h3>
              <p className="mb-6 text-gray-600 dark:text-gray-400">
                Als Anmelder erhalten Sie die Bestätigung und alle weiteren
                Informationen per E-Mail.
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Vorname *
                  </label>
                  <input
                    type="text"
                    value={registrationData.registrantFirstName}
                    onChange={(e) =>
                      setRegistrationData({
                        ...registrationData,
                        registrantFirstName: e.target.value,
                      })
                    }
                    maxLength={100}
                    required
                    className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
                    placeholder="Max"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Nachname *
                  </label>
                  <input
                    type="text"
                    value={registrationData.registrantLastName}
                    onChange={(e) =>
                      setRegistrationData({
                        ...registrationData,
                        registrantLastName: e.target.value,
                      })
                    }
                    maxLength={100}
                    required
                    className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
                    placeholder="Mustermann"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    E-Mail *
                  </label>
                  <input
                    type="email"
                    value={registrationData.registrantEmail}
                    onChange={(e) =>
                      setRegistrationData({
                        ...registrationData,
                        registrantEmail: e.target.value,
                      })
                    }
                    required
                    className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
                    placeholder="max@example.com"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Telefon *
                  </label>
                  <input
                    type="tel"
                    value={registrationData.registrantPhone}
                    onChange={(e) =>
                      setRegistrationData({
                        ...registrationData,
                        registrantPhone: e.target.value,
                      })
                    }
                    maxLength={50}
                    pattern="[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*"
                    title="Bitte geben Sie eine gültige Telefonnummer ein"
                    required
                    className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
                    placeholder="0211 123456"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Straße und Hausnummer *
                  </label>
                  <input
                    type="text"
                    value={registrationData.registrantStreet}
                    onChange={(e) =>
                      setRegistrationData({
                        ...registrationData,
                        registrantStreet: e.target.value,
                      })
                    }
                    maxLength={200}
                    className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
                    placeholder="Musterstraße 1"
                    required={!registrationData.useSeparateBilling}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    PLZ *
                  </label>
                  <input
                    type="text"
                    value={registrationData.registrantZipCode}
                    onChange={(e) =>
                      setRegistrationData({
                        ...registrationData,
                        registrantZipCode: e.target.value,
                      })
                    }
                    maxLength={20}
                    className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
                    placeholder="12345"
                    required={!registrationData.useSeparateBilling}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Ort *
                  </label>
                  <input
                    type="text"
                    value={registrationData.registrantCity}
                    onChange={(e) =>
                      setRegistrationData({
                        ...registrationData,
                        registrantCity: e.target.value,
                      })
                    }
                    maxLength={100}
                    className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
                    placeholder="Düsseldorf"
                    required={!registrationData.useSeparateBilling}
                  />
                </div>
              </div>
              {/* Billing Address Section */}
              <div className="dark:border-dark-border mt-8 border-t border-gray-200 pt-8">
                <h3 className="text-dark dark:text-dark-text mb-4 text-lg font-bold">
                  Rechnungsadresse
                </h3>

                <div className="mb-4">
                  <label className="dark:bg-dark-background-secondary dark:hover:bg-dark-background flex cursor-pointer items-center gap-3 rounded-lg bg-gray-50 p-4 transition-colors hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={registrationData.useSeparateBilling}
                      onChange={(e) =>
                        setRegistrationData({
                          ...registrationData,
                          useSeparateBilling: e.target.checked,
                        })
                      }
                      className="text-primary focus:ring-primary h-5 w-5 rounded"
                    />
                    <div>
                      <span className="text-dark dark:text-dark-text font-semibold">
                        Abweichende Rechnungsadresse
                      </span>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        z.B. für Kirchengemeinde oder Institution
                      </p>
                    </div>
                  </label>
                </div>

                {registrationData.useSeparateBilling && (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Firma / Institution / Kirchengemeinde
                      </label>
                      <input
                        type="text"
                        value={registrationData.billingCompany}
                        onChange={(e) =>
                          setRegistrationData({
                            ...registrationData,
                            billingCompany: e.target.value,
                          })
                        }
                        maxLength={200}
                        className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
                        placeholder="Evangelische Kirchengemeinde Düsseldorf"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Vorname
                      </label>
                      <input
                        type="text"
                        value={registrationData.billingFirstName}
                        onChange={(e) =>
                          setRegistrationData({
                            ...registrationData,
                            billingFirstName: e.target.value,
                          })
                        }
                        maxLength={100}
                        className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
                        placeholder="Max"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Nachname
                      </label>
                      <input
                        type="text"
                        value={registrationData.billingLastName}
                        onChange={(e) =>
                          setRegistrationData({
                            ...registrationData,
                            billingLastName: e.target.value,
                          })
                        }
                        maxLength={100}
                        className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
                        placeholder="Mustermann"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Straße und Hausnummer *
                      </label>
                      <input
                        type="text"
                        value={registrationData.billingStreet}
                        onChange={(e) =>
                          setRegistrationData({
                            ...registrationData,
                            billingStreet: e.target.value,
                          })
                        }
                        maxLength={200}
                        className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
                        placeholder="Musterstraße 123"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        PLZ *
                      </label>
                      <input
                        type="text"
                        value={registrationData.billingZipCode}
                        onChange={(e) =>
                          setRegistrationData({
                            ...registrationData,
                            billingZipCode: e.target.value,
                          })
                        }
                        maxLength={20}
                        className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
                        placeholder="40210"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Stadt *
                      </label>
                      <input
                        type="text"
                        value={registrationData.billingCity}
                        onChange={(e) =>
                          setRegistrationData({
                            ...registrationData,
                            billingCity: e.target.value,
                          })
                        }
                        maxLength={100}
                        className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
                        placeholder="Düsseldorf"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        E-Mail für Rechnung
                      </label>
                      <input
                        type="email"
                        value={registrationData.billingEmail}
                        onChange={(e) =>
                          setRegistrationData({
                            ...registrationData,
                            billingEmail: e.target.value,
                          })
                        }
                        className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
                        placeholder="rechnung@gemeinde.de"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Falls abweichend von Ihrer E-Mail-Adresse
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Add Participants */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-dark dark:text-dark-text text-xl font-bold">
                    Teilnehmer
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Sie können mehrere Personen gleichzeitig anmelden
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addMyselfAsParticipant}
                    className="flex items-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
                    title="Mich selbst als Teilnehmer hinzufügen"
                  >
                    <UserIcon className="h-5 w-5" />
                    <span className="hidden sm:inline">Mich selbst</span>
                  </button>
                  <button
                    onClick={addParticipant}
                    className="bg-primary hover:bg-primary-dark flex items-center gap-2 rounded-lg px-4 py-2 text-white transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="hidden sm:inline">Hinzufügen</span>
                  </button>
                </div>
              </div>

              {registrationData.participants.length === 0 ? (
                <div className="dark:border-dark-border dark:bg-dark-background-secondary rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12 text-center">
                  <Users className="mx-auto mb-4 h-16 w-16 text-gray-400 dark:text-gray-500" />
                  <p className="mb-4 text-gray-600 dark:text-gray-400">
                    Noch keine Teilnehmer hinzugefügt
                  </p>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={addMyselfAsParticipant}
                      className="flex items-center gap-2 rounded-lg bg-gray-600 px-6 py-2 text-white transition-colors hover:bg-gray-700"
                    >
                      <UserIcon className="h-5 w-5" />
                      Mich selbst hinzufügen
                    </button>
                    <button
                      onClick={addParticipant}
                      className="bg-primary hover:bg-primary-dark rounded-lg px-6 py-2 text-white transition-colors"
                    >
                      Andere Person hinzufügen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {registrationData.participants.map((participant, index) => {
                    const isRegistrant =
                      participant.firstName ===
                        registrationData.registrantFirstName &&
                      participant.lastName ===
                        registrationData.registrantLastName;

                    return (
                      <div
                        key={index}
                        className="dark:border-dark-border dark:bg-dark-background-secondary rounded-lg border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <h4 className="text-dark dark:text-dark-text font-semibold">
                              Teilnehmer {index + 1}
                            </h4>
                            {isRegistrant && (
                              <span className="bg-primary/10 text-primary flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold">
                                <UserIcon className="h-3 w-3" />
                                Ich
                              </span>
                            )}
                            {participant.siblingGroupId && (
                              <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <LinkIcon className="h-3 w-3" />
                                Geschwister
                              </span>
                            )}
                          </div>
                          {registrationData.participants.length > 1 && (
                            <button
                              onClick={() => removeParticipant(index)}
                              className="p-1 text-red-600 hover:text-red-700"
                              title="Teilnehmer entfernen"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>

                        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                          Grundlegende Informationen zur Person
                        </p>

                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {participant.firstName || participant.lastName ? (
                            <p className="text-dark dark:text-dark-text font-semibold">
                              {participant.firstName} {participant.lastName}
                            </p>
                          ) : (
                            <p className="text-gray-400 italic dark:text-gray-500">
                              Noch keine Daten eingegeben
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Participant Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="mb-6">
                <h3 className="text-dark dark:text-dark-text mb-2 text-xl font-bold">
                  Details der Teilnehmer
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Bitte füllen Sie die Informationen für alle Teilnehmer aus
                </p>
              </div>

              {/* Sibling Grouping Section - Only show if course allows discount and multiple participants */}
              {course.allowSiblingDiscount &&
                registrationData.participants.length > 1 && (
                  <div className="mb-6 rounded-lg border-2 border-dashed border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-900/20">
                    <div className="mb-3 flex items-start gap-3">
                      <Users className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <div className="flex-1">
                        <h4 className="text-dark dark:text-dark-text mb-1 font-semibold">
                          Geschwister markieren
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Markieren Sie Teilnehmer als Geschwister, um einen
                          Rabatt von 20% für jedes Geschwisterkind ab dem
                          zweiten Kind zu erhalten.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {registrationData.participants.map(
                        (participant, index) => {
                          const siblingGroup =
                            registrationData.participants.filter(
                              (p) =>
                                p.siblingGroupId &&
                                p.siblingGroupId === participant.siblingGroupId,
                            );
                          const isInGroup = siblingGroup.length > 1;
                          const groupMembers = siblingGroup
                            .map((p) => {
                              const idx =
                                registrationData.participants.indexOf(p);
                              return idx !== index ? idx + 1 : null;
                            })
                            .filter((idx): idx is number => idx !== null);

                          return (
                            <label
                              key={index}
                              className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-all ${
                                isInGroup
                                  ? "border-green-500 bg-green-50 dark:border-green-600 dark:bg-green-900/20"
                                  : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isInGroup}
                                onChange={(e) => {
                                  // Find another participant in the same group or create new group
                                  if (e.target.checked) {
                                    // Find first participant without a group or create new group
                                    const otherParticipant =
                                      registrationData.participants.find(
                                        (p, i) =>
                                          i !== index &&
                                          (!p.siblingGroupId ||
                                            p.siblingGroupId ===
                                              participant.siblingGroupId),
                                      );
                                    if (otherParticipant) {
                                      const otherIndex =
                                        registrationData.participants.indexOf(
                                          otherParticipant,
                                        );
                                      toggleSiblingGroup(index, otherIndex);
                                    } else {
                                      // Create new group with first available participant
                                      const firstOther =
                                        registrationData.participants.find(
                                          (_, i) => i !== index,
                                        );
                                      if (firstOther) {
                                        const firstIndex =
                                          registrationData.participants.indexOf(
                                            firstOther,
                                          );
                                        toggleSiblingGroup(index, firstIndex);
                                      }
                                    }
                                  } else {
                                    // Remove from group
                                    const updated = [
                                      ...registrationData.participants,
                                    ];
                                    updated[index] = {
                                      ...participant,
                                      siblingGroupId: undefined,
                                    };
                                    setRegistrationData({
                                      ...registrationData,
                                      participants: updated,
                                    });
                                  }
                                }}
                                className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-2 focus:ring-green-500"
                              />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  Teilnehmer {index + 1}
                                </div>
                                {isInGroup && groupMembers.length > 0 && (
                                  <div className="mt-1 text-xs text-green-700 dark:text-green-400">
                                    Geschwister mit: {groupMembers.join(", ")}
                                  </div>
                                )}
                              </div>
                              {isInGroup && (
                                <LinkIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                              )}
                            </label>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}

              {registrationData.participants.map((participant, index) => {
                // Get sibling group info for visual grouping
                const siblingGroup = registrationData.participants.filter(
                  (p) =>
                    p.siblingGroupId &&
                    p.siblingGroupId === participant.siblingGroupId,
                );
                const isInSiblingGroup = siblingGroup.length > 1;
                const isFirstInGroup =
                  isInSiblingGroup &&
                  registrationData.participants.indexOf(participant) ===
                    registrationData.participants.findIndex(
                      (p) => p.siblingGroupId === participant.siblingGroupId,
                    );

                return (
                  <div
                    key={index}
                    className={`dark:border-dark-border dark:bg-dark-background-secondary rounded-lg border p-6 ${
                      isInSiblingGroup
                        ? "border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    {isFirstInGroup && (
                      <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-100 px-3 py-2 dark:bg-green-900/30">
                        <Users className="h-4 w-4 text-green-700 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">
                          Geschwistergruppe ({siblingGroup.length} Teilnehmer)
                        </span>
                      </div>
                    )}
                    <h4 className="text-dark dark:text-dark-text mb-4 font-bold">
                      {isInSiblingGroup
                        ? `Teilnehmer ${index + 1} (Geschwister)`
                        : `Teilnehmer ${index + 1}`}
                    </h4>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Vorname *
                        </label>
                        <input
                          type="text"
                          value={participant.firstName}
                          onChange={(e) =>
                            updateParticipant(
                              index,
                              "firstName",
                              e.target.value,
                            )
                          }
                          maxLength={100}
                          required
                          className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Nachname *
                        </label>
                        <input
                          type="text"
                          value={participant.lastName}
                          onChange={(e) =>
                            updateParticipant(index, "lastName", e.target.value)
                          }
                          maxLength={100}
                          required
                          className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Geburtsdatum *
                        </label>
                        <input
                          type="date"
                          value={
                            participant.birthDate
                              ? new Date(participant.birthDate)
                                  .toISOString()
                                  .split("T")[0]
                              : ""
                          }
                          onChange={(e) => {
                            const newDate = e.target.value
                              ? new Date(e.target.value)
                              : ("" as any);
                            updateParticipant(index, "birthDate", newDate);
                            // Validate immediately
                            const newErrors = { ...validationErrors };
                            if (!e.target.value) {
                              newErrors[index] =
                                "Geburtsdatum ist erforderlich";
                            } else if (new Date(e.target.value) >= new Date()) {
                              newErrors[index] =
                                "Geburtsdatum muss in der Vergangenheit liegen";
                            } else {
                              delete newErrors[index];
                            }
                            setValidationErrors(newErrors);
                          }}
                          max={new Date().toISOString().split("T")[0]}
                          required
                          title="Geburtsdatum muss in der Vergangenheit liegen"
                          className={`focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border px-4 py-2 focus:border-transparent focus:ring-2 ${
                            validationErrors[index]
                              ? "border-red-500 dark:border-red-500"
                              : "border-gray-300"
                          }`}
                        />
                        {validationErrors[index] && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            {validationErrors[index]}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Wohnort *
                        </label>
                        <input
                          type="text"
                          value={participant.city}
                          onChange={(e) =>
                            updateParticipant(index, "city", e.target.value)
                          }
                          maxLength={100}
                          required
                          className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
                          placeholder="Düsseldorf"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Instrument
                        </label>
                        <input
                          type="text"
                          value={participant.instrument || ""}
                          onChange={(e) =>
                            updateParticipant(
                              index,
                              "instrument",
                              e.target.value,
                            )
                          }
                          maxLength={100}
                          className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
                          placeholder="Trompete"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Preisoption *
                        </label>
                        <select
                          value={participant.priceOptionId}
                          onChange={(e) =>
                            updateParticipant(
                              index,
                              "priceOptionId",
                              e.target.value,
                            )
                          }
                          className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
                        >
                          {course.priceOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label} - {option.price.toFixed(2)} €
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Custom Fields */}
                      {course.customFields?.map((field) => {
                        return (
                          <div key={field.fieldName} className="md:col-span-2">
                            <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                              {field.fieldName}
                              {field.isRequired && " *"}
                            </label>
                            {field.fieldType === "SELECT" && field.options ? (
                              <select
                                value={
                                  (participant.customFields &&
                                  typeof participant.customFields ===
                                    "object" &&
                                  field.fieldName in participant.customFields
                                    ? (
                                        participant.customFields as Record<
                                          string,
                                          any
                                        >
                                      )[field.fieldName]
                                    : "") || ""
                                }
                                onChange={(e) =>
                                  updateParticipant(index, "customFields", {
                                    ...(typeof participant.customFields ===
                                      "object" &&
                                    participant.customFields !== null
                                      ? participant.customFields
                                      : {}),
                                    [field.fieldName]: e.target.value,
                                  })
                                }
                                className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
                              >
                                <option value="">Bitte wählen</option>
                                {typeof field.options === "string" &&
                                  field.options.split(",").map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                              </select>
                            ) : field.fieldType === "TEXTAREA" ? (
                              <textarea
                                value={
                                  typeof participant.customFields ===
                                    "object" &&
                                  participant.customFields !== null &&
                                  field.fieldName in participant.customFields
                                    ? (
                                        participant.customFields as Record<
                                          string,
                                          any
                                        >
                                      )[field.fieldName]
                                    : ""
                                }
                                onChange={(e) =>
                                  updateParticipant(index, "customFields", {
                                    ...(typeof participant.customFields ===
                                      "object" &&
                                    participant.customFields !== null
                                      ? participant.customFields
                                      : {}),
                                    [field.fieldName]: e.target.value,
                                  })
                                }
                                rows={3}
                                className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
                                placeholder={
                                  field.helpText ? field.helpText : ""
                                }
                              />
                            ) : (
                              <input
                                type={
                                  field.fieldType === "NUMBER"
                                    ? "number"
                                    : "text"
                                }
                                value={
                                  typeof participant.customFields ===
                                    "object" &&
                                  participant.customFields !== null &&
                                  field.fieldName in participant.customFields
                                    ? (
                                        participant.customFields as Record<
                                          string,
                                          any
                                        >
                                      )[field.fieldName]
                                    : ""
                                }
                                onChange={(e) =>
                                  updateParticipant(index, "customFields", {
                                    ...(typeof participant.customFields ===
                                      "object" &&
                                    participant.customFields !== null
                                      ? participant.customFields
                                      : {}),
                                    [field.fieldName]: e.target.value,
                                  })
                                }
                                className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
                                placeholder={
                                  field.helpText ? field.helpText : ""
                                }
                              />
                            )}
                            {field.helpText && (
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {field.helpText}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Sibling Discount Checkbox */}
              {course.allowSiblingDiscount &&
                registrationData.participants.length > 1 &&
                (() => {
                  // Check if any participants are grouped as siblings
                  const hasSiblingGroups = registrationData.participants.some(
                    (p) => p.siblingGroupId,
                  );
                  return (
                    <div className="dark:border-dark-border dark:bg-dark-background-secondary rounded-lg border border-gray-200 bg-gray-50 p-6">
                      {!hasSiblingGroups && (
                        <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            💡 Tipp: Sie können Teilnehmer als Geschwister
                            markieren, indem Sie auf das Link-Symbol zwischen
                            den Teilnehmern klicken (Schritt 2).
                          </p>
                        </div>
                      )}
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={registrationData.siblingDiscountApplied}
                          onChange={(e) =>
                            setRegistrationData({
                              ...registrationData,
                              siblingDiscountApplied: e.target.checked,
                            })
                          }
                          disabled={!hasSiblingGroups}
                          className="text-primary focus:ring-primary mt-1 h-4 w-4 rounded border-gray-300 disabled:opacity-50"
                        />
                        <div className="flex-1">
                          <span className="text-dark dark:text-dark-text block text-sm font-semibold">
                            Geschwisterrabatt beantragen
                          </span>
                          <span className="mt-1 block text-xs text-gray-600 dark:text-gray-400">
                            Der Förderverein gewährt einen Rabatt von 20% für
                            jedes Geschwisterkind ab dem zweiten Kind in jeder
                            Familie. Die Bearbeitung kann einige Tage dauern.
                            {!hasSiblingGroups &&
                              " Bitte markieren Sie zuerst Geschwister in Schritt 2."}
                          </span>
                        </div>
                      </label>
                    </div>
                  );
                })()}
            </div>
          )}

          {/* Step 4: Summary */}
          {currentStep === 4 && (
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
                    {registrationData.billingZipCode}{" "}
                    {registrationData.billingCity}
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
                        className="dark:border-dark-border flex items-start justify-between border-b border-gray-200 pb-3 last:border-0"
                      >
                        <div>
                          <p className="text-dark dark:text-dark-text font-semibold">
                            {participant.firstName} {participant.lastName}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(participant.birthDate).toLocaleDateString(
                              "de-DE",
                            )}
                            {participant.instrument &&
                              ` • ${participant.instrument}`}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {priceOption?.label}
                          </p>
                        </div>
                        <p className="text-primary font-bold">
                          {priceOption?.price.toFixed(2)} €
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Price Breakdown */}
              {registrationData.siblingDiscountApplied &&
              course.allowSiblingDiscount &&
              calculateDiscountAmount() > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Zwischensumme
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {calculateOriginalPrice().toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                    <span className="text-sm text-green-700 dark:text-green-300">
                      Geschwisterrabatt (20%)
                    </span>
                    <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                      -{calculateDiscountAmount().toFixed(2)} €
                    </span>
                  </div>
                  <div className="bg-primary rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold">Gesamtpreis</span>
                      <span className="text-3xl font-bold">
                        {calculateTotalPrice().toFixed(2)} €
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
                      {calculateTotalPrice().toFixed(2)} €
                    </span>
                  </div>
                </div>
              )}

              {/* Terms */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    required
                    className="text-primary focus:ring-primary mt-1 h-4 w-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Ich akzeptiere die{" "}
                    <a href="#" className="text-primary font-semibold">
                      Allgemeinen Geschäftsbedingungen
                    </a>{" "}
                    und die{" "}
                    <a href="#" className="text-primary font-semibold">
                      Datenschutzerklärung
                    </a>
                    .
                  </span>
                </label>
              </div>

              {isWaitlist && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
                  <p className="text-sm text-orange-800 dark:text-orange-300">
                    <strong>Hinweis:</strong> Der Kurs ist bereits ausgebucht.
                    Sie werden auf die Warteliste gesetzt und bei einem
                    freigewordenen Platz benachrichtigt.
                  </p>
                </div>
              )}
            </div>
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
            Schritt {currentStep} von 4
          </div>

          {currentStep < 4 ? (
            <button
              onClick={() => {
                if (
                  currentStep === 3 &&
                  Object.keys(validationErrors).length > 0
                ) {
                  return; // Don't proceed if there are validation errors
                }
                setCurrentStep((currentStep + 1) as Step);
              }}
              disabled={
                !canProceed ||
                (currentStep === 3 && Object.keys(validationErrors).length > 0)
              }
              className="bg-primary hover:bg-primary-dark order-3 rounded-lg px-6 py-2 font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              Weiter
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="order-3 rounded-lg bg-green-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-green-700"
            >
              Verbindlich anmelden
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
