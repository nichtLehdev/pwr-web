"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { getErrorMessage } from "@/lib/utils";
import { useToast } from "@/app/_components/ui/toast";
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

// Roles that can create events for any district and use Auswahlchöre
const HIGHER_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.LPW, UserRole.RPW];

interface PriceOption {
  id: string;
  price: number;
  label: string;
  description: string;
}

export default function NewEventPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);

  // Fetch user profile for role and bezirk
  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, { enabled: !!session?.user });

  // Determine user permissions
  const userRole = profile?.role ?? UserRole.USER;
  const isHigherRole = HIGHER_ROLES.includes(userRole);
  const userBezirkId = profile?.bezirkId ?? null;

  // Form state
  const [title, setTitle] = useState("");
  const [motto, setMotto] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("18:00");
  const [category, setCategory] = useState<EventCategory>("KONZERT");
  const [bezirkId, setBezirkId] = useState<string>("");
  const [districtName, setDistrictName] = useState("");

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

  // Submission state
  const [submitAsDraft, setSubmitAsDraft] = useState(false);
  const [submitAsApproved, setSubmitAsApproved] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch bezirke
  const { data: bezirke } = api.bezirke.getAll.useQuery();

  // Fetch locations
  const { data: locationsData } = api.locations.getAll.useQuery({
    limit: 100,
    search: locationSearch || undefined,
  });

  // Fetch ensembles - filter by user's bezirk if restricted role
  const { data: ensemblesData } = api.ensembles.getAll.useQuery({
    bezirkId: !isHigherRole && userBezirkId ? userBezirkId : undefined,
  });

  // Fetch auswahlchöre - only for higher roles
  const { data: auswahlchoereData } = api.auswahlchoereRouter.getAll.useQuery(
    {},
    { enabled: isHigherRole },
  );

  // Set bezirk for restricted users when profile loads
  /* eslint-disable react-hooks/set-state-in-effect -- Initializing form state from server data is a valid pattern */
  useEffect(() => {
    if (!isHigherRole && userBezirkId && !bezirkId) {
      setBezirkId(userBezirkId);
    }
  }, [isHigherRole, userBezirkId, bezirkId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Create event mutation
  const createEventMutation = api.events.create.useMutation({
    onSuccess: (event) => {
      toast.success("Termin erfolgreich erstellt");
      router.push(`/dashboard/events/${event.id}`);
    },
    onError: (err) => {
      setError(getErrorMessage(err));
      setIsSubmitting(false);
      toast.error("Fehler beim Erstellen: " + getErrorMessage(err));
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
      toast.success("Veranstaltungsort erstellt");
    },
    onError: (err) => {
      setError(
        getErrorMessage(err, "Fehler beim Erstellen des Veranstaltungsortes."),
      );
      toast.error(
        getErrorMessage(err, "Fehler beim Erstellen des Veranstaltungsortes."),
      );
    },
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/events/new");
    }
  }, [session, sessionLoading, router]);

  // Redirect if user doesn't have permission to create events
  useEffect(() => {
    if (!profileLoading && profile && !hasRedirected.current) {
      // Only OBLEUTE and higher can create events
      const allowedRoles: UserRole[] = [
        UserRole.ADMIN,
        UserRole.LPW,
        UserRole.RPW,
        UserRole.OBLEUTE,
      ];
      const canCreateEvents = allowedRoles.includes(profile.role);

      if (!canCreateEvents) {
        hasRedirected.current = true;
        router.push("/dashboard");
      }
    }
  }, [profile, profileLoading, router]);

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

    // Prepare price options (remove temporary IDs)
    const preparedPriceOptions = !isFree
      ? priceOptions
          .filter((opt) => opt.label && opt.price >= 0)
          .map(({ label, price, description }) => ({
            label,
            price,
            description: description || undefined,
          }))
      : undefined;

    createEventMutation.mutate({
      title: title.trim(),
      motto: motto.trim() || undefined,
      description: description.trim() || undefined,
      eventDate: dateTime,
      locationId: locationId || undefined,
      category,
      bezirkId: bezirkId || undefined,
      districtName: districtName.trim() || undefined,
      performingEnsembleType: performingEnsembleType ?? undefined,
      ensembleId:
        performingEnsembleType === "ENSEMBLE"
          ? ensembleId || undefined
          : undefined,
      auswahlChorId:
        performingEnsembleType === "AUSWAHLCHOR"
          ? auswahlChorId || undefined
          : undefined,
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
      status: submitAsDraft
        ? ContentStatus.DRAFT
        : submitAsApproved
          ? ContentStatus.APPROVED
          : ContentStatus.PENDING,
    });
  };

  if (sessionLoading || profileLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session) {
    return null;
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
            <li className="dark:text-dark-text text-gray-900">Neuer Termin</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
            Neuen Termin erstellen
          </h1>
          <p className="dark:text-dark-muted mt-2 text-gray-600">
            Erstelle einen neuen Termin für den Posaunenchor
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
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
                  placeholder="z.B. Adventskonzert 2025"
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Motto
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
                      className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* District */}
          {/* District */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Bezirk
            </h2>
            <div className="space-y-4">
              {!isHigherRole && userBezirkId ? (
                // Restricted users: show their assigned bezirk (locked)
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Dein Bezirk
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={
                        bezirke?.find((b) => b.id === userBezirkId)
                          ? `Bezirk ${bezirke.find((b) => b.id === userBezirkId)?.number} – ${bezirke.find((b) => b.id === userBezirkId)?.name}`
                          : "Wird geladen..."
                      }
                      disabled
                      className="dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-gray-900 opacity-60"
                    />
                    <svg
                      className="h-5 w-5 shrink-0 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Du kannst nur Termine für deinen eigenen Bezirk erstellen.
                  </p>
                </div>
              ) : !isHigherRole && !userBezirkId ? (
                // Restricted users without bezirk assignment
                <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    <strong>Hinweis:</strong> Du bist keinem Bezirk zugeordnet.
                    Bitte wende dich an einen Administrator, um Termine
                    erstellen zu können.
                  </p>
                </div>
              ) : (
                // Higher roles: full bezirk selection
                <>
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
                </>
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
                {!isHigherRole && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Du kannst Ensembles aus deinem Bezirk auswählen oder einen
                    benutzerdefinierten Namen eingeben.
                  </p>
                )}
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

          {/* Submit Options */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Veröffentlichung
            </h2>
            <div className="space-y-4">
              {/* Status selection for higher roles */}
              {isHigherRole ? (
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="radio"
                      name="submitStatus"
                      checked={!submitAsDraft && submitAsApproved}
                      onChange={() => {
                        setSubmitAsDraft(false);
                        setSubmitAsApproved(true);
                      }}
                      className="text-primary focus:ring-primary mt-0.5 h-4 w-4 border-gray-300"
                    />
                    <div>
                      <span className="dark:text-dark-text font-medium text-gray-700">
                        Direkt veröffentlichen
                      </span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Der Termin wird sofort auf der Webseite angezeigt.
                      </p>
                    </div>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="radio"
                      name="submitStatus"
                      checked={!submitAsDraft && !submitAsApproved}
                      onChange={() => {
                        setSubmitAsDraft(false);
                        setSubmitAsApproved(false);
                      }}
                      className="text-primary focus:ring-primary mt-0.5 h-4 w-4 border-gray-300"
                    />
                    <div>
                      <span className="dark:text-dark-text font-medium text-gray-700">
                        Zur Prüfung einreichen
                      </span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Der Termin wird zur Prüfung durch einen Redakteur
                        eingereicht.
                      </p>
                    </div>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="radio"
                      name="submitStatus"
                      checked={submitAsDraft}
                      onChange={() => {
                        setSubmitAsDraft(true);
                        setSubmitAsApproved(false);
                      }}
                      className="text-primary focus:ring-primary mt-0.5 h-4 w-4 border-gray-300"
                    />
                    <div>
                      <span className="dark:text-dark-text font-medium text-gray-700">
                        Als Entwurf speichern
                      </span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Der Termin wird noch nicht veröffentlicht und ist nur
                        für dich sichtbar.
                      </p>
                    </div>
                  </label>
                </div>
              ) : (
                <>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={submitAsDraft}
                      onChange={(e) => setSubmitAsDraft(e.target.checked)}
                      className="text-primary focus:ring-primary mt-0.5 h-4 w-4 rounded border-gray-300"
                    />
                    <div>
                      <span className="dark:text-dark-text font-medium text-gray-700">
                        Als Entwurf speichern
                      </span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Der Termin wird noch nicht zur Prüfung eingereicht und
                        ist nur für dich sichtbar.
                      </p>
                    </div>
                  </label>

                  {!submitAsDraft && (
                    <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>Hinweis:</strong> Nach dem Erstellen wird der
                        Termin zur Prüfung eingereicht. Ein Redakteur wird den
                        Termin prüfen und freigeben.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard/events"
              className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-6 py-2.5 text-center font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Abbrechen
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || createEventMutation.isPending}
              className="bg-primary hover:bg-primary/90 rounded-lg px-6 py-2.5 font-medium text-white transition-colors disabled:opacity-50"
            >
              {isSubmitting || createEventMutation.isPending
                ? "Wird erstellt..."
                : submitAsDraft
                  ? "Entwurf speichern"
                  : submitAsApproved
                    ? "Veröffentlichen"
                    : "Termin einreichen"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
