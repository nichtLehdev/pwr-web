/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import type { RouterInputs, RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";
import type { User } from "~/generated/prisma/client";

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
  const registrationMutation = api.registrations.create.useMutation();
  const [currentStep, setCurrentStep] = useState<Step>(1);
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
    return registrationData.participants.reduce((sum, participant) => {
      const priceOption = course.priceOptions.find(
        (p) => p.id === participant.priceOptionId,
      );
      return sum + (priceOption?.price || 0);
    }, 0);
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
    console.log("Registration submitted:", {
      course: course.id,
      ...registrationData,
      totalPrice: calculateTotalPrice(),
      isWaitlist,
    });

    registrationMutation.mutate({
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
      })),
    });

    alert(
      isWaitlist
        ? "Sie wurden auf die Warteliste gesetzt."
        : "Ihre Anmeldung war erfolgreich.",
    );
    onSuccess();
    onClose();
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
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
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
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span className="hidden sm:inline">Mich selbst</span>
                  </button>
                  <button
                    onClick={addParticipant}
                    className="bg-primary hover:bg-primary-dark flex items-center gap-2 rounded-lg px-4 py-2 text-white transition-colors"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    <span className="hidden sm:inline">Hinzufügen</span>
                  </button>
                </div>
              </div>

              {registrationData.participants.length === 0 ? (
                <div className="dark:border-dark-border dark:bg-dark-background-secondary rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12 text-center">
                  <svg
                    className="mx-auto mb-4 h-16 w-16 text-gray-400 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <p className="mb-4 text-gray-600 dark:text-gray-400">
                    Noch keine Teilnehmer hinzugefügt
                  </p>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={addMyselfAsParticipant}
                      className="flex items-center gap-2 rounded-lg bg-gray-600 px-6 py-2 text-white transition-colors hover:bg-gray-700"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
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
                                <svg
                                  className="h-3 w-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                  />
                                </svg>
                                Ich
                              </span>
                            )}
                          </div>
                          {registrationData.participants.length > 1 && (
                            <button
                              onClick={() => removeParticipant(index)}
                              className="p-1 text-red-600 hover:text-red-700"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
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
              <h3 className="text-dark dark:text-dark-text mb-4 text-xl font-bold">
                Details der Teilnehmer
              </h3>

              {registrationData.participants.map((participant, index) => (
                <div
                  key={index}
                  className="dark:border-dark-border dark:bg-dark-background-secondary rounded-lg border border-gray-200 bg-gray-50 p-6"
                >
                  <h4 className="text-dark dark:text-dark-text mb-4 font-bold">
                    Teilnehmer {index + 1}
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
                          updateParticipant(index, "firstName", e.target.value)
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
                        onChange={(e) =>
                          updateParticipant(
                            index,
                            "birthDate",
                            e.target.value
                              ? new Date(e.target.value)
                              : ("" as any),
                          )
                        }
                        className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
                      />
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
                          updateParticipant(index, "instrument", e.target.value)
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
                                typeof participant.customFields === "object" &&
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
                                typeof participant.customFields === "object" &&
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
                              placeholder={field.helpText ? field.helpText : ""}
                            />
                          ) : (
                            <input
                              type={
                                field.fieldType === "NUMBER" ? "number" : "text"
                              }
                              value={
                                typeof participant.customFields === "object" &&
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
                              placeholder={field.helpText ? field.helpText : ""}
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
              ))}
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
                    <svg
                      className="h-5 w-5 text-blue-600 dark:text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
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

              {/* Total Price */}
              <div className="bg-primary rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Gesamtpreis</span>
                  <span className="text-3xl font-bold">
                    {calculateTotalPrice().toFixed(2)} €
                  </span>
                </div>
              </div>

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
              onClick={() => setCurrentStep((currentStep + 1) as Step)}
              disabled={!canProceed}
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
