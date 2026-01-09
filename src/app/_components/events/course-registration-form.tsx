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
  Save,
  BookOpen,
  Link as LinkIcon,
  Link2Off,
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

type Step = 1 | 2 | 3;

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
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (currentStep === 2) {
      const errors: Record<number, string> = {};
      registrationData.participants.forEach((p, index) => {
        if (!p.birthDate) {
          errors[index] = "Geburtsdatum ist erforderlich";
        } else if (new Date(p.birthDate) >= new Date()) {
          errors[index] = "Geburtsdatum muss in der Vergangenheit liegen";
        }
      });
      requestAnimationFrame(() => {
        setValidationErrors(errors);
      });
    } else {
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

  const loadSavedParticipant = (
    saved: RouterOutputs["savedParticipants"]["getAll"][0],
  ) => {
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
          firstName: saved.firstName,
          lastName: saved.lastName,
          birthDate: new Date(saved.birthDate),
          city: saved.city,
          instrument: saved.instrument || "",
          priceOptionId: firstPriceOption.id,
          customFields: (saved.customFields as Record<string, any>) || {},
          siblingGroupId: undefined,
        },
      ],
    });
    setShowParticipantLibrary(false);
    toast.success("Teilnehmer geladen");
  };

  const saveParticipant = (index: number) => {
    const participant = registrationData.participants[index];
    if (!participant) return;

    if (
      !participant.firstName ||
      !participant.lastName ||
      !participant.birthDate
    ) {
      toast.error(
        "Bitte füllen Sie mindestens Vorname, Nachname und Geburtsdatum aus",
      );
      return;
    }

    saveParticipantMutation.mutate({
      firstName: participant.firstName,
      lastName: participant.lastName,
      birthDate: new Date(participant.birthDate),
      city: participant.city,
      instrument: participant.instrument,
      customFields: participant.customFields || {},
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
    value: string | Record<string, any> | Date,
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

    if (
      registrationData.siblingDiscountApplied &&
      course.allowSiblingDiscount
    ) {
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

  const getParticipantDisplayName = (
    firstName: string,
    lastName: string,
    participantIndex?: number,
  ) => {
    const firstLetter = lastName.charAt(0).toUpperCase();
    const hasDuplicate = registrationData.participants.some(
      (p, idx) =>
        idx !== participantIndex &&
        p.firstName === firstName &&
        p.lastName.charAt(0).toUpperCase() === firstLetter,
    );

    if (hasDuplicate) {
      return `${firstName} ${lastName}`;
    }
    return `${firstName} ${firstLetter}.`;
  };

  const linkSiblings = (index1: number, index2: number) => {
    const participant1 = registrationData.participants[index1];
    const participant2 = registrationData.participants[index2];
    if (!participant1 || !participant2) return;

    const updated = [...registrationData.participants];

    if (
      participant1.siblingGroupId &&
      participant1.siblingGroupId === participant2.siblingGroupId
    ) {
      updated[index1] = { ...participant1, siblingGroupId: undefined };
      updated[index2] = { ...participant2, siblingGroupId: undefined };
    } else {
      const existingGroupId =
        participant1.siblingGroupId || participant2.siblingGroupId;
      let groupId = existingGroupId;
      if (!groupId) {
        groupIdCounterRef.current = (groupIdCounterRef.current || 0) + 1;
        groupId = `group-${groupIdCounterRef.current}`;
      }
      updated[index1] = { ...participant1, siblingGroupId: groupId };
      updated[index2] = { ...participant2, siblingGroupId: groupId };

      if (
        participant1.siblingGroupId &&
        participant1.siblingGroupId !== groupId
      ) {
        updated.forEach((p, idx) => {
          if (
            p.siblingGroupId === participant1.siblingGroupId &&
            idx !== index1
          ) {
            updated[idx] = { ...p, siblingGroupId: groupId };
          }
        });
      } else if (
        participant2.siblingGroupId &&
        participant2.siblingGroupId !== groupId
      ) {
        updated.forEach((p, idx) => {
          if (
            p.siblingGroupId === participant2.siblingGroupId &&
            idx !== index2
          ) {
            updated[idx] = { ...p, siblingGroupId: groupId };
          }
        });
      }
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
        return true;
      case 3:
        return termsAccepted;
      default:
        return false;
    }
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

  const hasSiblingGroups = registrationData.participants.some(
    (p) => p.siblingGroupId,
  );

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
            <div className="space-y-4">
              <div>
                <h3 className="text-dark dark:text-dark-text mb-4 text-xl font-bold">
                  Ihre Kontaktdaten
                </h3>
                <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
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
            </div>
          )}

          {/* Step 2: Participants */}
          {currentStep === 2 && (
            <div className="flex flex-col">
              {/* Header Section - Not sticky on mobile */}
              <div className="mb-4 space-y-4 px-2 sm:mb-6 sm:space-y-6 sm:px-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <h3 className="text-dark dark:text-dark-text mb-1 text-lg font-bold sm:mb-2 sm:text-xl">
                      Teilnehmer
                    </h3>
                    <p className="text-xs text-gray-600 sm:text-sm dark:text-gray-400">
                      Fügen Sie alle Teilnehmer hinzu, die Sie anmelden möchten
                    </p>
                  </div>
                </div>
              </div>

              {/* Sticky Buttons on mobile only - positioned below orange header */}
              <div
                className="dark:bg-dark-surface sticky z-20 -mx-2 bg-white px-2 pt-2 pb-2 shadow-[0_4px_6px_-4px_rgba(0,0,0,0.1)] sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:shadow-none dark:shadow-[0_4px_6px_-4px_rgba(0,0,0,0.3)] sm:dark:bg-transparent sm:dark:shadow-none"
                style={{ top: `${headerHeight}px` }}
              >
                <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                  {currentUser && (
                    <button
                      onClick={() =>
                        setShowParticipantLibrary(!showParticipantLibrary)
                      }
                      className="flex items-center justify-center gap-1.5 rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 sm:gap-2 sm:px-4 sm:text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <BookOpen className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline">Aus Bibliothek</span>
                    </button>
                  )}
                  {currentUser && (
                    <button
                      onClick={addMyselfAsParticipant}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-gray-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-700 sm:gap-2 sm:px-4 sm:text-sm"
                    >
                      <UserIcon className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline">Mich selbst</span>
                    </button>
                  )}
                  <button
                    onClick={addParticipant}
                    className="bg-primary hover:bg-primary-dark flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-colors sm:gap-2 sm:px-4 sm:text-sm"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">Hinzufügen</span>
                  </button>
                </div>
              </div>

              {/* Participant Library - Not sticky */}
              {showParticipantLibrary && currentUser && (
                <div className="mb-4 rounded-lg border-2 border-blue-200 bg-blue-50 p-3 sm:mb-6 sm:p-4 dark:border-blue-800 dark:bg-blue-900/20">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                      Gespeicherte Teilnehmer
                    </h4>
                    <button
                      onClick={() => setShowParticipantLibrary(false)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {savedParticipantsQuery.data &&
                  savedParticipantsQuery.data.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {savedParticipantsQuery.data.map((saved) => (
                        <button
                          key={saved.id}
                          onClick={() => loadSavedParticipant(saved)}
                          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                        >
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {saved.firstName} {saved.lastName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(saved.birthDate).toLocaleDateString(
                                "de-DE",
                              )}
                              {saved.city && ` • ${saved.city}`}
                            </div>
                          </div>
                          <Plus className="h-4 w-4 text-gray-400" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Noch keine Teilnehmer gespeichert. Sie können Teilnehmer
                      nach dem Hinzufügen speichern.
                    </p>
                  )}
                  {savedParticipantsQuery.data &&
                  savedParticipantsQuery.data.length > 0 ? (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Gespeicherte Teilnehmer können Sie in den{" "}
                      <a
                        href="/settings"
                        className="text-primary hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Einstellungen
                      </a>{" "}
                      verwalten und entfernen.
                    </p>
                  ) : null}
                </div>
              )}

              {/* Scrollable Participants Section */}
              <div className="flex-1">
                {registrationData.participants.length === 0 ? (
                  <div className="dark:border-dark-border rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center sm:py-12 dark:bg-gray-800">
                    <Users className="mx-auto mb-3 h-12 w-12 text-gray-400 sm:mb-4 sm:h-16 sm:w-16 dark:text-gray-500" />
                    <p className="mb-4 text-sm text-gray-600 sm:text-base dark:text-gray-400">
                      Noch keine Teilnehmer hinzugefügt
                    </p>
                    <div className="flex flex-col justify-center gap-2 sm:flex-row sm:gap-3">
                      {currentUser && (
                        <button
                          onClick={addMyselfAsParticipant}
                          className="flex items-center justify-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-700 sm:px-6 sm:text-base"
                        >
                          <UserIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                          Mich selbst hinzufügen
                        </button>
                      )}
                      <button
                        onClick={addParticipant}
                        className="bg-primary hover:bg-primary-dark flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-colors sm:px-6 sm:text-base"
                      >
                        <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                        Andere Person hinzufügen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-6">
                    {registrationData.participants.map((participant, index) => {
                      const siblingGroup = registrationData.participants.filter(
                        (p) =>
                          p.siblingGroupId &&
                          p.siblingGroupId === participant.siblingGroupId,
                      );
                      const isInGroup = siblingGroup.length > 1;

                      return (
                        <div
                          key={index}
                          className={`rounded-lg border-2 p-4 sm:p-6 ${
                            isInGroup
                              ? "border-green-500 bg-green-50 dark:border-green-600 dark:bg-green-900/20"
                              : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                          }`}
                        >
                          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                              <h4 className="text-dark dark:text-dark-text text-base font-semibold sm:text-lg">
                                Teilnehmer {index + 1}
                              </h4>
                              {isInGroup && (
                                <span className="rounded-full bg-green-600 px-2 py-1 text-xs font-medium whitespace-nowrap text-white dark:bg-green-700">
                                  Geschwistergruppe ({siblingGroup.length})
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2 self-start sm:self-auto">
                              {currentUser && (
                                <button
                                  onClick={() => saveParticipant(index)}
                                  disabled={saveParticipantMutation.isPending}
                                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                  title="Teilnehmer speichern"
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => removeParticipant(index)}
                                className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-red-700 dark:bg-gray-700 dark:text-red-400 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-gray-700 sm:text-sm dark:text-gray-300">
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
                                className="focus:ring-primary dark:border-dark-border text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 sm:px-4 sm:text-base dark:bg-gray-700"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-semibold text-gray-700 sm:text-sm dark:text-gray-300">
                                Nachname *
                              </label>
                              <input
                                type="text"
                                value={participant.lastName}
                                onChange={(e) =>
                                  updateParticipant(
                                    index,
                                    "lastName",
                                    e.target.value,
                                  )
                                }
                                maxLength={100}
                                required
                                className="focus:ring-primary dark:border-dark-border text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 sm:px-4 sm:text-base dark:bg-gray-700"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-semibold text-gray-700 sm:text-sm dark:text-gray-300">
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
                                  updateParticipant(
                                    index,
                                    "birthDate",
                                    newDate,
                                  );
                                  const newErrors = { ...validationErrors };
                                  if (!e.target.value) {
                                    newErrors[index] =
                                      "Geburtsdatum ist erforderlich";
                                  } else if (
                                    new Date(e.target.value) >= new Date()
                                  ) {
                                    newErrors[index] =
                                      "Geburtsdatum muss in der Vergangenheit liegen";
                                  } else {
                                    delete newErrors[index];
                                  }
                                  setValidationErrors(newErrors);
                                }}
                                max={new Date().toISOString().split("T")[0]}
                                required
                                className={`focus:ring-primary dark:border-dark-border text-dark dark:text-dark-text w-full rounded-lg border px-3 py-2 text-sm focus:border-transparent focus:ring-2 sm:px-4 sm:text-base dark:bg-gray-700 ${
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
                              <label className="mb-1 block text-xs font-semibold text-gray-700 sm:text-sm dark:text-gray-300">
                                Wohnort *
                              </label>
                              <input
                                type="text"
                                value={participant.city}
                                onChange={(e) =>
                                  updateParticipant(
                                    index,
                                    "city",
                                    e.target.value,
                                  )
                                }
                                maxLength={100}
                                required
                                className="focus:ring-primary dark:border-dark-border text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 sm:px-4 sm:text-base dark:bg-gray-700"
                                placeholder="Düsseldorf"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-semibold text-gray-700 sm:text-sm dark:text-gray-300">
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
                                className="focus:ring-primary dark:border-dark-border text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 sm:px-4 sm:text-base dark:bg-gray-700"
                                placeholder="Trompete"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-semibold text-gray-700 sm:text-sm dark:text-gray-300">
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
                                className="focus:ring-primary dark:border-dark-border text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 sm:px-4 sm:text-base dark:bg-gray-700"
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
                                <div
                                  key={field.fieldName}
                                  className="md:col-span-2"
                                >
                                  <label className="mb-1 block text-xs font-semibold text-gray-700 sm:text-sm dark:text-gray-300">
                                    {field.fieldName}
                                    {field.isRequired && " *"}
                                  </label>
                                  {field.fieldType === "SELECT" &&
                                  field.options ? (
                                    <select
                                      value={
                                        (participant.customFields &&
                                        typeof participant.customFields ===
                                          "object" &&
                                        field.fieldName in
                                          participant.customFields
                                          ? (
                                              participant.customFields as Record<
                                                string,
                                                any
                                              >
                                            )[field.fieldName]
                                          : "") || ""
                                      }
                                      onChange={(e) =>
                                        updateParticipant(
                                          index,
                                          "customFields",
                                          {
                                            ...(typeof participant.customFields ===
                                              "object" &&
                                            participant.customFields !== null
                                              ? participant.customFields
                                              : {}),
                                            [field.fieldName]: e.target.value,
                                          },
                                        )
                                      }
                                      className="focus:ring-primary dark:border-dark-border text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 sm:px-4 sm:text-base dark:bg-gray-700"
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
                                        field.fieldName in
                                          participant.customFields
                                          ? (
                                              participant.customFields as Record<
                                                string,
                                                any
                                              >
                                            )[field.fieldName]
                                          : ""
                                      }
                                      onChange={(e) =>
                                        updateParticipant(
                                          index,
                                          "customFields",
                                          {
                                            ...(typeof participant.customFields ===
                                              "object" &&
                                            participant.customFields !== null
                                              ? participant.customFields
                                              : {}),
                                            [field.fieldName]: e.target.value,
                                          },
                                        )
                                      }
                                      rows={3}
                                      className="focus:ring-primary dark:border-dark-border text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 sm:px-4 sm:text-base dark:bg-gray-700"
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
                                        field.fieldName in
                                          participant.customFields
                                          ? (
                                              participant.customFields as Record<
                                                string,
                                                any
                                              >
                                            )[field.fieldName]
                                          : ""
                                      }
                                      onChange={(e) =>
                                        updateParticipant(
                                          index,
                                          "customFields",
                                          {
                                            ...(typeof participant.customFields ===
                                              "object" &&
                                            participant.customFields !== null
                                              ? participant.customFields
                                              : {}),
                                            [field.fieldName]: e.target.value,
                                          },
                                        )
                                      }
                                      className="focus:ring-primary dark:border-dark-border text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 sm:px-4 sm:text-base dark:bg-gray-700"
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

                          {/* Sibling Grouping */}
                          {course.allowSiblingDiscount &&
                            registrationData.participants.length > 1 && (
                              <div className="mt-4 space-y-2">
                                <label className="text-dark dark:text-dark-text block text-xs font-medium sm:text-sm">
                                  Geschwister verknüpfen
                                </label>
                                <div className="flex flex-wrap items-center gap-2">
                                  {registrationData.participants
                                    .map((p, idx) => ({ p, idx }))
                                    .filter(({ idx: idx2 }) => idx2 !== index)
                                    .map(
                                      ({
                                        p: otherParticipant,
                                        idx: otherIndex,
                                      }) => {
                                        const isLinked =
                                          participant.siblingGroupId &&
                                          participant.siblingGroupId ===
                                            otherParticipant.siblingGroupId;
                                        return (
                                          <button
                                            key={otherIndex}
                                            type="button"
                                            onClick={() =>
                                              linkSiblings(index, otherIndex)
                                            }
                                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition-colors sm:gap-2 sm:px-3 sm:text-sm ${
                                              isLinked
                                                ? "border-green-500 bg-green-50 text-green-700 dark:border-green-600 dark:bg-green-900/30 dark:text-green-400"
                                                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                            }`}
                                          >
                                            {isLinked ? (
                                              <Link2Off className="h-4 w-4" />
                                            ) : (
                                              <LinkIcon className="h-4 w-4" />
                                            )}
                                            <span>
                                              {getParticipantDisplayName(
                                                otherParticipant.firstName,
                                                otherParticipant.lastName,
                                                otherIndex,
                                              )}
                                              {isLinked && " ✓"}
                                            </span>
                                          </button>
                                        );
                                      },
                                    )}
                                </div>
                                {participant.siblingGroupId && (
                                  <p className="text-xs text-green-700 dark:text-green-400">
                                    Geschwistergruppe:{" "}
                                    {registrationData.participants
                                      .map((p, idx) => ({ p, idx }))
                                      .filter(
                                        ({ p: p2, idx: idx2 }) =>
                                          p2.siblingGroupId ===
                                            participant.siblingGroupId &&
                                          idx2 !== index,
                                      )
                                      .map(({ p, idx }) =>
                                        getParticipantDisplayName(
                                          p.firstName,
                                          p.lastName,
                                          idx,
                                        ),
                                      )
                                      .join(", ")}
                                  </p>
                                )}
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sibling Discount Option */}
              {course.allowSiblingDiscount &&
                registrationData.participants.length > 1 &&
                hasSiblingGroups && (
                  <div className="mt-6 rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
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
                        className="mt-1 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-2 focus:ring-green-500"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          Geschwisterrabatt beantragen
                        </div>
                        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                          Sie erhalten 20% Rabatt für jedes Geschwisterkind ab
                          dem zweiten Kind. Der Rabatt muss noch bestätigt
                          werden.
                        </p>
                        {registrationData.siblingDiscountApplied &&
                          calculateDiscountAmount() > 0 && (
                            <div className="mt-2 text-sm font-semibold text-green-700 dark:text-green-400">
                              Ersparnis: {calculateDiscountAmount().toFixed(2)}{" "}
                              €
                            </div>
                          )}
                      </div>
                    </label>
                  </div>
                )}
            </div>
          )}

          {/* Step 3: Summary */}
          {currentStep === 3 && (
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
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
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
