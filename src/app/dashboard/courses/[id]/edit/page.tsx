"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { getErrorMessage } from "@/lib/utils";
import { useToast } from "@/app/_components/ui/toast";
import {
  CourseType,
  TargetAudience,
  ContentStatus,
  UserRole,
  CustomFieldType,
} from "~/generated/prisma/enums";
import {
  Lock,
  AlertTriangle,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  AlertTriangleIcon,
} from "lucide-react";

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

const customFieldTypeLabels: Record<CustomFieldType, string> = {
  TEXT: "Text",
  NUMBER: "Zahl",
  SELECT: "Auswahl",
  CHECKBOX: "Checkbox",
  TEXTAREA: "Mehrzeiliger Text",
};

const HIGHER_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.LPW, UserRole.RPW];

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

interface CustomField {
  id: string;
  fieldName: string;
  fieldType: CustomFieldType;
  options: string;
  isRequired: boolean;
  helpText: string;
  sortOrder: number;
}

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);

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
  const [showNewLocationForm, setShowNewLocationForm] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: "",
    street: "",
    zipCode: "",
    city: "",
    additionalInfo: "",
  });
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [allowWaitingList, setAllowWaitingList] = useState(false);
  const [isFree, setIsFree] = useState(true);
  const [priceInfo, setPriceInfo] = useState("");
  const [priceOptions, setPriceOptions] = useState<PriceOption[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [prerequisites, setPrerequisites] = useState("");
  const [whatToBring, setWhatToBring] = useState("");
  const [status, setStatus] = useState<ContentStatus>(ContentStatus.DRAFT);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [customFieldsChanged, setCustomFieldsChanged] = useState(false);
  const [originalCustomFields, setOriginalCustomFields] = useState<
    CustomField[]
  >([]);

  const locationDropdownRef = useRef<HTMLDivElement>(null);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, { enabled: !!session?.user });

  const { data: course, isLoading: courseLoading } =
    api.courses.getById.useQuery(
      { id: courseId },
      { enabled: !!courseId && !!session?.user },
    );

  const { data: bezirke } = api.bezirke.getAll.useQuery();

  const { data: locations } = api.locations.getAll.useQuery({ limit: 100 });

  const filteredLocations = locations?.locations.filter((loc) => {
    const searchLower = locationSearch.toLowerCase();
    return (
      loc.city.toLowerCase().includes(searchLower) ||
      (loc.name && loc.name.toLowerCase().includes(searchLower)) ||
      (loc.street && loc.street.toLowerCase().includes(searchLower))
    );
  });

  const isHigherRole = profile && HIGHER_ROLES.includes(profile.role);
  const userBezirkId = profile?.bezirkId ?? null;

  /* eslint-disable react-hooks/set-state-in-effect -- Initializing form state from server data is a valid pattern */
  useEffect(() => {
    if (course && !isInitialized) {
      setTitle(course.title);
      setMotto(course.motto || "");
      setDescription(course.description);

      const start = new Date(course.startDate);
      setStartDate(start.toISOString().split("T")[0] || "");
      const end = new Date(course.endDate);
      setEndDate(end.toISOString().split("T")[0] || "");

      setCourseType(course.courseType);
      setTargetAudience(course.targetAudience || "");
      setBezirkId(course.bezirkId || "");
      setStatus(course.status);

      if (course.location) {
        setLocationId(course.location.id);
        setLocationSearch(
          `${course.location.name ? course.location.name + ", " : ""}${course.location.city}`,
        );
      }

      setRegistrationOpen(course.registrationOpen);
      if (course.registrationDeadline) {
        const deadline = new Date(course.registrationDeadline);
        setRegistrationDeadline(deadline.toISOString().split("T")[0] || "");
      }
      setMaxParticipants(course.maxParticipants?.toString() || "");
      setAllowWaitingList(course.allowWaitingList);

      setIsFree(course.isFree);
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
      }

      if (course.customFields && course.customFields.length > 0) {
        const fields: CustomField[] = course.customFields.map((cf) => ({
          id: cf.id,
          fieldName: cf.fieldName,
          fieldType: cf.fieldType,
          options:
            typeof cf.options === "string"
              ? cf.options
              : cf.options
                ? JSON.stringify(cf.options)
                : "",
          isRequired: cf.isRequired,
          helpText: cf.helpText || "",
          sortOrder: cf.sortOrder,
        }));
        setCustomFields(fields);
        setOriginalCustomFields(fields);
      }

      setPrerequisites(course.prerequisites || "");
      setWhatToBring(course.whatToBring || "");

      setIsInitialized(true);
    }
  }, [course, isInitialized]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const utils = api.useUtils();

  const updateCourseMutation = api.courses.update.useMutation({
    onSuccess: async () => {
      await utils.courses.getById.invalidate({ id: courseId });
      toast.success("Kurs erfolgreich aktualisiert");
      router.push(`/dashboard/courses/${courseId}`);
    },
    onError: (err) => {
      setError(getErrorMessage(err));
      setIsSubmitting(false);
      toast.error("Fehler beim Aktualisieren: " + getErrorMessage(err));
    },
  });

  const createLocationMutation = api.locations.create.useMutation({
    onSuccess: async (location) => {
      await utils.locations.getAll.invalidate();
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

  const handleCreateLocation = () => {
    if (!newLocation.city) {
      setError("Bitte gib mindestens eine Stadt an.");
      return;
    }
    createLocationMutation.mutate(newLocation);
  };

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/courses/${courseId}/edit`);
    }
  }, [session, sessionLoading, router, courseId]);

  useEffect(() => {
    if (!profileLoading && profile && !hasRedirected.current) {
      if (!DASHBOARD_ROLES.includes(profile.role)) {
        hasRedirected.current = true;
        router.push("/");
      }
    }
  }, [profile, profileLoading, router]);

  useEffect(() => {
    if (course && profile && !hasRedirected.current) {
      const isCreator = course.createdById === session?.user?.id;
      const isHigherRoleUser = HIGHER_ROLES.includes(profile.role);
      const isObleuteForDistrict =
        profile.role === UserRole.OBLEUTE &&
        profile.bezirkId &&
        course.bezirkId === profile.bezirkId;

      const canEdit = isCreator || isHigherRoleUser || isObleuteForDistrict;

      if (!canEdit) {
        hasRedirected.current = true;
        router.push(`/dashboard/courses/${courseId}`);
      }
    }
  }, [course, profile, session, router, courseId]);

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

  const hasRegistrations = (course?._count?.participants ?? 0) > 0;
  const registrationCount = course?._count?.participants ?? 0;

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
  };

  const removePriceOption = (id: string) => {
    const newOptions = priceOptions.filter((opt) => opt.id !== id);
    setPriceOptions(newOptions);
  };

  const addCustomField = () => {
    const newFields = [
      ...customFields,
      {
        id: `new-${Date.now()}`,
        fieldName: "",
        fieldType: CustomFieldType.TEXT,
        options: "",
        isRequired: false,
        helpText: "",
        sortOrder: customFields.length,
      },
    ];
    setCustomFields(newFields);
    setCustomFieldsChanged(true);
  };

  const updateCustomField = (
    id: string,
    field: keyof CustomField,
    value: string | boolean | number | CustomFieldType,
  ) => {
    const newFields = customFields.map((cf) =>
      cf.id === id ? { ...cf, [field]: value } : cf,
    );
    setCustomFields(newFields);
    setCustomFieldsChanged(true);
  };

  const removeCustomField = (id: string) => {
    const newFields = customFields.filter((cf) => cf.id !== id);
    setCustomFields(newFields);
    setCustomFieldsChanged(true);
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
    [newFields[index], newFields[newIndex]] = [
      newFields[newIndex]!,
      newFields[index]!,
    ];

    setCustomFields(newFields.map((cf, i) => ({ ...cf, sortOrder: i })));
    setCustomFieldsChanged(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

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

    const preparedCustomFields = customFields
      .filter((cf) => cf.fieldName.trim())
      .map(
        ({
          id,
          fieldName,
          fieldType,
          options,
          isRequired,
          helpText,
          sortOrder,
        }) => ({
          id: id.startsWith("new-") ? undefined : id,
          fieldName: fieldName.trim(),
          fieldType,
          options:
            fieldType === CustomFieldType.SELECT ? options.trim() : undefined,
          isRequired,
          helpText: helpText.trim() || undefined,
          sortOrder,
        }),
      );

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
      registrationDeadline: registrationDeadline
        ? new Date(registrationDeadline)
        : null,
      maxParticipants: parseInt(maxParticipants),
      allowWaitingList,
      isFree,
      priceInfo: priceInfo.trim() || undefined,
      prerequisites: prerequisites.trim() || undefined,
      whatToBring: whatToBring.trim() || undefined,
      priceOptions: preparedPriceOptions,
      customFields: preparedCustomFields,
    });
  };

  if (sessionLoading || profileLoading || courseLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !course) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Kurs nicht gefunden
          </h1>
          <Link
            href="/dashboard/courses"
            className="text-primary mt-4 inline-block hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

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
                href="/dashboard/courses"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Kurse
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li>
              <Link
                href={`/dashboard/courses/${courseId}`}
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                {course.title}
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">Bearbeiten</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
            Kurs bearbeiten
          </h1>
          <p className="dark:text-dark-muted mt-2 text-gray-600">
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
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Grundinformationen
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="title"
                  className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                >
                  Titel *
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-1 focus:outline-none"
                  placeholder="z.B. Bläserlehrgang 2025"
                  required
                  maxLength={200}
                />
              </div>

              <div>
                <label
                  htmlFor="motto"
                  className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                >
                  Motto (optional)
                </label>
                <input
                  type="text"
                  id="motto"
                  value={motto}
                  onChange={(e) => setMotto(e.target.value)}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-1 focus:outline-none"
                  placeholder="z.B. Gemeinsam musizieren"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                >
                  Beschreibung *
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-1 focus:outline-none"
                  placeholder="Beschreibe den Kurs..."
                  required
                  maxLength={10000}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="courseType"
                    className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                  >
                    Kurstyp *
                  </label>
                  <select
                    id="courseType"
                    value={courseType}
                    onChange={(e) =>
                      setCourseType(e.target.value as CourseType)
                    }
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-1 focus:outline-none"
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
                    className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                  >
                    Zielgruppe (optional)
                  </label>
                  <select
                    id="targetAudience"
                    value={targetAudience}
                    onChange={(e) =>
                      setTargetAudience(e.target.value as TargetAudience | "")
                    }
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-1 focus:outline-none"
                  >
                    <option value="">Keine Angabe</option>
                    {Object.entries(targetAudienceLabels).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Date & Location */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Datum & Ort
            </h2>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="startDate"
                    className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                  >
                    Startdatum *
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-1 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="endDate"
                    className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                  >
                    Enddatum *
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || undefined}
                    title="Enddatum muss nach oder gleich dem Startdatum sein"
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-1 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="bezirk"
                  className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                >
                  Bezirk
                </label>
                {!isHigherRole && userBezirkId ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={
                        bezirke?.find((b) => b.id === userBezirkId)
                          ? `Bezirk ${bezirke.find((b) => b.id === userBezirkId)?.number} – ${bezirke.find((b) => b.id === userBezirkId)?.name}`
                          : "Wird geladen..."
                      }
                      disabled
                      className="dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-gray-900 opacity-60"
                    />
                    <Lock className="h-5 w-5 shrink-0 text-gray-400" />
                  </div>
                ) : (
                  <select
                    id="bezirk"
                    value={bezirkId}
                    onChange={(e) => setBezirkId(e.target.value)}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-1 focus:outline-none"
                  >
                    <option value="">Übergreifend / Kein Bezirk</option>
                    {bezirke?.map((bezirk) => (
                      <option key={bezirk.id} value={bezirk.id}>
                        Bezirk {bezirk.number} – {bezirk.shortName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div ref={locationDropdownRef} className="relative">
                <label
                  htmlFor="location"
                  className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
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
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-1 focus:outline-none"
                  placeholder="Suche nach Ort..."
                  autoComplete="off"
                />
                {showLocationDropdown && (
                  <div className="dark:border-dark-border dark:bg-dark-surface absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                    <div
                      className="overflow-y-auto"
                      style={{ maxHeight: "240px" }}
                    >
                      {filteredLocations && filteredLocations.length > 0 ? (
                        filteredLocations.map((loc) => (
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
                            <span className="dark:text-dark-text font-medium text-gray-900">
                              {loc.name ? `${loc.name}, ` : ""}
                              {loc.city}
                            </span>
                            {loc.street && (
                              <span className="ml-2 text-sm text-gray-500">
                                {loc.street}
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
                        placeholder="Name (z.B. Jugendherberge, Gemeindehaus)"
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
                        placeholder="Zusätzliche Info (z.B. Anfahrtsbeschreibung)"
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

          {/* Registration Settings */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Anmeldung
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="registrationOpen"
                  checked={registrationOpen}
                  onChange={(e) => setRegistrationOpen(e.target.checked)}
                  className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                />
                <label
                  htmlFor="registrationOpen"
                  className="dark:text-dark-text text-sm font-medium text-gray-700"
                >
                  Anmeldung geöffnet
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="maxParticipants"
                    className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                  >
                    Maximale Teilnehmerzahl *
                  </label>
                  <input
                    type="number"
                    id="maxParticipants"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(e.target.value)}
                    min="1"
                    max="500"
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-1 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="registrationDeadline"
                    className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                  >
                    Anmeldeschluss (optional)
                  </label>
                  <input
                    type="date"
                    id="registrationDeadline"
                    value={registrationDeadline}
                    onChange={(e) => setRegistrationDeadline(e.target.value)}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-1 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="allowWaitingList"
                  checked={allowWaitingList}
                  onChange={(e) => setAllowWaitingList(e.target.checked)}
                  className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                />
                <label
                  htmlFor="allowWaitingList"
                  className="dark:text-dark-text text-sm font-medium text-gray-700"
                >
                  Warteliste aktivieren
                </label>
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Preise
            </h2>

            {/* Warning when there are registrations */}
            {hasRegistrations && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-600 dark:bg-amber-950/50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="dark:text-dark-text font-medium text-gray-700">
                      Preisänderungen nicht möglich
                    </p>
                    <p className="mt-1 text-sm text-amber-700 dark:text-amber-200">
                      Es gibt bereits {registrationCount} Teilnehmer für diesen
                      Kurs. Die Preiskategorien können nicht mehr geändert
                      werden, da dies bestehende Anmeldungen beeinflussen würde.
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
                  }}
                  disabled={hasRegistrations}
                  className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <label
                  htmlFor="isFree"
                  className={`text-sm font-medium ${hasRegistrations ? "text-gray-400 dark:text-gray-500" : "dark:text-dark-text text-gray-700"}`}
                >
                  Kostenlos
                </label>
              </div>

              {!isFree && (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="priceInfo"
                      className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                    >
                      Preisinformationen (optional)
                    </label>
                    <textarea
                      id="priceInfo"
                      value={priceInfo}
                      onChange={(e) => setPriceInfo(e.target.value)}
                      rows={2}
                      className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-1 focus:outline-none"
                      placeholder="z.B. Frühbucherrabatt bis zum..."
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="dark:text-dark-text text-sm font-medium text-gray-700">
                        Preiskategorien
                      </label>
                      {!hasRegistrations && (
                        <button
                          type="button"
                          onClick={addPriceOption}
                          className="text-primary hover:text-primary/80 text-sm font-medium"
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
                            className={`rounded-lg border p-4 ${hasRegistrations ? "dark:border-dark-border dark:bg-dark-background-secondary border-gray-100 bg-gray-50" : "dark:border-dark-border border-gray-200"}`}
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
                                  <TrashIcon className="h-4 w-4" />
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
                                    updatePriceOption(
                                      option.id,
                                      "label",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="z.B. Erwachsene"
                                  disabled={hasRegistrations}
                                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text dark:disabled:bg-dark-background w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:text-gray-500"
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
                                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text dark:disabled:bg-dark-background w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:text-gray-500"
                                  />
                                  <span className="text-sm text-gray-500">
                                    €
                                  </span>
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
                                      e.target.value
                                        ? parseInt(e.target.value)
                                        : null,
                                    )
                                  }
                                  min="1"
                                  max="500"
                                  placeholder="Unbegrenzt"
                                  disabled={hasRegistrations}
                                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text dark:disabled:bg-dark-background w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:text-gray-500"
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
                                  updatePriceOption(
                                    option.id,
                                    "description",
                                    e.target.value,
                                  )
                                }
                                placeholder="z.B. Inkl. Verpflegung und Übernachtung"
                                disabled={hasRegistrations}
                                className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text dark:disabled:bg-dark-background w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:text-gray-500"
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

          {/* Custom Fields */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="dark:text-dark-text text-lg font-semibold text-gray-900">
                  Zusätzliche Anmeldefelder
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Definiere zusätzliche Felder, die bei der Anmeldung abgefragt
                  werden
                </p>
              </div>
              {!hasRegistrations && (
                <button
                  type="button"
                  onClick={addCustomField}
                  className="text-primary hover:text-primary/80 text-sm font-medium"
                >
                  + Feld hinzufügen
                </button>
              )}
            </div>

            {hasRegistrations && customFieldsChanged && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/20">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Hinweis:</strong> Es sind bereits Anmeldungen
                  vorhanden. Die Anmeldefelder können nicht mehr geändert
                  werden.
                </p>
              </div>
            )}

            {hasRegistrations && originalCustomFields.length > 0 && (
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-900/20">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Hinweis:</strong> Es sind bereits {registrationCount}{" "}
                  Anmeldung{registrationCount !== 1 ? "en" : ""} vorhanden. Die
                  Anmeldefelder können nicht mehr geändert werden.
                </p>
              </div>
            )}

            {customFields.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Keine zusätzlichen Felder definiert.
              </p>
            ) : (
              <div className="space-y-4">
                {customFields.map((field, index) => (
                  <div
                    key={field.id}
                    className={`rounded-lg border p-4 ${hasRegistrations ? "dark:border-dark-border dark:bg-dark-background-secondary border-gray-100 bg-gray-50" : "dark:border-dark-border border-gray-200"}`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Feld {index + 1}
                      </span>
                      {!hasRegistrations && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveCustomField(field.id, "up")}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <ArrowUpIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveCustomField(field.id, "down")}
                            disabled={index === customFields.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <ArrowDownIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeCustomField(field.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                          Feldname *
                        </label>
                        <input
                          type="text"
                          value={field.fieldName}
                          onChange={(e) =>
                            updateCustomField(
                              field.id,
                              "fieldName",
                              e.target.value,
                            )
                          }
                          placeholder="z.B. Ernährungsbesonderheiten"
                          disabled={hasRegistrations}
                          className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text dark:disabled:bg-dark-background block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:text-gray-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                          Feldtyp
                        </label>
                        <select
                          value={field.fieldType}
                          onChange={(e) =>
                            updateCustomField(
                              field.id,
                              "fieldType",
                              e.target.value as CustomFieldType,
                            )
                          }
                          disabled={hasRegistrations}
                          className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text dark:disabled:bg-dark-background block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:text-gray-500"
                        >
                          {Object.entries(customFieldTypeLabels).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                      </div>

                      {field.fieldType === CustomFieldType.SELECT && (
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                            Auswahloptionen (kommagetrennt)
                          </label>
                          <input
                            type="text"
                            value={field.options}
                            onChange={(e) =>
                              updateCustomField(
                                field.id,
                                "options",
                                e.target.value,
                              )
                            }
                            placeholder="z.B. Option 1, Option 2, Option 3"
                            disabled={hasRegistrations}
                            className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text dark:disabled:bg-dark-background block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:text-gray-500"
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
                          onChange={(e) =>
                            updateCustomField(
                              field.id,
                              "helpText",
                              e.target.value,
                            )
                          }
                          placeholder="z.B. Bitte gib eventuelle Allergien an"
                          disabled={hasRegistrations}
                          className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text dark:disabled:bg-dark-background block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:text-gray-500"
                        />
                      </div>

                      <div>
                        <label
                          className={`flex items-center gap-2 ${hasRegistrations ? "cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <input
                            type="checkbox"
                            checked={field.isRequired}
                            onChange={(e) =>
                              updateCustomField(
                                field.id,
                                "isRequired",
                                e.target.checked,
                              )
                            }
                            disabled={hasRegistrations}
                            className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                          <span
                            className={`text-sm ${hasRegistrations ? "text-gray-400 dark:text-gray-500" : "dark:text-dark-text text-gray-700"}`}
                          >
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

          {/* Additional Info */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Weitere Informationen
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="prerequisites"
                  className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                >
                  Voraussetzungen (optional)
                </label>
                <textarea
                  id="prerequisites"
                  value={prerequisites}
                  onChange={(e) => setPrerequisites(e.target.value)}
                  rows={3}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-1 focus:outline-none"
                  placeholder="z.B. Grundkenntnisse auf dem Instrument"
                />
              </div>

              <div>
                <label
                  htmlFor="whatToBring"
                  className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                >
                  Mitzubringen (optional)
                </label>
                <textarea
                  id="whatToBring"
                  value={whatToBring}
                  onChange={(e) => setWhatToBring(e.target.value)}
                  rows={3}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-1 focus:outline-none"
                  placeholder="z.B. Instrument, Notenständer, ..."
                />
              </div>
            </div>
          </section>

          {/* Status section */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Status
            </h2>

            {/* Notice for approved/rejected courses being edited */}
            {(course?.status === ContentStatus.APPROVED ||
              course?.status === ContentStatus.REJECTED) &&
              !isHigherRole && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500" />
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
              className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-6 py-2.5 text-center font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Abbrechen
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || updateCourseMutation.isPending}
              className="bg-primary hover:bg-primary/90 rounded-lg px-6 py-2.5 font-medium text-white transition-colors disabled:opacity-50"
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
