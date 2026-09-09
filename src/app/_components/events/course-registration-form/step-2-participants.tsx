/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { BookOpen, UserIcon, Plus, Users } from "lucide-react";
import type { RouterOutputs } from "@/trpc/react";
import type { RegistrationData, CourseWithRelations } from "./types";
import { getParticipantDisplayName, calculateDiscountAmount } from "./utils";
import { ParticipantLibraryPopup } from "./participant-library-popup";
import { ParticipantCard } from "./participant-card";
import { ParticipantEditor } from "./participant-editor";
import { ParticipantSheet } from "./participant-sheet";
import type { User } from "~/generated/prisma/client";

interface Step2ParticipantsProps {
  course: CourseWithRelations;
  registrationData: RegistrationData;
  setRegistrationData: React.Dispatch<React.SetStateAction<RegistrationData>>;
  validationErrors: Record<number, string>;
  missingFields: Record<number, string[]>;
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
  /** When false (e.g. full-page registration), use a static toolbar — no sticky offset hacks */
  stickyToolbar?: boolean;
}

export function Step2Participants({
  course,
  registrationData,
  setRegistrationData,
  validationErrors,
  missingFields,
  currentUser,
  savedParticipantsQuery,
  saveParticipantMutation,
  showParticipantLibrary,
  setShowParticipantLibrary,
  headerHeight,
  groupIdCounterRef,
  siblingDiscountError,
  stickyToolbar = true,
}: Step2ParticipantsProps) {
  /** Index of the participant whose fields are open in the sheet. */
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  /** Set once "Fertig" is pressed on an incomplete participant. */
  const [doneAttempted, setDoneAttempted] = useState(false);

  const openParticipant = (index: number | null) => {
    setEditingIndex(index);
    setDoneAttempted(false);
  };

  /**
   * "Fertig" only closes a participant that is complete. On an incomplete one
   * it reveals what is missing and stays put — the X, the backdrop and Escape
   * still leave, so nobody is stuck with a half-filled form.
   */
  const finishEditing = () => {
    if (editingIndex !== null && validationErrors[editingIndex]) {
      setDoneAttempted(true);
      return;
    }
    openParticipant(null);
  };

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
          // Empty like the other fields — pre-filling "today" instantly
          // failed validation before the user typed anything.
          birthDate: "" as any,
          city: "",
          instrument: "",
          priceOptionId: firstPriceOption.id,
          customFields: {},
          siblingGroupId: undefined,
        },
      ],
    });
    // A blank card has nothing to read, so go straight to the fields. The
    // prefilled routes below don't, since their card already says who it is.
    openParticipant(registrationData.participants.length);
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
    // Removing shifts every later index, which would leave the sheet pointing
    // at the wrong participant.
    openParticipant(null);
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

  const siblingGroupSize = (index: number) => {
    const participant = registrationData.participants[index];
    if (!participant?.siblingGroupId) return 1;
    return registrationData.participants.filter(
      (p) => p.siblingGroupId === participant.siblingGroupId,
    ).length;
  };

  const hasSiblingGroups = registrationData.participants.some(
    (p) => p.siblingGroupId,
  );

  const hasParticipants = registrationData.participants.length > 0;

  const editingParticipant =
    editingIndex !== null
      ? registrationData.participants[editingIndex]
      : undefined;

  const toolbarButtons = (
    <div className="flex flex-wrap justify-center gap-2">
      {currentUser && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowParticipantLibrary(!showParticipantLibrary)}
            className="text-dark dark:text-dark-text dark:border-dark-border dark:hover:bg-dark-background flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-3 text-xs font-semibold transition-colors hover:bg-gray-50 sm:px-4 sm:text-sm"
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            Aus Bibliothek
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
          type="button"
          onClick={addMyselfAsParticipant}
          className="text-dark dark:text-dark-text dark:border-dark-border dark:hover:bg-dark-background flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-3 text-xs font-semibold transition-colors hover:bg-gray-50 sm:px-4 sm:text-sm"
        >
          <UserIcon className="h-4 w-4 shrink-0" />
          Mich selbst
        </button>
      )}
      <button
        type="button"
        onClick={addParticipant}
        className="bg-primary hover:bg-primary-dark flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold text-white transition-colors sm:px-4 sm:text-sm"
      >
        <Plus className="h-4 w-4 shrink-0" />
        Hinzufügen
      </button>
    </div>
  );

  return (
    <div className="flex flex-col">
      <div className="mb-5">
        <h3 className="text-dark dark:text-dark-text mb-1 text-lg font-bold sm:text-xl">
          Teilnehmer
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Fügen Sie alle Personen hinzu, die Sie für diesen Lehrgang anmelden
          möchten. Zum Bearbeiten auf eine Person tippen.
        </p>
      </div>

      {/* `top-0`, not the modal header height: this bar already lives inside the
          modal's scroll container, whose top edge sits below that header —
          offsetting it again parked the buttons in mid-screen on phones. */}
      {stickyToolbar && hasParticipants && (
        <div className="dark:bg-dark-surface dark:border-dark-border sticky top-0 z-10 -mx-6 mb-6 border-b border-gray-100 bg-white px-6 py-3 shadow-sm">
          {toolbarButtons}
        </div>
      )}

      {!stickyToolbar && hasParticipants && (
        <div className="dark:border-dark-border dark:bg-dark-background-secondary bg-background-secondary mb-5 rounded-lg border border-gray-200 p-4">
          <p className="text-dark dark:text-dark-text mb-3 text-sm font-semibold">
            Weitere Teilnehmer
          </p>
          {toolbarButtons}
        </div>
      )}

      <div className="flex-1">
        {!hasParticipants ? (
          <div className="dark:border-dark-border dark:bg-dark-background-secondary bg-background-secondary rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center sm:py-9">
            <Users className="text-primary/60 dark:text-primary/40 mx-auto mb-2 h-9 w-9" />
            <p className="text-dark dark:text-dark-text text-sm font-medium">
              Noch keine Teilnehmer
            </p>
            <p className="mx-auto mt-1 mb-5 max-w-sm text-xs text-gray-500 dark:text-gray-400">
              {currentUser
                ? "Übernehmen Sie Daten aus Ihrer Bibliothek, tragen Sie sich selbst ein oder legen Sie eine neue Person an."
                : "Legen Sie eine neue Teilnehmerperson an."}
            </p>
            {toolbarButtons}
          </div>
        ) : (
          <div className="space-y-3">
            {registrationData.participants.map((participant, index) => (
              <ParticipantCard
                key={index}
                participant={participant}
                index={index}
                priceOptions={course.priceOptions}
                validationError={validationErrors[index]}
                siblingGroupSize={siblingGroupSize(index)}
                onEdit={() => openParticipant(index)}
                onRemove={() => removeParticipant(index)}
                onSaveToLibrary={
                  currentUser ? () => saveParticipant(index) : undefined
                }
                saveToLibraryPending={saveParticipantMutation.isPending}
              />
            ))}
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

      {editingIndex !== null && editingParticipant ? (
        <ParticipantSheet
          title={`Teilnehmer ${editingIndex + 1}`}
          subtitle={
            [editingParticipant.firstName, editingParticipant.lastName]
              .map((part) => part?.trim())
              .filter(Boolean)
              .join(" ") || undefined
          }
          onClose={() => openParticipant(null)}
          onDone={finishEditing}
        >
          <ParticipantEditor
            priceOptions={course.priceOptions}
            customFields={course.customFields ?? []}
            participant={editingParticipant}
            onChange={(field, value) =>
              updateParticipant(editingIndex, field, value)
            }
            missingFields={missingFields[editingIndex] ?? []}
            validationError={validationErrors[editingIndex]}
            showProblems={doneAttempted}
            siblings={
              course.allowSiblingDiscount &&
              registrationData.participants.length > 1
                ? {
                    candidates: registrationData.participants
                      .map((other, otherIndex) => ({ other, otherIndex }))
                      .filter(({ otherIndex }) => otherIndex !== editingIndex)
                      .map(({ other, otherIndex }) => ({
                        key: String(otherIndex),
                        label: getParticipantDisplayName(
                          other.firstName,
                          other.lastName,
                          registrationData.participants,
                          otherIndex,
                        ),
                        linked:
                          !!editingParticipant.siblingGroupId &&
                          editingParticipant.siblingGroupId ===
                            other.siblingGroupId,
                      })),
                    onToggle: (key) => linkSiblings(editingIndex, Number(key)),
                    groupMembers: editingParticipant.siblingGroupId
                      ? registrationData.participants
                          .map((other, otherIndex) => ({ other, otherIndex }))
                          .filter(
                            ({ other, otherIndex }) =>
                              otherIndex !== editingIndex &&
                              other.siblingGroupId ===
                                editingParticipant.siblingGroupId,
                          )
                          .map(({ other, otherIndex }) =>
                            getParticipantDisplayName(
                              other.firstName,
                              other.lastName,
                              registrationData.participants,
                              otherIndex,
                            ),
                          )
                      : [],
                  }
                : undefined
            }
          />
        </ParticipantSheet>
      ) : null}
    </div>
  );
}
