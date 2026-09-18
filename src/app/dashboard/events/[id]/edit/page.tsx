"use client";

import { Button, Select } from "@/app/_components/ui";
import { useState, useEffect, useRef, useMemo, startTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import type { PermissionKey } from "@/lib/permissions";
import { districtFieldState } from "@/lib/district-scope";
import { getErrorMessage } from "@/lib/utils";
import { useToast } from "@/app/_components/ui/toast";
import {
  DashboardFormBlock,
  DashboardFormMediaSplit,
  DashboardFormZoneHeader,
  DashboardPage,
  DashboardSectionedFormLayout,
  DraftRestorePrompt,
  SlugField,
  type DashboardSectionNavItem,
  NewLocationForm,
} from "@/app/_components/dashboard";
import {
  ContentStatus,
  EventCategory,
  EventEnsembleType,
} from "~/generated/prisma/enums";
import {
  Lock,
  Trash2,
  AlertTriangle,
  ImageIcon,
  FileDown,
  X,
} from "lucide-react";
import MediaPickerModal from "@/app/_components/editor/media-picker-modal";
import RichTextEditor from "@/app/_components/editor/rich-text-editor-lazy";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/description";
import DownloadPickerModal from "@/app/_components/editor/download-picker-modal";
import { datedSlugBase, slugify } from "@/lib/slug";
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

const EDIT_EVENT_NAV_ITEMS: DashboardSectionNavItem[] = [
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

  const {
    hasDashboardAccess,
    hasPermission,
    isLoading: permissionsLoading,
  } = usePermissions();

  const hasApprovePermission = hasPermission("events.approve" as PermissionKey);
  const isHigherRole = hasApprovePermission;
  const scopedBezirkIds = profile?.bezirkScopes?.map((s) => s.bezirkId) ?? [];
  // Zuständigkeit statt Zugehörigkeit: `profile.bezirkId` sagt, wo jemand im
  // Werk verortet ist (und trägt öffentlich ein Amt), nicht wofür er schreiben
  // darf. Beides zu vermischen hieße, für eine einzelne Ausnahme ein Amt zu
  // vergeben.
  const { selectableBezirkIds } = districtFieldState(
    isHigherRole,
    scopedBezirkIds,
  );

  const { data: event, isLoading: eventLoading } = api.events.getById.useQuery(
    { id: eventId },
    { enabled: !!eventId && !!session?.user },
  );

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
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
      slug,
      motto,
      description,
      eventDate,
      eventTime,
      duration,
      category,
      bezirkId,
      districtName,
      cancelled,
      locationId,
      locationSearch,
      performingEnsembleType,
      ensembleId,
      ensembleSearch,
      auswahlChorId,
      auswahlChorSearch,
      performingEnsembleName,
      leitung,
      openToParticipants,
      participationInfo,
      isFree,
      priceInfo,
      priceOptions,
      coverImageId,
      coverImageUrl,
      downloadIds,
      selectedDownloads,
      status,
    }),
    [
      title,
      slug,
      motto,
      description,
      eventDate,
      eventTime,
      duration,
      category,
      bezirkId,
      districtName,
      cancelled,
      locationId,
      locationSearch,
      performingEnsembleType,
      ensembleId,
      ensembleSearch,
      auswahlChorId,
      auswahlChorSearch,
      performingEnsembleName,
      leitung,
      openToParticipants,
      participationInfo,
      isFree,
      priceInfo,
      priceOptions,
      coverImageId,
      coverImageUrl,
      downloadIds,
      selectedDownloads,
      status,
    ],
  );

  const { pendingDraft, restoreDraft, discardDraft, clear, storageFailed } =
    useAutosave({
      name: `event-${eventId}-edit`,
      data: formData,
      userId: session?.user?.id,
      ready: isInitialized,
    });

  // Mirrors what createEventSlug derives on the server, so the preview is honest.
  const autoSlug = useMemo(() => {
    const parsed = eventDate
      ? new Date(`${eventDate}T${eventTime || "00:00"}`)
      : null;
    return parsed && !Number.isNaN(parsed.getTime())
      ? datedSlugBase(title, parsed)
      : slugify(title);
  }, [title, eventDate, eventTime]);

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

  const handleRestoreDraft = () => {
    const saved = restoreDraft();
    if (!saved) return;
    startTransition(() => {
      setTitle(saved.title || "");
      setSlug(saved.slug || "");
      setMotto(saved.motto || "");
      setDescription(saved.description || "");
      setEventDate(saved.eventDate || "");
      setEventTime(saved.eventTime || "18:00");
      setDuration(saved.duration ?? undefined);
      setCategory(saved.category || "KONZERT");
      setBezirkId(saved.bezirkId || "");
      setDistrictName(saved.districtName || "");
      setCancelled(saved.cancelled || false);
      setLocationId(saved.locationId || "");
      setLocationSearch(saved.locationSearch || "");
      setPerformingEnsembleType(saved.performingEnsembleType || null);
      setEnsembleId(saved.ensembleId || "");
      setEnsembleSearch(saved.ensembleSearch || "");
      setAuswahlChorId(saved.auswahlChorId || "");
      setAuswahlChorSearch(saved.auswahlChorSearch || "");
      setPerformingEnsembleName(saved.performingEnsembleName || "");
      setLeitung(saved.leitung || "");
      setOpenToParticipants(saved.openToParticipants || false);
      setParticipationInfo(saved.participationInfo || "");
      setIsFree(saved.isFree ?? true);
      setPriceInfo(saved.priceInfo || "");
      setPriceOptions(saved.priceOptions || []);
      setCoverImageId(saved.coverImageId || null);
      setCoverImageUrl(saved.coverImageUrl || null);
      setDownloadIds(saved.downloadIds || []);
      setSelectedDownloads(saved.selectedDownloads || []);
      setStatus(saved.status || "DRAFT");
    });
  };

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
  const selectableBezirke = selectableBezirkIds
    ? (bezirke?.filter((b) => selectableBezirkIds.includes(b.id)) ?? [])
    : (bezirke ?? []);

  const { data: locationsData } = api.locations.getAll.useQuery({
    limit: 100,
    search: locationSearch || undefined,
  });

  const { data: ensemblesData } = api.ensembles.getAll.useQuery(
    {
      limit: 100,
      search: ensembleSearch || undefined,
      // Derselbe Zuschnitt, den der Server beim Speichern prüft.
      bezirkIds: selectableBezirkIds ?? undefined,
    },
    // Ohne die alte Liste klappt das Dropdown bei jedem Tastendruck zu.
    { placeholderData: (prev) => prev },
  );

  // Die Suche läuft auf dem Server; dessen Treffer aus der Beschreibung
  // gehören nicht in eine Namenssuche.
  const ensembleOptions = (ensemblesData?.ensembles ?? []).filter((e) =>
    e.name.toLowerCase().includes(ensembleSearch.toLowerCase()),
  );

  const { data: auswahlchoereData } = api.auswahlchoere.getAll.useQuery(
    {},
    { enabled: isHigherRole },
  );

  useEffect(() => {
    if (event && !isInitialized) {
      startTransition(() => {
        setTitle(event.title);
        setSlug(event.slug ?? "");
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

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/events/${eventId}/edit`);
    }
  }, [session, sessionLoading, router, eventId]);

  useEffect(() => {
    if (!permissionsLoading && !hasDashboardAccess && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/");
    }
  }, [permissionsLoading, hasDashboardAccess, router]);

  useEffect(() => {
    if (event && profile && !hasRedirected.current) {
      const hasEditPermission =
        hasPermission("events.edit" as PermissionKey) ||
        hasPermission("events.approve" as PermissionKey);
      const canEdit =
        event.createdById === session?.user?.id || hasEditPermission;

      if (!canEdit) {
        hasRedirected.current = true;
        router.push(`/dashboard/events/${eventId}`);
      }
    }
  }, [event, profile, session, router, eventId, hasPermission]);

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

    // Ohne `maxLength` am Textfeld muss die Länge hier geprüft
    // werden: Sonst lehnte erst der Server ab, und zwar mit
    // einer englischen Zod-Meldung.
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      setError(
        `Die Beschreibung ist zu lang (${description.length} von ${MAX_DESCRIPTION_LENGTH} Zeichen).`,
      );
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
      slug: slug.trim() || undefined,
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

  if (sessionLoading || profileLoading || permissionsLoading || eventLoading) {
    return (
      <div className="dark:bg-night bg-paper flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !event) {
    return (
      <div className="dark:bg-night bg-paper flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-ink dark:text-night-text text-xl font-semibold">
            Termin nicht gefunden
          </h1>
          <Link
            href="/dashboard/events"
            className="text-primary-ink dark:text-primary mt-4 inline-block hover:underline"
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
        <DraftRestorePrompt
          draft={pendingDraft}
          onRestore={handleRestoreDraft}
          onDiscard={discardDraft}
          storageFailed={storageFailed}
        />

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <DashboardSectionedFormLayout
            navItems={EDIT_EVENT_NAV_ITEMS}
            contentClassName="space-y-14 sm:space-y-16"
          >
            <div
              id="event-form-inhalt"
              className="dashboard-form-scroll-anchor"
            >
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
                        <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                          Titel *
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="z.B. Konzert zum Advent"
                          className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper block w-full border px-3 py-2"
                          maxLength={200}
                          required
                        />
                      </div>

                      <SlugField
                        value={slug}
                        onChange={setSlug}
                        autoSlug={autoSlug}
                        basePath="/termine/event/"
                        currentSlug={event?.slug}
                      />

                      <div>
                        <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                          Motto / Untertitel
                        </label>
                        <input
                          type="text"
                          value={motto}
                          onChange={(e) => setMotto(e.target.value)}
                          placeholder="z.B. Musik zur Weihnachtszeit"
                          className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper block w-full border px-3 py-2"
                          maxLength={500}
                        />
                      </div>

                      <div>
                        <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                          Beschreibung
                        </label>
                        {/* Markdown-Schreibfläche, siehe Termin anlegen. */}
                        <RichTextEditor
                          variant="beschreibung"
                          ariaLabel="Beschreibung"
                          content={description}
                          onChange={setDescription}
                          placeholder="Beschreibe die Veranstaltung..."
                        />
                        <p className="text-dark dark:text-night-muted mt-2 text-xs">
                          Überschriften, Listen, Links und Hervorhebungen sind
                          möglich.
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor="event-category"
                          className="text-ink dark:text-night-text mb-1 block text-sm font-medium"
                        >
                          Kategorie *
                        </label>
                        <Select
                          id="event-category"
                          value={category}
                          onChange={(e) =>
                            setCategory(e.target.value as EventCategory)
                          }
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

                      {/* Cancelled Toggle */}
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={cancelled}
                          onChange={(e) => setCancelled(e.target.checked)}
                          className="border-ink dark:border-night-text h-4 w-4 border text-red-600"
                        />
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">
                          Veranstaltung abgesagt
                        </span>
                      </label>
                    </div>
                  </DashboardFormBlock>
                }
                aside={
                  <>
                    <DashboardFormBlock title="Titelbild">
                      <div className="space-y-4">
                        {coverImageUrl ? (
                          <div className="relative">
                            <div className="border-rule dark:border-night-rule relative aspect-video w-full overflow-hidden border">
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
                                className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised min-h-11 border px-4 py-2 text-sm font-medium transition-colors"
                              >
                                Bild ändern
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCoverImageId(null);
                                  setCoverImageUrl(null);
                                }}
                                className="min-h-11 border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                              >
                                Bild entfernen
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowMediaPicker(true)}
                            className="border-ink dark:border-night-text hover:border-primary dark:hover:bg-night-raised hover:bg-rule/25 flex min-h-11 w-full flex-col items-center justify-center border-2 border-dashed p-6 transition-colors sm:p-8"
                          >
                            <ImageIcon className="text-dark dark:text-night-muted h-10 w-10 sm:h-12 sm:w-12" />
                            <span className="text-ink dark:text-night-text mt-2 text-sm font-medium">
                              Titelbild auswählen
                            </span>
                            <span className="text-dark dark:text-night-muted mt-1 text-center text-xs">
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
                                className="border-rule dark:border-night-rule dark:bg-night-raised bg-rule/25 flex items-center justify-between border p-3"
                              >
                                <div className="flex items-center gap-3">
                                  <FileDown className="text-dark dark:text-night-muted h-5 w-5" />
                                  <span className="text-ink dark:text-night-text text-sm font-medium">
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
                                  className="text-dark dark:text-night-muted hover:bg-rule dark:hover:bg-night-rule p-1 transition-colors hover:text-red-600"
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
                          className="border-ink dark:border-night-text hover:border-primary dark:hover:bg-night-raised hover:bg-rule/25 flex min-h-11 w-full items-center justify-center gap-2 border-2 border-dashed px-4 py-3 text-sm font-medium transition-colors"
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
              className="border-rule dark:border-night-rule dashboard-form-scroll-anchor border-t pt-14"
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
                      <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                        Datum *
                      </label>
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper block w-full border px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                        Uhrzeit *
                      </label>
                      <input
                        type="time"
                        value={eventTime}
                        onChange={(e) => setEventTime(e.target.value)}
                        className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper block w-full border px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
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
                        className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper block w-full border px-3 py-2"
                      />
                    </div>
                  </div>
                </DashboardFormBlock>

                <DashboardFormBlock title="Veranstaltungsort">
                  <div className="space-y-4">
                    <div className="relative" data-dropdown>
                      <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
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
                        className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper block w-full border px-3 py-2"
                      />

                      {/* Location Dropdown */}
                      {showLocationDropdown && locationsData && (
                        <div className="border-rule dark:border-night-rule dark:bg-night-raised bg-paper absolute z-10 mt-1 w-full overflow-hidden border">
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
                                    onClick={() =>
                                      handleLocationSelect(location)
                                    }
                                    className="hover:bg-rule/25 dark:hover:bg-night-rule block w-full px-4 py-2 text-left text-sm"
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
                            className="text-primary-ink dark:text-primary border-rule dark:border-night-rule hover:bg-rule/25 dark:hover:bg-night-rule block w-full border-t px-4 py-2 text-left text-sm font-medium"
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

                    {/* Clear Location */}
                    {locationId && (
                      <button
                        type="button"
                        onClick={() => {
                          setLocationId("");
                          setLocationSearch("");
                        }}
                        className="text-dark dark:text-night-muted hover:text-ink dark:hover:text-night-text text-sm"
                      >
                        Ort entfernen
                      </button>
                    )}
                  </div>
                </DashboardFormBlock>

                <DashboardFormBlock title="Bezirk">
                  <div className="space-y-4">
                    {selectableBezirkIds !== null &&
                    selectableBezirke.length < 2 ? (
                      <div>
                        <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                          Dein Bezirk
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={
                              !bezirke
                                ? "Wird geladen..."
                                : bezirke.find((b) => b.id === bezirkId)
                                  ? `Bezirk ${bezirke.find((b) => b.id === bezirkId)?.number} – ${bezirke.find((b) => b.id === bezirkId)?.name}`
                                  : "Übergreifend / Kein Bezirk"
                            }
                            disabled
                            className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-rule/25 text-ink block w-full cursor-not-allowed border px-3 py-2 opacity-60"
                          />
                          <Lock className="text-dark dark:text-night-muted h-5 w-5 shrink-0" />
                        </div>
                        <p className="text-dark dark:text-night-muted mt-1 text-xs">
                          Du kannst Termine nur deinem eigenen Bezirk zuordnen.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                            Bezirk auswählen
                          </label>
                          <Select
                            value={bezirkId}
                            onChange={(e) => setBezirkId(e.target.value)}
                          >
                            {selectableBezirkIds === null && (
                              <option value="">
                                Übergreifend / Kein Bezirk
                              </option>
                            )}
                            {selectableBezirke.map((bezirk) => (
                              <option key={bezirk.id} value={bezirk.id}>
                                Bezirk {bezirk.number} – {bezirk.shortName}
                              </option>
                            ))}
                          </Select>
                        </div>

                        {!bezirkId && (
                          <div>
                            <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                              Oder Bezirksname eingeben
                            </label>
                            <input
                              type="text"
                              value={districtName}
                              onChange={(e) => setDistrictName(e.target.value)}
                              placeholder="z.B. Köln-Bonn"
                              className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper block w-full border px-3 py-2"
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
              className="border-rule dark:border-night-rule dashboard-form-scroll-anchor border-t pt-14"
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
                      <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
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
                        <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
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
                          className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper block w-full border px-3 py-2"
                        />

                        {/* Ensemble Dropdown */}
                        {showEnsembleDropdown && ensemblesData && (
                          <div className="border-rule dark:border-night-rule dark:bg-night-raised bg-paper absolute z-10 mt-1 w-full overflow-hidden border">
                            <div
                              className="overflow-y-auto"
                              style={{ maxHeight: "240px" }}
                            >
                              {ensembleOptions.map((ensemble) => (
                                <button
                                  key={ensemble.id}
                                  type="button"
                                  onClick={() => {
                                    setEnsembleId(ensemble.id);
                                    setEnsembleSearch(ensemble.name);
                                    setShowEnsembleDropdown(false);
                                  }}
                                  className="hover:bg-rule/25 dark:hover:bg-night-rule block w-full px-4 py-2 text-left text-sm"
                                >
                                  <span className="text-ink dark:text-night-text font-medium">
                                    {ensemble.name}
                                  </span>
                                  {ensemble.bezirk && (
                                    <span className="text-dark dark:text-night-muted">
                                      {" "}
                                      – Bezirk {ensemble.bezirk.number}
                                    </span>
                                  )}
                                </button>
                              ))}
                              {ensembleOptions.length === 0 && (
                                <div className="text-dark dark:text-night-muted px-4 py-3 text-sm">
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
                        <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
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
                          className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper block w-full border px-3 py-2"
                        />

                        {/* Auswahlchor Dropdown */}
                        {showAuswahlChorDropdown && auswahlchoereData && (
                          <div className="border-rule dark:border-night-rule dark:bg-night-raised bg-paper absolute z-10 mt-1 w-full overflow-hidden border">
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
                                    className="hover:bg-rule/25 dark:hover:bg-night-rule block w-full px-4 py-2 text-left text-sm"
                                  >
                                    <span className="text-ink dark:text-night-text font-medium">
                                      {chor.name}
                                    </span>
                                  </button>
                                ))}
                              {auswahlchoereData.auswahlchoere?.filter((c) =>
                                c.name
                                  .toLowerCase()
                                  .includes(auswahlChorSearch.toLowerCase()),
                              ).length === 0 && (
                                <div className="text-dark dark:text-night-muted px-4 py-3 text-sm">
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
                        <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                          Ensemble-Name
                        </label>
                        <input
                          type="text"
                          value={performingEnsembleName}
                          onChange={(e) =>
                            setPerformingEnsembleName(e.target.value)
                          }
                          placeholder="z.B. Posaunenchor Beispielstadt"
                          className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper block w-full border px-3 py-2"
                        />
                      </div>
                    )}

                    {performingEnsembleType && (
                      <div>
                        <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                          Leitung
                        </label>
                        <input
                          type="text"
                          value={leitung}
                          onChange={(e) => setLeitung(e.target.value)}
                          placeholder="Name der musikalischen Leitung"
                          className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper block w-full border px-3 py-2"
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
                        onChange={(e) =>
                          setOpenToParticipants(e.target.checked)
                        }
                        className="text-primary border-ink dark:border-night-text h-4 w-4"
                      />
                      <span className="text-ink dark:text-night-text text-sm">
                        Offen für externe Teilnehmer / Mitwirkende
                      </span>
                    </label>

                    {openToParticipants && (
                      <div>
                        <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                          Teilnahme-Informationen
                        </label>
                        <textarea
                          value={participationInfo}
                          onChange={(e) => setParticipationInfo(e.target.value)}
                          rows={3}
                          placeholder="Informationen zur Teilnahme, Anmeldung, etc."
                          className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper block w-full border px-3 py-2"
                        />
                      </div>
                    )}
                  </div>
                </DashboardFormBlock>
              </div>
            </div>

            <div
              id="event-form-preise"
              className="border-rule dark:border-night-rule dashboard-form-scroll-anchor border-t pt-14"
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
                        className="text-primary border-ink dark:border-night-text h-4 w-4"
                      />
                      <span className="text-ink dark:text-night-text text-sm">
                        Eintritt frei
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        checked={!isFree}
                        onChange={() => setIsFree(false)}
                        className="text-primary border-ink dark:border-night-text h-4 w-4"
                      />
                      <span className="text-ink dark:text-night-text text-sm">
                        Mit Eintritt
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
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
                      className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper block w-full border px-3 py-2"
                    />
                  </div>

                  {!isFree && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-ink dark:text-night-text text-sm font-medium">
                          Preiskategorien
                        </label>
                        <button
                          type="button"
                          onClick={addPriceOption}
                          className="text-primary-ink dark:text-primary text-sm font-medium hover:underline"
                        >
                          + Kategorie hinzufügen
                        </button>
                      </div>

                      {priceOptions.length === 0 ? (
                        <p className="text-dark dark:text-night-muted text-sm">
                          Noch keine Preiskategorien angelegt
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {priceOptions.map((option) => (
                            <div
                              key={option.id}
                              className="border-rule dark:border-night-rule flex items-start gap-3 border p-3"
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
                                    className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper border px-3 py-1.5 text-sm"
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
                                      className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper w-24 border px-3 py-1.5 text-sm"
                                    />
                                    <span className="text-dark dark:text-night-muted text-sm">
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
                                  className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper w-full border px-3 py-1.5 text-sm"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removePriceOption(option.id)}
                                className="text-dark dark:text-night-muted p-1 hover:text-red-500"
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
              className="border-rule dark:border-night-rule dashboard-form-scroll-anchor border-t pt-14"
            >
              <DashboardFormZoneHeader
                step={5}
                title="Veröffentlichung"
                description="Redaktionsstatus, Sichtbarkeit und Freigabe im öffentlichen Kalender."
              />
              <DashboardFormBlock title="Status & Freigabe">
                {/* Notice for approved/rejected events being edited */}
                {(event?.status === ContentStatus.APPROVED ||
                  event?.status === ContentStatus.REJECTED) &&
                  !isHigherRole && (
                    // Hinweis statt Alarm: Tinte auf Papier an einer
                    // Haarlinie statt bernsteinfarbenem Kasten.
                    <div className="border-ink dark:border-night-text mb-4 border-l-2 py-2 pl-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="dark:text-night-text text-ink mt-0.5 h-5 w-5 shrink-0" />
                        <div>
                          <p className="dark:text-night-text text-ink font-medium">
                            {event?.status === ContentStatus.APPROVED
                              ? "Hinweis zur erneuten Freigabe"
                              : "Hinweis zur erneuten Prüfung"}
                          </p>
                          <p className="text-dark dark:text-night-muted mt-1 text-sm">
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
                      <p className="text-dark dark:text-night-muted mb-3 text-sm">
                        Hinweis: Bei Änderungen wird der Status automatisch auf
                        &quot;Ausstehend&quot; zurückgesetzt, es sei denn, du
                        wählst einen anderen Status.
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
                          className="text-primary border-ink dark:border-night-text h-4 w-4"
                        />
                        <span className="text-ink dark:text-night-text text-sm">
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-dark dark:text-night-muted text-sm">
                    Aktueller Status:{" "}
                    <span className="font-medium">
                      {statusLabels[event?.status ?? ContentStatus.DRAFT]}
                    </span>
                    {(event?.status === ContentStatus.APPROVED ||
                      event?.status === ContentStatus.REJECTED) && (
                      <span className="ml-1">
                        → wird zu &quot;Ausstehend&quot;
                      </span>
                    )}
                  </p>
                )}
              </DashboardFormBlock>
            </div>

            <div className="border-rule dark:border-night-rule mt-16 flex flex-col gap-3 border-t pt-10 sm:flex-row sm:justify-end">
              <Link
                href={`/dashboard/events/${eventId}`}
                data-skip-warning
                onClick={() => clear()}
                className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised min-h-11 border px-6 py-2.5 text-center font-medium transition-colors"
              >
                Abbrechen
              </Link>
              <Button
                type="submit"
                disabled={isSubmitting || updateEventMutation.isPending}
                isLoading={isSubmitting || updateEventMutation.isPending}
              >
                Änderungen speichern
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
    </>
  );
}
