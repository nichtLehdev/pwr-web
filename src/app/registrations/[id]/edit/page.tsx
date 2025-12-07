"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { RegistrationStatus } from "~/generated/prisma/enums";
import { getErrorMessage } from "@/lib/utils";
import { useToast } from "@/app/_components/ui/toast";

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: Date;
  city: string;
  instrument: string | null;
  priceOption: string | null;
  customFields: unknown;
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

  // Registrant data state
  const [registrantPhone, setRegistrantPhone] = useState("");

  // Billing data state
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

  // Fetch registration details
  const { data: registration, isLoading: registrationLoading } =
    api.registrations.getById.useQuery(
      { id: registrationId },
      { enabled: !!registrationId },
    );

  // Fetch course availability
  const { data: availability, isLoading: availabilityLoading } =
    api.courses.getAvailableSlots.useQuery(
      { id: registration?.course?.id ?? "" },
      { enabled: !!registration?.course?.id },
    );

  // Update mutation
  const updateMutation = api.registrations.updateMyRegistration.useMutation({
    onSuccess: () => {
      toast.success("Die Änderungen wurden erfolgreich gespeichert.");
      setError("");
      // Invalidate queries to refresh data
      void utils.registrations.getMyRegistrations.invalidate();
      void utils.registrations.getById.invalidate({ id: registrationId });
      // Redirect after short delay
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

  // Cancel mutation
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

  // Redirect if not logged in
  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.push("/login");
    }
  }, [session, sessionLoading, router]);

  // Initialize participants from registration
  /* eslint-disable react-hooks/set-state-in-effect -- Initializing form state from server data is a valid pattern */
  useEffect(() => {
    if (registration?.participants) {
      setParticipants(
        registration.participants.map((p) => ({
          ...p,
          birthDate: new Date(p.birthDate),
          isNew: false,
          isDeleted: false,
        })),
      );
    }
  }, [registration]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Initialize registrant and billing data from registration
  /* eslint-disable react-hooks/set-state-in-effect -- Initializing form state from server data is a valid pattern */
  useEffect(() => {
    if (registration) {
      setRegistrantPhone(registration.registrantPhone ?? "");
      setUseSeparateBilling(registration.useSeparateBilling);
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

  // Check if registration can be edited
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

  // Check if user owns this registration
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

  // Get active (non-deleted) participants
  const activeParticipants = participants.filter((p) => !p.isDeleted);

  // Check if we can add more participants
  const canAddParticipant = () => {
    if (!availability) return false;
    const currentActive = activeParticipants.length;
    const originalCount = registration?.participants.length ?? 0;
    const netNew = currentActive - originalCount;

    // Check if there's room
    if (availability.availableSlots <= netNew && netNew > 0) {
      return false;
    }

    return true;
  };

  // Check if a specific price option is available
  const isPriceOptionAvailable = (priceOptionLabel: string) => {
    if (!availability?.capacityByPriceOption) return true;
    const available = availability.capacityByPriceOption[priceOptionLabel];
    if (available === undefined) return true;

    // Count how many we're using of this option
    const currentUsage = activeParticipants.filter(
      (p) => p.priceOption === priceOptionLabel && p.isNew,
    ).length;

    return available > currentUsage;
  };

  const participantIdCounter = useRef(0);
  const addParticipant = () => {
    if (!registration?.course?.priceOptions) return;

    // Find an available price option
    const availablePriceOption = registration.course.priceOptions.find((po) =>
      isPriceOptionAvailable(po.label),
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
        priceOption: availablePriceOption?.label ?? null,
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

  // Calculate total price
  const calculateTotalPrice = () => {
    if (!registration?.course?.priceOptions) return 0;
    return activeParticipants.reduce((sum, p) => {
      const priceOption = registration.course.priceOptions.find(
        (po) => po.label === p.priceOption,
      );
      return sum + (priceOption?.price ?? 0);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    // Validate all participants
    for (const p of activeParticipants) {
      if (!p.firstName || !p.lastName || !p.city || !p.priceOption) {
        setError("Bitte fülle alle Pflichtfelder für jeden Teilnehmer aus.");
        setIsSubmitting(false);
        return;
      }
    }

    // Validate billing fields if separate billing is enabled
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

    // Prepare participants data for the mutation
    const participantsData = activeParticipants.map((p) => ({
      id: p.isNew ? undefined : p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      birthDate: p.birthDate,
      city: p.city,
      instrument: p.instrument ?? undefined,
      priceOption: p.priceOption ?? undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      customFields: p.customFields as any,
    }));

    // Call the mutation
    updateMutation.mutate({
      id: registrationId,
      totalPrice: calculateTotalPrice(),
      participants: participantsData,
      registrantPhone: registrantPhone || undefined,
      useSeparateBilling,
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
                <svg
                  className="h-4 w-4"
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
                        onChange={(e) =>
                          updateParticipant(
                            participant.id,
                            "birthDate",
                            new Date(e.target.value),
                          )
                        }
                        className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-1 focus:outline-none"
                        required
                      />
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
                        className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-1 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-dark dark:text-dark-text mb-1 block text-sm font-medium">
                        Preisoption *
                      </label>
                      <select
                        value={participant.priceOption ?? ""}
                        onChange={(e) =>
                          updateParticipant(
                            participant.id,
                            "priceOption",
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
                            isPriceOptionAvailable(option.label);
                          const isCurrent =
                            participant.priceOption === option.label;
                          return (
                            <option
                              key={option.id}
                              value={option.label}
                              disabled={!isAvailable && !isCurrent}
                            >
                              {option.label} - {option.price.toFixed(2)} €
                              {!isAvailable && !isCurrent && " (ausgebucht)"}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
                <p className="text-primary text-3xl font-bold">
                  {calculateTotalPrice().toFixed(2)} €
                </p>
                {calculateTotalPrice() !== registration.totalPrice && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Ursprünglich: {registration.totalPrice.toFixed(2)} €
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="dark:bg-dark-surface w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
