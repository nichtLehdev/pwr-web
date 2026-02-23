/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import {
  BookOpen,
  UserIcon,
  Plus,
  Users,
  Save,
  Trash2,
  Link as LinkIcon,
  Link2Off,
} from "lucide-react";
import type { RouterOutputs } from "@/trpc/react";
import { Input, Label, Textarea, Select } from "@/app/_components/ui";
import type { RegistrationData, CourseWithRelations } from "./types";
import { getParticipantDisplayName, calculateDiscountAmount } from "./utils";
import { ParticipantLibraryPopup } from "./participant-library-popup";
import type { User } from "~/generated/prisma/client";

interface Step2ParticipantsProps {
  course: CourseWithRelations;
  registrationData: RegistrationData;
  setRegistrationData: React.Dispatch<React.SetStateAction<RegistrationData>>;
  validationErrors: Record<number, string>;
  setValidationErrors: React.Dispatch<
    React.SetStateAction<Record<number, string>>
  >;
  missingFields: Record<number, string[]>;
  setMissingFields: React.Dispatch<
    React.SetStateAction<Record<number, string[]>>
  >;
  currentUser?: User | null;
  savedParticipantsQuery: {
    data: RouterOutputs["savedParticipants"]["getAll"] | undefined;
  };
  saveParticipantMutation: {
    mutate: (variables: any) => void;
    isPending: boolean;
  };
  showParticipantLibrary: boolean;
  setShowParticipantLibrary: (show: boolean) => void;
  headerHeight: number;
  groupIdCounterRef: React.MutableRefObject<number>;
  siblingDiscountError: string;
}

export function Step2Participants({
  course,
  registrationData,
  setRegistrationData,
  validationErrors,
  setValidationErrors,
  missingFields,
  setMissingFields,
  currentUser,
  savedParticipantsQuery,
  saveParticipantMutation,
  showParticipantLibrary,
  setShowParticipantLibrary,
  headerHeight,
  groupIdCounterRef,
  siblingDiscountError,
}: Step2ParticipantsProps) {
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
  };

  const saveParticipant = (index: number) => {
    const participant = registrationData.participants[index];
    if (!participant) return;

    if (
      !participant.firstName ||
      !participant.lastName ||
      !participant.birthDate
    ) {
      return;
    }

    saveParticipantMutation.mutate({
      firstName: participant.firstName,
      lastName: participant.lastName,
      birthDate: new Date(participant.birthDate),
      city: participant.city,
      instrument: participant.instrument || undefined,
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
    }

    setRegistrationData({ ...registrationData, participants: updated });
  };

  const hasSiblingGroups = registrationData.participants.some(
    (p) => p.siblingGroupId,
  );

  return (
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

      {/* Sticky Buttons - sticky on mobile, also sticky on larger screens when participants exist */}
      <div
        className={`dark:bg-dark-surface sticky z-9 -mx-2 bg-white px-2 pt-2 pb-2 shadow-[0_4px_6px_-4px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_6px_-4px_rgba(0,0,0,0.3)] ${
          registrationData.participants.length > 0
            ? "sm:-mx-6 sm:w-[calc(100%+3rem)] sm:bg-white sm:px-6 sm:pt-4 sm:pb-4 sm:shadow-[0_4px_6px_rgba(0,0,0,0.1)] md:mb-6 sm:dark:bg-gray-900 sm:dark:shadow-[0_4px_6px_rgba(0,0,0,0.3)]"
            : "sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:dark:bg-transparent sm:dark:shadow-none"
        }`}
        style={{ top: `${headerHeight}px` }}
      >
        <div className="relative flex flex-wrap justify-center gap-2 sm:flex-nowrap sm:justify-center">
          {currentUser && (
            <div className="relative">
              <button
                onClick={() =>
                  setShowParticipantLibrary(!showParticipantLibrary)
                }
                className="flex items-center justify-center gap-1.5 rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 sm:gap-2 sm:px-4 sm:text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <BookOpen className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Aus Bibliothek</span>
              </button>
              <ParticipantLibraryPopup
                isOpen={showParticipantLibrary}
                onClose={() => setShowParticipantLibrary(false)}
                savedParticipants={savedParticipantsQuery.data}
                onLoadParticipant={loadSavedParticipant}
                headerHeight={headerHeight}
              />
            </div>
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
                (p: RegistrationData["participants"][0]) =>
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
                    {validationErrors[index] && (
                      <div className="w-full sm:w-auto">
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">
                          {validationErrors[index]}
                        </p>
                      </div>
                    )}
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
                          updateParticipant(index, "firstName", e.target.value)
                        }
                        maxLength={100}
                        required
                        className={`focus:ring-primary dark:border-dark-border text-dark dark:text-dark-text w-full rounded-lg border px-3 py-2 text-sm focus:border-transparent focus:ring-2 sm:px-4 sm:text-base dark:bg-gray-700 ${
                          missingFields[index]?.includes("firstName")
                            ? "border-red-500 dark:border-red-500"
                            : "border-gray-300"
                        }`}
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
                          updateParticipant(index, "lastName", e.target.value)
                        }
                        maxLength={100}
                        required
                        className={`focus:ring-primary dark:border-dark-border text-dark dark:text-dark-text w-full rounded-lg border px-3 py-2 text-sm focus:border-transparent focus:ring-2 sm:px-4 sm:text-base dark:bg-gray-700 ${
                          missingFields[index]?.includes("lastName")
                            ? "border-red-500 dark:border-red-500"
                            : "border-gray-300"
                        }`}
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
                          updateParticipant(index, "birthDate", newDate);
                          const newErrors = { ...validationErrors };
                          const newMissing = { ...missingFields };

                          if (!e.target.value) {
                            newErrors[index] = "Geburtsdatum ist erforderlich";
                            newMissing[index] = [
                              ...(newMissing[index] || []).filter(
                                (f) => f !== "birthDate",
                              ),
                              "birthDate",
                            ];
                          } else {
                            const birthDate = new Date(e.target.value);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const oneYearAgo = new Date(today);
                            oneYearAgo.setFullYear(today.getFullYear() - 1);
                            const maxAge = new Date(today);
                            maxAge.setFullYear(today.getFullYear() - 120);

                            if (birthDate >= today) {
                              newErrors[index] =
                                "Geburtsdatum darf nicht heute oder in der Zukunft liegen";
                              newMissing[index] = [
                                ...(newMissing[index] || []).filter(
                                  (f) => f !== "birthDate",
                                ),
                                "birthDate",
                              ];
                            } else if (birthDate > oneYearAgo) {
                              newErrors[index] =
                                "Teilnehmer muss mindestens 1 Jahr alt sein";
                              newMissing[index] = [
                                ...(newMissing[index] || []).filter(
                                  (f) => f !== "birthDate",
                                ),
                                "birthDate",
                              ];
                            } else if (birthDate < maxAge) {
                              newErrors[index] =
                                "Geburtsdatum ist nicht gültig";
                              newMissing[index] = [
                                ...(newMissing[index] || []).filter(
                                  (f) => f !== "birthDate",
                                ),
                                "birthDate",
                              ];
                            } else {
                              const updatedMissing = newMissing[index]?.filter(
                                (f) => f !== "birthDate",
                              );
                              if (updatedMissing && updatedMissing.length > 0) {
                                newMissing[index] = updatedMissing;
                              } else {
                                delete newMissing[index];
                              }
                              delete newErrors[index];
                            }
                          }
                          setValidationErrors(newErrors);
                          setMissingFields(newMissing);
                        }}
                        max={
                          new Date(
                            new Date().setFullYear(
                              new Date().getFullYear() - 1,
                            ),
                          )
                            .toISOString()
                            .split("T")[0]
                        }
                        required
                        className={`focus:ring-primary dark:border-dark-border text-dark dark:text-dark-text w-full rounded-lg border px-3 py-2 text-sm focus:border-transparent focus:ring-2 sm:px-4 sm:text-base dark:bg-gray-700 ${
                          missingFields[index]?.includes("birthDate") ||
                          (validationErrors[index] &&
                            (validationErrors[index].includes("Geburtsdatum") ||
                              validationErrors[index].includes("Jahr alt")))
                            ? "border-red-500 dark:border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {validationErrors[index] &&
                        (validationErrors[index].includes("Geburtsdatum") ||
                          validationErrors[index].includes("Jahr alt")) && (
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
                          updateParticipant(index, "city", e.target.value)
                        }
                        maxLength={100}
                        required
                        className={`focus:ring-primary dark:border-dark-border text-dark dark:text-dark-text w-full rounded-lg border px-3 py-2 text-sm focus:border-transparent focus:ring-2 sm:px-4 sm:text-base dark:bg-gray-700 ${
                          missingFields[index]?.includes("city")
                            ? "border-red-500 dark:border-red-500"
                            : "border-gray-300"
                        }`}
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
                          updateParticipant(index, "instrument", e.target.value)
                        }
                        maxLength={100}
                        className={`focus:ring-primary dark:border-dark-border text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 sm:px-4 sm:text-base ${
                          isInGroup
                            ? "bg-green-50 dark:bg-green-900/20"
                            : "bg-white dark:bg-gray-700"
                        }`}
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
                        className={`focus:ring-primary dark:border-dark-border text-dark dark:text-dark-text h-[42px] w-full rounded-lg border px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:outline-none sm:h-auto sm:px-4 sm:text-base dark:bg-gray-700 ${
                          missingFields[index]?.includes("priceOptionId")
                            ? "border-red-500 dark:border-red-500"
                            : "border-gray-300"
                        }`}
                      >
                        {course.priceOptions.map(
                          (option: {
                            id: string;
                            label: string;
                            price: number;
                          }) => (
                            <option key={option.id} value={option.id}>
                              {option.label} - {option.price.toFixed(2)} €
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    {/* Custom Fields */}
                    {course.customFields?.map((field) => {
                      return (
                        <div key={field.fieldName} className="md:col-span-2">
                          <Label
                            className="mb-1 text-xs sm:text-sm"
                            required={field.isRequired}
                          >
                            {field.fieldName}
                          </Label>
                          {field.fieldType === "SELECT" && field.options ? (
                            <Select
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
                              className={`text-sm sm:text-base ${
                                field.isRequired &&
                                missingFields[index]?.includes(
                                  `customField:${field.fieldName}`,
                                )
                                  ? "border-red-500 dark:border-red-500"
                                  : ""
                              }`}
                            >
                              <option value="">Bitte wählen</option>
                              {typeof field.options === "string" &&
                                field.options.split(",").map((opt: string) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                            </Select>
                          ) : field.fieldType === "TEXTAREA" ? (
                            <Textarea
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
                              className={`text-sm sm:text-base ${
                                field.isRequired &&
                                missingFields[index]?.includes(
                                  `customField:${field.fieldName}`,
                                )
                                  ? "border-red-500 dark:border-red-500"
                                  : ""
                              }`}
                              placeholder={field.helpText ? field.helpText : ""}
                            />
                          ) : (
                            <Input
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
                              className={`text-sm sm:text-base ${
                                field.isRequired &&
                                missingFields[index]?.includes(
                                  `customField:${field.fieldName}`,
                                )
                                  ? "border-red-500 dark:border-red-500"
                                  : ""
                              }`}
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
                            .map(({ p: otherParticipant, idx: otherIndex }) => {
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
                                      registrationData.participants,
                                      otherIndex,
                                    )}
                                    {isLinked && " ✓"}
                                  </span>
                                </button>
                              );
                            })}
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
                                  registrationData.participants,
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
                  Geschwisterkindrabatt beantragen
                </div>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  Sie erhalten 20% Rabatt auf die Teilnahmegebühr jedes weiteren
                  Geschwisterkindes ab dem zweiten Kind. Der Rabatt muss noch
                  bestätigt werden.
                </p>
                {registrationData.siblingDiscountApplied &&
                  calculateDiscountAmount(registrationData, course) > 0 && (
                    <div className="mt-2 text-sm font-semibold text-green-700 dark:text-green-400">
                      Ersparnis:{" "}
                      {calculateDiscountAmount(
                        registrationData,
                        course,
                      ).toFixed(2)}{" "}
                      €
                    </div>
                  )}
                {siblingDiscountError && (
                  <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {siblingDiscountError}
                  </div>
                )}
              </div>
            </label>
          </div>
        )}
    </div>
  );
}
