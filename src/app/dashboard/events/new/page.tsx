"use client";

import { Button, Select } from "@/app/_components/ui";
import { useState, useEffect, useRef, startTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import {
  DashboardPage,
  DashboardSectionedFormLayout,
  DashboardFormMediaSplit,
  DashboardFormZoneHeader,
  DashboardFormBlock,
  type DashboardSectionNavItem,
} from "@/app/_components/dashboard";
import { getErrorMessage } from "@/lib/utils";
import { useToast } from "@/app/_components/ui/toast";
import {
  EventCategory,
  EventEnsembleType,
  ContentStatus,
} from "~/generated/prisma/enums";
import { Lock, Trash2, ImageIcon, FileDown, X } from "lucide-react";
import MediaPickerModal from "@/app/_components/editor/media-picker-modal";
import DownloadPickerModal from "@/app/_components/editor/download-picker-modal";
import { useAutosave } from "@/lib/useAutosave";
import { useBeforeUnload } from "@/lib/useBeforeUnload";

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

const NEW_EVENT_NAV_ITEMS: DashboardSectionNavItem[] = [
  { href: "#event-form-inhalt", label: "Inhalt" },
  { href: "#event-form-termin", label: "Termin & Ort" },
  { href: "#event-form-mitwirkung", label: "Ensemble & Teilnahme" },
  { href: "#event-form-preise", label: "Eintritt" },
  { href: "#event-form-veroeffentlichung", label: "Veröffentlichung" },
];

// Dashboard access is now controlled by permissions

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

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, { enabled: !!session?.user });

  const { hasDashboardAccess, hasPermission } = usePermissions();

  const hasApprovePermission = hasPermission(PERMISSIONS.EVENTS_APPROVE);
  const isHigherRole = hasApprovePermission;
  const userBezirkId = profile?.bezirkId ?? null;

  const [title, setTitle] = useState("");
  const [motto, setMotto] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("18:00");
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [category, setCategory] = useState<EventCategory>("KONZERT");
  const [bezirkId, setBezirkId] = useState<string>("");
  const [districtName, setDistrictName] = useState("");

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

  const [openToParticipants, setOpenToParticipants] = useState(false);
  const [participationInfo, setParticipationInfo] = useState("");

  const [isFree, setIsFree] = useState(true);
  const [priceInfo, setPriceInfo] = useState("");
  const [priceOptions, setPriceOptions] = useState<PriceOption[]>([]);

  const [coverImageId, setCoverImageId] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [downloadIds, setDownloadIds] = useState<string[]>([]);
  const [selectedDownloads, setSelectedDownloads] = useState<
    Array<{ id: string; title: string; fileUrl: string }>
  >([]);
  const [showDownloadPicker, setShowDownloadPicker] = useState(false);

  const [submitAsDraft, setSubmitAsDraft] = useState(false);
  const [submitAsApproved, setSubmitAsApproved] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasRestoredRef = useRef(false);

  const formData = {
    title,
    motto,
    description,
    eventDate,
    eventTime,
    category,
    bezirkId,
    districtName,
    locationId,
    performingEnsembleType,
    ensembleId,
    auswahlChorId,
    performingEnsembleName,
    leitung,
    openToParticipants,
    participationInfo,
    isFree,
    priceInfo,
    priceOptions,
    coverImageId,
    downloadIds,
    submitAsDraft,
    submitAsApproved,
  };

  const { restore, clear } = useAutosave("event-new", formData);
  const hasUnsavedChanges = Boolean(
    title.trim() || description.trim() || eventDate,
  );
  useBeforeUnload(hasUnsavedChanges && !isSubmitting);

  useEffect(() => {
    if (!hasRestoredRef.current && !sessionLoading && !profileLoading) {
      const saved = restore();
      if (saved) {
        startTransition(() => {
          setTitle(saved.title || "");
          setMotto(saved.motto || "");
          setDescription(saved.description || "");
          setEventDate(saved.eventDate || "");
          setEventTime(saved.eventTime || "18:00");
          setCategory(saved.category || "KONZERT");
          setBezirkId(saved.bezirkId || "");
          setDistrictName(saved.districtName || "");
          setLocationId(saved.locationId || "");
          setPerformingEnsembleType(saved.performingEnsembleType || null);
          setEnsembleId(saved.ensembleId || "");
          setAuswahlChorId(saved.auswahlChorId || "");
          setPerformingEnsembleName(saved.performingEnsembleName || "");
          setLeitung(saved.leitung || "");
          setOpenToParticipants(saved.openToParticipants || false);
          setParticipationInfo(saved.participationInfo || "");
          setIsFree(saved.isFree ?? true);
          setPriceInfo(saved.priceInfo || "");
          setPriceOptions(saved.priceOptions || []);
          setCoverImageId(saved.coverImageId || null);
          setDownloadIds(saved.downloadIds || []);
          setSubmitAsDraft(saved.submitAsDraft || false);
          setSubmitAsApproved(saved.submitAsApproved || false);
        });
      }
      hasRestoredRef.current = true;
    }
  }, [restore, sessionLoading, profileLoading]);

  const { data: bezirke } = api.bezirke.getAll.useQuery();

  const { data: locationsData } = api.locations.getAll.useQuery({
    limit: 100,
    search: locationSearch || undefined,
  });

  const { data: ensemblesData } = api.ensembles.getAll.useQuery({
    bezirkId: !isHigherRole && userBezirkId ? userBezirkId : undefined,
  });

  const { data: auswahlchoereData } = api.auswahlchoere.getAll.useQuery(
    {},
    { enabled: isHigherRole },
  );

  /* eslint-disable react-hooks/set-state-in-effect -- Initializing form state from server data is a valid pattern */
  useEffect(() => {
    if (!isHigherRole && userBezirkId && !bezirkId) {
      setBezirkId(userBezirkId);
    }
  }, [isHigherRole, userBezirkId, bezirkId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const createEventMutation = api.events.create.useMutation({
    onSuccess: (event) => {
      clear();
      toast.success("Termin erfolgreich erstellt");
      router.push(`/dashboard/events/${event.id}`);
    },
    onError: (err) => {
      setError(getErrorMessage(err));
      setIsSubmitting(false);
      toast.error("Fehler beim Erstellen: " + getErrorMessage(err));
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
      setError(
        getErrorMessage(err, "Fehler beim Erstellen des Veranstaltungsortes."),
      );
      toast.error(
        getErrorMessage(err, "Fehler beim Erstellen des Veranstaltungsortes."),
      );
    },
  });

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/events/new");
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!profileLoading && profile && !hasRedirected.current) {
      if (!hasDashboardAccess) {
        hasRedirected.current = true;
        router.push("/dashboard");
      }
    }
  }, [profile, profileLoading, router, hasDashboardAccess]);

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

    const dateTime = new Date(`${eventDate}T${eventTime}`);

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
      duration: duration ?? undefined,
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
      coverImageId: coverImageId || undefined,
      downloadIds: downloadIds.length > 0 ? downloadIds : undefined,
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

  const availableEnsembleTypes = isHigherRole
    ? Object.entries(ensembleTypeLabels)
    : Object.entries(ensembleTypeLabels).filter(
        ([value]) => value !== "AUSWAHLCHOR",
      );

  return (
    <DashboardPage
      title="Neuer Termin"
      description="Erstelle einen neuen Termin für den Posaunenchor"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Termine", href: "/dashboard/events" },
        { label: "Neuer Termin" },
      ]}
      maxWidth="7xl"
    >
      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <DashboardSectionedFormLayout
          navItems={NEW_EVENT_NAV_ITEMS}
          contentClassName="space-y-14 sm:space-y-16"
        >
          <div id="event-form-inhalt" className="dashboard-form-scroll-anchor">
            <DashboardFormZoneHeader
              step={1}
              title="Inhalt"
              description="Was Besucher zuerst sehen: Texte, Bild und optionale Downloads."
            />
            <DashboardFormMediaSplit
              main={
                <DashboardFormBlock title="Grundinformationen">
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
                        maxLength={200}
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
                        maxLength={500}
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
                        maxLength={5000}
                      />
                    </div>

                    <div>
                      <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                        Kategorie *
                      </label>
                      <Select
                        value={category}
                        onChange={(e) =>
                          setCategory(e.target.value as EventCategory)
                        }
                        className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                      >
                        {Object.entries(categoryLabels).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </Select>
                    </div>
                  </div>
                </DashboardFormBlock>
              }
              aside={
                <>
                  <DashboardFormBlock title="Titelbild">
                    <div className="space-y-4">
                      {coverImageUrl ? (
                        <div className="relative">
                          <div className="dark:border-dark-border relative aspect-video w-full overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                            <Image
                              src={coverImageUrl}
                              alt="Titelbild"
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setShowMediaPicker(true)}
                              className="dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-background-secondary rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                            >
                              Bild ändern
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCoverImageId(null);
                                setCoverImageUrl(null);
                              }}
                              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                              Bild entfernen
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowMediaPicker(true)}
                          className="dark:border-dark-border hover:border-primary dark:hover:bg-dark-background-secondary flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-6 transition-colors hover:bg-gray-50 sm:p-8"
                        >
                          <ImageIcon className="h-10 w-10 text-gray-400 sm:h-12 sm:w-12" />
                          <span className="dark:text-dark-text mt-2 text-sm font-medium text-gray-700">
                            Titelbild auswählen
                          </span>
                          <span className="mt-1 text-center text-xs text-gray-500 dark:text-gray-400">
                            Aus der Medienbibliothek auswählen oder neues Bild
                            hochladen
                          </span>
                        </button>
                      )}
                    </div>
                  </DashboardFormBlock>
                  <DashboardFormBlock title="Downloads">
                    <div className="space-y-4">
                      {selectedDownloads.length > 0 && (
                        <div className="space-y-2">
                          {selectedDownloads.map((download) => (
                            <div
                              key={download.id}
                              className="dark:border-dark-border dark:bg-dark-background-secondary flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
                            >
                              <div className="flex items-center gap-3">
                                <FileDown className="h-5 w-5 text-gray-400" />
                                <span className="dark:text-dark-text text-sm font-medium text-gray-900">
                                  {download.title}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setDownloadIds(
                                    downloadIds.filter(
                                      (id) => id !== download.id,
                                    ),
                                  );
                                  setSelectedDownloads(
                                    selectedDownloads.filter(
                                      (d) => d.id !== download.id,
                                    ),
                                  );
                                }}
                                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-red-600 dark:hover:bg-gray-700"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowDownloadPicker(true)}
                        className="dark:border-dark-border hover:border-primary dark:hover:bg-dark-background-secondary flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <FileDown className="h-5 w-5" />
                        Download hinzufügen
                      </button>
                    </div>
                  </DashboardFormBlock>
                </>
              }
            />
          </div>

          <div
            id="event-form-termin"
            className="dark:border-dark-border dashboard-form-scroll-anchor border-t border-gray-200/80 pt-14"
          >
            <DashboardFormZoneHeader
              step={2}
              title="Termin & Ort"
              description="Datum und Ort erscheinen im Kalender; der Bezirk steuert die Einordnung im Verband."
            />
            <div className="space-y-10">
              <DashboardFormBlock title="Datum & Uhrzeit">
                <div className="grid gap-4 sm:grid-cols-3">
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
                  <div>
                    <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                      Dauer (Minuten)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="15"
                      value={duration ?? ""}
                      onChange={(e) =>
                        setDuration(
                          e.target.value
                            ? parseInt(e.target.value, 10)
                            : undefined,
                        )
                      }
                      placeholder="z.B. 120"
                      className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                    />
                  </div>
                </div>
              </DashboardFormBlock>

              <DashboardFormBlock title="Veranstaltungsort">
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
              </DashboardFormBlock>

              <DashboardFormBlock title="Bezirk">
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
                        Du kannst nur Termine für deinen eigenen Bezirk
                        erstellen.
                      </p>
                    </div>
                  ) : !isHigherRole && !userBezirkId ? (
                    <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
                      <p className="text-sm text-yellow-800 dark:text-yellow-300">
                        <strong>Hinweis:</strong> Du bist keinem Bezirk
                        zugeordnet. Bitte wende dich an einen Administrator, um
                        Termine erstellen zu können.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                          Bezirk auswählen
                        </label>
                        <Select
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
                        </Select>
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
              </DashboardFormBlock>
            </div>
          </div>

          <div
            id="event-form-mitwirkung"
            className="dark:border-dark-border dashboard-form-scroll-anchor border-t border-gray-200/80 pt-14"
          >
            <DashboardFormZoneHeader
              step={3}
              title="Ensemble & Teilnahme"
              description="Mitwirkende, Leitung und ob externe Teilnahme möglich ist."
            />
            <div className="space-y-10">
              <DashboardFormBlock title="Auftretendes Ensemble">
                <div className="space-y-4">
                  <div>
                    <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                      Ensemble-Typ
                    </label>
                    <Select
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
                    </Select>
                    {!isHigherRole && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Du kannst Ensembles aus deinem Bezirk auswählen oder
                        einen benutzerdefinierten Namen eingeben.
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
                        onChange={(e) =>
                          setPerformingEnsembleName(e.target.value)
                        }
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
              </DashboardFormBlock>

              <DashboardFormBlock title="Teilnahme">
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
              </DashboardFormBlock>
            </div>
          </div>

          <div
            id="event-form-preise"
            className="dark:border-dark-border dashboard-form-scroll-anchor border-t border-gray-200/80 pt-14"
          >
            <DashboardFormZoneHeader
              step={4}
              title="Eintritt"
              description="Freier Eintritt oder Preise und Kartenhinweise für Besucher."
            />
            <DashboardFormBlock title="Preise & Hinweise">
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
                                  maxLength={100}
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
                                  <span className="text-sm text-gray-500">
                                    €
                                  </span>
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
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DashboardFormBlock>
          </div>

          <div
            id="event-form-veroeffentlichung"
            className="dark:border-dark-border dashboard-form-scroll-anchor border-t border-gray-200/80 pt-14"
          >
            <DashboardFormZoneHeader
              step={5}
              title="Veröffentlichung"
              description="Sichtbarkeit im öffentlichen Kalender und im Redaktionsprozess."
            />
            <DashboardFormBlock title="Redaktionsstatus">
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
            </DashboardFormBlock>
          </div>

          <div className="dark:border-dark-border mt-16 flex flex-col gap-3 border-t border-gray-200/80 pt-10 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard/events"
              data-skip-warning
              onClick={() => clear()}
              className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-6 py-2.5 text-center font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Abbrechen
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting || createEventMutation.isPending}
              isLoading={isSubmitting || createEventMutation.isPending}
            >
              {submitAsDraft
                ? "Entwurf speichern"
                : submitAsApproved
                  ? "Veröffentlichen"
                  : "Termin einreichen"}
            </Button>
          </div>
        </DashboardSectionedFormLayout>
      </form>

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(url, _alt, mediaId) => {
          if (mediaId) {
            setCoverImageId(mediaId);
          }
          setCoverImageUrl(url);
          setShowMediaPicker(false);
        }}
      />

      {/* Download Picker Modal */}
      <DownloadPickerModal
        isOpen={showDownloadPicker}
        onClose={() => setShowDownloadPicker(false)}
        onSelect={(title, url, fileType, downloadId) => {
          if (downloadId && !downloadIds.includes(downloadId)) {
            setDownloadIds([...downloadIds, downloadId]);
            setSelectedDownloads([
              ...selectedDownloads,
              { id: downloadId, title, fileUrl: url },
            ]);
          }
          setShowDownloadPicker(false);
        }}
      />
    </DashboardPage>
  );
}
