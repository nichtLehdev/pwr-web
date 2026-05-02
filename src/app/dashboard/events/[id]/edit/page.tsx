"use client";
import { Select } from "@/app/_components/ui";

import { useState, useEffect, useRef, useMemo, startTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { getErrorMessage } from "@/lib/utils";
import { useToast } from "@/app/_components/ui/toast";
import {
  EventCategory,
  EventEnsembleType,
  ContentStatus,
} from "~/generated/prisma/enums";
import { Trash2, AlertTriangle, ImageIcon, FileDown, X } from "lucide-react";
import { DashboardPage } from "@/app/_components/dashboard";
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

const statusLabels: Record<ContentStatus, string> = {
  DRAFT: "Entwurf",
  PENDING: "Zur Prüfung",
  APPROVED: "Veröffentlicht",
  REJECTED: "Abgelehnt",
  ARCHIVED: "Archiviert",
};

// Dashboard access is now controlled by permissions

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
  const toast = useToast();
  const hasRedirected = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, { enabled: !!session?.user });

  const { data: userPermissions } = api.permissions.getMyPermissions.useQuery(
    undefined,
    { enabled: !!session?.user?.id },
  );

  const hasDashboardAccess =
    Array.isArray(userPermissions) && userPermissions.length > 0;
  const hasApprovePermission =
    Array.isArray(userPermissions) &&
    userPermissions.some((perm: string) => perm === "events.approve");
  const isHigherRole = hasApprovePermission;

  const { data: event, isLoading: eventLoading } = api.events.getById.useQuery(
    { id: eventId },
    { enabled: !!eventId && !!session?.user },
  );

  const [title, setTitle] = useState("");
  const [motto, setMotto] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("18:00");
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [category, setCategory] = useState<EventCategory>("KONZERT");
  const [bezirkId, setBezirkId] = useState<string>("");
  const [districtName, setDistrictName] = useState("");
  const [cancelled, setCancelled] = useState(false);

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

  const [status, setStatus] = useState<ContentStatus>("DRAFT");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasRestoredRef = useRef(false);
  const originalDataRef = useRef<{
    title: string;
    motto: string;
    description: string;
    eventDate: string;
    eventTime: string;
    category: EventCategory;
    bezirkId: string;
    districtName: string;
    cancelled: boolean;
    locationId: string;
    performingEnsembleType: string | null;
    ensembleId: string;
    auswahlChorId: string;
    performingEnsembleName: string;
    leitung: string;
    openToParticipants: boolean;
    participationInfo: string;
    isFree: boolean;
    priceInfo: string;
    priceOptions: Array<{
      id: string;
      price: number;
      label: string;
      description: string;
    }>;
    coverImageId: string | null;
    downloadIds: string[];
    status: ContentStatus;
  } | null>(null);

  const formData = useMemo(
    () => ({
      title,
      motto,
      description,
      eventDate,
      eventTime,
      category,
      bezirkId,
      districtName,
      cancelled,
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
      status,
    }),
    [
      title,
      motto,
      description,
      eventDate,
      eventTime,
      category,
      bezirkId,
      districtName,
      cancelled,
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
      status,
    ],
  );

  const { restore, clear } = useAutosave(`event-${eventId}-edit`, formData);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const hasChanges = originalDataRef.current
      ? JSON.stringify(formData) !== JSON.stringify(originalDataRef.current)
      : Boolean(title.trim() || description.trim() || eventDate);
    startTransition(() => {
      setHasUnsavedChanges(hasChanges);
    });
  }, [formData, title, description, eventDate]);

  useBeforeUnload(hasUnsavedChanges && !isSubmitting);

  useEffect(() => {
    if (!hasRestoredRef.current && !eventLoading && !event) {
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
          setCancelled(saved.cancelled || false);
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
          setStatus(saved.status || "DRAFT");
        });
      }
      hasRestoredRef.current = true;
    }
  }, [restore, eventLoading, event]);

  useEffect(() => {
    if (event && isInitialized && !originalDataRef.current) {
      const date = new Date(event.eventDate);
      originalDataRef.current = {
        title: event.title || "",
        motto: event.motto || "",
        description: event.description || "",
        eventDate: date.toISOString().split("T")[0] || "",
        eventTime: date.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        category: event.category || "KONZERT",
        bezirkId: event.bezirkId || "",
        districtName: event.districtName || "",
        cancelled: event.cancelled || false,
        locationId: event.locationId || "",
        performingEnsembleType: event.performingEnsembleType || null,
        ensembleId: event.ensembleId || "",
        auswahlChorId: event.auswahlChorId || "",
        performingEnsembleName: event.performingEnsembleName || "",
        leitung: event.leitung || "",
        openToParticipants: event.openToParticipants || false,
        participationInfo: event.participationInfo || "",
        isFree: event.isFree ?? true,
        priceInfo: event.priceInfo || "",
        priceOptions:
          event.priceOptions?.map((opt) => ({
            id: opt.id,
            price: opt.price,
            label: opt.label,
            description: opt.description || "",
          })) || [],
        coverImageId: event.coverImageId || null,
        downloadIds: event.downloads?.map((d) => d.id) || [],
        status: event.status || "DRAFT",
      };
    }
  }, [event, isInitialized]);

  const { data: bezirke } = api.bezirke.getAll.useQuery();

  const { data: locationsData } = api.locations.getAll.useQuery({
    limit: 100,
    search: locationSearch || undefined,
  });

  const { data: ensemblesData } = api.ensembles.getAll.useQuery({});

  const { data: auswahlchoereData } = api.auswahlchoere.getAll.useQuery(
    {},
    { enabled: isHigherRole },
  );

  useEffect(() => {
    if (event && !isInitialized) {
      startTransition(() => {
        setTitle(event.title);
        setMotto(event.motto || "");
        setDescription(event.description || "");
        setCancelled(event.cancelled);
        setCategory(event.category);
        setBezirkId(event.bezirkId || "");
        setDistrictName(event.districtName || "");
        setStatus(event.status);

        const date = new Date(event.eventDate);
        setEventDate(date.toISOString().split("T")[0] || "");
        setEventTime(
          date.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
        );
        setDuration(event.duration ?? undefined);

        if (event.location) {
          setLocationId(event.location.id);
          setLocationSearch(
            `${event.location.name ? event.location.name + ", " : ""}${event.location.city}`,
          );
        }

        setPerformingEnsembleType(event.performingEnsembleType);
        if (event.performingEnsembleType === "ENSEMBLE" && event.ensemble) {
          setEnsembleId(event.ensemble.id);
          setEnsembleSearch(event.ensemble.name);
        }
        if (
          event.performingEnsembleType === "AUSWAHLCHOR" &&
          event.auswahlChor
        ) {
          setAuswahlChorId(event.auswahlChor.id);
          setAuswahlChorSearch(event.auswahlChor.name);
        }
        if (event.performingEnsembleType === "CUSTOM") {
          setPerformingEnsembleName(event.performingEnsembleName || "");
        }
        setLeitung(event.leitung || "");

        setOpenToParticipants(event.openToParticipants);
        setParticipationInfo(event.participationInfo || "");

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

        if (event.coverImage) {
          setCoverImageId(event.coverImage.id);
          setCoverImageUrl(event.coverImage.url);
        }

        if (event.downloads && event.downloads.length > 0) {
          const downloadIdsList = event.downloads.map((ed) => ed.download.id);
          const downloadsList = event.downloads.map((ed) => ({
            id: ed.download.id,
            title: ed.download.title,
            fileUrl: ed.download.fileUrl,
          }));
          setDownloadIds(downloadIdsList);
          setSelectedDownloads(downloadsList);
        }

        setIsInitialized(true);
      });
    }
  }, [event, isInitialized]);

  const utils = api.useUtils();

  const updateEventMutation = api.events.update.useMutation({
    onSuccess: async () => {
      clear();
      await utils.events.getById.invalidate({ id: eventId });
      toast.success("Termin erfolgreich aktualisiert");
      router.push(`/dashboard/events/${eventId}`);
    },
    onError: (err) => {
      setError(getErrorMessage(err));
      setIsSubmitting(false);
      toast.error("Fehler beim Aktualisieren: " + getErrorMessage(err));
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
      router.push(`/login?callbackUrl=/dashboard/events/${eventId}/edit`);
    }
  }, [session, sessionLoading, router, eventId]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !hasDashboardAccess &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/");
    }
  }, [profile, profileLoading, hasDashboardAccess, router]);

  useEffect(() => {
    if (event && profile && !hasRedirected.current) {
      const hasEditPermission =
        Array.isArray(userPermissions) &&
        userPermissions.some(
          (perm: string) => perm === "events.edit" || perm === "events.approve",
        );
      const canEdit =
        event.createdById === session?.user?.id || hasEditPermission;

      if (!canEdit) {
        hasRedirected.current = true;
        router.push(`/dashboard/events/${eventId}`);
      }
    }
  }, [event, profile, session, router, eventId, userPermissions]);

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
          .map(({ id, label, price, description }) => ({
            id: id.startsWith("new-") ? undefined : id,
            label,
            price,
            description: description || undefined,
          }))
      : [];

    let finalStatus = status;
    if (
      (event?.status === ContentStatus.APPROVED &&
        status === ContentStatus.APPROVED) ||
      (event?.status === ContentStatus.REJECTED &&
        status === ContentStatus.REJECTED)
    ) {
      finalStatus = ContentStatus.PENDING;
    }

    updateEventMutation.mutate({
      id: eventId,
      title: title.trim(),
      motto: motto.trim() || undefined,
      description: description.trim() || undefined,
      eventDate: dateTime,
      duration: duration ?? null,
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
      coverImageId: coverImageId || null,
      downloadIds: downloadIds.length > 0 ? downloadIds : undefined,
      status: finalStatus,
      cancelled,
    });
  };

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

  const availableEnsembleTypes = isHigherRole
    ? Object.entries(ensembleTypeLabels)
    : Object.entries(ensembleTypeLabels).filter(
        ([value]) => value !== "AUSWAHLCHOR",
      );

  return (
    <>
      <DashboardPage
        title="Termin bearbeiten"
        description="Bearbeite die Details des Termins"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Termine", href: "/dashboard/events" },
          { label: event.title, href: `/dashboard/events/${eventId}` },
          { label: "Bearbeiten" },
        ]}
        maxWidth="7xl"
      >
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
                  maxLength={200}
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
                  onChange={(e) => setCategory(e.target.value as EventCategory)}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
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

          {/* Cover Image */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Titelbild
            </h2>
            <div className="space-y-4">
              {coverImageUrl ? (
                <div className="relative">
                  <div className="dark:border-dark-border relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200">
                    <Image
                      src={coverImageUrl}
                      alt="Titelbild"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="mt-3 flex gap-2">
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
                  className="dark:border-dark-border hover:border-primary dark:hover:bg-dark-background-secondary flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 transition-colors hover:bg-gray-50"
                >
                  <ImageIcon className="h-12 w-12 text-gray-400" />
                  <span className="dark:text-dark-text mt-2 text-sm font-medium text-gray-700">
                    Titelbild auswählen
                  </span>
                  <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Aus der Medienbibliothek auswählen oder neues Bild hochladen
                  </span>
                </button>
              )}
            </div>
          </section>

          {/* Downloads */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Downloads
            </h2>
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
                            downloadIds.filter((id) => id !== download.id),
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
          </section>

          {/* Date & Time */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Datum & Uhrzeit
            </h2>
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
                      e.target.value ? parseInt(e.target.value, 10) : undefined,
                    )
                  }
                  placeholder="z.B. 120"
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
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500" />
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
              data-skip-warning
              onClick={() => clear()}
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
    </>
  );
}
