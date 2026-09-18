/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useRef, useState } from "react";
import { BookOpen, UserIcon, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/trpc/react";
import type { RegistrationData, CourseWithRelations } from "./types";
import { getParticipantDisplayName, calculateDiscountAmount } from "./utils";
import { ParticipantLibraryPopup } from "./participant-library-popup";
import { ParticipantCard } from "./participant-card";
import { ParticipantEditor } from "./participant-editor";
import { ParticipantSheet } from "./participant-sheet";
import type { User } from "~/generated/prisma/client";
import {
  ageOnDate,
  priceOptionIdForAge,
  priceOptionAgeReferenceDate,
} from "@/lib/course-price-option-age";
import { formatEuro } from "@/lib/invoice-document";
import { isPriceOptionFullFor } from "@/lib/registration-seat-shortage";
import { Checkbox } from "@/app/_components/programmheft/field";
import { Heading } from "@/app/_components/programmheft/section-head";
import { Note } from "@/app/_components/programmheft/note";

/** The two places the add buttons appear: above the list and after it. */
type LibraryAnchor = "top" | "bottom";

/**
 * From this many participants on, the list is long enough that the header
 * group has scrolled away by the time you finish the last one — below that,
 * both groups sit on one screen and the second just reads as a duplicate.
 */
const REPEAT_ACTIONS_FROM = 3;

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
  groupIdCounterRef: React.MutableRefObject<number>;
  siblingDiscountError: string;
  /**
   * Dashboard mode: the course team may put a participant into a category
   * whose age limits they fall outside of.
   */
  staffMode?: boolean;
  /** Sprungziel für den Fokus beim Wechsel in diesen Schritt. */
  headingId: string;
  /** Restplätze je Preiskategorie, um ausgebuchte zu kennzeichnen. */
  capacityByPriceOption?: Record<string, number> | null;
}

/** Schlüssel (`data-focus-key`) des oberen „Hinzufügen“. */
export const ADD_PARTICIPANT_FOCUS_KEY = "add-participant";

/** Schlüssel (`data-focus-key`) der Karte eines Teilnehmers. */
export const participantFocusKey = (index: number) => `participant-${index}`;

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
  groupIdCounterRef,
  siblingDiscountError,
  staffMode = false,
  headingId,
  capacityByPriceOption,
}: Step2ParticipantsProps) {
  /**
   * Die Preiskategorie, die zu diesem Geburtsdatum passt. Bleibt genau eine
   * übrig, wird sie gesetzt — sonst bleibt die bisherige stehen und die
   * Prüfung sagt, dass gewählt werden muss.
   *
   * Nicht im Kursteam-Modus: dort ist eine Kategorie außerhalb der
   * Altersgrenze eine Absicht und kein Versehen, das korrigiert gehört.
   */
  const priceOptionForBirthDate = (
    birthDate: Date | string | null | undefined,
    currentId: string,
  ): string => {
    if (staffMode) return currentId;
    return (
      priceOptionIdForAge(
        course.priceOptions,
        ageOnDate(birthDate, priceOptionAgeReferenceDate(course)),
        currentId,
      ) ?? currentId
    );
  };

  /** Index of the participant whose fields are open in the sheet. */
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  /** Set once "Fertig" is pressed on an incomplete participant. */
  const [doneAttempted, setDoneAttempted] = useState(false);
  /** Zählt jedes gescheiterte „Fertig“ — der Fokus springt dann ins Feld. */
  const [doneFailures, setDoneFailures] = useState(0);
  /** Which of the two action groups the library popup belongs to. */
  const [libraryAnchor, setLibraryAnchor] = useState<LibraryAnchor>("top");

  const rootRef = useRef<HTMLDivElement>(null);
  /**
   * Wohin der Fokus nach dem Schließen des Fensters zurückkehrt: zum
   * auslösenden Knopf, und ist der verschwunden (das „Hinzufügen“ der leeren
   * Liste), zum gleichwertigen Knopf über der Liste. Vorher landete der Fokus
   * nach Escape, „Fertig“ oder dem Schließen auf `BODY`.
   */
  const sheetReturn = useRef<{
    element: HTMLElement | null;
    key: string;
  } | null>(null);
  /** Fokus, der nach dem nächsten Rendern gesetzt wird. */
  const pendingFocus = useRef<(() => void) | null>(null);

  const focusByKey = (key: string) =>
    rootRef.current
      ?.querySelector<HTMLElement>(`[data-focus-key="${key}"]`)
      ?.focus();

  useEffect(() => {
    const run = pendingFocus.current;
    pendingFocus.current = null;
    run?.();
  });

  const toggleParticipantLibrary = (anchor: LibraryAnchor) => {
    if (showParticipantLibrary && libraryAnchor === anchor) {
      setShowParticipantLibrary(false);
      return;
    }
    setLibraryAnchor(anchor);
    setShowParticipantLibrary(true);
  };

  const openParticipant = (
    index: number | null,
    returnKey: string = index === null ? "" : participantFocusKey(index),
  ) => {
    if (index !== null) {
      // Safari fokussiert angeklickte Knöpfe nicht, sondern den nächsten
      // fokussierbaren Vorfahren (`main`) — nur ein Element aus dieser Liste
      // taugt als Rückweg, sonst bleibt der Schlüssel.
      const active = document.activeElement;
      sheetReturn.current = {
        element:
          active instanceof HTMLElement && rootRef.current?.contains(active)
            ? active
            : null,
        key: returnKey,
      };
    } else if (editingIndex !== null && sheetReturn.current) {
      const { element, key } = sheetReturn.current;
      sheetReturn.current = null;
      pendingFocus.current = () => {
        if (element?.isConnected) element.focus();
        else focusByKey(key);
      };
    }
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
      setDoneFailures((n) => n + 1);
      return;
    }
    openParticipant(null);
  };

  /**
   * Vorbelegung für eine neue Person: die erste Kategorie, die für sie noch
   * frei ist. Vorher war es stur die erste — ohne Warteliste stand eine
   * ausgebuchte Kategorie dann gesperrt und zugleich gewählt da, mit
   * Warteliste landete die Anmeldung unbemerkt darauf. Sind alle voll, bleibt
   * es bei der ersten; die Kennzeichnung sagt dann, was los ist.
   */
  const defaultPriceOptionId = (): string | undefined => {
    const taken = registrationData.participants.map((p) => p.priceOptionId);
    const free = course.priceOptions.find(
      (option) =>
        !isPriceOptionFullFor({
          priceOptionId: option.id,
          otherParticipantPriceOptionIds: taken,
          priceOptions: course.priceOptions,
          capacityByPriceOption,
        }),
    );
    return (free ?? course.priceOptions[0])?.id;
  };

  const addParticipant = () => {
    if (!course.priceOptions || course.priceOptions.length === 0) {
      console.error("Course price options are not defined.");
      return;
    }
    const firstPriceOption = defaultPriceOptionId();
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
          priceOptionId: firstPriceOption,
          customFields: {},
          siblingGroupId: undefined,
        },
      ],
    });
    // A blank card has nothing to read, so go straight to the fields. The
    // prefilled routes below don't, since their card already says who it is.
    openParticipant(
      registrationData.participants.length,
      ADD_PARTICIPANT_FOCUS_KEY,
    );
  };

  const addMyselfAsParticipant = () => {
    if (!course.priceOptions || course.priceOptions.length === 0) {
      console.error("Course price options are not defined.");
      return;
    }
    const firstPriceOption = defaultPriceOptionId();
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
          priceOptionId: priceOptionForBirthDate(
            currentUser?.birthDate,
            firstPriceOption,
          ),
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
    const firstPriceOption = defaultPriceOptionId();
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
          priceOptionId: priceOptionForBirthDate(
            saved.birthDate,
            firstPriceOption,
          ),
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
    const remaining = registrationData.participants.length - 1;
    // Der Entfernen-Knopf verschwindet mit der Karte; der Fokus geht zur
    // Karte, die nachrückt, sonst zur vorigen, sonst zu „Hinzufügen“.
    pendingFocus.current = () =>
      focusByKey(
        remaining > 0
          ? participantFocusKey(Math.min(index, remaining - 1))
          : ADD_PARTICIPANT_FOCUS_KEY,
      );
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

    // Ein neues Geburtsdatum kann die gewählte Kategorie aus ihrer
    // Altersgrenze fallen lassen.
    const target = updated[index];
    if (field === "birthDate" && target) {
      target.priceOptionId = priceOptionForBirthDate(
        target.birthDate,
        target.priceOptionId,
      );
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

  // Three labelled buttons need ~376px and a phone card offers ~300, so they
  // cannot share one row without labels too terse to read. Rather than let
  // them wrap into a ragged second line, they are laid out as a deliberate
  // 2-up grid with the primary spanning both — and collapse to a single row
  // from sm: up, where the width is there.
  const ADD_BUTTON_GROUP =
    "grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center";
  const ADD_BUTTON_BASE =
    "semi-condensed inline-flex h-11 w-full items-center justify-center gap-1.5 px-3 text-xs font-semibold transition-colors sm:w-auto sm:gap-2 sm:px-4 sm:text-sm";
  const ADD_BUTTON_SECONDARY =
    "border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night border-2";

  /**
   * Rendered above and below the list, so adding a tenth person does not mean
   * scrolling back to the header. `anchor` decides which of the two triggers
   * the library popup hangs off — they share one open flag.
   */
  const renderActionButtons = (anchor: LibraryAnchor) => (
    <>
      {currentUser && (
        <div className="relative w-full sm:w-auto">
          <button
            type="button"
            onClick={() => toggleParticipantLibrary(anchor)}
            className={cn(ADD_BUTTON_BASE, ADD_BUTTON_SECONDARY)}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            Aus Bibliothek
          </button>
          <ParticipantLibraryPopup
            isOpen={showParticipantLibrary && libraryAnchor === anchor}
            onClose={() => setShowParticipantLibrary(false)}
            savedParticipants={savedParticipantsQuery.data}
            onLoadParticipant={loadSavedParticipant}
          />
        </div>
      )}
      {currentUser && (
        <button
          type="button"
          onClick={addMyselfAsParticipant}
          className={cn(ADD_BUTTON_BASE, ADD_BUTTON_SECONDARY)}
        >
          <UserIcon className="h-4 w-4 shrink-0" />
          Mich selbst
        </button>
      )}
      <button
        type="button"
        onClick={addParticipant}
        data-focus-key={
          anchor === "top" ? ADD_PARTICIPANT_FOCUS_KEY : undefined
        }
        className={cn(
          ADD_BUTTON_BASE,
          "bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper col-span-2",
        )}
      >
        <Plus className="h-4 w-4 shrink-0" aria-hidden />
        Hinzufügen
      </button>
    </>
  );

  /*
   * Ohne Preiskategorie kann sich niemand anmelden: Der Server verlangt für
   * jede Person eine Kategorie (`priceOptionId`). Bisher tat „Hinzufügen“ in
   * diesem Fall schlicht nichts — die Begründung stand nur in der
   * Entwicklerkonsole, „Weiter“ blieb gesperrt, und niemand erfuhr, warum.
   * Betroffen sind im Bestand fünf freigegebene Kurse.
   */
  if (!course.priceOptions || course.priceOptions.length === 0) {
    return (
      <Note tone="error" title="Anmeldung noch nicht möglich" titleAs="h3">
        <p>
          Für diesen Kurs sind noch keine Preiskategorien hinterlegt, und ohne
          sie lässt sich niemand anmelden. Bitte wenden Sie sich an das
          Posaunenwerk.
        </p>
      </Note>
    );
  }

  /**
   * Ausgebucht für die Person im Fenster — die übrigen Personen dieser
   * Anmeldung in derselben Kategorie zählen mit. Gekennzeichnet wie auf der
   * Bearbeiten-Seite; gesperrt nur, wo der Server ablehnen würde: ohne
   * Warteliste. Mit Warteliste kommt die Anmeldung darauf, und das Kursteam
   * darf überbuchen.
   */
  const priceOptionFull = (optionId: string) =>
    editingIndex !== null &&
    isPriceOptionFullFor({
      priceOptionId: optionId,
      otherParticipantPriceOptionIds: registrationData.participants
        .filter((_, i) => i !== editingIndex)
        .map((p) => p.priceOptionId),
      priceOptions: course.priceOptions,
      capacityByPriceOption,
    });

  return (
    <div ref={rootRef} className="flex flex-col">
      {/* Actions live in the header, like the edit page. They used to sit in a
          bordered "Weitere Teilnehmer" panel wedged between the description
          and the list — a box and a heading around what is really one button. */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Heading
            as="h3"
            size="list"
            id={headingId}
            tabIndex={-1}
            className="text-lg sm:text-[1.375rem]"
          >
            Teilnehmer
            {hasParticipants
              ? ` (${registrationData.participants.length})`
              : ""}
          </Heading>
          <p className="text-dark dark:text-night-muted mt-1 text-sm">
            {hasParticipants
              ? "Zum Bearbeiten auf eine Person tippen."
              : "Fügen Sie alle Personen hinzu, die Sie für diesen Lehrgang anmelden möchten."}
          </p>
        </div>
        {hasParticipants ? (
          <div
            className={cn(ADD_BUTTON_GROUP, "w-full sm:w-auto sm:justify-end")}
          >
            {renderActionButtons("top")}
          </div>
        ) : null}
      </div>

      <div className="flex-1">
        {!hasParticipants ? (
          <div className="border-rule dark:border-night-rule border border-dashed px-4 py-8 text-center sm:py-9">
            <Users
              className="text-dark dark:text-night-muted mx-auto mb-2 h-9 w-9"
              aria-hidden
            />
            <p className="text-ink dark:text-night-text text-sm font-medium">
              Noch keine Teilnehmer
            </p>
            <p className="text-dark dark:text-night-muted mx-auto mt-1 mb-5 max-w-sm text-xs">
              {currentUser
                ? "Übernehmen Sie Daten aus Ihrer Bibliothek, tragen Sie sich selbst ein oder legen Sie eine neue Person an."
                : "Legen Sie eine neue Teilnehmerperson an."}
            </p>
            <div className={cn(ADD_BUTTON_GROUP, "sm:justify-center")}>
              {renderActionButtons("top")}
            </div>
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
                focusKey={participantFocusKey(index)}
                onSaveToLibrary={
                  currentUser ? () => saveParticipant(index) : undefined
                }
                saveToLibraryPending={saveParticipantMutation.isPending}
              />
            ))}

            {/* Same group again once the list is long, so the tenth
                participant can be followed by an eleventh without scrolling
                back up. A dashed row rather than a second solid toolbar: it
                reads as the end of the list. */}
            {registrationData.participants.length >= REPEAT_ACTIONS_FROM ? (
              <div
                className={cn(
                  ADD_BUTTON_GROUP,
                  "border-rule dark:border-night-rule border border-dashed p-3 sm:justify-center",
                )}
              >
                {renderActionButtons("bottom")}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Sibling Discount Option */}
      {course.allowSiblingDiscount &&
        registrationData.participants.length > 1 &&
        hasSiblingGroups && (
          <Note tone="important" className="mt-6">
            <Checkbox
              id="sibling-discount-applied"
              checked={!!registrationData.siblingDiscountApplied}
              onChange={(e) =>
                setRegistrationData({
                  ...registrationData,
                  siblingDiscountApplied: e.target.checked,
                })
              }
            >
              <span className="font-semibold">
                Geschwisterkindrabatt beantragen
              </span>
              <span className="mt-1 block text-sm">
                Sie erhalten 20% Rabatt auf die Teilnahmegebühr jedes weiteren
                Geschwisterkindes ab dem zweiten Kind. Der Rabatt muss noch
                bestätigt werden.
              </span>
              {registrationData.siblingDiscountApplied &&
                calculateDiscountAmount(registrationData, course) > 0 && (
                  <span className="mt-2 block text-sm font-semibold">
                    Ersparnis:{" "}
                    {formatEuro(
                      calculateDiscountAmount(registrationData, course),
                    )}
                  </span>
                )}
              {siblingDiscountError && (
                <span className="mt-2 block text-sm">
                  {siblingDiscountError}
                </span>
              )}
            </Checkbox>
          </Note>
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
            priceOptionField={{
              isOptionDisabled: (optionId) =>
                !staffMode &&
                !course.allowWaitingList &&
                priceOptionFull(optionId),
              getOptionSuffix: (optionId) =>
                priceOptionFull(optionId) ? " (ausgebucht)" : "",
              ageReferenceDate: course.startDate,
              allowAgeMismatch: staffMode,
            }}
            focusProblemSignal={doneFailures}
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
