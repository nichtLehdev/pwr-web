"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { RegistrationStatus } from "~/generated/prisma/enums";
import { getErrorMessage } from "@/lib/utils";
import { useToast } from "@/app/_components/ui/toast";
import {
  CircleXIcon,
  PlusIcon,
  TrashIcon,
  Link as LinkIcon,
  Link2Off,
} from "lucide-react";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: Date;
  city: string;
  instrument: string | null;
  priceOptionId: string | null;
  customFields: unknown;
  siblingGroupId?: string | null;
  isNew?: boolean;
  isDeleted?: boolean;
}

export default function EditRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { data: session, isPending: sessionLoading } = useSession();
  const registrationId = params.id as string;
  const utils = api.useUtils();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [birthdateErrors, setBirthdateErrors] = useState<
    Record<string, string>
  >({});
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
      { id: registrationId },
      { enabled: !!registrationId },
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
        router.push("/registrations");
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
      router.push("/registrations");
    },
    onError: (err) => {
      setCancelError(err.message || "Ein Fehler ist aufgetreten.");
      toast.error(err.message || "Ein Fehler ist aufgetreten.");
    },
  });

  const confirmCancel = () => {
    cancelMutation.mutate({ id: registrationId });
  };

  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.push("/login");
    }
  }, [session, sessionLoading, router]);

  /* eslint-disable react-hooks/set-state-in-effect -- Initializing form state from server data is a valid pattern */
  useEffect(() => {
    if (registration?.participants && registration?.course?.priceOptions) {
      setParticipants(
        registration.participants.map((p) => {
          const priceOption = registration.course.priceOptions.find(
            (po) => po.label === p.priceOption,
          );
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { priceOption: priceOptionLabel, ...participantWithoutLabel } =
            p;
          return {
            ...participantWithoutLabel,
            birthDate: new Date(p.birthDate),
            priceOptionId: priceOption?.id ?? null,
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

  const isOwner = registration?.registrantEmail === session?.user?.email;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateForInput = (date: Date) => {
    return new Date(date).toISOString().split("T")[0];
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

    const available = availability.capacityByPriceOption[priceOption.label];
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
    setParticipants([
      ...participants,
      {
        id: `new-${participantIdCounter.current}`,
        firstName: "",
        lastName: "",
        birthDate: new Date(),
        city: "",
        instrument: null,
        priceOptionId: availablePriceOption?.id ?? null,
        customFields: {},
        isNew: true,
        isDeleted: false,
      },
    ]);
  };

  const removeParticipant = (participantId: string) => {
    if (activeParticipants.length <= 1) {
      setError(
        "Es muss mindestens ein Teilnehmer in der Anmeldung verbleiben.",
      );
      return;
    }

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

  const calculateOriginalPrice = () => {
    if (!registration?.course?.priceOptions) return 0;
    return activeParticipants.reduce((sum, p) => {
      const priceOption = registration.course.priceOptions.find(
        (po) => po.id === p.priceOptionId,
      );
      return sum + (priceOption?.price ?? 0);
    }, 0);
  };

  const calculateDiscountAmount = () => {
    if (
      !siblingDiscountApplied ||
      !registration?.course?.allowSiblingDiscount ||
      !registration?.course?.priceOptions
    )
      return 0;

    const siblingGroups = new Map<string, typeof activeParticipants>();
    for (const participant of activeParticipants) {
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
            const priceOption = registration.course.priceOptions.find(
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
  };

  const calculateTotalPrice = () => {
    const original = calculateOriginalPrice();
    const discount = calculateDiscountAmount();
    return original - discount;
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
      if (!p.firstName || !p.lastName || !p.city || !p.priceOptionId) {
        setError("Bitte fülle alle Pflichtfelder für jeden Teilnehmer aus.");
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
      birthDate: p.birthDate,
      city: p.city,
      instrument: p.instrument ?? undefined,
      priceOptionId: p.priceOptionId || "", // Ensure priceOptionId is never undefined
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      customFields: p.customFields as any,
      siblingGroupId: p.siblingGroupId ?? undefined,
    }));

    updateMutation.mutate({
      id: registrationId,
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

  if (sessionLoading || registrationLoading || availabilityLoading) {
    return (
      <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-dark dark:text-dark-text">Lädt...</div>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <h1 className="text-dark dark:text-dark-text mb-4 text-2xl font-bold">
            Anmeldung nicht gefunden
          </h1>
          <Link
            href="/registrations"
            className="text-primary hover:text-primary-dark"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <h1 className="text-dark dark:text-dark-text mb-4 text-2xl font-bold">
            Keine Berechtigung
          </h1>
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            Du kannst nur deine eigenen Anmeldungen bearbeiten.
          </p>
          <Link
            href="/registrations"
            className="text-primary hover:text-primary-dark"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  if (!canEditRegistration()) {
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
            href="/registrations"
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
          <nav className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Link
              href="/registrations"
              className="hover:text-primary transition-colors"
            >
              Meine Anmeldungen
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
                  Name und Adresse können in den{" "}
                  <Link
                    href="/settings"
                    className="text-primary hover:underline"
                  >
                    Einstellungen
                  </Link>{" "}
                  geändert werden
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

          {/* Participants Section */}
          <div className="dark:bg-dark-surface dark:border-dark-border mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
              <div>
                <h2 className="text-dark dark:text-dark-text text-lg font-semibold">
                  Teilnehmer ({activeParticipants.length})
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Bearbeite oder füge Teilnehmer hinzu
                </p>
              </div>
              <button
                type="button"
                onClick={addParticipant}
                disabled={!canAddParticipant()}
                className="bg-primary hover:bg-primary-dark inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlusIcon className="mr-2 h-5 w-5" />
                Teilnehmer hinzufügen
              </button>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {activeParticipants.map((participant, index) => (
                <div key={participant.id} className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-dark dark:text-dark-text font-semibold">
                      Teilnehmer {index + 1}
                      {participant.isNew && (
                        <span className="ml-2 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          Neu
                        </span>
                      )}
                    </h3>
                    {activeParticipants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeParticipant(participant.id)}
                        className="text-red-600 transition-colors hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <TrashIcon className="mr-2 h-5 w-5" />
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-dark dark:text-dark-text mb-1 block text-sm font-medium">
                        Vorname *
                      </label>
                      <input
                        type="text"
                        value={participant.firstName}
                        onChange={(e) =>
                          updateParticipant(
                            participant.id,
                            "firstName",
                            e.target.value,
                          )
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
                        value={participant.lastName}
                        onChange={(e) =>
                          updateParticipant(
                            participant.id,
                            "lastName",
                            e.target.value,
                          )
                        }
                        maxLength={100}
                        className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-1 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-dark dark:text-dark-text mb-1 block text-sm font-medium">
                        Geburtsdatum *
                      </label>
                      <input
                        type="date"
                        value={formatDateForInput(participant.birthDate)}
                        onChange={(e) => {
                          const newDate = new Date(e.target.value);
                          updateParticipant(
                            participant.id,
                            "birthDate",
                            newDate,
                          );
                          const newErrors = { ...birthdateErrors };
                          if (!e.target.value) {
                            newErrors[participant.id] =
                              "Geburtsdatum ist erforderlich";
                          } else if (newDate >= new Date()) {
                            newErrors[participant.id] =
                              "Geburtsdatum muss in der Vergangenheit liegen";
                          } else {
                            delete newErrors[participant.id];
                          }
                          setBirthdateErrors(newErrors);
                        }}
                        max={new Date().toISOString().split("T")[0]}
                        required
                        title="Geburtsdatum muss in der Vergangenheit liegen"
                        className={`focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-lg border px-3 py-2 focus:ring-1 focus:outline-none ${
                          birthdateErrors[participant.id]
                            ? "border-red-500 dark:border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {birthdateErrors[participant.id] && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {birthdateErrors[participant.id]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-dark dark:text-dark-text mb-1 block text-sm font-medium">
                        Wohnort *
                      </label>
                      <input
                        type="text"
                        value={participant.city}
                        onChange={(e) =>
                          updateParticipant(
                            participant.id,
                            "city",
                            e.target.value,
                          )
                        }
                        maxLength={100}
                        className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-1 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-dark dark:text-dark-text mb-1 block text-sm font-medium">
                        Instrument
                      </label>
                      <input
                        type="text"
                        value={participant.instrument ?? ""}
                        onChange={(e) =>
                          updateParticipant(
                            participant.id,
                            "instrument",
                            e.target.value || null,
                          )
                        }
                        maxLength={100}
                        className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-1 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-dark dark:text-dark-text mb-1 block text-sm font-medium">
                        Preisoption *
                      </label>
                      <select
                        value={participant.priceOptionId ?? ""}
                        onChange={(e) =>
                          updateParticipant(
                            participant.id,
                            "priceOptionId",
                            e.target.value,
                          )
                        }
                        className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-1 focus:outline-none"
                        required
                      >
                        <option value="">Bitte wählen</option>
                        {registration.course.priceOptions.map((option) => {
                          const isAvailable =
                            !participant.isNew ||
                            isPriceOptionAvailable(option.id);
                          const isCurrent =
                            participant.priceOptionId === option.id;
                          return (
                            <option
                              key={option.id}
                              value={option.id}
                              disabled={!isAvailable && !isCurrent}
                            >
                              {option.label} - {option.price.toFixed(2)} €
                              {!isAvailable && !isCurrent && " (ausgebucht)"}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Sibling Grouping */}
                    {registration.course.allowSiblingDiscount &&
                      activeParticipants.length > 1 && (
                        <div className="md:col-span-2">
                          <div className="space-y-2">
                            <label className="text-dark dark:text-dark-text block text-sm font-medium">
                              Geschwister verknüpfen
                            </label>
                            <div className="flex flex-wrap items-center gap-2">
                              {activeParticipants
                                .filter((p) => p.id !== participant.id)
                                .map((otherParticipant) => {
                                  const isLinked =
                                    participant.siblingGroupId &&
                                    participant.siblingGroupId ===
                                      otherParticipant.siblingGroupId;
                                  return (
                                    <button
                                      key={otherParticipant.id}
                                      type="button"
                                      onClick={() =>
                                        linkSiblings(
                                          participant.id,
                                          otherParticipant.id,
                                        )
                                      }
                                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
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
                                          otherParticipant.id,
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
                                {activeParticipants
                                  .filter(
                                    (p) =>
                                      p.siblingGroupId ===
                                        participant.siblingGroupId &&
                                      p.id !== participant.id,
                                  )
                                  .map((p) =>
                                    getParticipantDisplayName(
                                      p.firstName,
                                      p.lastName,
                                      p.id,
                                    ),
                                  )
                                  .join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>

            {/* Sibling Discount Option */}
            {registration.course.allowSiblingDiscount &&
              activeParticipants.length > 1 &&
              hasSiblingGroups && (
                <div className="mt-6 rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
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
                        Sie erhalten 20% Rabatt für jedes Geschwisterkind ab dem
                        zweiten Kind. Der Rabatt muss noch bestätigt werden.
                      </p>
                      {siblingDiscountApplied &&
                        calculateDiscountAmount() > 0 && (
                          <div className="mt-2 text-sm font-semibold text-green-700 dark:text-green-400">
                            Ersparnis: {calculateDiscountAmount().toFixed(2)} €
                          </div>
                        )}
                    </div>
                  </label>
                </div>
              )}
          </div>

          {/* Price Summary */}
          <div className="dark:bg-dark-surface dark:border-dark-border mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-dark dark:text-dark-text text-lg font-semibold">
                  Gesamtpreis
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Basierend auf {activeParticipants.length} Teilnehmer
                  {activeParticipants.length !== 1 && "n"}
                </p>
              </div>
              <div className="text-right">
                {siblingDiscountApplied &&
                registration.course.allowSiblingDiscount &&
                calculateDiscountAmount() > 0 ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Zwischensumme:
                      </span>
                      <span className="text-gray-900 line-through dark:text-gray-100">
                        {calculateOriginalPrice().toFixed(2)} €
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-green-600 dark:text-green-400">
                        Geschwisterkindrabatt (20%):
                      </span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        -{calculateDiscountAmount().toFixed(2)} €
                      </span>
                    </div>
                    <div className="border-t border-gray-200 pt-1 dark:border-gray-700">
                      <p className="text-primary text-3xl font-bold">
                        {calculateTotalPrice().toFixed(2)} €
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      * Der Rabatt muss noch bestätigt werden
                    </p>
                  </div>
                ) : (
                  <p className="text-primary text-3xl font-bold">
                    {calculateTotalPrice().toFixed(2)} €
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => setCancelModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-6 py-3 font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-700 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <CircleXIcon className="h-5 w-5" />
              Anmeldung stornieren
            </button>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/registrations"
                className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text dark:hover:bg-dark-background-secondary rounded-lg border border-gray-300 bg-white px-6 py-3 text-center font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Abbrechen
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary-dark rounded-lg px-6 py-3 font-semibold text-white transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Speichert..." : "Änderungen speichern"}
              </button>
            </div>
          </div>
        </form>

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
