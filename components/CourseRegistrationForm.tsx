"use client";

import { useState, useEffect } from "react";
import type { Course, Participant } from "@/types/strapi";

interface CourseRegistrationFormProps {
  course: Course;
  onClose: () => void;
  isWaitlist: boolean;
}

interface RegistrationData {
  registeredBy: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    choir: string;
    district: string;
  };
  participants: Array<
    Participant & {
      priceOption: string;
      customFields: Record<string, any>;
    }
  >;
}

type Step = 1 | 2 | 3 | 4;

export default function CourseRegistrationForm({
  course,
  onClose,
  isWaitlist,
}: CourseRegistrationFormProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    registeredBy: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      choir: "",
      district: "",
    },
    participants: [],
  });

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const districts = [
    "All Districts",
    "District 1",
    "District 2",
    "District 3",
    "District 4",
    "District 5",
    "District 6",
    "District 7",
    "District 8",
    "District 9",
    "District 10",
    "District 11",
    "District 12",
    "District 13",
  ];

  // Add new participant
  const addParticipant = () => {
    setRegistrationData({
      ...registrationData,
      participants: [
        ...registrationData.participants,
        {
          firstName: "",
          lastName: "",
          birthDate: "",
          city: "",
          instrument: "",
          priceOption: course.priceOptions[0]?.label || "",
          customFields: {},
        },
      ],
    });
  };

  // Add registrant as participant
  const addMyselfAsParticipant = () => {
    setRegistrationData({
      ...registrationData,
      participants: [
        ...registrationData.participants,
        {
          firstName: registrationData.registeredBy.firstName,
          lastName: registrationData.registeredBy.lastName,
          birthDate: "",
          city: "",
          instrument: "",
          priceOption: course.priceOptions[0]?.label || "",
          customFields: {},
        },
      ],
    });
  };

  // Remove participant
  const removeParticipant = (index: number) => {
    setRegistrationData({
      ...registrationData,
      participants: registrationData.participants.filter((_, i) => i !== index),
    });
  };

  // Update participant
  const updateParticipant = (
    index: number,
    field: string,
    value: string | Record<string, any>
  ) => {
    const updated = [...registrationData.participants];
    if (field === "customFields") {
      updated[index].customFields = value as Record<string, any>;
    } else {
      (updated[index] as any)[field] = value;
    }
    setRegistrationData({ ...registrationData, participants: updated });
  };

  // Calculate total price
  const calculateTotalPrice = () => {
    return registrationData.participants.reduce((sum, participant) => {
      const priceOption = course.priceOptions.find(
        (p) => p.label === participant.priceOption
      );
      return sum + (priceOption?.price || 0);
    }, 0);
  };

  // Validate current step
  const validateStep = (step: Step): boolean => {
    switch (step) {
      case 1:
        const { firstName, lastName, email, phone } =
          registrationData.registeredBy;
        return !!(firstName && lastName && email && phone);
      case 2:
        return registrationData.participants.length > 0;
      case 3:
        return registrationData.participants.every(
          (p) =>
            p.firstName && p.lastName && p.birthDate && p.city && p.priceOption
        );
      case 4:
        return true;
      default:
        return false;
    }
  };

  const canProceed = validateStep(currentStep);

  // Submit registration
  const handleSubmit = async () => {
    console.log("Registration submitted:", {
      course: course.id,
      ...registrationData,
      totalPrice: calculateTotalPrice(),
      isWaitlist,
    });

    // TODO: Send to API
    alert(
      `Anmeldung erfolgreich${isWaitlist ? " (Warteliste)" : ""}!\n\n` +
        `${registrationData.participants.length} Teilnehmer\n` +
        `Gesamtpreis: ${calculateTotalPrice().toFixed(2)} €\n\n` +
        `Eine Bestätigungs-E-Mail wurde an ${registrationData.registeredBy.email} gesendet.`
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-primary text-white p-6 rounded-t-xl z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">
                {isWaitlist ? "Warteliste" : "Anmeldung"}
              </h2>
              <p className="text-sm opacity-90">{course.title}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg
                className="w-6 h-6"
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
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    currentStep >= step
                      ? "bg-white text-primary"
                      : "bg-white/20 text-white/60"
                  }`}
                >
                  {step}
                </div>
                {step < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      currentStep > step ? "bg-white" : "bg-white/20"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs opacity-90">
            <span>Anmelder</span>
            <span>Teilnehmer</span>
            <span>Details</span>
            <span>Übersicht</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Registrant Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-dark mb-4">
                Ihre Kontaktdaten
              </h3>
              <p className="text-gray-600 mb-6">
                Als Anmelder erhalten Sie die Bestätigung und alle weiteren
                Informationen per E-Mail.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Vorname *
                  </label>
                  <input
                    type="text"
                    value={registrationData.registeredBy.firstName}
                    onChange={(e) =>
                      setRegistrationData({
                        ...registrationData,
                        registeredBy: {
                          ...registrationData.registeredBy,
                          firstName: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Max"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Nachname *
                  </label>
                  <input
                    type="text"
                    value={registrationData.registeredBy.lastName}
                    onChange={(e) =>
                      setRegistrationData({
                        ...registrationData,
                        registeredBy: {
                          ...registrationData.registeredBy,
                          lastName: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Mustermann"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    E-Mail *
                  </label>
                  <input
                    type="email"
                    value={registrationData.registeredBy.email}
                    onChange={(e) =>
                      setRegistrationData({
                        ...registrationData,
                        registeredBy: {
                          ...registrationData.registeredBy,
                          email: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="max@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Telefon *
                  </label>
                  <input
                    type="tel"
                    value={registrationData.registeredBy.phone}
                    onChange={(e) =>
                      setRegistrationData({
                        ...registrationData,
                        registeredBy: {
                          ...registrationData.registeredBy,
                          phone: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="0211 123456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Chor / Gemeinde
                  </label>
                  <input
                    type="text"
                    value={registrationData.registeredBy.choir}
                    onChange={(e) =>
                      setRegistrationData({
                        ...registrationData,
                        registeredBy: {
                          ...registrationData.registeredBy,
                          choir: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Posaunenchor Düsseldorf"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Bezirk
                  </label>
                  <select
                    value={registrationData.registeredBy.district}
                    onChange={(e) =>
                      setRegistrationData({
                        ...registrationData,
                        registeredBy: {
                          ...registrationData.registeredBy,
                          district: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Bitte wählen</option>
                    {districts.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Add Participants */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-dark">Teilnehmer</h3>
                  <p className="text-gray-600 text-sm">
                    Sie können mehrere Personen gleichzeitig anmelden
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addMyselfAsParticipant}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                    title="Mich selbst als Teilnehmer hinzufügen"
                  >
                    <svg
                      className="w-5 h-5"
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
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
                  >
                    <svg
                      className="w-5 h-5"
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
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <svg
                    className="w-16 h-16 mx-auto text-gray-400 mb-4"
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
                  <p className="text-gray-600 mb-4">
                    Noch keine Teilnehmer hinzugefügt
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={addMyselfAsParticipant}
                      className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <svg
                        className="w-5 h-5"
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
                      className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                    >
                      Andere Person hinzufügen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {registrationData.participants.map((participant, index) => {
                    // Check if this participant has the same name as registrant
                    const isRegistrant =
                      participant.firstName ===
                        registrationData.registeredBy.firstName &&
                      participant.lastName ===
                        registrationData.registeredBy.lastName;

                    return (
                      <div
                        key={index}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-dark">
                              Teilnehmer {index + 1}
                            </h4>
                            {isRegistrant && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                                <svg
                                  className="w-3 h-3"
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
                              className="text-red-600 hover:text-red-700 p-1"
                            >
                              <svg
                                className="w-5 h-5"
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

                        <p className="text-xs text-gray-500 mb-3">
                          Grundlegende Informationen zur Person
                        </p>

                        <div className="text-sm text-gray-600">
                          {participant.firstName || participant.lastName ? (
                            <p className="font-semibold">
                              {participant.firstName} {participant.lastName}
                            </p>
                          ) : (
                            <p className="italic text-gray-400">
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
              <h3 className="text-xl font-bold text-dark mb-4">
                Details der Teilnehmer
              </h3>

              {registrationData.participants.map((participant, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-6 border border-gray-200"
                >
                  <h4 className="font-bold text-dark mb-4">
                    Teilnehmer {index + 1}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Vorname *
                      </label>
                      <input
                        type="text"
                        value={participant.firstName}
                        onChange={(e) =>
                          updateParticipant(index, "firstName", e.target.value)
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Nachname *
                      </label>
                      <input
                        type="text"
                        value={participant.lastName}
                        onChange={(e) =>
                          updateParticipant(index, "lastName", e.target.value)
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Geburtsdatum *
                      </label>
                      <input
                        type="date"
                        value={participant.birthDate}
                        onChange={(e) =>
                          updateParticipant(index, "birthDate", e.target.value)
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Wohnort *
                      </label>
                      <input
                        type="text"
                        value={participant.city}
                        onChange={(e) =>
                          updateParticipant(index, "city", e.target.value)
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Düsseldorf"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Instrument
                      </label>
                      <input
                        type="text"
                        value={participant.instrument || ""}
                        onChange={(e) =>
                          updateParticipant(index, "instrument", e.target.value)
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Trompete"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Preisoption *
                      </label>
                      <select
                        value={participant.priceOption}
                        onChange={(e) =>
                          updateParticipant(
                            index,
                            "priceOption",
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        {course.priceOptions.map((option) => (
                          <option key={option.label} value={option.label}>
                            {option.label} - {option.price.toFixed(2)} €
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Custom Fields */}
                    {course.customFields?.map((field) => (
                      <div key={field.fieldName} className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          {field.fieldName}
                          {field.isRequired && " *"}
                        </label>
                        {field.fieldType === "Select" && field.options ? (
                          <select
                            value={
                              participant.customFields[field.fieldName] || ""
                            }
                            onChange={(e) =>
                              updateParticipant(index, "customFields", {
                                ...participant.customFields,
                                [field.fieldName]: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          >
                            <option value="">Bitte wählen</option>
                            {field.options.split(",").map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : field.fieldType === "TextArea" ? (
                          <textarea
                            value={
                              participant.customFields[field.fieldName] || ""
                            }
                            onChange={(e) =>
                              updateParticipant(index, "customFields", {
                                ...participant.customFields,
                                [field.fieldName]: e.target.value,
                              })
                            }
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder={field.helpText}
                          />
                        ) : (
                          <input
                            type={
                              field.fieldType === "Number" ? "number" : "text"
                            }
                            value={
                              participant.customFields[field.fieldName] || ""
                            }
                            onChange={(e) =>
                              updateParticipant(index, "customFields", {
                                ...participant.customFields,
                                [field.fieldName]: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder={field.helpText}
                          />
                        )}
                        {field.helpText && (
                          <p className="text-xs text-gray-500 mt-1">
                            {field.helpText}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 4: Summary */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-dark mb-4">
                Zusammenfassung
              </h3>

              {/* Course Info */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h4 className="font-bold text-dark mb-3">Lehrgang</h4>
                <p className="font-semibold text-lg">{course.title}</p>
                <p className="text-sm text-gray-600">
                  {new Date(course.startDate).toLocaleDateString("de-DE")} -{" "}
                  {new Date(course.endDate).toLocaleDateString("de-DE")}
                </p>
                <p className="text-sm text-gray-600">
                  {course.location.venue}, {course.location.city}
                </p>
              </div>

              {/* Registrant Info */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h4 className="font-bold text-dark mb-3">Anmelder</h4>
                <p className="font-semibold">
                  {registrationData.registeredBy.firstName}{" "}
                  {registrationData.registeredBy.lastName}
                </p>
                <p className="text-sm text-gray-600">
                  {registrationData.registeredBy.email}
                </p>
                <p className="text-sm text-gray-600">
                  {registrationData.registeredBy.phone}
                </p>
                {registrationData.registeredBy.choir && (
                  <p className="text-sm text-gray-600">
                    {registrationData.registeredBy.choir}
                  </p>
                )}
              </div>

              {/* Participants List */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h4 className="font-bold text-dark mb-3">
                  Teilnehmer ({registrationData.participants.length})
                </h4>
                <div className="space-y-3">
                  {registrationData.participants.map((participant, index) => {
                    const priceOption = course.priceOptions.find(
                      (p) => p.label === participant.priceOption
                    );
                    return (
                      <div
                        key={index}
                        className="flex justify-between items-start pb-3 border-b border-gray-200 last:border-0"
                      >
                        <div>
                          <p className="font-semibold">
                            {participant.firstName} {participant.lastName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(participant.birthDate).toLocaleDateString(
                              "de-DE"
                            )}
                            {participant.instrument &&
                              ` • ${participant.instrument}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {participant.priceOption}
                          </p>
                        </div>
                        <p className="font-bold text-primary">
                          {priceOption?.price.toFixed(2)} €
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Price */}
              <div className="bg-primary text-white rounded-lg p-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Gesamtpreis</span>
                  <span className="text-3xl font-bold">
                    {calculateTotalPrice().toFixed(2)} €
                  </span>
                </div>
              </div>

              {/* Terms */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    className="mt-1 w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">
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
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-orange-800">
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
        <div className="sticky bottom-0 bg-gray-50 border-t p-6 rounded-b-xl flex justify-between items-center gap-4">
          <button
            onClick={() =>
              currentStep > 1 && setCurrentStep((currentStep - 1) as Step)
            }
            disabled={currentStep === 1}
            className="px-6 py-2 border-2 border-gray-300 text-dark font-semibold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Zurück
          </button>

          <div className="flex-1 text-center text-sm text-gray-600">
            Schritt {currentStep} von 4
          </div>

          {currentStep < 4 ? (
            <button
              onClick={() => setCurrentStep((currentStep + 1) as Step)}
              disabled={!canProceed}
              className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Weiter
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
            >
              Verbindlich anmelden
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
