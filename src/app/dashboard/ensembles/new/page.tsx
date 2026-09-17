"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import {
  DashboardPage,
  SlugField,
  NewLocationForm,
  SocialLinksEditor,
  cleanSocialLinks,
} from "@/app/_components/dashboard";
import type { SocialLink } from "@/lib/social-links";
import { ensembleSlugBase } from "@/lib/slug";
import { getErrorMessage } from "@/lib/utils";
import MediaPickerModal from "@/app/_components/editor/media-picker-modal";
import { CheckIcon, PlusIcon, XIcon } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Textarea,
  Select,
  Checkbox,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/app/_components/ui";

export default function NewEnsemblePage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { hasDashboardAccess } = usePermissions();

  const { data: bezirke } = api.bezirke.getAll.useQuery();

  const [locationId, setLocationId] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showNewLocationForm, setShowNewLocationForm] = useState(false);
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
  const [slug, setSlug] = useState("");

  // Only a preview — when the field is left empty the server looks the town up
  // itself, so a location missing from the filtered list costs nothing here.
  const autoSlug = ensembleSlugBase(
    name,
    locationsData?.locations.find((location) => location.id === locationId)
      ?.city,
  );

  const [description, setDescription] = useState("");
  const [internalId, setInternalId] = useState("");
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
  const [conductorEmail, setConductorEmail] = useState("");
  const [conductorPhone, setConductorPhone] = useState("");
  const [representativeEmail, setRepresentativeEmail] = useState("");
  const [representativePhone, setRepresentativePhone] = useState("");
  const [contactWebsite, setContactWebsite] = useState("");
  const [socials, setSocials] = useState<SocialLink[]>([]);
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

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/ensembles/new");
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !hasDashboardAccess &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, hasDashboardAccess, router]);

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
      slug: slug.trim() || undefined,
      description: description.trim() || undefined,
      internalId: internalId.trim() || undefined,
      bezirkId: bezirkId || undefined,
      imageId: imageId || undefined,
      locationId: locationId || undefined,
      rehearsalSchedules: transformedRehearsalSchedules,
      contactWebsite: contactWebsite.trim() || undefined,
      socials: cleanSocialLinks(socials),
      conductorId: useCustomConductor ? undefined : conductorId || undefined,
      conductorName: useCustomConductor
        ? conductorName.trim() || undefined
        : undefined,
      conductorEmail: conductorEmail.trim() || undefined,
      conductorPhone: conductorPhone.trim() || undefined,
      representativeId: useCustomRepresentative
        ? undefined
        : representativeId || undefined,
      representativeName: useCustomRepresentative
        ? representativeName.trim() || undefined
        : undefined,
      representativeEmail: representativeEmail.trim() || undefined,
      representativePhone: representativePhone.trim() || undefined,
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
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !hasDashboardAccess) {
    return null;
  }

  return (
    <DashboardPage
      title="Neues Ensemble"
      description="Erstelle ein neues Ensemble oder Posaunenchor"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Ensembles", href: "/dashboard/ensembles" },
        { label: "Neu" },
      ]}
      maxWidth="7xl"
    >
      {/* Error */}
      {error && (
        <div className="mb-6 border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Grundinformationen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Name */}
                <div>
                  <Label required>Name</Label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={200}
                    placeholder="z.B. Posaunenchor Musterstadt"
                  />
                </div>

                <SlugField
                  value={slug}
                  onChange={setSlug}
                  autoSlug={autoSlug}
                  basePath="/ensembles/"
                />

                {/* Internal ID (Chor-Nr from Posaunenwerk registry) */}
                <div>
                  <Label>Chor-Nr (intern)</Label>
                  <Input
                    type="text"
                    value={internalId}
                    onChange={(e) => setInternalId(e.target.value)}
                    maxLength={50}
                    placeholder="z.B. 13-01"
                  />
                  <p className="text-dark dark:text-night-muted mt-1 text-xs">
                    Eindeutige Chor-Nummer aus dem Posaunenwerk-Register (z.B.
                    13-01). Optional.
                  </p>
                </div>

                {/* Description */}
                <div>
                  <Label>Beschreibung</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    maxLength={5000}
                    placeholder="Beschreibe das Ensemble..."
                  />
                </div>

                {/* Bezirk */}
                <div>
                  <Label>Bezirk</Label>
                  <Select
                    value={bezirkId}
                    onChange={(e) => setBezirkId(e.target.value)}
                  >
                    <option value="">Kein Bezirk</option>
                    {bezirke?.map((bezirk) => (
                      <option key={bezirk.id} value={bezirk.id}>
                        {bezirk.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Image */}
          <Card>
            <CardHeader>
              <CardTitle>Bild</CardTitle>
            </CardHeader>
            <CardContent>
              {imageUrl ? (
                <div className="flex items-start gap-4">
                  <div className="border-rule dark:border-night-rule relative h-24 w-24 overflow-hidden border">
                    <Image
                      src={imageUrl}
                      alt="Ensemble Bild"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      onClick={() => setShowMediaPicker(true)}
                      variant="outline"
                      size="sm"
                    >
                      Ändern
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setImageUrl("");
                        setImageId("");
                      }}
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      Entfernen
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMediaPicker(true)}
                  className="border-ink dark:border-night-text hover:border-primary-ink dark:hover:bg-night-raised text-dark dark:text-night-muted hover:bg-rule/25 flex h-24 w-full items-center justify-center border-2 border-dashed transition-colors"
                >
                  <div className="text-center">
                    <PlusIcon className="h-8 w-8" />
                    <span className="mt-1 block text-sm">Bild auswählen</span>
                  </div>
                </button>
              )}
            </CardContent>
          </Card>

          {/* Active */}
          <Card>
            <CardContent>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <Label htmlFor="isActive" className="mb-0">
                  Aktiv
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* People */}
          <Card>
            <CardHeader>
              <CardTitle>Personen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Conductor */}
              <div className="relative" data-dropdown>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="mb-0">Chorleitung</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
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
                    />
                    <label
                      htmlFor="useCustomConductor"
                      className="text-dark dark:text-night-muted text-xs"
                    >
                      Benutzerdefiniert
                    </label>
                  </div>
                </div>
                {useCustomConductor ? (
                  <Input
                    type="text"
                    value={conductorName}
                    onChange={(e) => setConductorName(e.target.value)}
                    placeholder="z.B. Max Mustermann"
                    maxLength={200}
                  />
                ) : (
                  <div className="relative">
                    <Input
                      type="text"
                      value={conductorSearch}
                      onChange={(e) => {
                        setConductorSearch(e.target.value);
                        setShowConductorDropdown(true);
                        if (!e.target.value) setConductorId(null);
                      }}
                      onFocus={() => setShowConductorDropdown(true)}
                      placeholder="Name oder E-Mail eingeben..."
                      className="pr-10"
                    />
                    {conductorId && (
                      <button
                        type="button"
                        onClick={handleClearConductor}
                        className="text-dark hover:text-ink dark:text-night-muted dark:hover:text-night-text absolute top-1/2 right-3 -translate-y-1/2"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* Conductor Dropdown */}
                {!useCustomConductor && showConductorDropdown && (
                  <div className="border-ink dark:border-night-text dark:bg-night-raised bg-paper absolute z-10 mt-1 w-full overflow-hidden border">
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
                            className="hover:bg-rule/25 dark:hover:bg-night-rule block w-full px-4 py-2 text-left text-sm transition-colors"
                          >
                            <span className="text-ink dark:text-night-text font-medium">
                              {user.displayName || user.email}
                            </span>
                            {user.displayName && (
                              <span className="text-dark dark:text-night-muted">
                                {" "}
                                – {user.email}
                              </span>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="text-dark dark:text-night-muted px-4 py-3 text-sm">
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
                        className="border-rule dark:border-night-rule hover:bg-rule/25 dark:hover:bg-night-rule block w-full border-t px-4 py-2 text-left text-sm font-medium text-red-600 transition-colors dark:text-red-400"
                      >
                        Verknüpfung entfernen
                      </button>
                    )}
                  </div>
                )}

                {/* Selected conductor indicator */}
                {!useCustomConductor && conductorId && (
                  <p className="mt-2 text-sm text-green-700 dark:text-green-400">
                    ✓ Chorleitung verknüpft
                  </p>
                )}
                {useCustomConductor && conductorName && (
                  <p className="mt-2 text-sm text-green-700 dark:text-green-400">
                    ✓ Benutzerdefinierte Chorleitung
                  </p>
                )}

                {/* Conductor contact (optional, useful for non-user conductors) */}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>E-Mail (Chorleitung)</Label>
                    <Input
                      type="email"
                      value={conductorEmail}
                      onChange={(e) => setConductorEmail(e.target.value)}
                      maxLength={255}
                      placeholder="leitung@example.de"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label>Telefon (Chorleitung)</Label>
                    <Input
                      type="tel"
                      value={conductorPhone}
                      onChange={(e) => setConductorPhone(e.target.value)}
                      maxLength={50}
                      pattern="[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*"
                      placeholder="+49 123 456789"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Representative */}
              <div className="relative" data-dropdown>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="mb-0">Ansprechpartner</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
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
                    />
                    <label
                      htmlFor="useCustomRepresentative"
                      className="text-dark dark:text-night-muted text-xs"
                    >
                      Benutzerdefiniert
                    </label>
                  </div>
                </div>
                {useCustomRepresentative ? (
                  <Input
                    type="text"
                    value={representativeName}
                    onChange={(e) => setRepresentativeName(e.target.value)}
                    placeholder="z.B. Max Mustermann"
                    maxLength={200}
                  />
                ) : (
                  <div className="relative">
                    <Input
                      type="text"
                      value={representativeSearch}
                      onChange={(e) => {
                        setRepresentativeSearch(e.target.value);
                        setShowRepresentativeDropdown(true);
                        if (!e.target.value) setRepresentativeId(null);
                      }}
                      onFocus={() => setShowRepresentativeDropdown(true)}
                      placeholder="Name oder E-Mail eingeben..."
                      className="pr-10"
                    />
                    {representativeId && (
                      <button
                        type="button"
                        onClick={handleClearRepresentative}
                        className="text-dark hover:text-ink dark:text-night-muted dark:hover:text-night-text absolute top-1/2 right-3 -translate-y-1/2"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* Representative Dropdown */}
                {!useCustomRepresentative && showRepresentativeDropdown && (
                  <div className="border-ink dark:border-night-text dark:bg-night-raised bg-paper absolute z-10 mt-1 w-full overflow-hidden border">
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
                            className="hover:bg-rule/25 dark:hover:bg-night-rule block w-full px-4 py-2 text-left text-sm transition-colors"
                          >
                            <span className="text-ink dark:text-night-text font-medium">
                              {user.displayName || user.email}
                            </span>
                            {user.displayName && (
                              <span className="text-dark dark:text-night-muted">
                                {" "}
                                – {user.email}
                              </span>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="text-dark dark:text-night-muted px-4 py-3 text-sm">
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
                        className="border-rule dark:border-night-rule hover:bg-rule/25 dark:hover:bg-night-rule block w-full border-t px-4 py-2 text-left text-sm font-medium text-red-600 transition-colors dark:text-red-400"
                      >
                        Verknüpfung entfernen
                      </button>
                    )}
                  </div>
                )}

                {/* Selected representative indicator */}
                {!useCustomRepresentative && representativeId && (
                  <p className="mt-2 text-sm text-green-700 dark:text-green-400">
                    ✓ Ansprechpartner verknüpft
                  </p>
                )}
                {useCustomRepresentative && representativeName && (
                  <p className="mt-2 text-sm text-green-700 dark:text-green-400">
                    ✓ Benutzerdefinierter Ansprechpartner
                  </p>
                )}

                {/* Representative contact (optional, useful for non-user representatives) */}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>E-Mail (Ansprechpartner)</Label>
                    <Input
                      type="email"
                      value={representativeEmail}
                      onChange={(e) => setRepresentativeEmail(e.target.value)}
                      maxLength={255}
                      placeholder="ap@example.de"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label>Telefon (Ansprechpartner)</Label>
                    <Input
                      type="tel"
                      value={representativePhone}
                      onChange={(e) => setRepresentativePhone(e.target.value)}
                      maxLength={50}
                      pattern="[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*"
                      placeholder="+49 123 456789"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rehearsal */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Probenzeiten</CardTitle>
              <button
                type="button"
                onClick={() =>
                  setRehearsalSchedules([
                    ...rehearsalSchedules,
                    { selectedDays: [], time: "" },
                  ])
                }
                className="link-ink text-sm"
              >
                + Hinzufügen
              </button>
            </CardHeader>
            <CardContent className="space-y-6">
              {rehearsalSchedules.length === 0 ? (
                <p className="text-dark dark:text-night-muted text-sm">
                  Keine Probenzeiten hinzugefügt. Klicken Sie auf
                  &quot;Hinzufügen&quot; um eine Probenzeit hinzuzufügen.
                </p>
              ) : (
                <div className="space-y-6">
                  {rehearsalSchedules.map((schedule, index) => (
                    <div
                      key={index}
                      className="border-rule dark:border-night-rule border p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-ink dark:text-night-text text-sm font-semibold">
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
                        <Label>Wochentage</Label>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                          {DAYS_OF_WEEK.map((day) => (
                            <label
                              key={day}
                              className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised flex items-center gap-2 border px-3 py-2 text-sm transition-colors"
                            >
                              <Checkbox
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
                              />
                              <span>{day}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label>Probenzeit</Label>
                        <Input
                          type="text"
                          value={schedule.time}
                          onChange={(e) => {
                            const updated = [...rehearsalSchedules];
                            updated[index]!.time = e.target.value;
                            setRehearsalSchedules(updated);
                          }}
                          placeholder="z.B. 8:00-12:00 oder 19:30-21:00"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Legacy fields (for backward compatibility) */}
              <div className="border-rule dark:border-night-rule border-t pt-4">
                <p className="text-ink dark:text-night-text mb-2 text-sm font-medium">
                  Legacy (veraltet - nur für Migration)
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Probentag (alt)</Label>
                    <Input
                      type="text"
                      value={rehearsalDay}
                      onChange={(e) => setRehearsalDay(e.target.value)}
                      placeholder="z.B. Mittwoch"
                    />
                  </div>
                  <div>
                    <Label>Probenzeit (alt)</Label>
                    <Input
                      type="text"
                      value={rehearsalTime}
                      onChange={(e) => setRehearsalTime(e.target.value)}
                      placeholder="z.B. 19:30 - 21:00 Uhr"
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="relative" data-dropdown>
                <Label>Probenort</Label>
                <Input
                  type="text"
                  value={locationSearch}
                  onChange={(e) => {
                    setLocationSearch(e.target.value);
                    setShowLocationDropdown(true);
                    if (!e.target.value) setLocationId("");
                  }}
                  onFocus={() => setShowLocationDropdown(true)}
                  placeholder="Suche nach einem Ort..."
                />

                {/* Location Dropdown */}
                {showLocationDropdown && locationsData && (
                  <div className="border-ink dark:border-night-text dark:bg-night-raised bg-paper absolute z-10 mt-1 w-full overflow-hidden border">
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
                              className="hover:bg-rule/25 dark:hover:bg-night-rule block w-full px-4 py-2 text-left text-sm transition-colors"
                            >
                              <span className="text-ink dark:text-night-text font-medium">
                                {location.name || location.city}
                              </span>
                              {location.name && (
                                <span className="text-dark dark:text-night-muted">
                                  {" "}
                                  – {location.city}
                                </span>
                              )}
                              {location.street && (
                                <span className="text-dark dark:text-night-muted block text-xs">
                                  {location.street}
                                </span>
                              )}
                            </button>
                          ))}
                        </>
                      ) : (
                        <div className="text-dark dark:text-night-muted px-4 py-3 text-sm">
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
                      className="link-ink border-rule dark:border-night-rule hover:bg-rule/25 dark:hover:bg-night-rule block w-full border-t px-4 py-2 text-left text-sm transition-colors"
                    >
                      + Neuen Ort erstellen
                    </button>
                  </div>
                )}
              </div>

              {showNewLocationForm && (
                <NewLocationForm
                  onCreated={(location) => {
                    setLocationId(location.id);
                    setLocationSearch(
                      `${location.name ? location.name + ", " : ""}${location.city}`,
                    );
                    setShowNewLocationForm(false);
                  }}
                  onCancel={() => setShowNewLocationForm(false)}
                  onError={setError}
                  successMessage="Veranstaltungsort erstellt"
                />
              )}
            </CardContent>
          </Card>

          {/* Website & Social Media (ensemble-level) */}
          <Card>
            <CardHeader>
              <CardTitle>Website & Social Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Website des Chores</Label>
                <Input
                  type="url"
                  value={contactWebsite}
                  onChange={(e) => setContactWebsite(e.target.value)}
                  maxLength={500}
                  placeholder="https://www.example.de"
                />
                <p className="text-dark dark:text-night-muted mt-1 text-xs">
                  E-Mail und Telefon werden pro Person (Chorleitung /
                  Ansprechpartner) gepflegt.
                </p>
              </div>

              <div>
                <Label>Social Media</Label>
                <SocialLinksEditor value={socials} onChange={setSocials} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            <CheckIcon className="h-4 w-4" />
            Ensemble erstellen
          </Button>
          <Link
            href="/dashboard/ensembles"
            className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 items-center gap-2 border px-4 py-2 transition-colors"
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
    </DashboardPage>
  );
}
