"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { api } from "@/trpc/react";
import { UserRole } from "~/generated/prisma/enums";
import { getErrorMessage } from "@/lib/utils";
import MediaPickerModal from "@/app/_components/editor/media-picker-modal";

const ALLOWED_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.LPW,
  UserRole.RPW,
  UserRole.OBLEUTE,
];

export default function EditEnsemblePage() {
  const router = useRouter();
  const params = useParams();
  const ensembleId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: ensemble, isLoading: ensembleLoading } =
    api.ensembles.getById.useQuery(
      { id: ensembleId },
      { enabled: !!ensembleId && !!session?.user },
    );

  const { data: bezirke } = api.bezirke.getAll.useQuery();

  const [locationId, setLocationId] = useState<string | null>("");
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

  const [representativeId, setRepresentativeId] = useState<string | null>(null);
  const [representativeSearch, setRepresentativeSearch] = useState("");
  const [showRepresentativeDropdown, setShowRepresentativeDropdown] =
    useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bezirkId, setBezirkId] = useState<string | null>("");
  const [imageId, setImageId] = useState<string | null>("");
  const [imageUrl, setImageUrl] = useState("");
  const [rehearsalDay, setRehearsalDay] = useState("");
  const [rehearsalTime, setRehearsalTime] = useState("");
  const [contactEmail, setContactEmail] = useState<string | null>("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactWebsite, setContactWebsite] = useState<string | null>("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [initialized, setInitialized] = useState(false);

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

  useEffect(() => {
    if (ensemble && !initialized) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(ensemble.name);
      setDescription(ensemble.description ?? "");
      setBezirkId(ensemble.bezirkId);
      setImageId(ensemble.imageId);
      setImageUrl(ensemble.image?.url ?? "");
      setLocationId(ensemble.locationId);
      setRehearsalDay(ensemble.rehearsalDay ?? "");
      setRehearsalTime(ensemble.rehearsalTime ?? "");
      setContactEmail(ensemble.contactEmail);
      setContactPhone(ensemble.contactPhone ?? "");
      setContactWebsite(ensemble.contactWebsite);
      setConductorId(ensemble.conductorId);
      setRepresentativeId(ensemble.representativeId);
      setIsActive(ensemble.isActive);

      if (ensemble.location) {
        setLocationSearch(
          `${ensemble.location.name ? ensemble.location.name + ", " : ""}${ensemble.location.city}`,
        );
      }

      if (ensemble.conductor) {
        setConductorSearch(ensemble.conductor.displayName || "");
      }

      if (ensemble.representative) {
        setRepresentativeSearch(ensemble.representative.displayName || "");
      }

      setInitialized(true);
    }
  }, [ensemble, initialized]);

  const utils = api.useUtils();

  const updateMutation = api.ensembles.update.useMutation({
    onSuccess: async () => {
      await utils.ensembles.getAll.invalidate();
      await utils.ensembles.getById.invalidate({ id: ensembleId });
      toast.success("Ensemble erfolgreich aktualisiert");
      router.push(`/dashboard/ensembles/${ensembleId}`);
    },
    onError: (err) => {
      setError(getErrorMessage(err));
      setIsSubmitting(false);
      toast.error("Fehler beim Aktualisieren: " + err.message);
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
      router.push(`/login?callbackUrl=/dashboard/ensembles/${ensembleId}/edit`);
    }
  }, [session, sessionLoading, router, ensembleId]);

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
  };

  const handleClearLocation = () => {
    setLocationId(null);
    setLocationSearch("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    updateMutation.mutate({
      id: ensembleId,
      name: name.trim(),
      description: description.trim() || undefined,
      bezirkId: bezirkId || null,
      imageId: imageId || null,
      locationId: locationId || null,
      rehearsalDay: rehearsalDay.trim() || undefined,
      rehearsalTime: rehearsalTime.trim() || undefined,
      contactEmail: contactEmail?.trim() || null,
      contactPhone: contactPhone.trim() || undefined,
      contactWebsite: contactWebsite?.trim() || null,
      conductorId: conductorId || null,
      representativeId: representativeId || null,
      isActive,
    });
  };

  const handleMediaSelect = (url: string, alt: string, mediaId?: string) => {
    setImageUrl(url);
    setImageId(mediaId ?? "");
    setShowMediaPicker(false);
  };

  if (sessionLoading || profileLoading || ensembleLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !ALLOWED_ROLES.includes(profile.role)) {
    return null;
  }

  if (!ensemble) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Ensemble nicht gefunden
          </h1>
          <Link
            href="/dashboard/ensembles"
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
            <li>
              <Link
                href={`/dashboard/ensembles/${ensembleId}`}
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                {ensemble.name}
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">Bearbeiten</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
            Ensemble bearbeiten
          </h1>
          <p className="dark:text-dark-muted mt-2 text-gray-600">
            Bearbeite die Informationen des Ensembles
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
                  value={bezirkId ?? ""}
                  onChange={(e) => setBezirkId(e.target.value || null)}
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
                          setImageId(null);
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
                      <svg
                        className="mx-auto h-8 w-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
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
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Chorleitung
                </label>
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
                  )}
                </div>

                {/* Conductor Dropdown */}
                {showConductorDropdown && (
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
                {conductorId && (
                  <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                    ✓ Chorleitung verknüpft
                  </p>
                )}
              </div>

              {/* Representative */}
              <div className="relative" data-dropdown>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Ansprechpartner
                </label>
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
                  )}
                </div>

                {/* Representative Dropdown */}
                {showRepresentativeDropdown && (
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
                {representativeId && (
                  <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                    ✓ Ansprechpartner verknüpft
                  </p>
                )}
              </div>
            </div>

            {/* Rehearsal */}
            <div className="dark:border-dark-border dark:bg-dark-surface space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="dark:text-dark-text text-lg font-semibold text-gray-900">
                Probe
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Rehearsal Day */}
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Probentag
                  </label>
                  <input
                    type="text"
                    value={rehearsalDay}
                    onChange={(e) => setRehearsalDay(e.target.value)}
                    className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. Mittwoch"
                  />
                </div>

                {/* Rehearsal Time */}
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Probenzeit
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

              {/* Location */}
              <div className="relative" data-dropdown>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Probenort
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={locationSearch}
                    onChange={(e) => {
                      setLocationSearch(e.target.value);
                      setShowLocationDropdown(true);
                      if (!e.target.value) setLocationId(null);
                    }}
                    onFocus={() => setShowLocationDropdown(true)}
                    placeholder="Suche nach einem Ort..."
                    className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                  {locationId && (
                    <button
                      type="button"
                      onClick={handleClearLocation}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
                  )}
                </div>

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

                {/* Selected location indicator */}
                {locationId && (
                  <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                    ✓ Probenort ausgewählt
                  </p>
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
                  value={contactEmail ?? ""}
                  onChange={(e) => setContactEmail(e.target.value || null)}
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
                  value={contactWebsite ?? ""}
                  onChange={(e) => setContactWebsite(e.target.value || null)}
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
                  Speichern...
                </>
              ) : (
                <>
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Speichern
                </>
              )}
            </button>
            <Link
              href={`/dashboard/ensembles/${ensembleId}`}
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
