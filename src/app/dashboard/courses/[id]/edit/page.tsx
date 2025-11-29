"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import {
  CourseType,
  TargetAudience,
  ContentStatus,
  UserRole,
} from "~/generated/prisma/enums";

const courseTypeLabels: Record<CourseType, string> = {
  LEHRGANG: "Lehrgang",
  FREIZEIT: "Freizeit",
  WORKSHOP: "Workshop",
  KOMPONISTENPORTRAIT: "Komponistenportrait",
  OTHER: "Sonstiges",
};

const targetAudienceLabels: Record<TargetAudience, string> = {
  ANFAENGER: "Anfänger",
  FORTGESCHRITTENE: "Fortgeschrittene",
  DIRIGENTEN: "Dirigenten",
  JUGEND: "Jugend",
  ALLE: "Alle",
};

const statusLabels: Record<ContentStatus, string> = {
  DRAFT: "Entwurf",
  PENDING: "Zur Prüfung",
  APPROVED: "Veröffentlicht",
  REJECTED: "Abgelehnt",
  ARCHIVED: "Archiviert",
};

// Roles that can edit courses for any district
const HIGHER_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.LPW];

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
  maxParticipants?: number | null;
}

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const hasRedirected = useRef(false);

  // Form state
  const [title, setTitle] = useState("");
  const [motto, setMotto] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [courseType, setCourseType] = useState<CourseType>(CourseType.LEHRGANG);
  const [targetAudience, setTargetAudience] = useState<TargetAudience | "">("");
  const [bezirkId, setBezirkId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [allowWaitingList, setAllowWaitingList] = useState(false);
  const [isFree, setIsFree] = useState(true);
  const [priceInfo, setPriceInfo] = useState("");
  const [priceOptions, setPriceOptions] = useState<PriceOption[]>([]);
  const [prerequisites, setPrerequisites] = useState("");
  const [whatToBring, setWhatToBring] = useState("");
  const [status, setStatus] = useState<ContentStatus>(ContentStatus.DRAFT);

  // UI state
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pricesChanged, setPricesChanged] = useState(false);
  const [originalPriceOptions, setOriginalPriceOptions] = useState<PriceOption[]>([]);
  const [originalIsFree, setOriginalIsFree] = useState(true);

  // Refs for click outside handling
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = api.users.getMyProfile.useQuery(
    undefined,
    { enabled: !!session?.user },
  );

  // Fetch course data
  const { data: course, isLoading: courseLoading } = api.courses.getById.useQuery(
    { id: courseId },
    { enabled: !!courseId && !!session?.user },
  );

  // Fetch bezirke
  const { data: bezirke } = api.bezirke.getAll.useQuery();

  // Fetch locations
  const { data: locations } = api.locations.getAll.useQuery({ limit: 100 });

  // Filter locations based on search
  const filteredLocations = locations?.locations.filter((loc) => {
    const searchLower = locationSearch.toLowerCase();
    return (
      loc.city.toLowerCase().includes(searchLower) ||
      (loc.name && loc.name.toLowerCase().includes(searchLower)) ||
      (loc.street && loc.street.toLowerCase().includes(searchLower))
    );
  });

  const isHigherRole = profile && HIGHER_ROLES.includes(profile.role);

  // Initialize form from course data
  useEffect(() => {
    if (course && !isInitialized) {
      setTitle(course.title);
      setMotto(course.motto || "");
      setDescription(course.description);
      
      // Format dates for input
      const start = new Date(course.startDate);
      setStartDate(start.toISOString().split("T")[0] || "");
      const end = new Date(course.endDate);
      setEndDate(end.toISOString().split("T")[0] || "");
      
      setCourseType(course.courseType);
      setTargetAudience(course.targetAudience || "");
      setBezirkId(course.bezirkId || "");
      setStatus(course.status);

      // Location
      if (course.location) {
        setLocationId(course.location.id);
        setLocationSearch(
          `${course.location.name ? course.location.name + ", " : ""}${course.location.city}`,
        );
      }

      // Registration
      setRegistrationOpen(course.registrationOpen);
      if (course.registrationDeadline) {
        const deadline = new Date(course.registrationDeadline);
        setRegistrationDeadline(deadline.toISOString().split("T")[0] || "");
      }
      setMaxParticipants(course.maxParticipants?.toString() || "");
      setAllowWaitingList(course.allowWaitingList);

      // Pricing
      setIsFree(course.isFree);
      setOriginalIsFree(course.isFree);
      setPriceInfo(course.priceInfo || "");
      if (course.priceOptions && course.priceOptions.length > 0) {
        const options = course.priceOptions.map((opt) => ({
          id: opt.id,
          price: opt.price,
          label: opt.label,
          description: opt.description || "",
          maxParticipants: opt.maxParticipants,
        }));
        setPriceOptions(options);
        setOriginalPriceOptions(options);
      }

      // Additional info
      setPrerequisites(course.prerequisites || "");
      setWhatToBring(course.whatToBring || "");

      setIsInitialized(true);
    }
  }, [course, isInitialized]);

  // tRPC utils for cache invalidation
  const utils = api.useUtils();

  // Update course mutation
  const updateCourseMutation = api.courses.update.useMutation({
    onSuccess: async () => {
      await utils.courses.getById.invalidate({ id: courseId });
      router.push(`/dashboard/courses/${courseId}`);
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
      router.push(`/login?callbackUrl=/dashboard/courses/${courseId}/edit`);
    }
  }, [session, sessionLoading, router, courseId]);

  // Redirect if user doesn't have dashboard access
  useEffect(() => {
    if (!profileLoading && profile && !hasRedirected.current) {
      if (!DASHBOARD_ROLES.includes(profile.role)) {
        hasRedirected.current = true;
        router.push("/");
      }
    }
  }, [profile, profileLoading, router]);

  // Check edit permissions once course is loaded
  useEffect(() => {
    if (course && profile && !hasRedirected.current) {
      const canEdit =
        course.createdById === session?.user?.id ||
        profile.role === UserRole.ADMIN ||
        profile.role === UserRole.LPW;

      if (!canEdit) {
        hasRedirected.current = true;
        router.push(`/dashboard/courses/${courseId}`);
      }
    }
  }, [course, profile, session, router, courseId]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        locationDropdownRef.current &&
        !locationDropdownRef.current.contains(event.target as Node)
      ) {
        setShowLocationDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check if course has registrations
  const hasRegistrations = (course?._count?.participants ?? 0) > 0;
  const registrationCount = course?._count?.participants ?? 0;

  // Check if prices have changed from original
  const checkPricesChanged = (newOptions: PriceOption[], newIsFree: boolean) => {
    if (newIsFree !== originalIsFree) {
      setPricesChanged(true);
      return;
    }
    if (newOptions.length !== originalPriceOptions.length) {
      setPricesChanged(true);
      return;
    }
    const changed = newOptions.some((opt, index) => {
      const original = originalPriceOptions[index];
      return (
        opt.label !== original?.label ||
        opt.price !== original?.price ||
        opt.maxParticipants !== original?.maxParticipants
      );
    });
    setPricesChanged(changed);
  };

  const addPriceOption = () => {
    const newOptions = [
      ...priceOptions,
      {
        id: `new-${Date.now()}`,
        price: 0,
        label: "",
        description: "",
      },
    ];
    setPriceOptions(newOptions);
    if (hasRegistrations) {
      checkPricesChanged(newOptions, isFree);
    }
  };

  const updatePriceOption = (
    id: string,
    field: keyof PriceOption,
    value: string | number | null,
  ) => {
    const newOptions = priceOptions.map((opt) =>
      opt.id === id ? { ...opt, [field]: value } : opt,
    );
    setPriceOptions(newOptions);
    if (hasRegistrations) {
      checkPricesChanged(newOptions, isFree);
    }
  };

  const removePriceOption = (id: string) => {
    const newOptions = priceOptions.filter((opt) => opt.id !== id);
    setPriceOptions(newOptions);
    if (hasRegistrations) {
      checkPricesChanged(newOptions, isFree);
    }
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

    if (!startDate || !endDate) {
      setError("Bitte wähle Start- und Enddatum aus.");
      setIsSubmitting(false);
      return;
    }

    if (!maxParticipants || parseInt(maxParticipants) < 1) {
      setError("Bitte gib die maximale Teilnehmerzahl an.");
      setIsSubmitting(false);
      return;
    }

    // Prepare price options
    const preparedPriceOptions = !isFree
      ? priceOptions
          .filter((opt) => opt.label && opt.price >= 0)
          .map(({ id, label, price, description, maxParticipants }) => ({
            id: id.startsWith("new-") ? undefined : id,
            label,
            price,
            description: description || undefined,
            maxParticipants: maxParticipants || undefined,
          }))
      : [];

    // If the course was approved/rejected and content is being changed, set status back to pending
    let finalStatus = status;
    if (
      (course?.status === ContentStatus.APPROVED && status === ContentStatus.APPROVED) ||
      (course?.status === ContentStatus.REJECTED && status === ContentStatus.REJECTED)
    ) {
      finalStatus = ContentStatus.PENDING;
    }

    updateCourseMutation.mutate({
      id: courseId,
      title: title.trim(),
      motto: motto.trim() || undefined,
      description: description.trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      locationId: locationId || null,
      courseType,
      targetAudience: targetAudience || null,
      bezirkId: bezirkId || null,
      registrationOpen,
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
      maxParticipants: parseInt(maxParticipants),
      allowWaitingList,
      isFree,
      priceInfo: priceInfo.trim() || undefined,
      prerequisites: prerequisites.trim() || undefined,
      whatToBring: whatToBring.trim() || undefined,
      priceOptions: preparedPriceOptions,
    });
  };

  // Loading state
  if (sessionLoading || profileLoading || courseLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-dark-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!session || !course) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-dark-background">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-dark-text">
            Kurs nicht gefunden
          </h1>
          <Link
            href="/dashboard/courses"
            className="mt-4 inline-block text-primary hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
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
            <li>
              <Link
                href={`/dashboard/courses/${courseId}`}
                className="text-gray-500 hover:text-primary dark:text-dark-muted dark:hover:text-primary"
              >
                {course.title}
              </Link>
            </li>
            <li className="text-gray-400 dark:text-dark-muted">/</li>
            <li className="text-gray-900 dark:text-dark-text">Bearbeiten</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text">
            Kurs bearbeiten
          </h1>
          <p className="mt-2 text-gray-600 dark:text-dark-muted">
            Bearbeite die Kursinformationen
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">
              Grundinformationen
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="title"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-text"
                >
                  Titel *
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                  placeholder="z.B. Bläserlehrgang 2025"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="motto"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-text"
                >
                  Motto (optional)
                </label>
                <input
                  type="text"
                  id="motto"
                  value={motto}
                  onChange={(e) => setMotto(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                  placeholder="z.B. Gemeinsam musizieren"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-text"
                >
                  Beschreibung *
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                  placeholder="Beschreibe den Kurs..."
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="courseType"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-text"
                  >
                    Kurstyp *
                  </label>
                  <select
                    id="courseType"
                    value={courseType}
                    onChange={(e) => setCourseType(e.target.value as CourseType)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                  >
                    {Object.entries(courseTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="targetAudience"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-text"
                  >
                    Zielgruppe (optional)
                  </label>
                  <select
                    id="targetAudience"
                    value={targetAudience}
                    onChange={(e) =>
                      setTargetAudience(e.target.value as TargetAudience | "")
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                  >
                    <option value="">Keine Angabe</option>
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

          {/* Date & Location */}
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">
              Datum & Ort
            </h2>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="startDate"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-text"
                  >
                    Startdatum *
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="endDate"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-text"
                  >
                    Enddatum *
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="bezirk"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-text"
                >
                  Bezirk (optional)
                </label>
                <select
                  id="bezirk"
                  value={bezirkId}
                  onChange={(e) => setBezirkId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                >
                  <option value="">Übergreifend / Kein Bezirk</option>
                  {bezirke?.map((bezirk) => (
                    <option key={bezirk.id} value={bezirk.id}>
                      Bezirk {bezirk.number} - {bezirk.name}
                    </option>
                  ))}
                </select>
              </div>

              <div ref={locationDropdownRef} className="relative">
                <label
                  htmlFor="location"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-text"
                >
                  Veranstaltungsort (optional)
                </label>
                <input
                  type="text"
                  id="location"
                  value={locationSearch}
                  onChange={(e) => {
                    setLocationSearch(e.target.value);
                    setShowLocationDropdown(true);
                    if (!e.target.value) {
                      setLocationId("");
                    }
                  }}
                  onFocus={() => setShowLocationDropdown(true)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                  placeholder="Suche nach Ort..."
                  autoComplete="off"
                />
                {showLocationDropdown && filteredLocations && filteredLocations.length > 0 && (
                  <div
                    className="absolute z-10 mt-1 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-dark-border dark:bg-dark-surface"
                    style={{ maxHeight: "240px" }}
                  >
                    {filteredLocations.map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => {
                          setLocationId(loc.id);
                          setLocationSearch(
                            `${loc.name ? loc.name + ", " : ""}${loc.city}`,
                          );
                          setShowLocationDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <span className="font-medium text-gray-900 dark:text-dark-text">
                          {loc.name ? `${loc.name}, ` : ""}
                          {loc.city}
                        </span>
                        {loc.street && (
                          <span className="ml-2 text-sm text-gray-500">
                            {loc.street}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Registration Settings */}
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">
              Anmeldung
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="registrationOpen"
                  checked={registrationOpen}
                  onChange={(e) => setRegistrationOpen(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label
                  htmlFor="registrationOpen"
                  className="text-sm font-medium text-gray-700 dark:text-dark-text"
                >
                  Anmeldung geöffnet
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="maxParticipants"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-text"
                  >
                    Maximale Teilnehmerzahl *
                  </label>
                  <input
                    type="number"
                    id="maxParticipants"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(e.target.value)}
                    min="1"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="registrationDeadline"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-text"
                  >
                    Anmeldeschluss (optional)
                  </label>
                  <input
                    type="date"
                    id="registrationDeadline"
                    value={registrationDeadline}
                    onChange={(e) => setRegistrationDeadline(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="allowWaitingList"
                  checked={allowWaitingList}
                  onChange={(e) => setAllowWaitingList(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label
                  htmlFor="allowWaitingList"
                  className="text-sm font-medium text-gray-700 dark:text-dark-text"
                >
                  Warteliste aktivieren
                </label>
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">
              Preise
            </h2>

            {/* Warning when there are registrations */}
            {hasRegistrations && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-600 dark:bg-amber-950/50">
                <div className="flex items-start gap-3">
                  <svg
                    className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
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
                    <p className="font-medium text-gray-700 dark:text-dark-text">
                      Preisänderungen nicht möglich
                    </p>
                    <p className="mt-1 text-sm text-amber-700 dark:text-amber-200">
                      Es gibt bereits {registrationCount} Teilnehmer für diesen Kurs. 
                      Die Preiskategorien können nicht mehr geändert werden, da dies 
                      bestehende Anmeldungen beeinflussen würde.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isFree"
                  checked={isFree}
                  onChange={(e) => {
                    setIsFree(e.target.checked);
                    if (hasRegistrations) {
                      checkPricesChanged(priceOptions, e.target.checked);
                    }
                  }}
                  disabled={hasRegistrations}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                />
                <label
                  htmlFor="isFree"
                  className={`text-sm font-medium ${hasRegistrations ? "text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-dark-text"}`}
                >
                  Kostenlos
                </label>
              </div>

              {!isFree && (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="priceInfo"
                      className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-text"
                    >
                      Preisinformationen (optional)
                    </label>
                    <textarea
                      id="priceInfo"
                      value={priceInfo}
                      onChange={(e) => setPriceInfo(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                      placeholder="z.B. Frühbucherrabatt bis zum..."
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 dark:text-dark-text">
                        Preiskategorien
                      </label>
                      {!hasRegistrations && (
                        <button
                          type="button"
                          onClick={addPriceOption}
                          className="text-sm font-medium text-primary hover:text-primary/80"
                        >
                          + Kategorie hinzufügen
                        </button>
                      )}
                    </div>

                    {priceOptions.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Noch keine Preiskategorien angelegt
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {priceOptions.map((option, index) => (
                          <div
                            key={option.id}
                            className={`rounded-lg border p-4 ${hasRegistrations ? "border-gray-100 bg-gray-50 dark:border-dark-border dark:bg-dark-background-secondary" : "border-gray-200 dark:border-dark-border"}`}
                          >
                            <div className="mb-3 flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                Preiskategorie {index + 1}
                              </span>
                              {!hasRegistrations && (
                                <button
                                  type="button"
                                  onClick={() => removePriceOption(option.id)}
                                  className="p-1 text-gray-400 hover:text-red-500"
                                  title="Kategorie entfernen"
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
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>
                            <div className="grid gap-4 sm:grid-cols-3">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                                  Bezeichnung
                                </label>
                                <input
                                  type="text"
                                  value={option.label}
                                  onChange={(e) =>
                                    updatePriceOption(option.id, "label", e.target.value)
                                  }
                                  placeholder="z.B. Erwachsene"
                                  disabled={hasRegistrations}
                                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text dark:disabled:bg-dark-background dark:disabled:text-gray-500"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                                  Preis (€)
                                </label>
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
                                    disabled={hasRegistrations}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text dark:disabled:bg-dark-background dark:disabled:text-gray-500"
                                  />
                                  <span className="text-sm text-gray-500">€</span>
                                </div>
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                                  Max. Teilnehmer
                                </label>
                                <input
                                  type="number"
                                  value={option.maxParticipants || ""}
                                  onChange={(e) =>
                                    updatePriceOption(
                                      option.id,
                                      "maxParticipants",
                                      e.target.value ? parseInt(e.target.value) : null,
                                    )
                                  }
                                  min="1"
                                  placeholder="Unbegrenzt"
                                  disabled={hasRegistrations}
                                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text dark:disabled:bg-dark-background dark:disabled:text-gray-500"
                                />
                              </div>
                            </div>
                            <div className="mt-3">
                              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                                Beschreibung (optional)
                              </label>
                              <input
                                type="text"
                                value={option.description}
                                onChange={(e) =>
                                  updatePriceOption(option.id, "description", e.target.value)
                                }
                                placeholder="z.B. Inkl. Verpflegung und Übernachtung"
                                disabled={hasRegistrations}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text dark:disabled:bg-dark-background dark:disabled:text-gray-500"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Additional Info */}
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">
              Weitere Informationen
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="prerequisites"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-text"
                >
                  Voraussetzungen (optional)
                </label>
                <textarea
                  id="prerequisites"
                  value={prerequisites}
                  onChange={(e) => setPrerequisites(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                  placeholder="z.B. Grundkenntnisse auf dem Instrument"
                />
              </div>

              <div>
                <label
                  htmlFor="whatToBring"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-text"
                >
                  Mitzubringen (optional)
                </label>
                <textarea
                  id="whatToBring"
                  value={whatToBring}
                  onChange={(e) => setWhatToBring(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                  placeholder="z.B. Instrument, Notenständer, ..."
                />
              </div>
            </div>
          </section>

          {/* Status section */}
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">
              Status
            </h2>

            {/* Notice for approved/rejected courses being edited */}
            {(course?.status === ContentStatus.APPROVED ||
              course?.status === ContentStatus.REJECTED) &&
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
                        {course?.status === ContentStatus.APPROVED
                          ? "Hinweis zur erneuten Freigabe"
                          : "Hinweis zur erneuten Prüfung"}
                      </p>
                      <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                        {course?.status === ContentStatus.APPROVED
                          ? "Dieser Kurs ist bereits freigegeben. Nach dem Speichern wird er erneut zur Prüfung eingereicht und muss wieder freigegeben werden."
                          : "Dieser Kurs wurde abgelehnt. Nach dem Speichern wird er erneut zur Prüfung eingereicht."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {isHigherRole ? (
              <div className="space-y-3">
                {((course?.status === ContentStatus.APPROVED &&
                  status === ContentStatus.APPROVED) ||
                  (course?.status === ContentStatus.REJECTED &&
                    status === ContentStatus.REJECTED)) && (
                  <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                    Hinweis: Bei Änderungen wird der Status automatisch auf
                    &quot;Ausstehend&quot; zurückgesetzt, es sei denn, du wählst einen
                    anderen Status.
                  </p>
                )}
                {Object.entries(statusLabels).map(([value, label]) => (
                  <label key={value} className="flex cursor-pointer items-center gap-3">
                    <input
                      type="radio"
                      name="status"
                      checked={status === value}
                      onChange={() => setStatus(value as ContentStatus)}
                      className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700 dark:text-dark-text">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Aktueller Status:{" "}
                <span className="font-medium">
                  {statusLabels[course?.status ?? ContentStatus.DRAFT]}
                </span>
                {(course?.status === ContentStatus.APPROVED ||
                  course?.status === ContentStatus.REJECTED) && (
                  <span className="ml-1">→ wird zu &quot;Ausstehend&quot;</span>
                )}
              </p>
            )}
          </section>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href={`/dashboard/courses/${courseId}`}
              className="rounded-lg border border-gray-300 px-6 py-2.5 text-center font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-dark-border dark:text-dark-text dark:hover:bg-gray-700"
            >
              Abbrechen
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || updateCourseMutation.isPending}
              className="rounded-lg bg-primary px-6 py-2.5 font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting || updateCourseMutation.isPending
                ? "Wird gespeichert..."
                : "Änderungen speichern"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
