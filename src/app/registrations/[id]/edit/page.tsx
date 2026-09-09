"use client";

import { useState, useEffect, useRef } from "react";
import { ParticipantCard } from "@/app/_components/events/course-registration-form/participant-card";
import { ParticipantEditor } from "@/app/_components/events/course-registration-form/participant-editor";
import { ParticipantSheet } from "@/app/_components/events/course-registration-form/participant-sheet";
import {
  isRequiredCustomFieldEmpty,
  normalizeParticipantCustomFieldsValues,
} from "@/lib/course-custom-fields";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  useRegistrationAccessToken,
  withAccessToken,
} from "@/lib/registration-access";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { RegistrationStatus } from "~/generated/prisma/enums";
import { getErrorMessage } from "@/lib/utils";
import { useToast } from "@/app/_components/ui/toast";
import { CircleXIcon, PlusIcon, Info, Users } from "lucide-react";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import {
  computeSiblingDiscounts,
  hasDiscountEligibleSiblingGroup,
  roundMoney,
} from "@/lib/sibling-discount";
import { resolveParticipantPriceOption } from "@/lib/course-price-options";

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  /** Null on a participant just added here, until a date is picked. */
  birthDate: Date | null;
  city: string;
  instrument: string | null;
  priceOptionId: string | null;
  customFields: unknown;
  siblingGroupId?: string | null;
  isNew?: boolean;
  isDeleted?: boolean;
}

/** German names for the required participant fields, for the "missing" line. */
const PARTICIPANT_FIELD_LABELS: Record<string, string> = {
  firstName: "Vorname",
  lastName: "Nachname",
  birthDate: "Geburtsdatum",
  city: "Wohnort",
  priceOptionId: "Preisoption",
};

/** Only allow redirecting to dashboard paths to avoid open redirects */
function getReturnToPath(searchParams: URLSearchParams): string | null {
  const returnTo = searchParams.get("returnTo");
  if (!returnTo || typeof returnTo !== "string") return null;
  const path = returnTo.startsWith("/") ? returnTo : `/${returnTo}`;
  if (!path.startsWith("/dashboard")) return null;
  return path;
}

export default function EditRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { data: session, isPending: sessionLoading } = useSession();
  const registrationId = params.id as string;
  const utils = api.useUtils();
  const returnTo = getReturnToPath(searchParams);
  const accessToken = useRegistrationAccessToken();
  // Magic-link visitors have no account area to navigate back into.
  const isGuestAccess = !!accessToken;
  const backHref =
    returnTo ??
    (isGuestAccess
      ? withAccessToken(`/registrations/${registrationId}`, accessToken)
      : "/registrations");

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelError, setCancelError] = useState("");
  /** Id of the participant whose fields are open in the sheet. */
  const [editingParticipantId, setEditingParticipantId] = useState<
    string | null
  >(null);
  /** Set once "Fertig" is pressed on an incomplete participant. */
  const [doneAttempted, setDoneAttempted] = useState(false);
  const [siblingDiscountApplied, setSiblingDiscountApplied] = useState(false);
  const groupIdCounterRef = useRef(0);

  const [registrantPhone, setRegistrantPhone] = useState("");

  const [useSeparateBilling, setUseSeparateBilling] = useState(false);
  const [billingData, setBillingData] = useState({
    billingCompany: "",
    billingFirstName: "",
    billingLastName: "",
    billingStreet: "",
    billingZipCode: "",
    billingCity: "",
    billingEmail: "",
  });

  const { data: registration, isLoading: registrationLoading } =
    api.registrations.getById.useQuery(
      { id: registrationId, accessToken },
      { enabled: !!registrationId },
    );

  const { data: management, isLoading: managementLoading } =
    api.registrations.canManageRegistration.useQuery(
      { id: registrationId },
      { enabled: !!session?.user && !!registrationId },
    );

  const { data: availability, isLoading: availabilityLoading } =
    api.courses.getAvailableSlots.useQuery(
      { id: registration?.course?.id ?? "" },
      { enabled: !!registration?.course?.id },
    );

  const updateMutation = api.registrations.updateMyRegistration.useMutation({
    onSuccess: () => {
      toast.success("Die Änderungen wurden erfolgreich gespeichert.");
      setError("");

      void utils.registrations.getMyRegistrations.invalidate();
      void utils.registrations.getById.invalidate({ id: registrationId });

      setTimeout(() => {
        router.push(backHref);
      }, 1500);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
      setError(getErrorMessage(err));
      setIsSubmitting(false);
    },
  });

  const cancelMutation = api.registrations.cancel.useMutation({
    onSuccess: () => {
      setCancelModalOpen(false);
      setCancelError("");
      toast.success("Anmeldung erfolgreich storniert");
      void utils.registrations.getMyRegistrations.invalidate();
      router.push(backHref);
    },
    onError: (err) => {
      setCancelError(err.message || "Ein Fehler ist aufgetreten.");
      toast.error(err.message || "Ein Fehler ist aufgetreten.");
    },
  });

  const confirmCancel = () => {
    cancelMutation.mutate({ id: registrationId, accessToken });
  };

  useEffect(() => {
    if (!isGuestAccess && !sessionLoading && !session?.user) {
      router.push("/login");
    }
  }, [session, sessionLoading, router, isGuestAccess]);

  /* eslint-disable react-hooks/set-state-in-effect -- Initializing form state from server data is a valid pattern */
  useEffect(() => {
    if (registration?.participants && registration?.course?.priceOptions) {
      setParticipants(
        registration.participants.map((p) => {
          // Über die id, nicht über das Label: bei zwei gleichnamigen
          // Kategorien hätte der Label-Treffer die Anmeldung beim Speichern
          // stillschweigend auf die andere (und deren Preis) umgestellt.
          const priceOption = resolveParticipantPriceOption(
            p,
            registration.course.priceOptions,
          );
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { priceOption: priceOptionLabel, ...participantWithoutLabel } =
            p;
          return {
            ...participantWithoutLabel,
            birthDate: new Date(p.birthDate),
            priceOptionId: priceOption?.id ?? null,
            customFields: normalizeParticipantCustomFieldsValues(
              p.customFields as Record<string, unknown> | undefined,
              registration.course.customFields ?? [],
            ),
            siblingGroupId: p.siblingGroupId ?? null,
            isNew: false,
            isDeleted: false,
          };
        }),
      );
    }
  }, [registration]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- Initializing form state from server data is a valid pattern */
  useEffect(() => {
    if (registration) {
      setRegistrantPhone(registration.registrantPhone ?? "");
      setUseSeparateBilling(registration.useSeparateBilling);
      setSiblingDiscountApplied(registration.siblingDiscountApplied ?? false);
      setBillingData({
        billingCompany: registration.billingCompany ?? "",
        billingFirstName: registration.billingFirstName ?? "",
        billingLastName: registration.billingLastName ?? "",
        billingStreet: registration.billingStreet ?? "",
        billingZipCode: registration.billingZipCode ?? "",
        billingCity: registration.billingCity ?? "",
        billingEmail: registration.billingEmail ?? "",
      });
    }
  }, [registration]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const canEditRegistration = () => {
    if (!registration) return false;
    const now = new Date();
    const courseStart = new Date(registration.course.startDate);
    const deadline = registration.course.registrationDeadline
      ? new Date(registration.course.registrationDeadline)
      : null;

    if (courseStart <= now) return false;
    if (deadline && deadline <= now) return false;
    if (registration.registrationStatus === RegistrationStatus.CANCELLED)
      return false;

    return true;
  };

  const isOwner =
    isGuestAccess || registration?.registrantEmail === session?.user?.email;
  const isStaff = management?.isStaff ?? false;
  const canView = management?.canView ?? isOwner;
  const canEdit = management?.canEdit ?? (isOwner && canEditRegistration());
  const canCancel = management?.canCancel ?? isOwner;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const activeParticipants = participants.filter((p) => !p.isDeleted);

  const canAddParticipant = () => {
    if (!availability) return false;
    const currentActive = activeParticipants.length;
    const originalCount = registration?.participants.length ?? 0;
    const netNew = currentActive - originalCount;

    if (availability.availableSlots <= netNew && netNew > 0) {
      return false;
    }

    return true;
  };

  const isPriceOptionAvailable = (priceOptionId: string) => {
    if (
      !availability?.capacityByPriceOption ||
      !registration?.course?.priceOptions
    )
      return true;

    const priceOption = registration.course.priceOptions.find(
      (po) => po.id === priceOptionId,
    );
    if (!priceOption) return false;

    // Nach id nachschlagen: zwei Kategorien dürfen dasselbe Label tragen, und
    // über das Label bekam die eine die Restplätze der anderen.
    const available = availability.capacityByPriceOption[priceOption.id];
    if (available === undefined) return true;

    const currentUsage = activeParticipants.filter(
      (p) => p.priceOptionId === priceOptionId && p.isNew,
    ).length;

    return available > currentUsage;
  };

  const participantIdCounter = useRef(0);
  const addParticipant = () => {
    if (!registration?.course?.priceOptions) return;

    const availablePriceOption = registration.course.priceOptions.find((po) =>
      isPriceOptionAvailable(po.id),
    );

    participantIdCounter.current += 1;
    const id = `new-${participantIdCounter.current}`;
    setParticipants([
      ...participants,
      {
        id,
        firstName: "",
        lastName: "",
        // Not `new Date()`: today is never a valid birthdate, so prefilling it
        // handed the registrant an invalid value they had not entered.
        birthDate: null,
        city: "",
        instrument: null,
        priceOptionId: availablePriceOption?.id ?? null,
        customFields: {},
        isNew: true,
        isDeleted: false,
      },
    ]);
    openParticipant(id);
  };

  const removeParticipant = (participantId: string) => {
    if (activeParticipants.length <= 1) {
      setError(
        "Es muss mindestens ein Teilnehmer in der Anmeldung verbleiben.",
      );
      return;
    }

    if (editingParticipantId === participantId) openParticipant(null);
    setParticipants(
      participants.map((p) =>
        p.id === participantId ? { ...p, isDeleted: true } : p,
      ),
    );
    setError("");
  };

  const updateParticipant = (
    participantId: string,
    field: keyof Participant,
    value: unknown,
  ) => {
    setParticipants(
      participants.map((p) =>
        p.id === participantId ? { ...p, [field]: value } : p,
      ),
    );
  };

  const updateParticipantCustomFields = (
    participantId: string,
    customFields: Record<string, unknown>,
  ) => {
    setParticipants(
      participants.map((p) =>
        p.id === participantId ? { ...p, customFields } : p,
      ),
    );
  };

  const calculateOriginalPrice = () => {
    if (!registration?.course?.priceOptions) return 0;
    return activeParticipants.reduce((sum, p) => {
      const priceOption = registration.course.priceOptions.find(
        (po) => po.id === p.priceOptionId,
      );
      return sum + (priceOption?.price ?? 0);
    }, 0);
  };

  /**
   * Same shared rule the server applies when it saves the edit, so the price
   * shown here is the price that ends up on the registration.
   */
  const siblingDiscountInput = () =>
    activeParticipants.map((participant) => ({
      birthDate: participant.birthDate,
      siblingGroupId: participant.siblingGroupId,
      price:
        registration?.course?.priceOptions?.find(
          (p) => p.id === participant.priceOptionId,
        )?.price ?? 0,
    }));

  const calculateDiscountAmount = () => {
    if (
      !siblingDiscountApplied ||
      !registration?.course?.allowSiblingDiscount ||
      !registration?.course?.priceOptions
    )
      return 0;

    return computeSiblingDiscounts(siblingDiscountInput()).totalDiscount;
  };

  /** True when at least one sibling group has 2+ members. Required for the discount. */
  const hasEligibleSiblingGroupForDiscount =
    (registration?.course?.allowSiblingDiscount ?? false) &&
    hasDiscountEligibleSiblingGroup(activeParticipants);

  const calculateTotalPrice = () => {
    const original = calculateOriginalPrice();
    const discount = calculateDiscountAmount();
    return roundMoney(original - discount);
  };

  const linkSiblings = (participantId1: string, participantId2: string) => {
    const participant1 = activeParticipants.find(
      (p) => p.id === participantId1,
    );
    const participant2 = activeParticipants.find(
      (p) => p.id === participantId2,
    );
    if (!participant1 || !participant2) return;

    const updated = [...participants];
    const index1 = updated.findIndex((p) => p.id === participantId1);
    const index2 = updated.findIndex((p) => p.id === participantId2);
    if (index1 === -1 || index2 === -1) return;

    if (
      participant1.siblingGroupId &&
      participant1.siblingGroupId === participant2.siblingGroupId
    ) {
      updated[index1] = { ...participant1, siblingGroupId: null };
      updated[index2] = { ...participant2, siblingGroupId: null };
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
            p.id !== participant1.id
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
            p.id !== participant2.id
          ) {
            updated[idx] = { ...p, siblingGroupId: groupId };
          }
        });
      }
    }

    setParticipants(updated);
  };

  const hasSiblingGroups = activeParticipants.some((p) => p.siblingGroupId);

  /**
   * Required fields a participant is still missing, in the key vocabulary
   * `ParticipantEditor` uses for its red borders (`customField:<name>` for the
   * course's own fields).
   */
  const participantMissingFields = (participant: Participant): string[] => {
    const missing: string[] = [];
    if (!participant.firstName?.trim()) missing.push("firstName");
    if (!participant.lastName?.trim()) missing.push("lastName");
    if (!participant.birthDate) missing.push("birthDate");
    if (!participant.city?.trim()) missing.push("city");
    if (!participant.priceOptionId) missing.push("priceOptionId");

    const record =
      participant.customFields &&
      typeof participant.customFields === "object" &&
      !Array.isArray(participant.customFields)
        ? (participant.customFields as Record<string, unknown>)
        : {};
    for (const field of registration?.course.customFields ?? []) {
      if (
        field.isRequired &&
        isRequiredCustomFieldEmpty(field.fieldType, record[field.fieldName])
      ) {
        missing.push(`customField:${field.fieldName}`);
      }
    }
    return missing;
  };

  /**
   * One line describing what is wrong with a participant, or undefined when it
   * is complete. Computed on every render rather than only on submit, so the
   * card badges say which person still needs attention before you try to save.
   */
  const participantError = (participant: Participant): string | undefined => {
    if (participant.birthDate && participant.birthDate >= new Date()) {
      return "Geburtsdatum muss in der Vergangenheit liegen";
    }
    const missing = participantMissingFields(participant);
    if (missing.length === 0) return undefined;
    const names = missing.map(
      (key) =>
        PARTICIPANT_FIELD_LABELS[key] ?? key.slice("customField:".length),
    );
    return `Fehlende Pflichtfelder: ${names.join(", ")}`;
  };

  const siblingGroupSize = (participant: Participant) =>
    participant.siblingGroupId
      ? activeParticipants.filter(
          (p) => p.siblingGroupId === participant.siblingGroupId,
        ).length
      : 1;

  /**
   * The list split into sibling groups and lone participants, so members of a
   * group sit together instead of wherever they happen to fall in the list.
   *
   * A group takes the position of its first member, which keeps the rest of
   * the order as the registrant entered it. Display only — `participants`
   * keeps its own order for saving.
   */
  const participantBlocks: { key: string; members: Participant[] }[] = [];
  const placed = new Set<string>();
  for (const participant of activeParticipants) {
    if (placed.has(participant.id)) continue;
    const members = participant.siblingGroupId
      ? activeParticipants.filter(
          (p) => p.siblingGroupId === participant.siblingGroupId,
        )
      : [participant];
    members.forEach((m) => placed.add(m.id));
    participantBlocks.push({
      key: participant.siblingGroupId ?? participant.id,
      members,
    });
  }

  /** Display order, so the numbers on the cards read 1..n top to bottom. */
  const orderedParticipants = participantBlocks.flatMap(
    (block) => block.members,
  );

  const editingParticipant = editingParticipantId
    ? activeParticipants.find((p) => p.id === editingParticipantId)
    : undefined;

  const openParticipant = (id: string | null) => {
    setEditingParticipantId(id);
    setDoneAttempted(false);
  };

  /**
   * "Fertig" only closes a participant that is complete. On an incomplete one
   * it reveals what is missing and stays put — the X, the backdrop and Escape
   * still leave, so nobody is stuck with a half-filled form.
   */
  const finishEditing = () => {
    if (editingParticipant && participantError(editingParticipant)) {
      setDoneAttempted(true);
      return;
    }
    openParticipant(null);
  };

  const getParticipantDisplayName = (
    firstName: string,
    lastName: string,
    participantId?: string,
  ) => {
    const firstLetter = lastName.charAt(0).toUpperCase();
    const hasDuplicate = activeParticipants.some(
      (p) =>
        p.id !== participantId &&
        p.firstName === firstName &&
        p.lastName.charAt(0).toUpperCase() === firstLetter,
    );

    if (hasDuplicate) {
      return `${firstName} ${lastName}`;
    }
    return `${firstName} ${firstLetter}.`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    for (const p of activeParticipants) {
      if (
        !p.firstName ||
        !p.lastName ||
        !p.birthDate ||
        !p.city ||
        !p.priceOptionId
      ) {
        setError("Bitte fülle alle Pflichtfelder für jeden Teilnehmer aus.");
        setIsSubmitting(false);
        return;
      }

      const missingCustomFields =
        registration?.course.customFields
          ?.filter((field) => {
            if (!field.isRequired) return false;
            const record =
              p.customFields &&
              typeof p.customFields === "object" &&
              !Array.isArray(p.customFields)
                ? (p.customFields as Record<string, unknown>)
                : {};
            return isRequiredCustomFieldEmpty(
              field.fieldType,
              record[field.fieldName],
            );
          })
          .map((field) => field.fieldName) ?? [];

      if (missingCustomFields.length > 0) {
        setError(
          "Bitte fülle alle Pflichtfelder für jeden Teilnehmer aus (einschließlich Zusatzfelder).",
        );
        setIsSubmitting(false);
        return;
      }
    }

    if (useSeparateBilling) {
      if (
        !billingData.billingFirstName ||
        !billingData.billingLastName ||
        !billingData.billingStreet ||
        !billingData.billingZipCode ||
        !billingData.billingCity ||
        !billingData.billingEmail
      ) {
        setError("Bitte fülle alle Pflichtfelder der Rechnungsadresse aus.");
        setIsSubmitting(false);
        return;
      }
    }

    const participantsData = activeParticipants.map((p) => ({
      id: p.isNew ? undefined : p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      // Non-null by the required-field loop above, which returns early.
      birthDate: p.birthDate as Date,
      city: p.city,
      instrument: p.instrument ?? undefined,
      priceOptionId: p.priceOptionId || "", // Ensure priceOptionId is never undefined
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      customFields: p.customFields as any,
      siblingGroupId: p.siblingGroupId ?? undefined,
    }));

    updateMutation.mutate({
      id: registrationId,
      accessToken,
      participants: participantsData,
      registrantPhone: registrantPhone || undefined,
      useSeparateBilling,
      siblingDiscountApplied,
      ...(useSeparateBilling && {
        billingCompany: billingData.billingCompany || undefined,
        billingFirstName: billingData.billingFirstName,
        billingLastName: billingData.billingLastName,
        billingStreet: billingData.billingStreet,
        billingZipCode: billingData.billingZipCode,
        billingCity: billingData.billingCity,
        billingEmail: billingData.billingEmail,
      }),
    });
  };

  const waitingForManagement =
    !!session?.user && !!registrationId && managementLoading;
  if (
    sessionLoading ||
    registrationLoading ||
    waitingForManagement ||
    availabilityLoading
  ) {
    return (
      <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-dark dark:text-dark-text">Lädt...</div>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="max-w-md px-4 text-center">
          <h1 className="text-dark dark:text-dark-text mb-4 text-2xl font-bold">
            Anmeldung nicht gefunden
          </h1>
          {isGuestAccess ? (
            <>
              <p className="mb-4 text-gray-600 dark:text-gray-400">
                Dieser Zugangslink ist ungültig oder abgelaufen. Du kannst dir
                jederzeit einen neuen Link schicken lassen.
              </p>
              <Link
                href="/anmeldung-verwalten"
                className="text-primary hover:text-primary-dark"
              >
                Neuen Zugangslink anfordern
              </Link>
            </>
          ) : (
            <Link
              href={backHref}
              className="text-primary hover:text-primary-dark"
            >
              Zurück zur Übersicht
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <h1 className="text-dark dark:text-dark-text mb-4 text-2xl font-bold">
            Keine Berechtigung
          </h1>
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            Du kannst nur deine eigenen Anmeldungen oder Anmeldungen zu Kursen
            bearbeiten, für die du Admin, Kursleitung oder Ersteller:in bist.
          </p>
          <Link
            href={backHref}
            className="text-primary hover:text-primary-dark"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <h1 className="text-dark dark:text-dark-text mb-4 text-2xl font-bold">
            Bearbeitung nicht möglich
          </h1>
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            Diese Anmeldung kann nicht mehr bearbeitet werden, da die Frist
            abgelaufen ist oder der Kurs bereits begonnen hat.
          </p>
          <Link
            href={backHref}
            className="text-primary hover:text-primary-dark"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-secondary dark:bg-dark-background-secondary min-h-[calc(100vh-4rem)] px-4 py-8">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          {isStaff && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/25">
              <Info className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Du bearbeitest diese Anmeldung als Kursleitung / Admin.
              </p>
            </div>
          )}
          <nav className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Link
              href={backHref}
              className="hover:text-primary transition-colors"
            >
              {returnTo
                ? "Teilnehmer"
                : isGuestAccess
                  ? "Meine Anmeldung"
                  : "Meine Anmeldungen"}
            </Link>
            <span>/</span>
            <span className="text-dark dark:text-dark-text">Bearbeiten</span>
          </nav>
          <h1 className="text-dark dark:text-dark-text text-3xl font-bold">
            Anmeldung bearbeiten
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {registration.course.title}
          </p>
        </div>

        {/* Course Info Card */}
        <div className="dark:bg-dark-surface dark:border-dark-border mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-dark dark:text-dark-text mb-4 text-lg font-semibold">
            Kursdetails
          </h2>
          <div className="grid gap-4 text-sm md:grid-cols-2">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Zeitraum:
              </span>
              <p className="text-gray-600 dark:text-gray-400">
                {formatDate(registration.course.startDate)} -{" "}
                {formatDate(registration.course.endDate)}
              </p>
            </div>
            {registration.course.location && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Ort:
                </span>
                <p className="text-gray-600 dark:text-gray-400">
                  {registration.course.location.name},{" "}
                  {registration.course.location.city}
                </p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Verfügbare Plätze:
              </span>
              <p
                className={`${availability?.isFull ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
              >
                {availability?.availableSlots ?? "?"} von{" "}
                {availability?.totalCapacity ?? "?"}
              </p>
            </div>
            {registration.course.registrationDeadline && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Anmeldefrist:
                </span>
                <p className="text-gray-600 dark:text-gray-400">
                  {formatDate(registration.course.registrationDeadline)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <p className="text-sm text-green-800 dark:text-green-300">
              {success}
            </p>
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit}>
          {/* Registrant Info Section */}
          <div className="dark:bg-dark-surface dark:border-dark-border mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-dark dark:text-dark-text mb-4 text-lg font-semibold">
              Anmelder
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-dark dark:text-dark-text mb-1 block text-sm font-medium">
                  Name
                </label>
                <input
                  type="text"
                  value={`${registration.registrantFirstName} ${registration.registrantLastName}`}
                  disabled
                  className="dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 opacity-60"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {isGuestAccess ? (
                    "Name und Adresse können nur vom Kursteam geändert werden – melde dich dafür bitte bei uns"
                  ) : (
                    <>
                      Name und Adresse können in den{" "}
                      <Link
                        href="/settings"
                        className="text-primary hover:underline"
                      >
                        Einstellungen
                      </Link>{" "}
                      geändert werden
                    </>
                  )}
                </p>
              </div>
              <div>
                <label className="text-dark dark:text-dark-text mb-1 block text-sm font-medium">
                  E-Mail
                </label>
                <input
                  type="email"
                  value={registration.registrantEmail}
                  disabled
                  className="dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 opacity-60"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-dark dark:text-dark-text mb-1 block text-sm font-medium">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={registrantPhone}
                  onChange={(e) => setRegistrantPhone(e.target.value)}
                  maxLength={50}
                  pattern="[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*"
                  title="Bitte geben Sie eine gültige Telefonnummer ein"
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-1 focus:outline-none"
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          {/* Billing Address Section */}
          <div className="dark:bg-dark-surface dark:border-dark-border mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-dark dark:text-dark-text text-lg font-semibold">
                Rechnungsadresse
              </h2>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={useSeparateBilling}
                  onChange={(e) => setUseSeparateBilling(e.target.checked)}
                  className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Abweichende Rechnungsadresse
                </span>
              </label>
            </div>

            {useSeparateBilling ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="text-dark dark:text-dark-text mb-1 block text-sm font-medium">
                    Firma/Organisation
                  </label>
                  <input
                    type="text"
                    value={billingData.billingCompany}
                    onChange={(e) =>
                      setBillingData({
                        ...billingData,
                        billingCompany: e.target.value,
                      })
                    }
                    maxLength={200}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-1 focus:outline-none"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="text-dark dark:text-dark-text mb-1 block text-sm font-medium">
                    Vorname *
                  </label>
                  <input
                    type="text"
                    value={billingData.billingFirstName}
                    onChange={(e) =>
                      setBillingData({
                        ...billingData,
                        billingFirstName: e.target.value,
                      })
                    }
                    maxLength={100}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-1 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-dark dark:text-dark-text mb-1 block text-sm font-medium">
                    Nachname *
                  </label>
                  <input
                    type="text"
                    value={billingData.billingLastName}
                    onChange={(e) =>
                      setBillingData({
                        ...billingData,
                        billingLastName: e.target.value,
                      })
                    }
                    maxLength={100}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-1 focus:outline-none"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-dark dark:text-dark-text mb-1 block text-sm font-medium">
                    Straße und Hausnummer *
                  </label>
                  <input
                    type="text"
                    value={billingData.billingStreet}
                    onChange={(e) =>
                      setBillingData({
                        ...billingData,
                        billingStreet: e.target.value,
                      })
                    }
                    maxLength={200}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-1 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-dark dark:text-dark-text mb-1 block text-sm font-medium">
                    PLZ *
                  </label>
                  <input
                    type="text"
                    value={billingData.billingZipCode}
                    onChange={(e) =>
                      setBillingData({
                        ...billingData,
                        billingZipCode: e.target.value,
                      })
                    }
                    maxLength={20}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-1 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-dark dark:text-dark-text mb-1 block text-sm font-medium">
                    Stadt *
                  </label>
                  <input
                    type="text"
                    value={billingData.billingCity}
                    onChange={(e) =>
                      setBillingData({
                        ...billingData,
                        billingCity: e.target.value,
                      })
                    }
                    maxLength={100}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-1 focus:outline-none"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-dark dark:text-dark-text mb-1 block text-sm font-medium">
                    E-Mail für Rechnung *
                  </label>
                  <input
                    type="email"
                    value={billingData.billingEmail}
                    onChange={(e) =>
                      setBillingData({
                        ...billingData,
                        billingEmail: e.target.value,
                      })
                    }
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-1 focus:outline-none"
                    required
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Die Rechnung wird an die E-Mail-Adresse des Anmelders gesendet.
              </p>
            )}
          </div>

          {/* Participants: a flat list of cards. The old markup nested a
              max-h/overflow-y-auto box inside the page, which on a phone
              trapped the scroll and pushed the save bar out of reach. */}
          <div className="dark:bg-dark-surface dark:border-dark-border mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-dark dark:text-dark-text text-lg font-semibold">
                  Teilnehmer ({activeParticipants.length})
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Zum Bearbeiten auf eine Person tippen.
                </p>
              </div>
              <button
                type="button"
                onClick={addParticipant}
                disabled={!canAddParticipant()}
                className="bg-primary hover:bg-primary-dark inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlusIcon className="h-5 w-5 shrink-0" />
                Hinzufügen
              </button>
            </div>

            <div className="space-y-4">
              {participantBlocks.map((block) => {
                const isGroup = block.members.length > 1;
                const cards = block.members.map((participant) => (
                  <ParticipantCard
                    key={participant.id}
                    participant={participant}
                    index={orderedParticipants.findIndex(
                      (p) => p.id === participant.id,
                    )}
                    priceOptions={registration.course.priceOptions}
                    validationError={participantError(participant)}
                    siblingGroupSize={siblingGroupSize(participant)}
                    badge={participant.isNew ? "Neu" : undefined}
                    canRemove={activeParticipants.length > 1}
                    onEdit={() => openParticipant(participant.id)}
                    onRemove={() => removeParticipant(participant.id)}
                  />
                ));

                if (!isGroup) return <div key={block.key}>{cards}</div>;

                // Tighter spacing inside a group than between blocks, plus one
                // caption underneath — enough to read as a unit without
                // wrapping the cards in yet another bordered box.
                const eligible = hasDiscountEligibleSiblingGroup(block.members);
                return (
                  <div key={block.key}>
                    <div className="space-y-2">{cards}</div>
                    <p className="mt-2 flex items-start gap-1.5 pl-1 text-xs text-green-700 dark:text-green-400">
                      <Users className="mt-px h-3.5 w-3.5 shrink-0" />
                      <span>
                        Geschwistergruppe:{" "}
                        {block.members
                          .map((p) =>
                            getParticipantDisplayName(
                              p.firstName,
                              p.lastName,
                              p.id,
                            ),
                          )
                          .join(", ")}
                        {registration.course.allowSiblingDiscount &&
                          (eligible
                            ? " — 20% Rabatt ab dem zweiten Kind"
                            : " — Rabatt erst mit vollständigen Angaben")}
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Sibling Discount Option: only if at least one group has 2+ siblings */}
            {registration.course.allowSiblingDiscount &&
              activeParticipants.length > 1 &&
              hasSiblingGroups && (
                <div className="mt-6 space-y-3">
                  {hasEligibleSiblingGroupForDiscount ? (
                    <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={siblingDiscountApplied}
                          onChange={(e) =>
                            setSiblingDiscountApplied(e.target.checked)
                          }
                          className="mt-1 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-2 focus:ring-green-500"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            Geschwisterkindrabatt beantragen
                          </div>
                          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                            Sie erhalten 20% Rabatt auf die Teilnahmegebühr
                            jedes weiteren Geschwisterkindes ab dem zweiten
                            Kind. Der Rabatt muss noch bestätigt werden.
                          </p>
                          {siblingDiscountApplied &&
                            calculateDiscountAmount() > 0 && (
                              <div className="mt-2 text-sm font-semibold text-green-700 dark:text-green-400">
                                Ersparnis:{" "}
                                {calculateDiscountAmount().toFixed(2)} €
                              </div>
                            )}
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        Für den Geschwisterkindrabatt müssen mindestens zwei
                        Geschwister in einer Geschwistergruppe zusammengefasst
                        sein.
                      </p>
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* Price Summary: the breakdown gets the full card width on a phone
              and a fixed column from sm: up. Squeezed into half the card it
              wrapped the discount label onto three lines and broke the amount
              itself across two. */}
          <div className="dark:bg-dark-surface dark:border-dark-border mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-dark dark:text-dark-text text-lg font-semibold">
                  Gesamtpreis
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Basierend auf {activeParticipants.length} Teilnehmer
                  {activeParticipants.length !== 1 && "n"}
                </p>
              </div>
              <div className="w-full sm:w-72 sm:shrink-0">
                {siblingDiscountApplied &&
                registration.course.allowSiblingDiscount &&
                calculateDiscountAmount() > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Zwischensumme
                      </span>
                      <span className="shrink-0 whitespace-nowrap text-gray-900 line-through dark:text-gray-100">
                        {calculateOriginalPrice().toFixed(2)} €
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-green-600 dark:text-green-400">
                        Geschwisterkindrabatt
                        <span className="block text-xs">
                          20% pro weiteres Kind
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold whitespace-nowrap text-green-600 dark:text-green-400">
                        -{calculateDiscountAmount().toFixed(2)} €
                      </span>
                    </div>
                    <div className="dark:border-dark-border flex items-baseline justify-between gap-3 border-t border-gray-200 pt-2">
                      <span className="text-dark dark:text-dark-text text-sm font-semibold">
                        Gesamt
                      </span>
                      <span className="text-primary text-2xl font-bold whitespace-nowrap sm:text-3xl">
                        {calculateTotalPrice().toFixed(2)} €
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      * Der Rabatt muss noch bestätigt werden
                    </p>
                  </div>
                ) : (
                  <p className="text-primary text-2xl font-bold whitespace-nowrap sm:text-right sm:text-3xl">
                    {calculateTotalPrice().toFixed(2)} €
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions: sticky so "Speichern" stays reachable however many
              participants the registration has. */}
          <div className="dark:border-dark-border dark:bg-dark-background-secondary sticky bottom-0 z-20 -mx-4 flex flex-col gap-3 border-t border-gray-200 bg-gray-50/90 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:mx-0 sm:flex-row sm:justify-between sm:rounded-lg sm:border sm:px-4">
            {canCancel ? (
              <button
                type="button"
                onClick={() => setCancelModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-6 py-3 font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-700 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <CircleXIcon className="h-5 w-5" />
                Anmeldung stornieren
              </button>
            ) : (
              <div />
            )}
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href={backHref}
                className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text dark:hover:bg-dark-background-secondary rounded-lg border border-gray-300 bg-white px-6 py-3 text-center font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Abbrechen
              </Link>
              <button
                type="submit"
                disabled={!canEdit || isSubmitting}
                className="bg-primary hover:bg-primary-dark rounded-lg px-6 py-3 font-semibold text-white transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Speichert..." : "Änderungen speichern"}
              </button>
            </div>
          </div>
        </form>

        {editingParticipant ? (
          <ParticipantSheet
            title={`Teilnehmer ${
              orderedParticipants.findIndex(
                (p) => p.id === editingParticipant.id,
              ) + 1
            }`}
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
              priceOptions={registration.course.priceOptions}
              customFields={registration.course.customFields ?? []}
              participant={editingParticipant}
              onChange={(field, value) => {
                if (field === "customFields") {
                  updateParticipantCustomFields(
                    editingParticipant.id,
                    value as Record<string, unknown>,
                  );
                } else if (field === "instrument") {
                  // Kept nullable in the database, so an emptied field must not
                  // save as "".
                  updateParticipant(
                    editingParticipant.id,
                    "instrument",
                    (value as string) || null,
                  );
                } else if (field === "birthDate") {
                  updateParticipant(
                    editingParticipant.id,
                    "birthDate",
                    value instanceof Date ? value : null,
                  );
                } else {
                  updateParticipant(
                    editingParticipant.id,
                    field as keyof Participant,
                    value,
                  );
                }
              }}
              missingFields={participantMissingFields(editingParticipant)}
              validationError={participantError(editingParticipant)}
              showProblems={doneAttempted}
              priceOptionField={{
                placeholderOption: true,
                isOptionDisabled: (optionId) =>
                  !editingParticipant.isNew || isPriceOptionAvailable(optionId)
                    ? false
                    : editingParticipant.priceOptionId !== optionId,
                getOptionSuffix: (optionId) => {
                  const isAvailable =
                    !editingParticipant.isNew ||
                    isPriceOptionAvailable(optionId);
                  const isCurrent =
                    editingParticipant.priceOptionId === optionId;
                  return !isAvailable && !isCurrent ? " (ausgebucht)" : "";
                },
              }}
              siblings={
                registration.course.allowSiblingDiscount &&
                activeParticipants.length > 1
                  ? {
                      candidates: activeParticipants
                        .filter((p) => p.id !== editingParticipant.id)
                        .map((other) => ({
                          key: other.id,
                          label: getParticipantDisplayName(
                            other.firstName,
                            other.lastName,
                            other.id,
                          ),
                          linked:
                            !!editingParticipant.siblingGroupId &&
                            editingParticipant.siblingGroupId ===
                              other.siblingGroupId,
                        })),
                      onToggle: (key) =>
                        linkSiblings(editingParticipant.id, key),
                      groupMembers: editingParticipant.siblingGroupId
                        ? activeParticipants
                            .filter(
                              (p) =>
                                p.id !== editingParticipant.id &&
                                p.siblingGroupId ===
                                  editingParticipant.siblingGroupId,
                            )
                            .map((p) =>
                              getParticipantDisplayName(
                                p.firstName,
                                p.lastName,
                                p.id,
                              ),
                            )
                        : [],
                    }
                  : undefined
              }
            />
          </ParticipantSheet>
        ) : null}

        {/* Cancel Confirmation Modal */}
        {cancelModalOpen && (
          <ScrollableModal>
            <ScrollableModalCard maxW="md">
              <ScrollableModalBody>
                <h3 className="text-dark dark:text-dark-text mb-4 text-lg font-bold">
                  Anmeldung stornieren?
                </h3>
                <p className="mb-6 text-gray-600 dark:text-gray-400">
                  Bist du sicher, dass du diese Anmeldung stornieren möchtest?
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
                {cancelError && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                    <p className="text-sm text-red-800 dark:text-red-300">
                      {cancelError}
                    </p>
                  </div>
                )}
              </ScrollableModalBody>
              <ScrollableModalFooter>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setCancelModalOpen(false);
                      setCancelError("");
                    }}
                    className="dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Zurück
                  </button>
                  <button
                    onClick={confirmCancel}
                    disabled={cancelMutation.isPending}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {cancelMutation.isPending
                      ? "Wird storniert..."
                      : "Stornieren"}
                  </button>
                </div>
              </ScrollableModalFooter>
            </ScrollableModalCard>
          </ScrollableModal>
        )}
      </div>
    </div>
  );
}
