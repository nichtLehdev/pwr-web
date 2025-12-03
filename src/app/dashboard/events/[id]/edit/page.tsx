"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { getErrorMessage } from "@/lib/utils";
import {
  EventCategory,
  EventEnsembleType,
  ContentStatus,
  UserRole,
} from "~/generated/prisma/enums";

const categoryLabels: Record<EventCategory, string> = {
  KONZERT: "Konzert",
  GOTTESDIENST: "Gottesdienst",
  PROBE: "Probe",
  ANDERE: "Andere",
};

const ensembleTypeLabels: Record<EventEnsembleType, string> = {
  AUSWAHLCHOR: "Auswahlchor",
  ENSEMBLE: "Ensemble",
  CUSTOM: "Benutzerdefiniert",
};

const statusLabels: Record<ContentStatus, string> = {
  DRAFT: "Entwurf",
  PENDING: "Zur Prüfung",
  APPROVED: "Veröffentlicht",
  REJECTED: "Abgelehnt",
  ARCHIVED: "Archiviert",
};

// Roles that can edit events for any district and use Auswahlchöre
const HIGHER_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.LPW, UserRole.RPW];

// Roles that have access to the dashboard
const DASHBOARD_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.LPW,
  UserRole.RPW,
  UserRole.OBLEUTE,
];

interface PriceOption {
  id: string;
  price: number;
  label: string;
  description: string;
}

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const hasRedirected = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch user profile for role and bezirk
  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, { enabled: !!session?.user });

  // Fetch existing event
  const { data: event, isLoading: eventLoading } = api.events.getById.useQuery(
    { id: eventId },
    { enabled: !!eventId && !!session?.user },
  );

  // Determine user permissions
  const userRole = profile?.role ?? UserRole.USER;
  const isHigherRole = HIGHER_ROLES.includes(userRole);

  // Form state
  const [title, setTitle] = useState("");
  const [motto, setMotto] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("18:00");
  const [category, setCategory] = useState<EventCategory>("KONZERT");
  const [bezirkId, setBezirkId] = useState<string>("");
  const [districtName, setDistrictName] = useState("");
  const [cancelled, setCancelled] = useState(false);

  // Location state
  const [locationId, setLocationId] = useState<string>("");
  const [locationSearch, setLocationSearch] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showNewLocationForm, setShowNewLocationForm] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: "",
    street: "",
    zipCode: "",
    city: "",
    additionalInfo: "",
  });

  // Performing ensemble state
  const [performingEnsembleType, setPerformingEnsembleType] =
    useState<EventEnsembleType | null>(null);
  const [ensembleId, setEnsembleId] = useState<string>("");
  const [ensembleSearch, setEnsembleSearch] = useState("");
  const [showEnsembleDropdown, setShowEnsembleDropdown] = useState(false);
  const [auswahlChorId, setAuswahlChorId] = useState<string>("");
  const [auswahlChorSearch, setAuswahlChorSearch] = useState("");
  const [showAuswahlChorDropdown, setShowAuswahlChorDropdown] = useState(false);
  const [performingEnsembleName, setPerformingEnsembleName] = useState("");
  const [leitung, setLeitung] = useState("");

  // Participation state
  const [openToParticipants, setOpenToParticipants] = useState(false);
  const [participationInfo, setParticipationInfo] = useState("");

  // Pricing state
  const [isFree, setIsFree] = useState(true);
  const [priceInfo, setPriceInfo] = useState("");
  const [priceOptions, setPriceOptions] = useState<PriceOption[]>([]);

  // Status state
  const [status, setStatus] = useState<ContentStatus>("DRAFT");

  // Submission state
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch bezirke
  const { data: bezirke } = api.bezirke.getAll.useQuery();

  // Fetch locations
  const { data: locationsData } = api.locations.getAll.useQuery({
    limit: 100,
    search: locationSearch || undefined,
  });

  // Fetch ensembles
  const { data: ensemblesData } = api.ensembles.getAll.useQuery({});

  // Fetch auswahlchöre - only for higher roles
  const { data: auswahlchoereData } = api.auswahlchoereRouter.getAll.useQuery(
    {},
    { enabled: isHigherRole },
  );

  // Initialize form with event data
  useEffect(() => {
    if (event && !isInitialized) {
      setTitle(event.title);
      setMotto(event.motto || "");
      setDescription(event.description || "");
      setCancelled(event.cancelled);
      setCategory(event.category);
      setBezirkId(event.bezirkId || "");
      setDistrictName(event.districtName || "");
      setStatus(event.status);

      // Parse date and time
      const date = new Date(event.eventDate);
      setEventDate(date.toISOString().split("T")[0] || "");
      setEventTime(
        date.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      );

      // Location
      if (event.location) {
        setLocationId(event.location.id);
        setLocationSearch(
          `${event.location.name ? event.location.name + ", " : ""}${event.location.city}`,
        );
      }

      // Ensemble
      setPerformingEnsembleType(event.performingEnsembleType);
      if (event.performingEnsembleType === "ENSEMBLE" && event.ensemble) {
        setEnsembleId(event.ensemble.id);
        setEnsembleSearch(event.ensemble.name);
      }
      if (event.performingEnsembleType === "AUSWAHLCHOR" && event.auswahlChor) {
        setAuswahlChorId(event.auswahlChor.id);
        setAuswahlChorSearch(event.auswahlChor.name);
      }
      if (event.performingEnsembleType === "CUSTOM") {
        setPerformingEnsembleName(event.performingEnsembleName || "");
      }
      setLeitung(event.leitung || "");

      // Participation
      setOpenToParticipants(event.openToParticipants);
      setParticipationInfo(event.participationInfo || "");

      // Pricing
      setIsFree(event.isFree);
      setPriceInfo(event.priceInfo || "");
      if (event.priceOptions && event.priceOptions.length > 0) {
        setPriceOptions(
          event.priceOptions.map((opt) => ({
            id: opt.id,
            price: opt.price,
            label: opt.label,
            description: opt.description || "",
          })),
        );
      }

      setIsInitialized(true);
    }
  }, [event, isInitialized]);

  // tRPC utils for cache invalidation
  const utils = api.useUtils();

  // Update event mutation
  const updateEventMutation = api.events.update.useMutation({
    onSuccess: async () => {
      // Invalidate the event query to refetch fresh data on the view page
      await utils.events.getById.invalidate({ id: eventId });
      router.push(`/dashboard/events/${eventId}`);
    },
    onError: (err) => {
      setError(getErrorMessage(err));
      setIsSubmitting(false);
    },
  });

  // Create location mutation
  const createLocationMutation = api.locations.create.useMutation({
    onSuccess: (location) => {
      setLocationId(location.id);
      setLocationSearch(
        `${location.name ? location.name + ", " : ""}${location.city}`,
      );
      setShowNewLocationForm(false);
      setNewLocation({
        name: "",
        street: "",
        zipCode: "",
        city: "",
        additionalInfo: "",
      });
    },
    onError: (err) => {
      setError(
        getErrorMessage(err, "Fehler beim Erstellen des Veranstaltungsortes."),
      );
    },
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/events/${eventId}/edit`);
    }
  }, [session, sessionLoading, router, eventId]);

  // Redirect if user doesn't have dashboard access
  useEffect(() => {
    if (!profileLoading && profile && !hasRedirected.current) {
      if (!DASHBOARD_ROLES.includes(profile.role)) {
        hasRedirected.current = true;
        router.push("/");
      }
    }
  }, [profile, profileLoading, router]);

  // Check edit permissions once event is loaded
  useEffect(() => {
    if (event && profile && !hasRedirected.current) {
      const canEdit =
        event.createdById === session?.user?.id ||
        profile.role === UserRole.ADMIN ||
        profile.role === UserRole.LPW;

      if (!canEdit) {
        hasRedirected.current = true;
        router.push(`/dashboard/events/${eventId}`);
      }
    }
  }, [event, profile, session, router, eventId]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-dropdown]")) {
        setShowLocationDropdown(false);
        setShowEnsembleDropdown(false);
        setShowAuswahlChorDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLocationSelect = (location: {
    id: string;
    name: string | null;
    city: string;
  }) => {
    setLocationId(location.id);
    setLocationSearch(
      `${location.name ? location.name + ", " : ""}${location.city}`,
    );
    setShowLocationDropdown(false);
  };

  const handleCreateLocation = () => {
    if (!newLocation.city) {
      setError("Bitte gib mindestens eine Stadt an.");
      return;
    }
    createLocationMutation.mutate(newLocation);
  };

  const addPriceOption = () => {
    setPriceOptions([
      ...priceOptions,
      {
        id: `new-${Date.now()}`,
        price: 0,
        label: "",
        description: "",
      },
    ]);
  };

  const updatePriceOption = (
    id: string,
    field: keyof PriceOption,
    value: string | number,
  ) => {
    setPriceOptions(
      priceOptions.map((opt) =>
        opt.id === id ? { ...opt, [field]: value } : opt,
      ),
    );
  };

  const removePriceOption = (id: string) => {
    setPriceOptions(priceOptions.filter((opt) => opt.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    // Validation
    if (!title.trim()) {
      setError("Bitte gib einen Titel ein.");
      setIsSubmitting(false);
      return;
    }

    if (!eventDate) {
      setError("Bitte wähle ein Datum aus.");
      setIsSubmitting(false);
      return;
    }

    // Combine date and time
    const dateTime = new Date(`${eventDate}T${eventTime}`);

    // Prepare price options
    const preparedPriceOptions = !isFree
      ? priceOptions
          .filter((opt) => opt.label && opt.price >= 0)
          .map(({ id, label, price, description }) => ({
            id: id.startsWith("new-") ? undefined : id,
            label,
            price,
            description: description || undefined,
          }))
      : [];

    // If the event was approved or rejected and content is being changed, set status back to pending
    // (unless user is explicitly setting a different status)
    let finalStatus = status;
    if (
      (event?.status === ContentStatus.APPROVED &&
        status === ContentStatus.APPROVED) ||
      (event?.status === ContentStatus.REJECTED &&
        status === ContentStatus.REJECTED)
    ) {
      // Content was approved/rejected and user didn't change status - set back to pending for re-review
      finalStatus = ContentStatus.PENDING;
    }

    updateEventMutation.mutate({
      id: eventId,
      title: title.trim(),
      motto: motto.trim() || undefined,
      description: description.trim() || undefined,
      eventDate: dateTime,
      locationId: locationId || null,
      category,
      bezirkId: bezirkId || null,
      districtName: districtName.trim() || undefined,
      performingEnsembleType: performingEnsembleType ?? undefined,
      ensembleId:
        performingEnsembleType === "ENSEMBLE" ? ensembleId || null : null,
      auswahlChorId:
        performingEnsembleType === "AUSWAHLCHOR" ? auswahlChorId || null : null,
      performingEnsembleName:
        performingEnsembleType === "CUSTOM"
          ? performingEnsembleName.trim() || undefined
          : undefined,
      leitung: leitung.trim() || undefined,
      openToParticipants,
      participationInfo: participationInfo.trim() || undefined,
      isFree,
      priceInfo: priceInfo.trim() || undefined,
      priceOptions: preparedPriceOptions,
      status: finalStatus,
      cancelled,
    });
  };

  // Loading state
  if (sessionLoading || profileLoading || eventLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !event) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Termin nicht gefunden
          </h1>
          <Link
            href="/dashboard/events"
            className="text-primary mt-4 inline-block hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  // Get available ensemble types based on role
  const availableEnsembleTypes = isHigherRole
    ? Object.entries(ensembleTypeLabels)
    : Object.entries(ensembleTypeLabels).filter(
        ([value]) => value !== "AUSWAHLCHOR",
      );

  return (
    <main className="dark:bg-dark-background min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm">
          <ol className="flex items-center gap-2">
            <li>
              <Link
                href="/dashboard"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Dashboard
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li>
              <Link
                href="/dashboard/events"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Termine
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li>
              <Link
                href={`/dashboard/events/${eventId}`}
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                {event.title}
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">Bearbeiten</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
            Termin bearbeiten
          </h1>
          <p className="dark:text-dark-muted mt-2 text-gray-600">
            Bearbeite die Details des Termins
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Grundinformationen
            </h2>
            <div className="space-y-4">
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Titel *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z.B. Konzert zum Advent"
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Motto / Untertitel
                </label>
                <input
                  type="text"
                  value={motto}
                  onChange={(e) => setMotto(e.target.value)}
                  placeholder="z.B. Musik zur Weihnachtszeit"
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                />
              </div>

              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Beschreibung
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Beschreibe die Veranstaltung..."
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                />
              </div>

              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Kategorie *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as EventCategory)}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cancelled Toggle */}
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={cancelled}
                  onChange={(e) => setCancelled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  Veranstaltung abgesagt
                </span>
              </label>
            </div>
          </section>

          {/* Date & Time */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Datum & Uhrzeit
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Datum *
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Uhrzeit *
                </label>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  required
                />
              </div>
            </div>
          </section>

          {/* Location */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Veranstaltungsort
            </h2>
            <div className="space-y-4">
              <div className="relative" data-dropdown>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Ort suchen
                </label>
                <input
                  type="text"
                  value={locationSearch}
                  onChange={(e) => {
                    setLocationSearch(e.target.value);
                    setShowLocationDropdown(true);
                    if (!e.target.value) setLocationId("");
                  }}
                  onFocus={() => setShowLocationDropdown(true)}
                  placeholder="Suche nach einem Ort..."
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                />

                {/* Location Dropdown */}
                {showLocationDropdown && locationsData && (
                  <div className="dark:border-dark-border dark:bg-dark-surface absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                    <div
                      className="overflow-y-auto"
                      style={{ maxHeight: "240px" }}
                    >
                      {locationsData.locations.length > 0 ? (
                        <>
                          {locationsData.locations.map((location) => (
                            <button
                              key={location.id}
                              type="button"
                              onClick={() => handleLocationSelect(location)}
                              className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <span className="dark:text-dark-text font-medium text-gray-900">
                                {location.name || location.city}
                              </span>
                              {location.name && (
                                <span className="text-gray-500 dark:text-gray-400">
                                  {" "}
                                  – {location.city}
                                </span>
                              )}
                              {location.street && (
                                <span className="block text-xs text-gray-400 dark:text-gray-500">
                                  {location.street}
                                </span>
                              )}
                            </button>
                          ))}
                        </>
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          Keine Orte gefunden
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLocationDropdown(false);
                        setShowNewLocationForm(true);
                      }}
                      className="text-primary dark:border-dark-border block w-full border-t border-gray-200 px-4 py-2 text-left text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      + Neuen Ort erstellen
                    </button>
                  </div>
                )}
              </div>

              {/* New Location Form */}
              {showNewLocationForm && (
                <div className="dark:border-dark-border dark:bg-dark-background-secondary rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h3 className="dark:text-dark-text mb-3 font-medium text-gray-900">
                    Neuen Ort erstellen
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={newLocation.name}
                        onChange={(e) =>
                          setNewLocation({
                            ...newLocation,
                            name: e.target.value,
                          })
                        }
                        placeholder="Name (z.B. Gemeindehaus)"
                        className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-surface dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={newLocation.street}
                        onChange={(e) =>
                          setNewLocation({
                            ...newLocation,
                            street: e.target.value,
                          })
                        }
                        placeholder="Straße und Hausnummer"
                        className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-surface dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={newLocation.zipCode}
                        onChange={(e) =>
                          setNewLocation({
                            ...newLocation,
                            zipCode: e.target.value,
                          })
                        }
                        placeholder="PLZ"
                        className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-surface dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={newLocation.city}
                        onChange={(e) =>
                          setNewLocation({
                            ...newLocation,
                            city: e.target.value,
                          })
                        }
                        placeholder="Stadt *"
                        className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-surface dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={newLocation.additionalInfo}
                        onChange={(e) =>
                          setNewLocation({
                            ...newLocation,
                            additionalInfo: e.target.value,
                          })
                        }
                        placeholder="Zusätzliche Info (z.B. Eingang über Hinterhof)"
                        className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-surface dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateLocation}
                      disabled={createLocationMutation.isPending}
                      className="bg-primary hover:bg-primary/90 rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {createLocationMutation.isPending
                        ? "Speichern..."
                        : "Speichern"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewLocationForm(false)}
                      className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}

              {/* Clear Location */}
              {locationId && (
                <button
                  type="button"
                  onClick={() => {
                    setLocationId("");
                    setLocationSearch("");
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Ort entfernen
                </button>
              )}
            </div>
          </section>

          {/* Bezirk */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Bezirk
            </h2>
            <div className="space-y-4">
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Bezirk auswählen
                </label>
                <select
                  value={bezirkId}
                  onChange={(e) => setBezirkId(e.target.value)}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                >
                  <option value="">Übergreifend / Kein Bezirk</option>
                  {bezirke?.map((bezirk) => (
                    <option key={bezirk.id} value={bezirk.id}>
                      Bezirk {bezirk.number} – {bezirk.name}
                    </option>
                  ))}
                </select>
              </div>

              {!bezirkId && (
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Oder Bezirksname eingeben
                  </label>
                  <input
                    type="text"
                    value={districtName}
                    onChange={(e) => setDistrictName(e.target.value)}
                    placeholder="z.B. Köln-Bonn"
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Performing Ensemble */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Auftretendes Ensemble
            </h2>
            <div className="space-y-4">
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Ensemble-Typ
                </label>
                <select
                  value={performingEnsembleType ?? ""}
                  onChange={(e) =>
                    setPerformingEnsembleType(
                      e.target.value
                        ? (e.target.value as EventEnsembleType)
                        : null,
                    )
                  }
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                >
                  <option value="">Kein Ensemble</option>
                  {availableEnsembleTypes.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {performingEnsembleType === "ENSEMBLE" && (
                <div className="relative" data-dropdown>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Ensemble suchen
                  </label>
                  <input
                    type="text"
                    value={ensembleSearch}
                    onChange={(e) => {
                      setEnsembleSearch(e.target.value);
                      setShowEnsembleDropdown(true);
                      if (!e.target.value) setEnsembleId("");
                    }}
                    onFocus={() => setShowEnsembleDropdown(true)}
                    placeholder="Suche nach einem Ensemble..."
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  />

                  {/* Ensemble Dropdown */}
                  {showEnsembleDropdown && ensemblesData && (
                    <div className="dark:border-dark-border dark:bg-dark-surface absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                      <div
                        className="overflow-y-auto"
                        style={{ maxHeight: "240px" }}
                      >
                        {ensemblesData.ensembles
                          ?.filter((e) =>
                            e.name
                              .toLowerCase()
                              .includes(ensembleSearch.toLowerCase()),
                          )
                          .map((ensemble) => (
                            <button
                              key={ensemble.id}
                              type="button"
                              onClick={() => {
                                setEnsembleId(ensemble.id);
                                setEnsembleSearch(ensemble.name);
                                setShowEnsembleDropdown(false);
                              }}
                              className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <span className="dark:text-dark-text font-medium text-gray-900">
                                {ensemble.name}
                              </span>
                              {ensemble.bezirk && (
                                <span className="text-gray-500 dark:text-gray-400">
                                  {" "}
                                  – Bezirk {ensemble.bezirk.number}
                                </span>
                              )}
                            </button>
                          ))}
                        {ensemblesData.ensembles?.filter((e) =>
                          e.name
                            .toLowerCase()
                            .includes(ensembleSearch.toLowerCase()),
                        ).length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            Keine Ensembles gefunden
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {performingEnsembleType === "AUSWAHLCHOR" && (
                <div className="relative" data-dropdown>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Auswahlchor suchen
                  </label>
                  <input
                    type="text"
                    value={auswahlChorSearch}
                    onChange={(e) => {
                      setAuswahlChorSearch(e.target.value);
                      setShowAuswahlChorDropdown(true);
                      if (!e.target.value) setAuswahlChorId("");
                    }}
                    onFocus={() => setShowAuswahlChorDropdown(true)}
                    placeholder="Suche nach einem Auswahlchor..."
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  />

                  {/* Auswahlchor Dropdown */}
                  {showAuswahlChorDropdown && auswahlchoereData && (
                    <div className="dark:border-dark-border dark:bg-dark-surface absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                      <div
                        className="overflow-y-auto"
                        style={{ maxHeight: "240px" }}
                      >
                        {auswahlchoereData.auswahlchoere
                          ?.filter((c) =>
                            c.name
                              .toLowerCase()
                              .includes(auswahlChorSearch.toLowerCase()),
                          )
                          .map((chor) => (
                            <button
                              key={chor.id}
                              type="button"
                              onClick={() => {
                                setAuswahlChorId(chor.id);
                                setAuswahlChorSearch(chor.name);
                                setShowAuswahlChorDropdown(false);
                              }}
                              className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <span className="dark:text-dark-text font-medium text-gray-900">
                                {chor.name}
                              </span>
                            </button>
                          ))}
                        {auswahlchoereData.auswahlchoere?.filter((c) =>
                          c.name
                            .toLowerCase()
                            .includes(auswahlChorSearch.toLowerCase()),
                        ).length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            Keine Auswahlchöre gefunden
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {performingEnsembleType === "CUSTOM" && (
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Ensemble-Name
                  </label>
                  <input
                    type="text"
                    value={performingEnsembleName}
                    onChange={(e) => setPerformingEnsembleName(e.target.value)}
                    placeholder="z.B. Posaunenchor Beispielstadt"
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  />
                </div>
              )}

              {performingEnsembleType && (
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Leitung
                  </label>
                  <input
                    type="text"
                    value={leitung}
                    onChange={(e) => setLeitung(e.target.value)}
                    placeholder="Name der musikalischen Leitung"
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Participation */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Teilnahme
            </h2>
            <div className="space-y-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={openToParticipants}
                  onChange={(e) => setOpenToParticipants(e.target.checked)}
                  className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                />
                <span className="dark:text-dark-text text-sm text-gray-700">
                  Offen für externe Teilnehmer / Mitwirkende
                </span>
              </label>

              {openToParticipants && (
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Teilnahme-Informationen
                  </label>
                  <textarea
                    value={participationInfo}
                    onChange={(e) => setParticipationInfo(e.target.value)}
                    rows={3}
                    placeholder="Informationen zur Teilnahme, Anmeldung, etc."
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Pricing */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Eintritt
            </h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    checked={isFree}
                    onChange={() => setIsFree(true)}
                    className="text-primary focus:ring-primary h-4 w-4 border-gray-300"
                  />
                  <span className="dark:text-dark-text text-sm text-gray-700">
                    Eintritt frei
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    checked={!isFree}
                    onChange={() => setIsFree(false)}
                    className="text-primary focus:ring-primary h-4 w-4 border-gray-300"
                  />
                  <span className="dark:text-dark-text text-sm text-gray-700">
                    Mit Eintritt
                  </span>
                </label>
              </div>

              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Preis-Informationen
                </label>
                <input
                  type="text"
                  value={priceInfo}
                  onChange={(e) => setPriceInfo(e.target.value)}
                  placeholder={
                    isFree
                      ? "z.B. Um eine Spende wird gebeten"
                      : "z.B. Karten an der Abendkasse"
                  }
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                />
              </div>

              {!isFree && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="dark:text-dark-text text-sm font-medium text-gray-700">
                      Preiskategorien
                    </label>
                    <button
                      type="button"
                      onClick={addPriceOption}
                      className="text-primary hover:text-primary/80 text-sm font-medium"
                    >
                      + Kategorie hinzufügen
                    </button>
                  </div>

                  {priceOptions.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Noch keine Preiskategorien angelegt
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {priceOptions.map((option) => (
                        <div
                          key={option.id}
                          className="dark:border-dark-border flex items-start gap-3 rounded-lg border border-gray-200 p-3"
                        >
                          <div className="flex-1 space-y-2">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <input
                                type="text"
                                value={option.label}
                                onChange={(e) =>
                                  updatePriceOption(
                                    option.id,
                                    "label",
                                    e.target.value,
                                  )
                                }
                                placeholder="Bezeichnung (z.B. Erwachsene)"
                                className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:ring-1 focus:outline-none"
                              />
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={option.price}
                                  onChange={(e) =>
                                    updatePriceOption(
                                      option.id,
                                      "price",
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                  min="0"
                                  step="0.01"
                                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-24 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:ring-1 focus:outline-none"
                                />
                                <span className="text-sm text-gray-500">€</span>
                              </div>
                            </div>
                            <input
                              type="text"
                              value={option.description}
                              onChange={(e) =>
                                updatePriceOption(
                                  option.id,
                                  "description",
                                  e.target.value,
                                )
                              }
                              placeholder="Beschreibung (optional)"
                              className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:ring-1 focus:outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removePriceOption(option.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
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
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Status section */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Status
            </h2>

            {/* Notice for approved/rejected events being edited */}
            {(event?.status === ContentStatus.APPROVED ||
              event?.status === ContentStatus.REJECTED) &&
              !isHigherRole && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
                  <div className="flex items-start gap-3">
                    <svg
                      className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        {event?.status === ContentStatus.APPROVED
                          ? "Hinweis zur erneuten Freigabe"
                          : "Hinweis zur erneuten Prüfung"}
                      </p>
                      <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                        {event?.status === ContentStatus.APPROVED
                          ? "Diese Veranstaltung ist bereits freigegeben. Nach dem Speichern wird sie erneut zur Prüfung eingereicht und muss wieder freigegeben werden."
                          : "Diese Veranstaltung wurde abgelehnt. Nach dem Speichern wird sie erneut zur Prüfung eingereicht."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {isHigherRole ? (
              <div className="space-y-3">
                {((event?.status === ContentStatus.APPROVED &&
                  status === ContentStatus.APPROVED) ||
                  (event?.status === ContentStatus.REJECTED &&
                    status === ContentStatus.REJECTED)) && (
                  <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                    Hinweis: Bei Änderungen wird der Status automatisch auf
                    &quot;Ausstehend&quot; zurückgesetzt, es sei denn, du wählst
                    einen anderen Status.
                  </p>
                )}
                {Object.entries(statusLabels).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-3"
                  >
                    <input
                      type="radio"
                      name="status"
                      checked={status === value}
                      onChange={() => setStatus(value as ContentStatus)}
                      className="text-primary focus:ring-primary h-4 w-4 border-gray-300"
                    />
                    <span className="dark:text-dark-text text-sm text-gray-700">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Aktueller Status:{" "}
                <span className="font-medium">
                  {statusLabels[event?.status ?? ContentStatus.DRAFT]}
                </span>
                {(event?.status === ContentStatus.APPROVED ||
                  event?.status === ContentStatus.REJECTED) && (
                  <span className="ml-1">→ wird zu &quot;Ausstehend&quot;</span>
                )}
              </p>
            )}
          </section>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href={`/dashboard/events/${eventId}`}
              className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-6 py-2.5 text-center font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Abbrechen
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || updateEventMutation.isPending}
              className="bg-primary hover:bg-primary/90 rounded-lg px-6 py-2.5 font-medium text-white transition-colors disabled:opacity-50"
            >
              {isSubmitting || updateEventMutation.isPending
                ? "Wird gespeichert..."
                : "Änderungen speichern"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
