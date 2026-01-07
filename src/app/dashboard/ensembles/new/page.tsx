"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { api } from "@/trpc/react";
import { UserRole } from "~/generated/prisma/enums";
import { getErrorMessage } from "@/lib/utils";
import MediaPickerModal from "@/app/_components/editor/media-picker-modal";
import { CheckIcon, PlusIcon, XIcon } from "lucide-react";

const ALLOWED_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.LPW,
  UserRole.RPW,
  UserRole.OBLEUTE,
];

export default function NewEnsemblePage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: bezirke } = api.bezirke.getAll.useQuery();

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

  const { data: locationsData } = api.locations.getAll.useQuery({
    limit: 100,
    search: locationSearch || undefined,
  });

  const { data: usersData } = api.users.list.useQuery(
    { page: 1, limit: 100 },
    { enabled: !!session?.user },
  );

  const [conductorId, setConductorId] = useState<string | null>(null);
  const [conductorSearch, setConductorSearch] = useState("");
  const [showConductorDropdown, setShowConductorDropdown] = useState(false);
  const [conductorName, setConductorName] = useState("");
  const [useCustomConductor, setUseCustomConductor] = useState(false);

  const [representativeId, setRepresentativeId] = useState<string | null>(null);
  const [representativeSearch, setRepresentativeSearch] = useState("");
  const [showRepresentativeDropdown, setShowRepresentativeDropdown] =
    useState(false);
  const [representativeName, setRepresentativeName] = useState("");
  const [useCustomRepresentative, setUseCustomRepresentative] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bezirkId, setBezirkId] = useState("");
  const [imageId, setImageId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [rehearsalDay, setRehearsalDay] = useState("");
  const [rehearsalTime, setRehearsalTime] = useState("");
  const [rehearsalSchedules, setRehearsalSchedules] = useState<
    Array<{ selectedDays: string[]; time: string }>
  >([]);

  const DAYS_OF_WEEK = [
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
    "Sonntag",
  ];
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactWebsite, setContactWebsite] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const filteredConductorUsers = usersData?.users.filter((user) => {
    if (!conductorSearch.trim()) return true;
    const searchLower = conductorSearch.toLowerCase();
    return (
      user.displayName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  const filteredRepresentativeUsers = usersData?.users.filter((user) => {
    if (!representativeSearch.trim()) return true;
    const searchLower = representativeSearch.toLowerCase();
    return (
      user.displayName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  const utils = api.useUtils();

  const createMutation = api.ensembles.create.useMutation({
    onSuccess: async (data) => {
      await utils.ensembles.getAll.invalidate();
      toast.success("Ensemble erfolgreich erstellt");
      router.push(`/dashboard/ensembles/${data.id}`);
    },
    onError: (err) => {
      setError(getErrorMessage(err));
      setIsSubmitting(false);
      toast.error("Fehler beim Erstellen: " + err.message);
    },
  });

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
      setError(getErrorMessage(err, "Fehler beim Erstellen des Ortes."));
      toast.error("Fehler beim Erstellen: " + err.message);
    },
  });

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/ensembles/new");
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-dropdown]")) {
        setShowLocationDropdown(false);
        setShowConductorDropdown(false);
        setShowRepresentativeDropdown(false);
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

  const handleConductorSelect = (user: {
    id: string;
    displayName: string | null;
    email: string;
  }) => {
    setConductorId(user.id);
    setConductorSearch(user.displayName || user.email);
    setShowConductorDropdown(false);
  };

  const handleClearConductor = () => {
    setConductorId(null);
    setConductorSearch("");
    setConductorName("");
    setUseCustomConductor(false);
  };

  const handleRepresentativeSelect = (user: {
    id: string;
    displayName: string | null;
    email: string;
  }) => {
    setRepresentativeId(user.id);
    setRepresentativeSearch(user.displayName || user.email);
    setShowRepresentativeDropdown(false);
  };

  const handleClearRepresentative = () => {
    setRepresentativeId(null);
    setRepresentativeSearch("");
    setRepresentativeName("");
    setUseCustomRepresentative(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    // Transform rehearsal schedules from form format to API format
    // Form format: [{ selectedDays: ["Montag", "Dienstag"], time: "19:30" }]
    // API format: [{ day: "Montag", time: "19:30" }, { day: "Dienstag", time: "19:30" }]
    const transformedRehearsalSchedules =
      rehearsalSchedules.length > 0
        ? rehearsalSchedules
            .filter(
              (schedule) =>
                schedule.selectedDays.length > 0 && schedule.time.trim(),
            )
            .flatMap((schedule) =>
              schedule.selectedDays.map((day) => ({
                day,
                time: schedule.time.trim(),
              })),
            )
        : undefined;

    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      bezirkId: bezirkId || undefined,
      imageId: imageId || undefined,
      locationId: locationId || undefined,
      rehearsalSchedules: transformedRehearsalSchedules,
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      contactWebsite: contactWebsite.trim() || undefined,
      conductorId: useCustomConductor ? undefined : conductorId || undefined,
      conductorName: useCustomConductor
        ? conductorName.trim() || undefined
        : undefined,
      representativeId: useCustomRepresentative
        ? undefined
        : representativeId || undefined,
      representativeName: useCustomRepresentative
        ? representativeName.trim() || undefined
        : undefined,
      isActive,
    });
  };

  const handleMediaSelect = (url: string, alt: string, mediaId?: string) => {
    setImageUrl(url);
    setImageId(mediaId ?? "");
    setShowMediaPicker(false);
  };

  if (sessionLoading || profileLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !ALLOWED_ROLES.includes(profile.role)) {
    return null;
  }

  return (
    <main className="dark:bg-dark-background min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
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
                href="/dashboard/ensembles"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Ensembles
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">Neu</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
            Neues Ensemble
          </h1>
          <p className="dark:text-dark-muted mt-2 text-gray-600">
            Erstelle ein neues Ensemble oder Posaunenchor
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="dark:border-dark-border dark:bg-dark-surface space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="dark:text-dark-text text-lg font-semibold text-gray-900">
                Grundinformationen
              </h2>

              {/* Name */}
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={200}
                  className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Posaunenchor Musterstadt"
                />
              </div>

              {/* Description */}
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Beschreibung
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={5000}
                  className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="Beschreibe das Ensemble..."
                />
              </div>

              {/* Bezirk */}
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Bezirk
                </label>
                <select
                  value={bezirkId}
                  onChange={(e) => setBezirkId(e.target.value)}
                  className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Kein Bezirk</option>
                  {bezirke?.map((bezirk) => (
                    <option key={bezirk.id} value={bezirk.id}>
                      {bezirk.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Image */}
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Bild
                </label>
                {imageUrl ? (
                  <div className="flex items-start gap-4">
                    <div className="relative h-24 w-24 overflow-hidden rounded-lg">
                      <Image
                        src={imageUrl}
                        alt="Ensemble Bild"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setShowMediaPicker(true)}
                        className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Ändern
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrl("");
                          setImageId("");
                        }}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        Entfernen
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowMediaPicker(true)}
                    className="dark:border-dark-border dark:text-dark-text flex h-24 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-600"
                  >
                    <div className="text-center">
                      <PlusIcon className="h-8 w-8" />
                      <span className="mt-1 block text-sm">Bild auswählen</span>
                    </div>
                  </button>
                )}
              </div>

              {/* Active */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="text-primary h-4 w-4 rounded border-gray-300 focus:ring-blue-500"
                />
                <label
                  htmlFor="isActive"
                  className="dark:text-dark-text text-sm font-medium text-gray-700"
                >
                  Aktiv
                </label>
              </div>
            </div>

            {/* People */}
            <div className="dark:border-dark-border dark:bg-dark-surface space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="dark:text-dark-text text-lg font-semibold text-gray-900">
                Personen
              </h2>

              {/* Conductor */}
              <div className="relative" data-dropdown>
                <div className="mb-2 flex items-center justify-between">
                  <label className="dark:text-dark-text block text-sm font-medium text-gray-700">
                    Chorleitung
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useCustomConductor"
                      checked={useCustomConductor}
                      onChange={(e) => {
                        setUseCustomConductor(e.target.checked);
                        if (e.target.checked) {
                          setConductorId(null);
                          setConductorSearch("");
                        } else {
                          setConductorName("");
                        }
                      }}
                      className="text-primary h-4 w-4 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label
                      htmlFor="useCustomConductor"
                      className="dark:text-dark-text text-xs text-gray-600"
                    >
                      Benutzerdefiniert
                    </label>
                  </div>
                </div>
                {useCustomConductor ? (
                  <input
                    type="text"
                    value={conductorName}
                    onChange={(e) => setConductorName(e.target.value)}
                    placeholder="z.B. Max Mustermann"
                    maxLength={200}
                    className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={conductorSearch}
                      onChange={(e) => {
                        setConductorSearch(e.target.value);
                        setShowConductorDropdown(true);
                        if (!e.target.value) setConductorId(null);
                      }}
                      onFocus={() => setShowConductorDropdown(true)}
                      placeholder="Name oder E-Mail eingeben..."
                      className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                    {conductorId && (
                      <button
                        type="button"
                        onClick={handleClearConductor}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* Conductor Dropdown */}
                {!useCustomConductor && showConductorDropdown && (
                  <div className="dark:border-dark-border dark:bg-dark-surface absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                    <div
                      className="overflow-y-auto"
                      style={{ maxHeight: "240px" }}
                    >
                      {filteredConductorUsers &&
                      filteredConductorUsers.length > 0 ? (
                        filteredConductorUsers.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => handleConductorSelect(user)}
                            className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <span className="dark:text-dark-text font-medium text-gray-900">
                              {user.displayName || user.email}
                            </span>
                            {user.displayName && (
                              <span className="text-gray-500 dark:text-gray-400">
                                {" "}
                                – {user.email}
                              </span>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {conductorSearch
                            ? "Keine Benutzer gefunden"
                            : "Tippe, um Benutzer zu suchen"}
                        </div>
                      )}
                    </div>
                    {conductorId && (
                      <button
                        type="button"
                        onClick={handleClearConductor}
                        className="dark:border-dark-border block w-full border-t border-gray-200 px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700"
                      >
                        Verknüpfung entfernen
                      </button>
                    )}
                  </div>
                )}

                {/* Selected conductor indicator */}
                {!useCustomConductor && conductorId && (
                  <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                    ✓ Chorleitung verknüpft
                  </p>
                )}
                {useCustomConductor && conductorName && (
                  <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                    ✓ Benutzerdefinierte Chorleitung
                  </p>
                )}
              </div>

              {/* Representative */}
              <div className="relative" data-dropdown>
                <div className="mb-2 flex items-center justify-between">
                  <label className="dark:text-dark-text block text-sm font-medium text-gray-700">
                    Ansprechpartner
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useCustomRepresentative"
                      checked={useCustomRepresentative}
                      onChange={(e) => {
                        setUseCustomRepresentative(e.target.checked);
                        if (e.target.checked) {
                          setRepresentativeId(null);
                          setRepresentativeSearch("");
                        } else {
                          setRepresentativeName("");
                        }
                      }}
                      className="text-primary h-4 w-4 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label
                      htmlFor="useCustomRepresentative"
                      className="dark:text-dark-text text-xs text-gray-600"
                    >
                      Benutzerdefiniert
                    </label>
                  </div>
                </div>
                {useCustomRepresentative ? (
                  <input
                    type="text"
                    value={representativeName}
                    onChange={(e) => setRepresentativeName(e.target.value)}
                    placeholder="z.B. Max Mustermann"
                    maxLength={200}
                    className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={representativeSearch}
                      onChange={(e) => {
                        setRepresentativeSearch(e.target.value);
                        setShowRepresentativeDropdown(true);
                        if (!e.target.value) setRepresentativeId(null);
                      }}
                      onFocus={() => setShowRepresentativeDropdown(true)}
                      placeholder="Name oder E-Mail eingeben..."
                      className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                    {representativeId && (
                      <button
                        type="button"
                        onClick={handleClearRepresentative}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* Representative Dropdown */}
                {!useCustomRepresentative && showRepresentativeDropdown && (
                  <div className="dark:border-dark-border dark:bg-dark-surface absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                    <div
                      className="overflow-y-auto"
                      style={{ maxHeight: "240px" }}
                    >
                      {filteredRepresentativeUsers &&
                      filteredRepresentativeUsers.length > 0 ? (
                        filteredRepresentativeUsers.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => handleRepresentativeSelect(user)}
                            className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <span className="dark:text-dark-text font-medium text-gray-900">
                              {user.displayName || user.email}
                            </span>
                            {user.displayName && (
                              <span className="text-gray-500 dark:text-gray-400">
                                {" "}
                                – {user.email}
                              </span>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {representativeSearch
                            ? "Keine Benutzer gefunden"
                            : "Tippe, um Benutzer zu suchen"}
                        </div>
                      )}
                    </div>
                    {representativeId && (
                      <button
                        type="button"
                        onClick={handleClearRepresentative}
                        className="dark:border-dark-border block w-full border-t border-gray-200 px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700"
                      >
                        Verknüpfung entfernen
                      </button>
                    )}
                  </div>
                )}

                {/* Selected representative indicator */}
                {!useCustomRepresentative && representativeId && (
                  <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                    ✓ Ansprechpartner verknüpft
                  </p>
                )}
                {useCustomRepresentative && representativeName && (
                  <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                    ✓ Benutzerdefinierter Ansprechpartner
                  </p>
                )}
              </div>
            </div>

            {/* Rehearsal */}
            <div className="dark:border-dark-border dark:bg-dark-surface space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="dark:text-dark-text text-lg font-semibold text-gray-900">
                  Probenzeiten
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setRehearsalSchedules([
                      ...rehearsalSchedules,
                      { selectedDays: [], time: "" },
                    ])
                  }
                  className="text-primary hover:text-primary-dark text-sm font-medium"
                >
                  + Hinzufügen
                </button>
              </div>

              {rehearsalSchedules.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Keine Probenzeiten hinzugefügt. Klicken Sie auf
                  &quot;Hinzufügen&quot; um eine Probenzeit hinzuzufügen.
                </p>
              ) : (
                <div className="space-y-6">
                  {rehearsalSchedules.map((schedule, index) => (
                    <div
                      key={index}
                      className="dark:border-dark-border rounded-lg border border-gray-200 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="dark:text-dark-text text-sm font-semibold text-gray-700">
                          Probenzeit {index + 1}
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setRehearsalSchedules(
                              rehearsalSchedules.filter((_, i) => i !== index),
                            );
                          }}
                          className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Entfernen
                        </button>
                      </div>

                      <div className="mb-4">
                        <label className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700">
                          Wochentage
                        </label>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                          {DAYS_OF_WEEK.map((day) => (
                            <label
                              key={day}
                              className="dark:text-dark-text flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                            >
                              <input
                                type="checkbox"
                                checked={schedule.selectedDays.includes(day)}
                                onChange={(e) => {
                                  const updated = [...rehearsalSchedules];
                                  if (e.target.checked) {
                                    updated[index]!.selectedDays = [
                                      ...schedule.selectedDays,
                                      day,
                                    ];
                                  } else {
                                    updated[index]!.selectedDays =
                                      schedule.selectedDays.filter(
                                        (d) => d !== day,
                                      );
                                  }
                                  setRehearsalSchedules(updated);
                                }}
                                className="text-primary h-4 w-4 rounded border-gray-300 focus:ring-blue-500"
                              />
                              <span>{day}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                          Probenzeit
                        </label>
                        <input
                          type="text"
                          value={schedule.time}
                          onChange={(e) => {
                            const updated = [...rehearsalSchedules];
                            updated[index]!.time = e.target.value;
                            setRehearsalSchedules(updated);
                          }}
                          className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                          placeholder="z.B. 8:00-12:00 oder 19:30-21:00"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Legacy fields (for backward compatibility) */}
              <div className="dark:border-dark-border border-t border-gray-200 pt-4">
                <p className="dark:text-dark-text mb-2 text-sm font-medium text-gray-700">
                  Legacy (veraltet - nur für Migration)
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                      Probentag (alt)
                    </label>
                    <input
                      type="text"
                      value={rehearsalDay}
                      onChange={(e) => setRehearsalDay(e.target.value)}
                      className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. Mittwoch"
                    />
                  </div>
                  <div>
                    <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                      Probenzeit (alt)
                    </label>
                    <input
                      type="text"
                      value={rehearsalTime}
                      onChange={(e) => setRehearsalTime(e.target.value)}
                      className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. 19:30 - 21:00 Uhr"
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="relative" data-dropdown>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Probenort
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
                  className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
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

            {/* Contact */}
            <div className="dark:border-dark-border dark:bg-dark-surface space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="dark:text-dark-text text-lg font-semibold text-gray-900">
                Kontaktdaten
              </h2>

              {/* Email */}
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  E-Mail
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  maxLength={255}
                  className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="kontakt@example.de"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  maxLength={50}
                  pattern="[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*"
                  title="Bitte geben Sie eine gültige Telefonnummer ein"
                  className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="+49 123 456789"
                />
              </div>

              {/* Website */}
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Website
                </label>
                <input
                  type="url"
                  value={contactWebsite}
                  onChange={(e) => setContactWebsite(e.target.value)}
                  maxLength={500}
                  className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="https://www.example.de"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Erstellen...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" />
                  Ensemble erstellen
                </>
              )}
            </button>
            <Link
              href="/dashboard/ensembles"
              className="dark:border-dark-border dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Abbrechen
            </Link>
          </div>
        </form>

        {/* Media Picker Modal */}
        <MediaPickerModal
          isOpen={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onSelect={handleMediaSelect}
        />
      </div>
    </main>
  );
}
