"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { getErrorMessage } from "@/lib/utils";
import { useToast } from "@/app/_components/ui/toast";
import {
  CourseType,
  TargetAudience,
  CustomFieldType,
  UserRole,
} from "~/generated/prisma/enums";
import { Lock, Trash2 } from "lucide-react";

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

const customFieldTypeLabels: Record<CustomFieldType, string> = {
  TEXT: "Text",
  NUMBER: "Zahl",
  SELECT: "Auswahl",
  CHECKBOX: "Checkbox",
  TEXTAREA: "Mehrzeiliger Text",
};

const ALLOWED_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.LPW,
  UserRole.RPW,
  UserRole.OBLEUTE,
];

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
  const toast = useToast();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, { enabled: !!session?.user });

  const userRole = profile?.role ?? UserRole.USER;
  const isHigherRole = HIGHER_ROLES.includes(userRole);

  const [title, setTitle] = useState("");
  const [motto, setMotto] = useState("");
  const [description, setDescription] = useState("");
  const [courseType, setCourseType] = useState<CourseType>("LEHRGANG");
  const [targetAudience, setTargetAudience] = useState<TargetAudience>("ALLE");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");

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

  const [bezirkId, setBezirkId] = useState<string>("");
  const userBezirkId = profile?.bezirkId ?? null;

  const [maxParticipants, setMaxParticipants] = useState<number>(20);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [allowWaitingList, setAllowWaitingList] = useState(false);

  const [isFree, setIsFree] = useState(false);
  const [priceInfo, setPriceInfo] = useState("");
  const [priceOptions, setPriceOptions] = useState<PriceOption[]>([]);

  const [prerequisites, setPrerequisites] = useState("");
  const [whatToBring, setWhatToBring] = useState("");

  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  const [submitAsDraft, setSubmitAsDraft] = useState(false);
  const [submitAsApproved, setSubmitAsApproved] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: locationsData } = api.locations.getAll.useQuery({
    limit: 100,
    search: locationSearch || undefined,
  });

  const { data: bezirke } = api.bezirke.getAll.useQuery();

  const utils = api.useUtils();

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

  const createCourseMutation = api.courses.create.useMutation({
    onSuccess: (course) => {
      toast.success("Kurs erfolgreich erstellt");
      router.push(`/dashboard/courses/${course.id}`);
    },
    onError: (err) => {
      setError(getErrorMessage(err));
      setIsSubmitting(false);
      toast.error("Fehler beim Erstellen: " + getErrorMessage(err));
    },
  });

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/courses/new");
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!profileLoading && profile && !hasRedirected.current) {
      if (!ALLOWED_ROLES.includes(profile.role)) {
        hasRedirected.current = true;
        router.push("/dashboard");
      }
    }
  }, [profile, profileLoading, router]);

  /* eslint-disable react-hooks/set-state-in-effect -- Initializing form state from server data is a valid pattern */
  useEffect(() => {
    if (!isHigherRole && userBezirkId && !bezirkId) {
      setBezirkId(userBezirkId);
    }
  }, [isHigherRole, userBezirkId, bezirkId]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
      customFields.map((cf) => (cf.id === id ? { ...cf, [field]: value } : cf)),
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
    [newFields[index], newFields[newIndex]] = [
      newFields[newIndex]!,
      newFields[index]!,
    ];

    setCustomFields(newFields.map((cf, i) => ({ ...cf, sortOrder: i })));
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

    const preparedCustomFields = customFields
      .filter((cf) => cf.fieldName.trim())
      .map(
        ({
          fieldName,
          fieldType,
          options,
          isRequired,
          helpText,
          sortOrder,
        }) => ({
          fieldName: fieldName.trim(),
          fieldType,
          options: fieldType === "SELECT" ? options.trim() : undefined,
          isRequired,
          helpText: helpText.trim() || undefined,
          sortOrder,
        }),
      );

    createCourseMutation.mutate({
      title: title.trim(),
      motto: motto.trim() || undefined,
      description: description.trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      registrationDeadline: registrationDeadline
        ? new Date(registrationDeadline)
        : undefined,
      locationId: locationId || undefined,
      bezirkId: bezirkId || undefined,
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
      customFields:
        preparedCustomFields.length > 0 ? preparedCustomFields : undefined,
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
            <li className="dark:text-dark-text text-gray-900">Neuer Kurs</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
            Neuen Kurs erstellen
          </h1>
          <p className="dark:text-dark-muted mt-2 text-gray-600">
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
                  placeholder="z.B. Bläserfreizeit 2025"
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  required
                  maxLength={200}
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
                  placeholder="z.B. Gemeinsam musizieren"
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                />
              </div>

              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Beschreibung *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Beschreibe den Kurs..."
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  required
                  maxLength={10000}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Kursart *
                  </label>
                  <select
                    value={courseType}
                    onChange={(e) =>
                      setCourseType(e.target.value as CourseType)
                    }
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  >
                    {Object.entries(courseTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Zielgruppe
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) =>
                      setTargetAudience(e.target.value as TargetAudience)
                    }
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  >
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

          {/* Date & Time */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Datum & Zeit
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Startdatum *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Enddatum *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || undefined}
                  title="Enddatum muss nach oder gleich dem Startdatum sein"
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Anmeldeschluss
                </label>
                <input
                  type="date"
                  value={registrationDeadline}
                  onChange={(e) => setRegistrationDeadline(e.target.value)}
                  max={startDate || undefined}
                  title="Anmeldeschluss muss vor oder am Startdatum sein"
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
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

          {/* District */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Bezirk
            </h2>
            <div className="space-y-4">
              {!isHigherRole && userBezirkId ? (
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
                    <Lock className="h-5 w-5 shrink-0 text-gray-400" />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Du kannst nur Lehrgänge für deinen eigenen Bezirk erstellen.
                  </p>
                </div>
              ) : !isHigherRole && !userBezirkId ? (
                <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    <strong>Hinweis:</strong> Du bist keinem Bezirk zugeordnet.
                    Bitte wende dich an einen Administrator, um Lehrgänge
                    erstellen zu können.
                  </p>
                </div>
              ) : (
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
                        Bezirk {bezirk.number} – {bezirk.shortName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </section>

          {/* Capacity & Registration */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Kapazität & Anmeldung
            </h2>
            <div className="space-y-4">
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Maximale Teilnehmerzahl *
                </label>
                <input
                  type="number"
                  value={maxParticipants}
                  onChange={(e) =>
                    setMaxParticipants(parseInt(e.target.value) || 0)
                  }
                  min="1"
                  max="500"
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-32 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={registrationOpen}
                    onChange={(e) => setRegistrationOpen(e.target.checked)}
                    className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                  />
                  <span className="dark:text-dark-text text-sm text-gray-700">
                    Anmeldung geöffnet
                  </span>
                </label>

                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={allowWaitingList}
                    onChange={(e) => setAllowWaitingList(e.target.checked)}
                    className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                  />
                  <span className="dark:text-dark-text text-sm text-gray-700">
                    Warteliste erlauben
                  </span>
                </label>
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Preise
            </h2>
            <div className="space-y-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={(e) => setIsFree(e.target.checked)}
                  className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                />
                <span className="dark:text-dark-text text-sm text-gray-700">
                  Kostenloser Kurs
                </span>
              </label>

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
                      ? "z.B. Verpflegung inklusive"
                      : "z.B. Frühbucherrabatt bis 31.01."
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
                      Noch keine Preiskategorien angelegt. Füge mindestens eine
                      hinzu.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {priceOptions.map((option) => (
                        <div
                          key={option.id}
                          className="dark:border-dark-border flex items-start gap-3 rounded-lg border border-gray-200 p-3"
                        >
                          <div className="flex-1 space-y-2">
                            <div className="grid gap-2 sm:grid-cols-3">
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
                              <input
                                type="number"
                                value={option.maxParticipants || ""}
                                onChange={(e) =>
                                  updatePriceOption(
                                    option.id,
                                    "maxParticipants",
                                    e.target.value
                                      ? parseInt(e.target.value)
                                      : undefined,
                                  )
                                }
                                min="1"
                                max="500"
                                placeholder="Max. Plätze (optional)"
                                className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:ring-1 focus:outline-none"
                              />
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
                            <Trash2 className="h-5 w-5" />
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
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Zusätzliche Informationen
            </h2>
            <div className="space-y-4">
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Voraussetzungen
                </label>
                <textarea
                  value={prerequisites}
                  onChange={(e) => setPrerequisites(e.target.value)}
                  rows={3}
                  placeholder="z.B. Mindestens 2 Jahre Spielerfahrung"
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                />
              </div>

              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Mitzubringen
                </label>
                <textarea
                  value={whatToBring}
                  onChange={(e) => setWhatToBring(e.target.value)}
                  rows={3}
                  placeholder="z.B. Eigenes Instrument, Notenständer"
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                />
              </div>
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
              <button
                type="button"
                onClick={addCustomField}
                className="text-primary hover:text-primary/80 text-sm font-medium"
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
                    className="dark:border-dark-border rounded-lg border border-gray-200 p-4"
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
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveCustomField(field.id, "down")}
                          disabled={index === customFields.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
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
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCustomField(field.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
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
                              d="M6 18L18 6M6 6l12 12"
                            />
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
                          onChange={(e) =>
                            updateCustomField(
                              field.id,
                              "fieldName",
                              e.target.value,
                            )
                          }
                          placeholder="z.B. Ernährungsbesonderheiten"
                          className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:ring-1 focus:outline-none"
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
                          className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:ring-1 focus:outline-none"
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

                      {field.fieldType === "SELECT" && (
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
                            className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:ring-1 focus:outline-none"
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
                          className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:ring-1 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="flex cursor-pointer items-center gap-2">
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
                            className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                          />
                          <span className="dark:text-dark-text text-sm text-gray-700">
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
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
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
                      className="text-primary focus:ring-primary mt-0.5 h-4 w-4 border-gray-300"
                    />
                    <div>
                      <span className="dark:text-dark-text font-medium text-gray-700">
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
                      className="text-primary focus:ring-primary mt-0.5 h-4 w-4 border-gray-300"
                    />
                    <div>
                      <span className="dark:text-dark-text font-medium text-gray-700">
                        Zur Prüfung einreichen
                      </span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Der Kurs wird zur Prüfung durch einen Redakteur
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
                        Der Kurs wird noch nicht veröffentlicht und ist nur für
                        dich sichtbar.
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
                        Der Kurs wird noch nicht zur Prüfung eingereicht und ist
                        nur für dich sichtbar.
                      </p>
                    </div>
                  </label>

                  {!submitAsDraft && (
                    <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>Hinweis:</strong> Nach dem Erstellen wird der
                        Kurs zur Prüfung eingereicht. Ein Redakteur wird den
                        Kurs prüfen und freigeben.
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
              className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-6 py-2.5 text-center font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Abbrechen
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || createCourseMutation.isPending}
              className="bg-primary hover:bg-primary/90 rounded-lg px-6 py-2.5 font-medium text-white transition-colors disabled:opacity-50"
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
