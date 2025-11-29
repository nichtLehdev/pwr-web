"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import {
  CourseType,
  TargetAudience,
  CustomFieldType,
  ContentStatus,
  UserRole,
} from "~/generated/prisma/enums";

// German labels for course types
const courseTypeLabels: Record<CourseType, string> = {
  LEHRGANG: "Lehrgang",
  FREIZEIT: "Freizeit",
  WORKSHOP: "Workshop",
  KOMPONISTENPORTRAIT: "Komponistenportrait",
  OTHER: "Sonstiges",
};

// German labels for target audience
const targetAudienceLabels: Record<TargetAudience, string> = {
  ANFAENGER: "Anfänger",
  FORTGESCHRITTENE: "Fortgeschrittene",
  DIRIGENTEN: "Dirigenten",
  JUGEND: "Jugend",
  ALLE: "Alle",
};

// German labels for custom field types
const customFieldTypeLabels: Record<CustomFieldType, string> = {
  TEXT: "Text",
  NUMBER: "Zahl",
  SELECT: "Auswahl",
  CHECKBOX: "Checkbox",
  TEXTAREA: "Mehrzeiliger Text",
};

// Roles that have access to create courses
const ALLOWED_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.LPW,
  UserRole.RPW,
  UserRole.OBLEUTE,
];

// Roles that can directly approve
const HIGHER_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.LPW, UserRole.RPW];

interface PriceOption {
  id: string;
  price: number;
  label: string;
  description: string;
  maxParticipants?: number;
}

interface CustomField {
  id: string;
  fieldName: string;
  fieldType: CustomFieldType;
  options: string;
  isRequired: boolean;
  helpText: string;
  sortOrder: number;
}

export default function NewCoursePage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const hasRedirected = useRef(false);

  // Fetch user profile for role
  const { data: profile, isLoading: profileLoading } = api.users.getMyProfile.useQuery(
    undefined,
    { enabled: !!session?.user },
  );

  // Determine user permissions
  const userRole = profile?.role ?? UserRole.USER;
  const isHigherRole = HIGHER_ROLES.includes(userRole);

  // Basic info state
  const [title, setTitle] = useState("");
  const [motto, setMotto] = useState("");
  const [description, setDescription] = useState("");
  const [courseType, setCourseType] = useState<CourseType>("LEHRGANG");
  const [targetAudience, setTargetAudience] = useState<TargetAudience>("ALLE");

  // Date state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");

  // Location state
  const [locationId, setLocationId] = useState<string>("");
  const [locationSearch, setLocationSearch] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showNewLocationForm, setShowNewLocationForm] = useState(false);
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const [customLocation, setCustomLocation] = useState({
    venue: "",
    street: "",
    zipCode: "",
    city: "",
    additionalInfo: "",
  });

  // Capacity state
  const [maxParticipants, setMaxParticipants] = useState<number>(20);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [allowWaitingList, setAllowWaitingList] = useState(false);

  // Pricing state
  const [isFree, setIsFree] = useState(false);
  const [priceInfo, setPriceInfo] = useState("");
  const [priceOptions, setPriceOptions] = useState<PriceOption[]>([]);

  // Additional info state
  const [prerequisites, setPrerequisites] = useState("");
  const [whatToBring, setWhatToBring] = useState("");

  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // Submit state
  const [submitAsDraft, setSubmitAsDraft] = useState(false);
  const [submitAsApproved, setSubmitAsApproved] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch locations
  const { data: locationsData } = api.locations.getAll.useQuery({
    limit: 100,
    search: locationSearch || undefined,
  });

  // Create course mutation
  const createCourseMutation = api.courses.create.useMutation({
    onSuccess: (course) => {
      router.push(`/dashboard/courses/${course.id}`);
    },
    onError: (err) => {
      setError(err.message || "Ein Fehler ist aufgetreten.");
      setIsSubmitting(false);
    },
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/courses/new");
    }
  }, [session, sessionLoading, router]);

  // Redirect if user doesn't have permission
  useEffect(() => {
    if (!profileLoading && profile && !hasRedirected.current) {
      if (!ALLOWED_ROLES.includes(profile.role)) {
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
    setLocationSearch(`${location.name ? location.name + ", " : ""}${location.city}`);
    setShowLocationDropdown(false);
    setUseCustomLocation(false);
  };

  // Price option handlers
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
    value: string | number | undefined,
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

  // Custom field handlers
  const addCustomField = () => {
    setCustomFields([
      ...customFields,
      {
        id: `new-${Date.now()}`,
        fieldName: "",
        fieldType: "TEXT",
        options: "",
        isRequired: false,
        helpText: "",
        sortOrder: customFields.length,
      },
    ]);
  };

  const updateCustomField = (
    id: string,
    field: keyof CustomField,
    value: string | boolean | number | CustomFieldType,
  ) => {
    setCustomFields(
      customFields.map((cf) =>
        cf.id === id ? { ...cf, [field]: value } : cf,
      ),
    );
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter((cf) => cf.id !== id));
  };

  const moveCustomField = (id: string, direction: "up" | "down") => {
    const index = customFields.findIndex((cf) => cf.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === customFields.length - 1)
    ) {
      return;
    }

    const newFields = [...customFields];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    [newFields[index], newFields[newIndex]] = [newFields[newIndex]!, newFields[index]!];

    // Update sort orders
    setCustomFields(
      newFields.map((cf, i) => ({ ...cf, sortOrder: i })),
    );
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

    if (!description.trim()) {
      setError("Bitte gib eine Beschreibung ein.");
      setIsSubmitting(false);
      return;
    }

    if (!startDate) {
      setError("Bitte wähle ein Startdatum aus.");
      setIsSubmitting(false);
      return;
    }

    if (!endDate) {
      setError("Bitte wähle ein Enddatum aus.");
      setIsSubmitting(false);
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError("Das Enddatum muss nach dem Startdatum liegen.");
      setIsSubmitting(false);
      return;
    }

    if (!maxParticipants || maxParticipants < 1) {
      setError("Bitte gib eine maximale Teilnehmerzahl ein.");
      setIsSubmitting(false);
      return;
    }

    // Prepare price options
    const preparedPriceOptions = !isFree
      ? priceOptions
          .filter((opt) => opt.label.trim())
          .map(({ label, price, description, maxParticipants }) => ({
            label: label.trim(),
            price,
            description: description.trim() || undefined,
            maxParticipants: maxParticipants || undefined,
          }))
      : undefined;

    // Prepare custom fields
    const preparedCustomFields = customFields
      .filter((cf) => cf.fieldName.trim())
      .map(({ fieldName, fieldType, options, isRequired, helpText, sortOrder }) => ({
        fieldName: fieldName.trim(),
        fieldType,
        options: fieldType === "SELECT" ? options.trim() : undefined,
        isRequired,
        helpText: helpText.trim() || undefined,
        sortOrder,
      }));

    createCourseMutation.mutate({
      title: title.trim(),
      motto: motto.trim() || undefined,
      description: description.trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      registrationDeadline: registrationDeadline
        ? new Date(registrationDeadline)
        : undefined,
      locationId: !useCustomLocation && locationId ? locationId : undefined,
      locationVenue: useCustomLocation ? customLocation.venue.trim() || undefined : undefined,
      locationStreet: useCustomLocation ? customLocation.street.trim() || undefined : undefined,
      locationZipCode: useCustomLocation ? customLocation.zipCode.trim() || undefined : undefined,
      locationCity: useCustomLocation ? customLocation.city.trim() || undefined : undefined,
      locationAdditionalInfo: useCustomLocation ? customLocation.additionalInfo.trim() || undefined : undefined,
      courseType,
      targetAudience,
      maxParticipants,
      registrationOpen,
      allowWaitingList,
      isFree,
      priceInfo: priceInfo.trim() || undefined,
      priceOptions: preparedPriceOptions,
      prerequisites: prerequisites.trim() || undefined,
      whatToBring: whatToBring.trim() || undefined,
      customFields: preparedCustomFields.length > 0 ? preparedCustomFields : undefined,
    });
  };

  if (sessionLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-dark-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-dark-background">
      <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm">
          <ol className="flex items-center gap-2">
            <li>
              <Link
                href="/dashboard"
                className="text-gray-500 hover:text-primary dark:text-dark-muted dark:hover:text-primary"
              >
                Dashboard
              </Link>
            </li>
            <li className="text-gray-400 dark:text-dark-muted">/</li>
            <li>
              <Link
                href="/dashboard/courses"
                className="text-gray-500 hover:text-primary dark:text-dark-muted dark:hover:text-primary"
              >
                Kurse
              </Link>
            </li>
            <li className="text-gray-400 dark:text-dark-muted">/</li>
            <li className="text-gray-900 dark:text-dark-text">Neuer Kurs</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text">
            Neuen Kurs erstellen
          </h1>
          <p className="mt-2 text-gray-600 dark:text-dark-muted">
            Erstelle einen neuen Kurs oder eine Freizeit
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
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">
              Grundinformationen
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-text">
                  Titel *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z.B. Bläserfreizeit 2025"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-text">
                  Motto
                </label>
                <input
                  type="text"
                  value={motto}
                  onChange={(e) => setMotto(e.target.value)}
                  placeholder="z.B. Gemeinsam musizieren"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-text">
                  Beschreibung *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Beschreibe den Kurs..."
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-text">
                    Kursart *
                  </label>
                  <select
                    value={courseType}
                    onChange={(e) => setCourseType(e.target.value as CourseType)}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                  >
                    {Object.entries(courseTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-text">
                    Zielgruppe
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value as TargetAudience)}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                  >
                    {Object.entries(targetAudienceLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Date & Time */}
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">
              Datum & Zeit
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-text">
                  Startdatum *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-text">
                  Enddatum *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-text">
                  Anmeldeschluss
                </label>
                <input
                  type="date"
                  value={registrationDeadline}
                  onChange={(e) => setRegistrationDeadline(e.target.value)}
                  max={startDate}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                />
              </div>
            </div>
          </section>

          {/* Location */}
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">
              Veranstaltungsort
            </h2>
            <div className="space-y-4">
              {/* Toggle between existing and custom location */}
              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    checked={!useCustomLocation}
                    onChange={() => setUseCustomLocation(false)}
                    className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-dark-text">
                    Vorhandenen Ort auswählen
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    checked={useCustomLocation}
                    onChange={() => {
                      setUseCustomLocation(true);
                      setLocationId("");
                      setLocationSearch("");
                    }}
                    className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-dark-text">
                    Neuen Ort eingeben
                  </span>
                </label>
              </div>

              {!useCustomLocation ? (
                <div className="relative" data-dropdown>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-text">
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
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                  />

                  {/* Location Dropdown */}
                  {showLocationDropdown && locationsData && (
                    <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-dark-border dark:bg-dark-surface">
                      <div className="max-h-60 overflow-y-auto">
                        {locationsData.locations.length > 0 ? (
                          locationsData.locations.map((location) => (
                            <button
                              key={location.id}
                              type="button"
                              onClick={() => handleLocationSelect(location)}
                              className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <span className="font-medium text-gray-900 dark:text-dark-text">
                                {location.name || location.city}
                              </span>
                              {location.name && (
                                <span className="text-gray-500 dark:text-gray-400">
                                  {" "}– {location.city}
                                </span>
                              )}
                              {location.street && (
                                <span className="block text-xs text-gray-400 dark:text-gray-500">
                                  {location.street}
                                </span>
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            Keine Orte gefunden
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={customLocation.venue}
                      onChange={(e) =>
                        setCustomLocation({ ...customLocation, venue: e.target.value })
                      }
                      placeholder="Veranstaltungsort (z.B. Jugendherberge Muster)"
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={customLocation.street}
                      onChange={(e) =>
                        setCustomLocation({ ...customLocation, street: e.target.value })
                      }
                      placeholder="Straße und Hausnummer"
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={customLocation.zipCode}
                      onChange={(e) =>
                        setCustomLocation({ ...customLocation, zipCode: e.target.value })
                      }
                      placeholder="PLZ"
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={customLocation.city}
                      onChange={(e) =>
                        setCustomLocation({ ...customLocation, city: e.target.value })
                      }
                      placeholder="Stadt"
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={customLocation.additionalInfo}
                      onChange={(e) =>
                        setCustomLocation({
                          ...customLocation,
                          additionalInfo: e.target.value,
                        })
                      }
                      placeholder="Zusätzliche Info (z.B. Anfahrtsbeschreibung)"
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Capacity & Registration */}
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">
              Kapazität & Anmeldung
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-text">
                  Maximale Teilnehmerzahl *
                </label>
                <input
                  type="number"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 0)}
                  min="1"
                  className="block w-32 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                  required
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={registrationOpen}
                    onChange={(e) => setRegistrationOpen(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-dark-text">
                    Anmeldung geöffnet
                  </span>
                </label>

                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={allowWaitingList}
                    onChange={(e) => setAllowWaitingList(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-dark-text">
                    Warteliste erlauben
                  </span>
                </label>
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">
              Preise
            </h2>
            <div className="space-y-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={(e) => setIsFree(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700 dark:text-dark-text">
                  Kostenloser Kurs
                </span>
              </label>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-text">
                  Preis-Informationen
                </label>
                <input
                  type="text"
                  value={priceInfo}
                  onChange={(e) => setPriceInfo(e.target.value)}
                  placeholder={isFree ? "z.B. Verpflegung inklusive" : "z.B. Frühbucherrabatt bis 31.01."}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                />
              </div>

              {!isFree && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 dark:text-dark-text">
                      Preiskategorien
                    </label>
                    <button
                      type="button"
                      onClick={addPriceOption}
                      className="text-sm font-medium text-primary hover:text-primary/80"
                    >
                      + Kategorie hinzufügen
                    </button>
                  </div>

                  {priceOptions.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Noch keine Preiskategorien angelegt. Füge mindestens eine hinzu.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {priceOptions.map((option) => (
                        <div
                          key={option.id}
                          className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-dark-border"
                        >
                          <div className="flex-1 space-y-2">
                            <div className="grid gap-2 sm:grid-cols-3">
                              <input
                                type="text"
                                value={option.label}
                                onChange={(e) =>
                                  updatePriceOption(option.id, "label", e.target.value)
                                }
                                placeholder="Bezeichnung (z.B. Erwachsene)"
                                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
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
                                  className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                                />
                                <span className="text-sm text-gray-500">€</span>
                              </div>
                              <input
                                type="number"
                                value={option.maxParticipants || ""}
                                onChange={(e) =>
                                  updatePriceOption(
                                    option.id,
                                    "maxParticipants",
                                    e.target.value ? parseInt(e.target.value) : undefined,
                                  )
                                }
                                min="1"
                                placeholder="Max. Plätze (optional)"
                                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                              />
                            </div>
                            <input
                              type="text"
                              value={option.description}
                              onChange={(e) =>
                                updatePriceOption(option.id, "description", e.target.value)
                              }
                              placeholder="Beschreibung (optional)"
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
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

          {/* Additional Info */}
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">
              Zusätzliche Informationen
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-text">
                  Voraussetzungen
                </label>
                <textarea
                  value={prerequisites}
                  onChange={(e) => setPrerequisites(e.target.value)}
                  rows={3}
                  placeholder="z.B. Mindestens 2 Jahre Spielerfahrung"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-text">
                  Mitzubringen
                </label>
                <textarea
                  value={whatToBring}
                  onChange={(e) => setWhatToBring(e.target.value)}
                  rows={3}
                  placeholder="z.B. Eigenes Instrument, Notenständer"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                />
              </div>
            </div>
          </section>

          {/* Custom Fields */}
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                  Zusätzliche Anmeldefelder
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Definiere zusätzliche Felder, die bei der Anmeldung abgefragt werden
                </p>
              </div>
              <button
                type="button"
                onClick={addCustomField}
                className="text-sm font-medium text-primary hover:text-primary/80"
              >
                + Feld hinzufügen
              </button>
            </div>

            {customFields.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Keine zusätzlichen Felder definiert.
              </p>
            ) : (
              <div className="space-y-4">
                {customFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="rounded-lg border border-gray-200 p-4 dark:border-dark-border"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Feld {index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveCustomField(field.id, "up")}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveCustomField(field.id, "down")}
                          disabled={index === customFields.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCustomField(field.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                          Feldname *
                        </label>
                        <input
                          type="text"
                          value={field.fieldName}
                          onChange={(e) => updateCustomField(field.id, "fieldName", e.target.value)}
                          placeholder="z.B. Ernährungsbesonderheiten"
                          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                          Feldtyp
                        </label>
                        <select
                          value={field.fieldType}
                          onChange={(e) => updateCustomField(field.id, "fieldType", e.target.value as CustomFieldType)}
                          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                        >
                          {Object.entries(customFieldTypeLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {field.fieldType === "SELECT" && (
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                            Auswahloptionen (kommagetrennt)
                          </label>
                          <input
                            type="text"
                            value={field.options}
                            onChange={(e) => updateCustomField(field.id, "options", e.target.value)}
                            placeholder="z.B. Option 1, Option 2, Option 3"
                            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                          />
                        </div>
                      )}

                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                          Hilfetext
                        </label>
                        <input
                          type="text"
                          value={field.helpText}
                          onChange={(e) => updateCustomField(field.id, "helpText", e.target.value)}
                          placeholder="z.B. Bitte gib eventuelle Allergien an"
                          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                        />
                      </div>

                      <div>
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={field.isRequired}
                            onChange={(e) => updateCustomField(field.id, "isRequired", e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-gray-700 dark:text-dark-text">
                            Pflichtfeld
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Publication Status */}
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">
              Veröffentlichung
            </h2>
            <div className="space-y-4">
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
                      className="mt-0.5 h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="font-medium text-gray-700 dark:text-dark-text">
                        Direkt veröffentlichen
                      </span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Der Kurs wird sofort auf der Webseite angezeigt.
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
                      className="mt-0.5 h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="font-medium text-gray-700 dark:text-dark-text">
                        Zur Prüfung einreichen
                      </span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Der Kurs wird zur Prüfung durch einen Redakteur eingereicht.
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
                      className="mt-0.5 h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="font-medium text-gray-700 dark:text-dark-text">
                        Als Entwurf speichern
                      </span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Der Kurs wird noch nicht veröffentlicht und ist nur für dich sichtbar.
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
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="font-medium text-gray-700 dark:text-dark-text">
                        Als Entwurf speichern
                      </span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Der Kurs wird noch nicht zur Prüfung eingereicht und ist nur für dich sichtbar.
                      </p>
                    </div>
                  </label>

                  {!submitAsDraft && (
                    <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>Hinweis:</strong> Nach dem Erstellen wird der Kurs zur Prüfung eingereicht. Ein Redakteur wird den Kurs prüfen und freigeben.
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
              href="/dashboard/courses"
              className="rounded-lg border border-gray-300 px-6 py-2.5 text-center font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-dark-border dark:text-dark-text dark:hover:bg-gray-700"
            >
              Abbrechen
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || createCourseMutation.isPending}
              className="rounded-lg bg-primary px-6 py-2.5 font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting || createCourseMutation.isPending
                ? "Wird erstellt..."
                : submitAsDraft
                  ? "Entwurf speichern"
                  : submitAsApproved
                    ? "Veröffentlichen"
                    : "Kurs einreichen"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
