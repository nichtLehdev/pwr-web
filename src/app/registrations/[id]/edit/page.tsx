"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
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
import { getErrorMessage, cn } from "@/lib/utils";
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
import { downPaymentForPriceOption } from "@/lib/course-down-payment";
import {
  ageOnDate,
  priceOptionAgeMismatchMessage,
  priceOptionAgeReferenceDate,
  priceOptionIdForAge,
} from "@/lib/course-price-option-age";
import { formatEuro } from "@/lib/invoice-document";
import PublicPage from "@/app/_components/general/public-page";
import { headMeta } from "@/app/_components/programmheft/page-head";
import { PageSection } from "@/app/_components/programmheft/page-section";
import { Heading } from "@/app/_components/programmheft/section-head";
import { Note } from "@/app/_components/programmheft/note";
import {
  FieldLabel,
  Checkbox,
  fieldControlClasses,
} from "@/app/_components/programmheft/field";
import { ValueTable } from "@/app/_components/programmheft/value-table";
import { formatBerlin } from "@/lib/berlin-time";

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

/**
 * Schaltflächen-Stimmen des Programmhefts, lokal wiederholt wie auf den
 * übrigen öffentlichen Formularseiten (z. B. /registrations).
 */
const BTN_PRIMARY =
  "bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper semi-condensed inline-flex min-h-12 items-center justify-center gap-2 px-6 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
const BTN_OUTLINE =
  "border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night semi-condensed inline-flex min-h-12 items-center justify-center gap-2 border-2 px-6 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

/** Bezeichnung über einem schreibgeschützten Wert (wie `headMeta.label` als Kopf über Meta-Zeilen). */
function InfoField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className={headMeta.label}>{label}</p>
      <p className="text-ink dark:text-night-text mt-1">{children}</p>
    </div>
  );
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

  const { data: publicAvailability, isLoading: availabilityLoading } =
    api.courses.getAvailableSlots.useQuery(
      { id: registration?.course?.id ?? "" },
      { enabled: !!registration?.course?.id },
    );
  // Die öffentlichen Plätze sind die, die eine neue Anmeldung nutzen dürfte —
  // ohne die, die Wartende nutzen könnten. Das Kursteam darf freie Plätze trotzdem
  // vergeben (etwa zwei Anmeldungen zusammenführen) und sieht deshalb die
  // tatsächlichen; der Server hält es genauso.
  const { data: teamOverview, isLoading: teamOverviewLoading } =
    api.registrations.getWaitlistOverview.useQuery(
      { courseId: registration?.course?.id ?? "" },
      {
        enabled: !!registration?.course?.id && !!management?.isStaff,
        staleTime: 0,
      },
    );
  const availability =
    management?.isStaff && teamOverview
      ? teamOverview.seats
      : publicAvailability;

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

  // Mit Anzahlung bleibt die Teilnehmerzahl dem Kursteam vorbehalten — und
  // hängt der Betrag an der Kategorie, auch die Kategorien. Eine Anmeldung ohne
  // Anzahlung darf keine Kategorie mit Anzahlung dazubuchen. Der Server prüft
  // dasselbe (registrantEditViolation).
  const hasDownPayment = !!registration?.downPaymentAmount;
  const participantsLocked = !isStaff && hasDownPayment;
  const ticketsLocked =
    participantsLocked && registration?.course.downPaymentMode === "TICKET";
  const optionNeedsStaff = (optionId: string) =>
    !isStaff &&
    !hasDownPayment &&
    !!registration &&
    downPaymentForPriceOption(registration.course, optionId) > 0;

  const formatDate = (date: Date) => {
    return formatBerlin(date, "datumZweistellig");
  };

  const activeParticipants = participants.filter((p) => !p.isDeleted);

  // Plätze belegt nur eine bestätigte Anmeldung. Auf der Warteliste darf sie
  // wachsen und jede Kategorie wählen — die Plätze prüft erst das Nachrücken.
  // Der Server hält es genauso.
  const holdsSeats =
    registration?.registrationStatus === RegistrationStatus.CONFIRMED;

  const canAddParticipant = () => {
    if (!availability) return false;
    if (participantsLocked) return false;
    if (!holdsSeats) return true;
    const currentActive = activeParticipants.length;
    const originalCount = registration?.participants.length ?? 0;
    const netNew = currentActive - originalCount;

    if (availability.availableSlots <= netNew && netNew > 0) {
      return false;
    }

    return true;
  };

  const isPriceOptionAvailable = (priceOptionId: string) => {
    if (!holdsSeats) return true;
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

    const availablePriceOption = registration.course.priceOptions.find(
      (po) => isPriceOptionAvailable(po.id) && !optionNeedsStaff(po.id),
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
      participants.map((p) => {
        if (p.id !== participantId) return p;
        const next = { ...p, [field]: value };

        // Ein neues Geburtsdatum kann die gewählte Kategorie aus ihrer
        // Altersgrenze fallen lassen. Bleibt genau eine passende übrig, wird
        // sie gesetzt; sonst bleibt die bisherige und die Prüfung meldet es.
        //
        // Nicht für das Kursteam: dort ist eine Kategorie außerhalb der
        // Altersgrenze eine Absicht, und ein korrigierter Tippfehler im
        // Geburtsdatum soll nicht stillschweigend den Preis ändern.
        if (field === "birthDate" && !isStaff && registration?.course) {
          next.priceOptionId =
            priceOptionIdForAge(
              registration.course.priceOptions,
              ageOnDate(
                next.birthDate,
                priceOptionAgeReferenceDate(registration.course),
              ),
              next.priceOptionId,
            ) ?? next.priceOptionId;
        }

        return next;
      }),
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
   * Altersgrenze der gewählten Preiskategorie, oder undefined wenn sie passt.
   * Für das Kursteam immer undefined: es darf eine Kategorie bewusst entgegen
   * ihrer Grenze vergeben, genau wie der Server es zulässt.
   */
  const participantAgeError = (
    participant: Participant,
  ): string | undefined => {
    if (isStaff || !registration?.course) return undefined;

    // Wer in dieser Kategorie schon angemeldet ist, bleibt es — auch wenn ihre
    // Altersgrenze nachträglich enger gezogen wurde. Sonst ließe sich die
    // Anmeldung nicht einmal mehr in einem anderen Feld ändern. Der Server
    // lässt dieselbe Ausnahme zu.
    const booked = registration.participants.find(
      (p) => p.id === participant.id,
    );
    if (booked && booked.priceOptionId === participant.priceOptionId) {
      return undefined;
    }

    const priceOption = registration.course.priceOptions.find(
      (po) => po.id === participant.priceOptionId,
    );
    if (!priceOption) return undefined;

    return (
      priceOptionAgeMismatchMessage(
        priceOption,
        ageOnDate(
          participant.birthDate,
          priceOptionAgeReferenceDate(registration.course),
        ),
      ) ?? undefined
    );
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
    if (missing.length === 0) return participantAgeError(participant);
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

      const ageProblem = participantAgeError(p);
      if (ageProblem) {
        setError(`${p.firstName} ${p.lastName}: ${ageProblem}`);
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
    availabilityLoading ||
    (isStaff && teamOverviewLoading)
  ) {
    return (
      <div className="bg-paper dark:bg-night text-ink dark:text-night-text flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="semi-condensed text-lg font-semibold">Lädt...</p>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="bg-paper dark:bg-night text-ink dark:text-night-text flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="condensed text-[1.75rem] leading-none font-extrabold">
            Anmeldung nicht gefunden
          </h1>
          {isGuestAccess ? (
            <>
              <p className="text-dark dark:text-night-muted mt-4">
                Dieser Zugangslink ist ungültig oder abgelaufen. Du kannst dir
                jederzeit einen neuen Link schicken lassen.
              </p>
              <Link
                href="/anmeldung-verwalten"
                className="link-ink mt-4 inline-block"
              >
                Neuen Zugangslink anfordern
              </Link>
            </>
          ) : (
            <Link href={backHref} className="link-ink mt-4 inline-block">
              Zurück zur Übersicht
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="bg-paper dark:bg-night text-ink dark:text-night-text flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="condensed text-[1.75rem] leading-none font-extrabold">
            Keine Berechtigung
          </h1>
          <p className="text-dark dark:text-night-muted mt-4">
            Du kannst nur deine eigenen Anmeldungen oder Anmeldungen zu Kursen
            bearbeiten, für die du Admin, Kursleitung oder Ersteller:in bist.
          </p>
          <Link href={backHref} className="link-ink mt-4 inline-block">
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="bg-paper dark:bg-night text-ink dark:text-night-text flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="condensed text-[1.75rem] leading-none font-extrabold">
            Bearbeitung nicht möglich
          </h1>
          <p className="text-dark dark:text-night-muted mt-4">
            Diese Anmeldung kann nicht mehr bearbeitet werden, da die Frist
            abgelaufen ist oder der Kurs bereits begonnen hat.
          </p>
          <Link href={backHref} className="link-ink mt-4 inline-block">
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PublicPage
      title="Anmeldung bearbeiten"
      breadcrumbs={[
        { label: "Start", href: "/" },
        {
          label: returnTo
            ? "Teilnehmer"
            : isGuestAccess
              ? "Meine Anmeldung"
              : "Meine Anmeldungen",
          href: backHref,
        },
        { label: "Bearbeiten" },
      ]}
      heroSize="compact"
      description={<p>{registration.course.title}</p>}
    >
      <PageSection>
        <div className="space-y-10">
          {isStaff && (
            <Note tone="info">
              <p className="flex items-start gap-2">
                <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                Du bearbeitest diese Anmeldung als Kursleitung / Admin.
              </p>
            </Note>
          )}

          {/* Course Info */}
          <div>
            <Heading as="h2" size="list" rule>
              Kursdetails
            </Heading>
            <div className="mt-4 grid gap-6 text-sm sm:grid-cols-2">
              <InfoField label="Zeitraum">
                {formatDate(registration.course.startDate)} –{" "}
                {formatDate(registration.course.endDate)}
              </InfoField>
              {registration.course.location && (
                <InfoField label="Ort">
                  {registration.course.location.name},{" "}
                  {registration.course.location.city}
                </InfoField>
              )}
              <InfoField label="Verfügbare Plätze">
                {availability?.availableSlots ?? "?"} von{" "}
                {availability?.totalCapacity ?? "?"}
              </InfoField>
              {registration.course.registrationDeadline && (
                <InfoField label="Anmeldefrist">
                  {formatDate(registration.course.registrationDeadline)}
                </InfoField>
              )}
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <Note tone="error">
              <p>{error}</p>
            </Note>
          )}
          {success && (
            <Note tone="info">
              <p>{success}</p>
            </Note>
          )}

          {/* Edit Form */}
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Registrant Info Section */}
            <div>
              <Heading as="h2" size="list" rule>
                Anmelder
              </Heading>
              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="registrantName">Name</FieldLabel>
                  <input
                    id="registrantName"
                    type="text"
                    value={`${registration.registrantFirstName} ${registration.registrantLastName}`}
                    disabled
                    className={cn(fieldControlClasses, "cursor-not-allowed")}
                  />
                  <p className="text-dark dark:text-night-muted mt-2 text-xs">
                    {isGuestAccess ? (
                      "Name und Adresse können nur vom Kursteam geändert werden – melde dich dafür bitte bei uns"
                    ) : (
                      <>
                        Name und Adresse können in den{" "}
                        <Link href="/settings" className="link-ink">
                          Einstellungen
                        </Link>{" "}
                        geändert werden
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <FieldLabel htmlFor="registrantEmail">E-Mail</FieldLabel>
                  <input
                    id="registrantEmail"
                    type="email"
                    value={registration.registrantEmail}
                    disabled
                    className={cn(fieldControlClasses, "cursor-not-allowed")}
                  />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="registrantPhone">Telefon</FieldLabel>
                  <input
                    id="registrantPhone"
                    type="tel"
                    value={registrantPhone}
                    onChange={(e) => setRegistrantPhone(e.target.value)}
                    maxLength={50}
                    pattern="[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*"
                    title="Bitte geben Sie eine gültige Telefonnummer ein"
                    className={fieldControlClasses}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            {/* Billing Address Section */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <Heading as="h2" size="list" rule className="flex-1">
                  Rechnungsadresse
                </Heading>
              </div>
              <Checkbox
                id="useSeparateBilling"
                checked={useSeparateBilling}
                onChange={(e) => setUseSeparateBilling(e.target.checked)}
                className="mt-4"
              >
                Abweichende Rechnungsadresse
              </Checkbox>

              {useSeparateBilling ? (
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FieldLabel htmlFor="billingCompany">
                      Firma/Organisation
                    </FieldLabel>
                    <input
                      id="billingCompany"
                      type="text"
                      value={billingData.billingCompany}
                      onChange={(e) =>
                        setBillingData({
                          ...billingData,
                          billingCompany: e.target.value,
                        })
                      }
                      maxLength={200}
                      className={fieldControlClasses}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="billingFirstName" required>
                      Vorname
                    </FieldLabel>
                    <input
                      id="billingFirstName"
                      type="text"
                      value={billingData.billingFirstName}
                      onChange={(e) =>
                        setBillingData({
                          ...billingData,
                          billingFirstName: e.target.value,
                        })
                      }
                      maxLength={100}
                      className={fieldControlClasses}
                      required
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="billingLastName" required>
                      Nachname
                    </FieldLabel>
                    <input
                      id="billingLastName"
                      type="text"
                      value={billingData.billingLastName}
                      onChange={(e) =>
                        setBillingData({
                          ...billingData,
                          billingLastName: e.target.value,
                        })
                      }
                      maxLength={100}
                      className={fieldControlClasses}
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel htmlFor="billingStreet" required>
                      Straße und Hausnummer
                    </FieldLabel>
                    <input
                      id="billingStreet"
                      type="text"
                      value={billingData.billingStreet}
                      onChange={(e) =>
                        setBillingData({
                          ...billingData,
                          billingStreet: e.target.value,
                        })
                      }
                      maxLength={200}
                      className={fieldControlClasses}
                      required
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="billingZipCode" required>
                      PLZ
                    </FieldLabel>
                    <input
                      id="billingZipCode"
                      type="text"
                      value={billingData.billingZipCode}
                      onChange={(e) =>
                        setBillingData({
                          ...billingData,
                          billingZipCode: e.target.value,
                        })
                      }
                      maxLength={20}
                      className={fieldControlClasses}
                      required
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="billingCity" required>
                      Stadt
                    </FieldLabel>
                    <input
                      id="billingCity"
                      type="text"
                      value={billingData.billingCity}
                      onChange={(e) =>
                        setBillingData({
                          ...billingData,
                          billingCity: e.target.value,
                        })
                      }
                      maxLength={100}
                      className={fieldControlClasses}
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel htmlFor="billingEmail" required>
                      E-Mail für Rechnung
                    </FieldLabel>
                    <input
                      id="billingEmail"
                      type="email"
                      value={billingData.billingEmail}
                      onChange={(e) =>
                        setBillingData({
                          ...billingData,
                          billingEmail: e.target.value,
                        })
                      }
                      className={fieldControlClasses}
                      required
                    />
                  </div>
                </div>
              ) : (
                <p className="text-dark dark:text-night-muted mt-4 text-sm">
                  Die Rechnung wird an die E-Mail-Adresse des Anmelders
                  gesendet.
                </p>
              )}
            </div>

            {/* Participants: a flat list of cards. */}
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Heading as="h2" size="list" rule>
                    Teilnehmer ({activeParticipants.length})
                  </Heading>
                  <p className="text-dark dark:text-night-muted mt-3 text-sm">
                    Zum Bearbeiten auf eine Person tippen.
                  </p>
                  {participantsLocked && (
                    <p className="text-dark dark:text-night-muted mt-1 text-sm">
                      Für diese Anmeldung ist eine Anzahlung vereinbart.
                      Teilnehmer hinzufügen oder entfernen
                      {ticketsLocked ? " und Preiskategorien ändern" : ""} kann
                      nur das Kursteam.
                    </p>
                  )}
                  {!isStaff && holdsSeats && availability?.hasWaitingList && (
                    // Derselbe Vorrang, den der Server beim Speichern prüft —
                    // hier vorab, damit niemand erst nach dem Absenden erfährt,
                    // dass ein freier Platz schon den Wartenden zusteht. Die
                    // Plätze oben sind bereits ohne sie gezählt.
                    <p className="text-dark dark:text-night-muted mt-1 text-sm">
                      Für diesen Kurs warten Anmeldungen auf der Warteliste.
                      Freie Plätze, die sie nutzen könnten, gehen zuerst an sie;
                      Teilnehmer hinzufügen oder die Preiskategorie wechseln
                      geht nur, soweit die übrigen reichen.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={addParticipant}
                  disabled={!canAddParticipant()}
                  className={cn(BTN_PRIMARY, "shrink-0 px-4 text-sm")}
                >
                  <PlusIcon className="h-5 w-5 shrink-0" aria-hidden />
                  Hinzufügen
                </button>
              </div>

              <div className="mt-4 space-y-4">
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
                      canRemove={
                        activeParticipants.length > 1 && !participantsLocked
                      }
                      onEdit={() => openParticipant(participant.id)}
                      onRemove={() => removeParticipant(participant.id)}
                    />
                  ));

                  if (!isGroup) return <div key={block.key}>{cards}</div>;

                  // Tighter spacing inside a group than between blocks, plus
                  // one caption underneath.
                  const eligible = hasDiscountEligibleSiblingGroup(
                    block.members,
                  );
                  return (
                    <div key={block.key}>
                      <div className="space-y-2">{cards}</div>
                      <p className="text-dark dark:text-night-muted mt-2 flex items-start gap-1.5 pl-1 text-xs">
                        <Users
                          className="mt-px h-3.5 w-3.5 shrink-0"
                          aria-hidden
                        />
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
                  <div className="mt-6">
                    {hasEligibleSiblingGroupForDiscount ? (
                      <Note tone="info">
                        <Checkbox
                          id="siblingDiscountApplied"
                          checked={siblingDiscountApplied}
                          onChange={(e) =>
                            setSiblingDiscountApplied(e.target.checked)
                          }
                        >
                          <span className="font-semibold">
                            Geschwisterkindrabatt beantragen
                          </span>
                          <span className="mt-1 block text-sm">
                            Sie erhalten 20% Rabatt auf die Teilnahmegebühr
                            jedes weiteren Geschwisterkindes ab dem zweiten
                            Kind. Der Rabatt muss noch bestätigt werden.
                          </span>
                          {siblingDiscountApplied &&
                            calculateDiscountAmount() > 0 && (
                              <span className="mt-2 block text-sm font-semibold">
                                Ersparnis:{" "}
                                {formatEuro(calculateDiscountAmount())}
                              </span>
                            )}
                        </Checkbox>
                      </Note>
                    ) : (
                      <Note tone="info">
                        <p>
                          Für den Geschwisterkindrabatt müssen mindestens zwei
                          Geschwister in einer Geschwistergruppe zusammengefasst
                          sein.
                        </p>
                      </Note>
                    )}
                  </div>
                )}
            </div>

            {/* Price Summary */}
            <div>
              <Heading as="h2" size="list" rule>
                Gesamtpreis
              </Heading>
              <p className="text-dark dark:text-night-muted mt-3 text-sm">
                Basierend auf {activeParticipants.length} Teilnehmer
                {activeParticipants.length !== 1 && "n"}
              </p>
              {siblingDiscountApplied &&
              registration.course.allowSiblingDiscount &&
              calculateDiscountAmount() > 0 ? (
                <>
                  <ValueTable
                    className="mt-4"
                    rows={[
                      {
                        label: "Zwischensumme",
                        value: (
                          <span className="line-through decoration-2">
                            {formatEuro(calculateOriginalPrice())}
                          </span>
                        ),
                      },
                      {
                        label: (
                          <span>
                            Geschwisterkindrabatt
                            <span className="text-dark dark:text-night-muted block text-xs">
                              20% pro weiteres Kind
                            </span>
                          </span>
                        ),
                        value: `- ${formatEuro(calculateDiscountAmount())}`,
                      },
                      {
                        label: "Gesamt",
                        value: formatEuro(calculateTotalPrice()),
                      },
                    ]}
                  />
                  <p className="text-dark dark:text-night-muted mt-2 text-xs">
                    * Der Rabatt muss noch bestätigt werden
                  </p>
                </>
              ) : (
                <ValueTable
                  className="mt-4"
                  rows={[
                    {
                      label: "Gesamtpreis",
                      value: formatEuro(calculateTotalPrice()),
                    },
                  ]}
                />
              )}
            </div>

            {/* Nicht klebend: Am Fensterboden festgeklebt legte sich die
                Leiste beim Scrollen über die Eingabefelder — gemessen deckte
                sie ein Feld zur Hälfte ab. Sie steht jetzt am Ende des
                Formulars im normalen Fluss, wie überall sonst im Heft. */}
            <div className="border-rule dark:border-night-rule -mx-1 flex flex-col gap-3 border-t-2 px-1 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between">
              {canCancel ? (
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(true)}
                  className={BTN_OUTLINE}
                >
                  <CircleXIcon className="h-5 w-5" aria-hidden />
                  Anmeldung stornieren
                </button>
              ) : (
                <div />
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href={backHref} className={BTN_OUTLINE}>
                  Abbrechen
                </Link>
                <button
                  type="submit"
                  disabled={!canEdit || isSubmitting}
                  className={BTN_PRIMARY}
                >
                  {isSubmitting ? "Speichert..." : "Änderungen speichern"}
                </button>
              </div>
            </div>
          </form>
        </div>

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
                isOptionDisabled: (optionId) => {
                  if (editingParticipant.priceOptionId === optionId) {
                    return false;
                  }
                  if (ticketsLocked || optionNeedsStaff(optionId)) return true;
                  return (
                    !!editingParticipant.isNew &&
                    !isPriceOptionAvailable(optionId)
                  );
                },
                getOptionSuffix: (optionId) => {
                  if (editingParticipant.priceOptionId === optionId) return "";
                  if (optionNeedsStaff(optionId)) {
                    return " (mit Anzahlung – über das Kursteam)";
                  }
                  return editingParticipant.isNew &&
                    !isPriceOptionAvailable(optionId)
                    ? " (ausgebucht)"
                    : "";
                },
                ageReferenceDate: registration.course.startDate,
                // Das Kursteam darf eine Kategorie entgegen ihrer
                // Altersgrenze vergeben — der Hinweis bleibt trotzdem stehen.
                allowAgeMismatch: isStaff,
                // Und die Kategorie, in der jemand schon steckt, bleibt ihm
                // erhalten, auch wenn ihre Grenze inzwischen enger ist.
                ageExemptOptionId:
                  registration.participants.find(
                    (p) => p.id === editingParticipant.id,
                  )?.priceOptionId ?? null,
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
            <ScrollableModalCard
              maxW="md"
              className="border-ink dark:border-night-text rounded-none! border-2 shadow-none!"
            >
              <ScrollableModalBody>
                <Heading as="h2" size="list" className="text-[1.375rem]">
                  Anmeldung stornieren?
                </Heading>
                <p className="text-ink dark:text-night-text mt-4">
                  Bist du sicher, dass du diese Anmeldung stornieren möchtest?
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
                {cancelError && (
                  <Note tone="error" className="mt-4">
                    <p>{cancelError}</p>
                  </Note>
                )}
              </ScrollableModalBody>
              <ScrollableModalFooter className="border-rule dark:border-night-rule">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCancelModalOpen(false);
                      setCancelError("");
                    }}
                    className={cn(BTN_OUTLINE, "flex-1")}
                  >
                    Zurück
                  </button>
                  <button
                    type="button"
                    onClick={confirmCancel}
                    disabled={cancelMutation.isPending}
                    className={cn(BTN_PRIMARY, "flex-1")}
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
      </PageSection>
    </PublicPage>
  );
}
