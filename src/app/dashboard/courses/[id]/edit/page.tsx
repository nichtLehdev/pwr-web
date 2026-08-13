"use client";
import { Select } from "@/app/_components/ui";

import { useState, useEffect, useRef, useMemo, startTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { parseDeadlineEndOfDay, toLocalDateInputValue } from "@/lib/date-input";
import { usePermissions } from "@/lib/use-permissions";
import type { PermissionKey } from "@/lib/permissions";
import { cn, getErrorMessage } from "@/lib/utils";
import { useToast } from "@/app/_components/ui/toast";
import {
  CourseType,
  ContentStatus,
  CourseCollaboratorRole,
} from "~/generated/prisma/enums";
import { customFieldTypeNeedsOptions } from "@/lib/course-custom-fields";
import {
  Lock,
  AlertTriangle,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  AlertTriangleIcon,
  ImageIcon,
  UserPlus,
} from "lucide-react";
import {
  DashboardPage,
  DashboardSectionedFormLayout,
  DashboardFormMediaSplit,
  DashboardFormZoneHeader,
  DashboardFormBlock,
  CourseFormEditMetaBar,
  CourseCustomFieldsEditor,
  DraftRestorePrompt,
  SlugField,
  type CourseCustomFieldDraft,
  type DashboardSectionNavItem,
} from "@/app/_components/dashboard";
import MediaPickerModal from "@/app/_components/editor/media-picker-modal";
import { datedSlugBase, slugify } from "@/lib/slug";
import { useAutosave } from "@/lib/useAutosave";
import { useBeforeUnload } from "@/lib/useBeforeUnload";
import {
  registrationOpensMerge,
  registrationOpensSplit,
} from "@/lib/dashboard-registration-opens-at";
import { isExternalCourse } from "@/lib/course-external";

const courseTypeLabels: Record<CourseType, string> = {
  LEHRGANG: "Lehrgang",
  FREIZEIT: "Freizeit",
  WORKSHOP: "Workshop",
  KOMPONISTENPORTRAIT: "Komponistenportrait",
  VERANSTALTUNG: "Veranstaltung",
  OTHER: "Sonstiges",
};

const statusLabels: Record<ContentStatus, string> = {
  DRAFT: "Entwurf",
  PENDING: "Zur Prüfung",
  APPROVED: "Veröffentlicht",
  REJECTED: "Abgelehnt",
  ARCHIVED: "Archiviert",
};

const COURSE_FORM_NAV_ITEMS: DashboardSectionNavItem[] = [
  { href: "#kurs-form-inhalt", label: "Inhalt" },
  { href: "#kurs-form-termin", label: "Termin & Ort" },
  { href: "#kurs-form-anmeldung", label: "Anmeldung" },
  { href: "#kurs-form-team", label: "Kurs-Team" },
  { href: "#kurs-form-preise", label: "Preise" },
  { href: "#kurs-form-veroeffentlichung", label: "Veröffentlichung" },
];

const courseCollaboratorRoleLabels: Record<CourseCollaboratorRole, string> = {
  [CourseCollaboratorRole.ORGANIZER]:
    "Organisator:in (Kurs bearbeiten, Team verwalten)",
  [CourseCollaboratorRole.STAFF]: "Team (Teilnehmerliste & Anmeldungen)",
};

// Dashboard access is now controlled by permissions

interface PriceOption {
  id: string;
  price: number;
  label: string;
  description: string;
  maxParticipants?: number | null;
}

type CustomField = CourseCustomFieldDraft;

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [motto, setMotto] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("17:00");
  const [courseType, setCourseType] = useState<CourseType>(CourseType.LEHRGANG);
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
  const [registrationOpensAt, setRegistrationOpensAt] = useState("");
  const [scheduledRegistrationOpens, setScheduledRegistrationOpens] =
    useState(false);
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [hasRegistrationDeadline, setHasRegistrationDeadline] = useState(false);
  const [isExternalProvider, setIsExternalProvider] = useState(false);
  const [externalProviderName, setExternalProviderName] = useState("");
  const [externalRegistrationUrl, setExternalRegistrationUrl] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [allowWaitingList, setAllowWaitingList] = useState(false);
  const [allowSiblingDiscount, setAllowSiblingDiscount] = useState(false);
  const [isFree, setIsFree] = useState(true);
  const [paymentCashAllowed, setPaymentCashAllowed] = useState(true);
  const [paymentInvoiceAllowed, setPaymentInvoiceAllowed] = useState(true);
  const [invoicingEnabled, setInvoicingEnabled] = useState(false);
  const [priceInfo, setPriceInfo] = useState("");
  const [priceOptions, setPriceOptions] = useState<PriceOption[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [prerequisites, setPrerequisites] = useState("");
  const [whatToBring, setWhatToBring] = useState("");
  const [status, setStatus] = useState<ContentStatus>(ContentStatus.DRAFT);

  const [imageId, setImageId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [customFieldsChanged, setCustomFieldsChanged] = useState(false);
  const [originalCustomFields, setOriginalCustomFields] = useState<
    CustomField[]
  >([]);
  const originalDataRef = useRef<{
    title: string;
    motto: string;
    description: string;
    courseType: CourseType;
    startDate: string;
    endDate: string;
    registrationDeadline: string;
    hasRegistrationDeadline: boolean;
    registrationOpensAt: string;
    scheduledRegistrationOpens: boolean;
    locationId: string;
    bezirkId: string;
    isExternalProvider: boolean;
    externalProviderName: string;
    externalRegistrationUrl: string;
    maxParticipants: string;
    registrationOpen: boolean;
    allowWaitingList: boolean;
    allowSiblingDiscount: boolean;
    isFree: boolean;
    paymentCashAllowed: boolean;
    paymentInvoiceAllowed: boolean;
    invoicingEnabled: boolean;
    priceInfo: string;
    priceOptions: PriceOption[];
    prerequisites: string;
    whatToBring: string;
    imageId: string | null;
    customFields: CustomField[];
    status: ContentStatus;
  } | null>(null);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, { enabled: !!session?.user });

  const { data: course, isLoading: courseLoading } =
    api.courses.getById.useQuery(
      { id: courseId },
      { enabled: !!courseId && !!session?.user },
    );

  const formData = useMemo(
    () => ({
      title,
      slug,
      motto,
      description,
      courseType,
      startDate,
      startTime,
      endDate,
      endTime,
      registrationDeadline,
      hasRegistrationDeadline,
      registrationOpensAt,
      scheduledRegistrationOpens,
      locationId,
      locationSearch,
      bezirkId,
      isExternalProvider,
      externalProviderName,
      externalRegistrationUrl,
      maxParticipants,
      registrationOpen,
      allowWaitingList,
      allowSiblingDiscount,
      isFree,
      paymentCashAllowed,
      paymentInvoiceAllowed,
      invoicingEnabled,
      priceInfo,
      priceOptions,
      prerequisites,
      whatToBring,
      imageId,
      imageUrl,
      customFields,
      status,
    }),
    [
      title,
      slug,
      motto,
      description,
      courseType,
      startDate,
      startTime,
      endDate,
      endTime,
      registrationDeadline,
      hasRegistrationDeadline,
      registrationOpensAt,
      scheduledRegistrationOpens,
      locationId,
      locationSearch,
      bezirkId,
      isExternalProvider,
      externalProviderName,
      externalRegistrationUrl,
      maxParticipants,
      registrationOpen,
      allowWaitingList,
      allowSiblingDiscount,
      isFree,
      paymentCashAllowed,
      paymentInvoiceAllowed,
      invoicingEnabled,
      priceInfo,
      priceOptions,
      prerequisites,
      whatToBring,
      imageId,
      imageUrl,
      customFields,
      status,
    ],
  );

  const { pendingDraft, restoreDraft, discardDraft, clear, storageFailed } =
    useAutosave({
      name: `course-${courseId}-edit`,
      data: formData,
      userId: session?.user?.id,
      ready: isInitialized,
    });

  // Mirrors what createCourseSlug derives on the server, so the preview is honest.
  const autoSlug = useMemo(() => {
    const parsed = startDate
      ? new Date(`${startDate}T${startTime || "00:00"}`)
      : null;
    return parsed && !Number.isNaN(parsed.getTime())
      ? datedSlugBase(title, parsed)
      : slugify(title);
  }, [title, startDate, startTime]);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const hasChanges = originalDataRef.current
      ? JSON.stringify(formData) !== JSON.stringify(originalDataRef.current)
      : Boolean(title.trim() || description.trim() || startDate);
    startTransition(() => {
      setHasUnsavedChanges(hasChanges);
    });
  }, [formData, title, description, startDate]);

  useBeforeUnload(Boolean(hasUnsavedChanges && !isSubmitting));

  const handleRestoreDraft = () => {
    const saved = restoreDraft();
    if (!saved) return;
    startTransition(() => {
      setTitle(saved.title || "");
      setSlug(saved.slug || "");
      setMotto(saved.motto || "");
      setDescription(saved.description || "");
      setCourseType(saved.courseType || CourseType.LEHRGANG);
      setStartDate(saved.startDate || "");
      setStartTime(saved.startTime || "09:00");
      setEndDate(saved.endDate || "");
      setEndTime(saved.endTime || "17:00");
      setRegistrationDeadline(saved.registrationDeadline || "");
      setHasRegistrationDeadline(
        saved.hasRegistrationDeadline ?? Boolean(saved.registrationDeadline),
      );
      const restoredScheduled =
        saved.scheduledRegistrationOpens ?? Boolean(saved.registrationOpensAt);
      setScheduledRegistrationOpens(restoredScheduled);
      setRegistrationOpensAt(
        restoredScheduled ? saved.registrationOpensAt || "" : "",
      );
      setLocationId(saved.locationId || "");
      setLocationSearch(saved.locationSearch || "");
      setBezirkId(saved.bezirkId || "");
      setIsExternalProvider(saved.isExternalProvider || false);
      setExternalProviderName(saved.externalProviderName || "");
      setExternalRegistrationUrl(saved.externalRegistrationUrl || "");
      setMaxParticipants(saved.maxParticipants || "");
      setRegistrationOpen(saved.registrationOpen || false);
      setAllowWaitingList(saved.allowWaitingList || false);
      setAllowSiblingDiscount(saved.allowSiblingDiscount || false);
      setIsFree(saved.isFree ?? true);
      setPaymentCashAllowed(saved.paymentCashAllowed ?? true);
      setPaymentInvoiceAllowed(saved.paymentInvoiceAllowed ?? true);
      setInvoicingEnabled(saved.invoicingEnabled ?? false);
      setPriceInfo(saved.priceInfo || "");
      setPriceOptions(saved.priceOptions || []);
      setPrerequisites(saved.prerequisites || "");
      setWhatToBring(saved.whatToBring || "");
      setImageId(saved.imageId || null);
      setImageUrl(saved.imageUrl || null);
      setCustomFields(saved.customFields || []);
      setStatus(saved.status || ContentStatus.DRAFT);
    });
  };

  useEffect(() => {
    if (course && isInitialized && !originalDataRef.current) {
      const start = new Date(course.startDate);
      const end = new Date(course.endDate);
      originalDataRef.current = {
        title: course.title || "",
        motto: course.motto || "",
        description: course.description || "",
        courseType: course.courseType || CourseType.LEHRGANG,
        startDate: toLocalDateInputValue(start),
        endDate: toLocalDateInputValue(end),
        registrationDeadline: course.registrationDeadline
          ? toLocalDateInputValue(new Date(course.registrationDeadline))
          : "",
        hasRegistrationDeadline: Boolean(course.registrationDeadline),
        registrationOpensAt: course.registrationOpensAt
          ? (() => {
              const opensAt = new Date(course.registrationOpensAt);
              const year = opensAt.getFullYear();
              const month = String(opensAt.getMonth() + 1).padStart(2, "0");
              const day = String(opensAt.getDate()).padStart(2, "0");
              const hours = String(opensAt.getHours()).padStart(2, "0");
              const minutes = String(opensAt.getMinutes()).padStart(2, "0");
              return `${year}-${month}-${day}T${hours}:${minutes}`;
            })()
          : "",
        scheduledRegistrationOpens: Boolean(course.registrationOpensAt),
        locationId: course.locationId || "",
        bezirkId: course.bezirkId || "",
        isExternalProvider: isExternalCourse(course),
        externalProviderName: course.externalProviderName || "",
        externalRegistrationUrl: course.externalRegistrationUrl || "",
        maxParticipants: course.maxParticipants?.toString() || "",
        registrationOpen: course.registrationOpen || false,
        allowWaitingList: course.allowWaitingList || false,
        allowSiblingDiscount: course.allowSiblingDiscount || false,
        isFree: course.isFree ?? true,
        paymentCashAllowed: course.paymentCashAllowed ?? true,
        paymentInvoiceAllowed: course.paymentInvoiceAllowed ?? true,
        invoicingEnabled: course.invoicingEnabled ?? false,
        priceInfo: course.priceInfo || "",
        priceOptions:
          course.priceOptions?.map((opt) => ({
            id: opt.id,
            price: opt.price,
            label: opt.label,
            description: opt.description || "",
            maxParticipants: opt.maxParticipants || null,
          })) || [],
        prerequisites: course.prerequisites || "",
        whatToBring: course.whatToBring || "",
        imageId: course.imageId || null,
        customFields:
          course.customFields?.map((cf) => ({
            id: cf.id,
            fieldName: cf.fieldName,
            fieldType: cf.fieldType,
            options:
              typeof cf.options === "string"
                ? cf.options
                : JSON.stringify(cf.options ?? ""),
            isRequired: cf.isRequired,
            helpText: cf.helpText || "",
            sortOrder: cf.sortOrder,
          })) || [],
        status: course.status || ContentStatus.DRAFT,
      };
    }
  }, [course, isInitialized]);

  const locationDropdownRef = useRef<HTMLDivElement>(null);

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

  const {
    hasDashboardAccess,
    hasPermission,
    isLoading: permissionsLoading,
  } = usePermissions();

  const hasApprovePermission = hasPermission(
    "courses.approve" as PermissionKey,
  );
  const hasCoursesEditPermission =
    hasPermission("courses.edit" as PermissionKey) ||
    hasPermission("courses.approve" as PermissionKey);
  const isHigherRole = hasApprovePermission;
  const canEnableInvoicing = hasPermission(
    "courses.enable_invoicing" as PermissionKey,
  );
  // The same permission courses.update checks. Gating the control on
  // courses.approve instead used to hide it from people who were allowed to
  // set it, and show a value they were not allowed to change.
  const canManageSiblingDiscount = hasPermission(
    "courses.manage_registrations" as PermissionKey,
  );
  const userBezirkId = profile?.bezirkId ?? null;

  const canManageCourseTeamUi = useMemo(() => {
    if (!course || !profile || !session?.user) return false;
    const isDistrictManager =
      !!profile.bezirkId &&
      !!course.bezirkId &&
      profile.bezirkId === course.bezirkId;
    return (
      course.createdById === session.user.id ||
      hasCoursesEditPermission ||
      isDistrictManager ||
      course.viewerCollaboratorRole === CourseCollaboratorRole.ORGANIZER
    );
  }, [course, profile, session?.user, hasCoursesEditPermission]);

  const [courseTeamPickQuery, setCourseTeamPickQuery] = useState("");
  const [guestTeamDraft, setGuestTeamDraft] = useState<
    { displayName: string; bio: string }[]
  >([]);

  const opensScheduleParts = useMemo(() => {
    const { date: opensDatePart, time: opensTimePart } =
      registrationOpensSplit(registrationOpensAt);
    const opensTimeMax =
      opensDatePart && startDate && opensDatePart === startDate
        ? startTime
        : undefined;
    return {
      opensDatePart,
      opensTimePart,
      opensTimeMax,
    };
  }, [registrationOpensAt, startDate, startTime]);

  const registrationFieldInputClass =
    "focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none";

  const teamDenseInputClass = cn(
    registrationFieldInputClass,
    "py-1.5 text-sm leading-snug",
  );

  useEffect(() => {
    if (course && !isInitialized) {
      startTransition(() => {
        setTitle(course.title);
        setSlug(course.slug ?? "");
        setMotto(course.motto || "");
        setDescription(course.description);

        const start = new Date(course.startDate);
        setStartDate(toLocalDateInputValue(start));
        setStartTime(
          start.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
        );
        const end = new Date(course.endDate);
        setEndDate(toLocalDateInputValue(end));
        setEndTime(
          end.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
        );

        setCourseType(course.courseType);
        setBezirkId(course.bezirkId || "");
        setStatus(course.status);

        if (course.location) {
          setLocationId(course.location.id);
          setLocationSearch(
            `${course.location.name ? course.location.name + ", " : ""}${course.location.city}`,
          );
        }

        setRegistrationOpen(course.registrationOpen);
        if (course.registrationOpensAt) {
          const opensAt = new Date(course.registrationOpensAt);
          const year = opensAt.getFullYear();
          const month = String(opensAt.getMonth() + 1).padStart(2, "0");
          const day = String(opensAt.getDate()).padStart(2, "0");
          const hours = String(opensAt.getHours()).padStart(2, "0");
          const minutes = String(opensAt.getMinutes()).padStart(2, "0");
          setRegistrationOpensAt(`${year}-${month}-${day}T${hours}:${minutes}`);
          setScheduledRegistrationOpens(true);
        } else {
          setRegistrationOpensAt("");
          setScheduledRegistrationOpens(false);
        }
        if (course.registrationDeadline) {
          const deadline = new Date(course.registrationDeadline);
          setRegistrationDeadline(toLocalDateInputValue(deadline));
          setHasRegistrationDeadline(true);
        } else {
          setRegistrationDeadline("");
          setHasRegistrationDeadline(false);
        }
        setIsExternalProvider(isExternalCourse(course));
        setExternalProviderName(course.externalProviderName || "");
        setExternalRegistrationUrl(course.externalRegistrationUrl || "");
        setMaxParticipants(course.maxParticipants?.toString() || "");
        setAllowWaitingList(course.allowWaitingList);
        setAllowSiblingDiscount(course.allowSiblingDiscount ?? false);

        setIsFree(course.isFree);
        setPaymentCashAllowed(course.paymentCashAllowed ?? true);
        setPaymentInvoiceAllowed(course.paymentInvoiceAllowed ?? true);
        setInvoicingEnabled(course.invoicingEnabled ?? false);
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

        if (course.image) {
          setImageId(course.image.id);
          setImageUrl(course.image.url);
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
      });
    }
  }, [course, isInitialized]);

  const utils = api.useUtils();

  const { data: courseCollaboratorsFetched } =
    api.courses.listCollaborators.useQuery(
      { courseId },
      {
        enabled: !!courseId && !!session?.user && canManageCourseTeamUi,
      },
    );

  const { data: courseTeamPickUsers } = api.users.search.useQuery(
    { query: courseTeamPickQuery.trim(), limit: 12 },
    {
      enabled:
        courseTeamPickQuery.trim().length >= 2 &&
        canManageCourseTeamUi &&
        !!session?.user,
    },
  );

  const setCollaboratorsMutation = api.courses.setCollaborators.useMutation({
    onSuccess: async () => {
      await utils.courses.listCollaborators.invalidate({ courseId });
      await utils.courses.getById.invalidate({ id: courseId });
      await utils.courses.getDashboardCourses.invalidate();
    },
    onError: (err) => {
      toast.error(
        "Team konnte nicht gespeichert werden: " + getErrorMessage(err),
      );
    },
  });

  const { data: guestTeamFetched } = api.courses.listGuestTeamMembers.useQuery(
    { courseId },
    {
      enabled: !!courseId && !!session?.user && canManageCourseTeamUi,
    },
  );

  const setGuestTeamMembersMutation =
    api.courses.setGuestTeamMembers.useMutation({
      onSuccess: async () => {
        await utils.courses.listGuestTeamMembers.invalidate({ courseId });
        await utils.courses.getById.invalidate({ id: courseId });
        toast.success("Mitwirkende ohne Konto gespeichert");
      },
      onError: (err) => {
        toast.error("Speichern fehlgeschlagen: " + getErrorMessage(err));
      },
    });

  useEffect(() => {
    if (guestTeamFetched === undefined) return;
    const rows = guestTeamFetched.map((r) => ({
      displayName: r.displayName,
      bio: r.bio ?? "",
    }));
    startTransition(() => {
      setGuestTeamDraft(rows);
    });
  }, [guestTeamFetched]);

  const courseTeamListed = courseCollaboratorsFetched ?? [];
  const teamMutationBusy = setCollaboratorsMutation.isPending;
  const guestTeamMutationBusy = setGuestTeamMembersMutation.isPending;

  const updateCourseMutation = api.courses.update.useMutation({
    onSuccess: async () => {
      clear();
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
    if (!permissionsLoading && !hasDashboardAccess && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/");
    }
  }, [permissionsLoading, hasDashboardAccess, router]);

  useEffect(() => {
    if (course && profile && !hasRedirected.current) {
      const isCreator = course.createdById === session?.user?.id;
      const isObleuteForDistrict =
        profile.bezirkId &&
        course.bezirkId &&
        profile.bezirkId === course.bezirkId;
      const isDelegatedOrganizer =
        course.viewerCollaboratorRole === CourseCollaboratorRole.ORGANIZER;

      const canEdit =
        !!isCreator ||
        hasCoursesEditPermission ||
        isObleuteForDistrict ||
        isDelegatedOrganizer;

      if (!canEdit) {
        hasRedirected.current = true;
        router.push(`/dashboard/courses/${courseId}`);
      }
    }
  }, [course, profile, session, router, courseId, hasCoursesEditPermission]);

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
  const registrationCount =
    course?.registrationStats?.totalConfirmedParticipants ??
    course?._count?.participants ??
    0;
  const participantsByPriceOption =
    course?.registrationStats?.byPriceOptionLabel ?? {};

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

    if (isExternalProvider) {
      const url = externalRegistrationUrl.trim();
      if (!url) {
        setError("Bitte gib die URL zur externen Anmeldung an.");
        setIsSubmitting(false);
        return;
      }
      try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          throw new Error("invalid protocol");
        }
      } catch {
        setError("Bitte gib eine gültige URL ein (mit http:// oder https://).");
        setIsSubmitting(false);
        return;
      }
      if (hasRegistrations && course && !isExternalCourse(course)) {
        setError(
          "Kurse mit bestehenden Anmeldungen können nicht auf externe Anmeldung umgestellt werden.",
        );
        setIsSubmitting(false);
        return;
      }
    } else if (!maxParticipants || parseInt(maxParticipants) < 1) {
      setError("Bitte gib die maximale Teilnehmerzahl an.");
      setIsSubmitting(false);
      return;
    }

    if (
      !isExternalProvider &&
      hasRegistrations &&
      parseInt(maxParticipants) < registrationCount
    ) {
      setError(
        `Die maximale Teilnehmerzahl darf nicht unter ${registrationCount} liegen (bereits angemeldet).`,
      );
      setIsSubmitting(false);
      return;
    }

    if (hasRegistrations && !isFree) {
      for (const option of priceOptions) {
        if (option.maxParticipants == null) continue;
        const minForOption = participantsByPriceOption[option.label] ?? 0;
        if (option.maxParticipants < minForOption) {
          setError(
            `Das Limit für „${option.label}“ darf nicht unter ${minForOption} liegen (bereits angemeldet).`,
          );
          setIsSubmitting(false);
          return;
        }
      }
    }

    if (scheduledRegistrationOpens) {
      if (!registrationOpensAt.trim()) {
        setError(
          "Bitte wähle Datum und Uhrzeit für den geplanten Anmeldebeginn.",
        );
        setIsSubmitting(false);
        return;
      }
      const opensDt = new Date(registrationOpensAt);
      const startDt = new Date(`${startDate}T${startTime}`);
      if (Number.isNaN(opensDt.getTime()) || Number.isNaN(startDt.getTime())) {
        setError("Datum oder Zeit für den Anmeldebeginn ist ungültig.");
        setIsSubmitting(false);
        return;
      }
      if (opensDt.getTime() >= startDt.getTime()) {
        setError(
          "Der geplante Anmeldungsbeginn muss vor Kursbeginn (Datum und Uhrzeit) liegen.",
        );
        setIsSubmitting(false);
        return;
      }
      if (hasRegistrationDeadline && registrationDeadline) {
        const dl = parseDeadlineEndOfDay(registrationDeadline);
        if (!Number.isNaN(dl.getTime()) && opensDt > dl) {
          setError(
            "Der geplante Anmeldungsbeginn darf nicht nach dem Anmeldeschluss liegen.",
          );
          setIsSubmitting(false);
          return;
        }
      }
    }

    if (hasRegistrationDeadline && !registrationDeadline) {
      setError(
        "Bitte wähle ein Datum für den Anmeldeschluss oder deaktiviere die Option.",
      );
      setIsSubmitting(false);
      return;
    }

    if (
      !isExternalProvider &&
      !isFree &&
      !paymentCashAllowed &&
      !paymentInvoiceAllowed
    ) {
      setError(
        "Mindestens eine Zahlungsart (Bar vor Ort oder Rechnung per Überweisung) muss aktiv sein.",
      );
      setIsSubmitting(false);
      return;
    }

    const preparedPriceOptions =
      !isExternalProvider && !isFree
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

    const preparedCustomFields = isExternalProvider
      ? []
      : customFields
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
              options: customFieldTypeNeedsOptions(fieldType)
                ? options.trim()
                : undefined,
              isRequired,
              helpText: helpText.trim() || undefined,
              sortOrder,
            }),
          );

    updateCourseMutation.mutate({
      id: courseId,
      title: title.trim(),
      slug: slug.trim() || undefined,
      motto: motto.trim() || undefined,
      description: description.trim(),
      startDate: new Date(`${startDate}T${startTime}`),
      endDate: new Date(`${endDate}T${endTime}`),
      locationId: locationId || null,
      courseType,
      bezirkId: bezirkId || null,
      registrationOpen,
      registrationOpensAt:
        scheduledRegistrationOpens && registrationOpensAt
          ? new Date(registrationOpensAt)
          : null,
      registrationDeadline:
        hasRegistrationDeadline && registrationDeadline
          ? parseDeadlineEndOfDay(registrationDeadline)
          : null,
      externalProviderName: isExternalProvider
        ? externalProviderName.trim() || null
        : null,
      externalRegistrationUrl: isExternalProvider
        ? externalRegistrationUrl.trim()
        : null,
      maxParticipants: isExternalProvider ? null : parseInt(maxParticipants),
      allowWaitingList: isExternalProvider ? false : allowWaitingList,
      // Omitted entirely when the user may not change it: sending a hardcoded
      // false would ask the server to switch the discount off behind their
      // back. Turning the course external clears the flag server-side anyway.
      ...(canManageSiblingDiscount
        ? {
            allowSiblingDiscount: isExternalProvider
              ? false
              : allowSiblingDiscount,
          }
        : {}),
      isFree: isExternalProvider ? true : isFree,
      paymentCashAllowed,
      paymentInvoiceAllowed,
      invoicingEnabled: isExternalProvider ? false : invoicingEnabled,
      priceInfo: priceInfo.trim() || undefined,
      prerequisites: prerequisites.trim() || undefined,
      whatToBring: whatToBring.trim() || undefined,
      imageId: imageId || null,
      priceOptions: preparedPriceOptions,
      customFields: preparedCustomFields,
      status,
    });
  };

  if (sessionLoading || profileLoading || permissionsLoading || courseLoading) {
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
    <>
      <DashboardPage
        title={title.trim() || course.title || "Kurs bearbeiten"}
        description={`${courseTypeLabels[courseType]} · ${statusLabels[status]}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kurse", href: "/dashboard/courses" },
          { label: course.title, href: `/dashboard/courses/${courseId}` },
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

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <CourseFormEditMetaBar
            startDate={startDate}
            startTime={startTime}
            endDate={endDate}
            endTime={endTime}
            courseId={courseId}
          />

          <DashboardSectionedFormLayout
            navItems={COURSE_FORM_NAV_ITEMS}
            contentClassName="space-y-14 sm:space-y-16"
          >
            <div id="kurs-form-inhalt" className="dashboard-form-scroll-anchor">
              <DashboardFormZoneHeader
                step={1}
                title="Inhalt"
                description="Das, was Besucher zuerst sehen: Titeltext, Bild und optionale Hinweise zur Teilnahme."
              />
              <DashboardFormMediaSplit
                main={
                  <>
                    <DashboardFormBlock title="Grundinformationen">
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

                        <SlugField
                          value={slug}
                          onChange={setSlug}
                          autoSlug={autoSlug}
                          basePath="/termine/course/"
                          currentSlug={course?.slug}
                        />

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
                            <Select
                              id="courseType"
                              value={courseType}
                              onChange={(e) =>
                                setCourseType(e.target.value as CourseType)
                              }
                              className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-1 focus:outline-none"
                            >
                              {Object.entries(courseTypeLabels).map(
                                ([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ),
                              )}
                            </Select>
                          </div>
                        </div>
                      </div>
                    </DashboardFormBlock>

                    <DashboardFormBlock title="Weitere Informationen">
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
                    </DashboardFormBlock>
                  </>
                }
                aside={
                  <DashboardFormBlock title="Titelbild">
                    <div className="space-y-4">
                      {imageUrl ? (
                        <div className="relative">
                          <div className="dark:border-dark-border relative aspect-video w-full overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                            <Image
                              src={imageUrl}
                              alt="Kursbild"
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
                                setImageId(null);
                                setImageUrl(null);
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
                            Bild auswählen
                          </span>
                          <span className="mt-1 text-center text-xs text-gray-500 dark:text-gray-400">
                            Mediathek oder neu hochladen
                          </span>
                        </button>
                      )}
                    </div>
                  </DashboardFormBlock>
                }
              />
            </div>

            <div
              id="kurs-form-termin"
              className="dark:border-dark-border dashboard-form-scroll-anchor border-t border-gray-200/80 pt-14"
            >
              <DashboardFormZoneHeader
                step={2}
                title="Termin & Ort"
                description="Zeitfenster, Bezirk und Veranstaltungsort steuern Kalender und Anfahrtshinweise."
              />
              <DashboardFormBlock title="Datum & Ort">
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-4">
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
                        htmlFor="startTime"
                        className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                      >
                        Startzeit *
                      </label>
                      <input
                        type="time"
                        id="startTime"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
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
                    <div>
                      <label
                        htmlFor="endTime"
                        className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                      >
                        Endzeit *
                      </label>
                      <input
                        type="time"
                        id="endTime"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
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
                      <Select
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
                      </Select>
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
              </DashboardFormBlock>
            </div>

            <div
              id="kurs-form-anmeldung"
              className="dark:border-dark-border dashboard-form-scroll-anchor border-t border-gray-200/80 pt-14"
            >
              <DashboardFormZoneHeader
                step={3}
                title="Anmeldung"
                description={
                  isExternalProvider
                    ? "Anmeldung über eine externe Website – ohne Teilnehmerverwaltung auf dieser Plattform."
                    : "Wer sich wann eintragen darf, wie viele Plätze es gibt und welche Extrafragen gestellt werden."
                }
              />
              <div className="space-y-10">
                <DashboardFormBlock title="Anmeldeeinstellungen">
                  <div className="space-y-6">
                    <div className="dark:border-dark-border rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          id="edit-course-external-provider"
                          checked={isExternalProvider}
                          disabled={hasRegistrations && !isExternalProvider}
                          onChange={(e) =>
                            setIsExternalProvider(e.target.checked)
                          }
                          className="text-primary focus:ring-primary mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 disabled:opacity-50"
                        />
                        <span className="min-w-0">
                          <span className="dark:text-dark-text block text-sm leading-snug font-medium text-gray-700">
                            Externer Anbieter
                          </span>
                          <span className="mt-1 block text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                            Die Anmeldung erfolgt auf einer externen Website.
                            {hasRegistrations && !isExternalProvider
                              ? " Nicht verfügbar, solange Anmeldungen vorhanden sind."
                              : " Es gibt kein Anmeldeformular und keine Teilnehmerverwaltung hier."}
                          </span>
                        </span>
                      </label>

                      {isExternalProvider ? (
                        <div className="mt-4 space-y-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                          <div>
                            <label
                              htmlFor="edit-course-external-provider-name"
                              className="dark:text-dark-text mb-1.5 block text-sm font-medium text-gray-700"
                            >
                              Name des Anbieters (optional)
                            </label>
                            <input
                              type="text"
                              id="edit-course-external-provider-name"
                              value={externalProviderName}
                              onChange={(e) =>
                                setExternalProviderName(e.target.value)
                              }
                              placeholder="z.B. Evangelische Akademie"
                              className={registrationFieldInputClass}
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="edit-course-external-registration-url"
                              className="dark:text-dark-text mb-1.5 block text-sm font-medium text-gray-700"
                            >
                              Link zur Anmeldung *
                            </label>
                            <input
                              type="url"
                              id="edit-course-external-registration-url"
                              value={externalRegistrationUrl}
                              onChange={(e) =>
                                setExternalRegistrationUrl(e.target.value)
                              }
                              placeholder="https://..."
                              className={registrationFieldInputClass}
                              required
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="edit-course-external-price-info"
                              className="dark:text-dark-text mb-1.5 block text-sm font-medium text-gray-700"
                            >
                              Hinweis zu Kosten (optional)
                            </label>
                            <input
                              type="text"
                              id="edit-course-external-price-info"
                              value={priceInfo}
                              onChange={(e) => setPriceInfo(e.target.value)}
                              placeholder="z.B. Kosten auf Anfrage beim Anbieter"
                              className={registrationFieldInputClass}
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <fieldset className="dark:border-dark-border rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                      <legend className="sr-only">
                        Anmeldezeitpunkt und -fenster
                      </legend>
                      <div className="space-y-5">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            id="registrationOpen"
                            checked={registrationOpen}
                            onChange={(e) =>
                              setRegistrationOpen(e.target.checked)
                            }
                            className="text-primary focus:ring-primary mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300"
                          />
                          <label
                            htmlFor="registrationOpen"
                            className="dark:text-dark-text cursor-pointer text-sm leading-snug font-medium text-gray-700"
                          >
                            Anmeldung geöffnet
                          </label>
                        </div>

                        <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              id="scheduledRegistrationOpens"
                              checked={scheduledRegistrationOpens}
                              onChange={(e) => {
                                const on = e.target.checked;
                                setScheduledRegistrationOpens(on);
                                if (!on) setRegistrationOpensAt("");
                              }}
                              className="text-primary focus:ring-primary mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300"
                            />
                            <span className="min-w-0">
                              <span className="dark:text-dark-text block text-sm leading-snug font-medium text-gray-700">
                                Anmeldebeginn später planen
                              </span>
                              <span className="mt-1 block text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                {scheduledRegistrationOpens
                                  ? "Datum und Uhrzeit vor Kursbeginn wählen; Kursbeschreibung ist schon vorher sichtbar."
                                  : "Ohne Planung gilt der normale Zeitpunkt, sobald die Anmeldung freigeschaltet ist."}
                              </span>
                            </span>
                          </label>

                          {scheduledRegistrationOpens ? (
                            <div className="mt-4 space-y-2">
                              <p className="dark:text-dark-text text-sm font-medium text-gray-900">
                                Anmeldung öffnet ab
                              </p>
                              <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                                <div>
                                  <label
                                    htmlFor="registrationOpensDate"
                                    className="dark:text-dark-text mb-1.5 block text-sm font-medium text-gray-700"
                                  >
                                    Datum
                                  </label>
                                  <input
                                    type="date"
                                    id="registrationOpensDate"
                                    value={opensScheduleParts.opensDatePart}
                                    max={startDate || undefined}
                                    onChange={(e) =>
                                      setRegistrationOpensAt(
                                        registrationOpensMerge(
                                          e.target.value,
                                          opensScheduleParts.opensTimePart,
                                        ),
                                      )
                                    }
                                    title="Spätestens am Kurstag (vor oder am gleichen Datum wie Beginn)"
                                    className={registrationFieldInputClass}
                                  />
                                </div>
                                <div>
                                  <label
                                    htmlFor="registrationOpensTime"
                                    className="dark:text-dark-text mb-1.5 block text-sm font-medium text-gray-700"
                                  >
                                    Uhrzeit
                                  </label>
                                  <input
                                    type="time"
                                    id="registrationOpensTime"
                                    value={opensScheduleParts.opensTimePart}
                                    max={
                                      opensScheduleParts.opensTimeMax ??
                                      undefined
                                    }
                                    title="Am Kurstag höchstens bis Kursbeginn"
                                    onChange={(e) =>
                                      setRegistrationOpensAt(
                                        registrationOpensMerge(
                                          opensScheduleParts.opensDatePart,
                                          e.target.value,
                                        ),
                                      )
                                    }
                                    className={registrationFieldInputClass}
                                  />
                                </div>
                              </div>
                              <p className="max-w-xl text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                Die Buttons zum Anmelden erscheinen erst ab
                                diesem Zeitpunkt; der Kurstext bleibt sichtbar.
                              </p>
                            </div>
                          ) : null}
                        </div>

                        <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              id="hasRegistrationDeadline"
                              checked={hasRegistrationDeadline}
                              onChange={(e) => {
                                const on = e.target.checked;
                                setHasRegistrationDeadline(on);
                                if (!on) setRegistrationDeadline("");
                              }}
                              className="text-primary focus:ring-primary mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300"
                            />
                            <span className="min-w-0">
                              <span className="dark:text-dark-text block text-sm leading-snug font-medium text-gray-700">
                                Anmeldeschluss festlegen
                              </span>
                              <span className="mt-1 block text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                {hasRegistrationDeadline
                                  ? isExternalProvider
                                    ? "Datum wählen, bis wann der Anmelde-Link sichtbar bleibt."
                                    : "Datum wählen, bis wann sich Teilnehmer anmelden können."
                                  : "Ohne Frist bleibt die Anmeldung bis Kursbeginn offen."}
                              </span>
                            </span>
                          </label>

                          {hasRegistrationDeadline ? (
                            <div className="mt-4 max-w-xs">
                              <label
                                htmlFor="registrationDeadline"
                                className="dark:text-dark-text mb-1.5 block text-sm font-medium text-gray-700"
                              >
                                Anmeldeschluss
                              </label>
                              <input
                                type="date"
                                id="registrationDeadline"
                                value={registrationDeadline}
                                onChange={(e) =>
                                  setRegistrationDeadline(e.target.value)
                                }
                                min={
                                  scheduledRegistrationOpens &&
                                  registrationOpensAt.includes("T")
                                    ? opensScheduleParts.opensDatePart ||
                                      undefined
                                    : undefined
                                }
                                max={startDate || undefined}
                                title="Anmeldeschluss muss vor oder am Startdatum sein"
                                className={registrationFieldInputClass}
                                required
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </fieldset>

                    {!isExternalProvider ? (
                      <>
                        <div className="max-w-xs">
                          <label
                            htmlFor="maxParticipants"
                            className="dark:text-dark-text mb-1.5 block text-sm font-medium text-gray-700"
                          >
                            Maximale Teilnehmerzahl *
                          </label>
                          <input
                            type="number"
                            id="maxParticipants"
                            value={maxParticipants}
                            onChange={(e) => setMaxParticipants(e.target.value)}
                            min={hasRegistrations ? registrationCount : 1}
                            max="500"
                            className={registrationFieldInputClass}
                            required
                          />
                          {hasRegistrations ? (
                            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                              {registrationCount} bereits angemeldet. Erhöhen
                              oder Verringern möglich, solange nicht unter die
                              aktuelle Anmeldungszahl.
                            </p>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="allowWaitingList"
                            checked={allowWaitingList}
                            onChange={(e) =>
                              setAllowWaitingList(e.target.checked)
                            }
                            className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                          />
                          <label
                            htmlFor="allowWaitingList"
                            className="dark:text-dark-text text-sm font-medium text-gray-700"
                          >
                            Warteliste aktivieren
                          </label>
                        </div>
                      </>
                    ) : null}

                    {/* Sibling Discount - only for users who may change it */}
                    {!isExternalProvider &&
                      (canManageSiblingDiscount ? (
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="allowSiblingDiscount"
                            checked={allowSiblingDiscount}
                            onChange={(e) =>
                              setAllowSiblingDiscount(e.target.checked)
                            }
                            className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                          />
                          <label
                            htmlFor="allowSiblingDiscount"
                            className="dark:text-dark-text text-sm font-medium text-gray-700"
                          >
                            Geschwisterkindrabatt erlauben (20% auf die Gebühr
                            jedes weiteren Geschwisterkindes ab dem zweiten
                            Kind)
                          </label>
                        </div>
                      ) : (
                        // Shown read-only rather than hidden: the setting
                        // changes what registrants pay, so an organizer needs
                        // to see it even when they cannot switch it.
                        allowSiblingDiscount && (
                          <p className="dark:text-dark-muted text-sm text-gray-500">
                            Geschwisterkindrabatt ist für diesen Kurs aktiv. Nur
                            Landesposaunenwarte und Administratoren können das
                            ändern.
                          </p>
                        )
                      ))}
                  </div>
                </DashboardFormBlock>

                {!isExternalProvider ? (
                  <DashboardFormBlock
                    title="Zusätzliche Anmeldefelder"
                    description="Felder, die direkt beim Ausfüllen der Anmeldung abgefragt werden."
                  >
                    {hasRegistrations && customFieldsChanged && (
                      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/20">
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          <strong>Hinweis:</strong> Es sind bereits Anmeldungen
                          vorhanden. Die Anmeldefelder können nicht mehr
                          geändert werden.
                        </p>
                      </div>
                    )}

                    {hasRegistrations && originalCustomFields.length > 0 && (
                      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-900/20">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <strong>Hinweis:</strong> Es sind bereits{" "}
                          {registrationCount} Anmeldung
                          {registrationCount !== 1 ? "en" : ""} vorhanden. Die
                          Anmeldefelder können nicht mehr geändert werden.
                        </p>
                      </div>
                    )}

                    <CourseCustomFieldsEditor
                      fields={customFields}
                      onChange={(next) => {
                        setCustomFields(next);
                        setCustomFieldsChanged(true);
                      }}
                      disabled={hasRegistrations}
                    />
                  </DashboardFormBlock>
                ) : null}
              </div>
            </div>

            <div
              id="kurs-form-team"
              className="dark:border-dark-border dashboard-form-scroll-anchor border-t border-gray-200/80 pt-14"
            >
              <DashboardFormZoneHeader
                step={4}
                title="Kurs-Team"
                description="Zwei Bereiche unten: (1) Vereinskonten mit Rollen für Bearbeitung und Teilnehmerlisten, (2) freie Namen nur für die öffentliche Kursseite ohne eigenes Login."
              />

              {!canManageCourseTeamUi &&
                course.viewerCollaboratorRole ===
                  CourseCollaboratorRole.STAFF && (
                  <div className="dark:border-dark-border mb-8 rounded-xl border border-sky-200/80 bg-sky-50/80 px-4 py-4 text-sm text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-100">
                    <p className="font-medium">
                      Du bist diesem Kurs als Teammitglied zugeordnet.
                    </p>
                    <p className="mt-2 leading-relaxed">
                      Hier kann nur die Kurserstellung oder eingetragene
                      Organisator:innen Personen hinzufügen. Für dich gilt
                      Lese-/Teilnahme-Verwaltung ohne vollen
                      Bearbeitungszugriff.
                    </p>
                  </div>
                )}

              {canManageCourseTeamUi ? (
                <>
                  <DashboardFormBlock
                    title="Organisator:innen und Teammitglieder"
                    description={`Über bestehende Nutzer:innen aus der Suche hinzufügen. Wer den Kurs angelegt hat, bleibt immer dabei${
                      course.createdBy?.displayName
                        ? ` (${course.createdBy.displayName})`
                        : ""
                    }. Auf der öffentlichen Seite erscheint das mit Profilbild und Kurztext (falls im Profil gepflegt).`}
                  >
                    <div className="space-y-3">
                      <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                        Änderungen an Konten und Rollen werden sofort
                        gespeichert — unabhängig vom Kurs-Formular weiter unten.
                      </p>

                      <div className="dark:border-dark-border dark:bg-dark-surface overflow-hidden rounded-lg border border-gray-200 bg-white">
                        <div className="dark:border-dark-border dark:bg-dark-background-secondary/70 border-b border-gray-200 bg-gray-50 px-3 py-2.5">
                          <label
                            htmlFor="course-team-search"
                            className="dark:text-dark-text mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600"
                          >
                            <UserPlus
                              className="text-primary h-3.5 w-3.5 shrink-0"
                              aria-hidden
                            />
                            Person suchen &amp; hinzufügen
                          </label>
                          <div className="relative w-full">
                            <input
                              id="course-team-search"
                              type="text"
                              value={courseTeamPickQuery}
                              disabled={teamMutationBusy}
                              onChange={(e) =>
                                setCourseTeamPickQuery(e.target.value)
                              }
                              autoComplete="off"
                              placeholder="Name oder E-Mail (mind. 2 Zeichen)"
                              className={teamDenseInputClass}
                            />
                            {courseTeamPickQuery.trim().length >= 2 &&
                              courseTeamPickUsers &&
                              courseTeamPickUsers.length > 0 && (
                                <ul
                                  className="dark:border-dark-border dark:bg-dark-surface absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg"
                                  role="listbox"
                                >
                                  {courseTeamPickUsers.map((u) => {
                                    if (
                                      u.id === session?.user?.id ||
                                      u.id === course.createdById
                                    )
                                      return null;
                                    if (
                                      courseTeamListed.some(
                                        (w) => w.userId === u.id,
                                      )
                                    )
                                      return null;
                                    return (
                                      <li key={u.id}>
                                        <button
                                          type="button"
                                          disabled={teamMutationBusy}
                                          role="option"
                                          className="dark:hover:bg-dark-background-secondary dark:text-dark-text w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-50"
                                          onClick={() => {
                                            setCollaboratorsMutation.mutate({
                                              courseId,
                                              collaborators: [
                                                ...courseTeamListed.map(
                                                  (r) => ({
                                                    userId: r.userId,
                                                    role: r.role,
                                                  }),
                                                ),
                                                {
                                                  userId: u.id,
                                                  role: CourseCollaboratorRole.STAFF,
                                                },
                                              ],
                                            });
                                            setCourseTeamPickQuery("");
                                          }}
                                        >
                                          <span className="font-medium">
                                            {u.displayName ??
                                              u.username ??
                                              u.email}
                                          </span>
                                          <span className="dark:text-dark-muted mt-0.5 block text-xs text-gray-500">
                                            {u.email}
                                          </span>
                                        </button>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                          </div>
                        </div>

                        {courseTeamListed.length === 0 ? (
                          <p className="px-3 py-5 text-center text-sm text-gray-500 dark:text-gray-400">
                            Keine zusätzlichen Team-Mitglied:innen.
                          </p>
                        ) : (
                          <ul
                            className="dark:divide-dark-border divide-y divide-gray-200"
                            role="list"
                          >
                            {courseTeamListed.map((row) => (
                              <li
                                key={row.userId}
                                className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="dark:text-dark-text truncate text-sm font-medium text-gray-900">
                                    {row.user.displayName ?? row.user.email}
                                  </p>
                                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                    {row.user.email}
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                                  <Select
                                    value={row.role}
                                    disabled={teamMutationBusy}
                                    aria-label={`Rolle für ${row.user.email}`}
                                    onChange={(e) => {
                                      const value = e.target
                                        .value as CourseCollaboratorRole;
                                      setCollaboratorsMutation.mutate({
                                        courseId,
                                        collaborators: courseTeamListed.map(
                                          (t) =>
                                            t.userId === row.userId
                                              ? {
                                                  userId: t.userId,
                                                  role: value,
                                                }
                                              : {
                                                  userId: t.userId,
                                                  role: t.role,
                                                },
                                        ),
                                      });
                                    }}
                                    className={cn(
                                      "focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text",
                                      "h-9 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-2.5 text-sm focus:ring-1 focus:outline-none sm:w-auto sm:min-w-[220px]",
                                    )}
                                  >
                                    {(
                                      Object.keys(
                                        courseCollaboratorRoleLabels,
                                      ) as CourseCollaboratorRole[]
                                    ).map((rk) => (
                                      <option key={rk} value={rk}>
                                        {courseCollaboratorRoleLabels[rk]}
                                      </option>
                                    ))}
                                  </Select>
                                  <button
                                    type="button"
                                    title="Zuordnung entfernen"
                                    disabled={teamMutationBusy}
                                    className="dark:hover:bg-dark-background-secondary rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600 disabled:opacity-40 dark:hover:text-red-400"
                                    onClick={() => {
                                      setCollaboratorsMutation.mutate({
                                        courseId,
                                        collaborators: courseTeamListed
                                          .filter(
                                            (t) => t.userId !== row.userId,
                                          )
                                          .map((t) => ({
                                            userId: t.userId,
                                            role: t.role,
                                          })),
                                      });
                                    }}
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </DashboardFormBlock>

                  <div className="mt-8">
                    <DashboardFormBlock
                      title="Weitere Namen (ohne Vereinskonto)"
                      description="Nur Darstellung auf der öffentlichen Kursseite: kein Zugriff auf den Kurs, keine Teilnehmerliste. Praktisch z.&nbsp;B. für Gastreferent:innen ohne Account. Hier ein optionaler Kurztext pro Person möglich."
                    >
                      <div className="dark:border-dark-border dark:bg-dark-surface overflow-hidden rounded-lg border border-gray-200 bg-white">
                        <div className="dark:border-dark-border dark:border-dark-border border-b border-gray-200 bg-amber-50/80 px-3 py-2 text-xs leading-snug text-amber-950 dark:bg-amber-950/25 dark:text-amber-100">
                          Diese Einträge werden erst nach Klick auf{" "}
                          <strong className="font-semibold">
                            Mitwirkende ohne Konto speichern
                          </strong>{" "}
                          übernommen — im Unterschied zu den Konten im ersten
                          Kasten.
                        </div>

                        {guestTeamDraft.length === 0 ? (
                          <div className="flex flex-col items-center gap-3 px-4 py-10">
                            <p className="max-w-sm text-center text-sm text-gray-600 dark:text-gray-400">
                              Noch keine freien Namen. Nutze das unten, wenn
                              z.&nbsp;B. Referent:innen ohne Vereinskonto auf
                              der Kursseite erscheinen sollen.
                            </p>
                            <button
                              type="button"
                              disabled={guestTeamMutationBusy}
                              className="text-primary hover:text-primary-dark text-sm font-semibold underline-offset-2 hover:underline disabled:opacity-50"
                              onClick={() =>
                                setGuestTeamDraft((rows) => [
                                  ...rows,
                                  { displayName: "", bio: "" },
                                ])
                              }
                            >
                              Erste Zeile hinzufügen
                            </button>
                          </div>
                        ) : (
                          <>
                            <ul className="dark:divide-dark-border divide-y divide-gray-200">
                              {guestTeamDraft.map((row, idx) => (
                                <li
                                  key={idx}
                                  className="flex flex-col gap-2 px-3 py-2 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_auto] sm:items-center sm:gap-x-3"
                                >
                                  <input
                                    type="text"
                                    value={row.displayName}
                                    disabled={guestTeamMutationBusy}
                                    aria-label={`Anzeigename Position ${idx + 1}`}
                                    onChange={(e) =>
                                      setGuestTeamDraft((rows) =>
                                        rows.map((r, i) =>
                                          i === idx
                                            ? {
                                                ...r,
                                                displayName: e.target.value,
                                              }
                                            : r,
                                        ),
                                      )
                                    }
                                    maxLength={200}
                                    placeholder="Anzeigename"
                                    className={teamDenseInputClass}
                                  />
                                  <textarea
                                    value={row.bio}
                                    disabled={guestTeamMutationBusy}
                                    aria-label={`Kurzinfo Position ${idx + 1}`}
                                    onChange={(e) =>
                                      setGuestTeamDraft((rows) =>
                                        rows.map((r, i) =>
                                          i === idx
                                            ? { ...r, bio: e.target.value }
                                            : r,
                                        ),
                                      )
                                    }
                                    rows={2}
                                    maxLength={2000}
                                    placeholder="Kurzinfo (optional)"
                                    className={cn(
                                      teamDenseInputClass,
                                      "resize-y sm:min-h-[2.75rem]",
                                    )}
                                  />
                                  <div className="flex items-center justify-end gap-0.5 sm:flex-col sm:justify-center sm:pt-0">
                                    <button
                                      type="button"
                                      disabled={
                                        guestTeamMutationBusy || idx === 0
                                      }
                                      className="dark:hover:bg-dark-background-secondary rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-25 dark:hover:text-gray-200"
                                      title="Nach oben"
                                      onClick={() => {
                                        if (idx === 0) return;
                                        setGuestTeamDraft((rows) => {
                                          const copy = [...rows];
                                          const a = copy[idx - 1];
                                          const b = copy[idx];
                                          if (!a || !b) return copy;
                                          copy[idx - 1] = b;
                                          copy[idx] = a;
                                          return copy;
                                        });
                                      }}
                                    >
                                      <ArrowUpIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={
                                        guestTeamMutationBusy ||
                                        idx >= guestTeamDraft.length - 1
                                      }
                                      className="dark:hover:bg-dark-background-secondary rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-25 dark:hover:text-gray-200"
                                      title="Nach unten"
                                      onClick={() => {
                                        if (idx >= guestTeamDraft.length - 1)
                                          return;
                                        setGuestTeamDraft((rows) => {
                                          const copy = [...rows];
                                          const a = copy[idx];
                                          const b = copy[idx + 1];
                                          if (!a || !b) return copy;
                                          copy[idx] = b;
                                          copy[idx + 1] = a;
                                          return copy;
                                        });
                                      }}
                                    >
                                      <ArrowDownIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={guestTeamMutationBusy}
                                      title="Zeile entfernen"
                                      className="dark:hover:bg-dark-background-secondary rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-40 dark:hover:text-red-400"
                                      onClick={() =>
                                        setGuestTeamDraft((rows) =>
                                          rows.filter((_, i) => i !== idx),
                                        )
                                      }
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                            <div className="dark:border-dark-border dark:bg-dark-background-secondary/70 flex flex-col gap-2 border-t border-gray-200 bg-gray-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                              <button
                                type="button"
                                disabled={guestTeamMutationBusy}
                                className="text-primary hover:text-primary-dark text-left text-sm font-medium disabled:opacity-50 sm:text-center"
                                onClick={() =>
                                  setGuestTeamDraft((rows) => [
                                    ...rows,
                                    { displayName: "", bio: "" },
                                  ])
                                }
                              >
                                + Weitere Zeile
                              </button>
                              <button
                                type="button"
                                disabled={guestTeamMutationBusy}
                                className="bg-primary hover:bg-primary-dark shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                                onClick={() => {
                                  const nonempty = guestTeamDraft.filter(
                                    (r) => r.displayName.trim().length > 0,
                                  );
                                  const blanks =
                                    guestTeamDraft.length - nonempty.length;
                                  if (blanks > 0) {
                                    toast.info(
                                      `${blanks} leere Zeile${blanks === 1 ? "" : "n"} ohne Namen wurden ausgelassen.`,
                                    );
                                  }
                                  setGuestTeamMembersMutation.mutate({
                                    courseId,
                                    members: nonempty.map((r) => ({
                                      displayName: r.displayName.trim(),
                                      bio: r.bio.trim()
                                        ? r.bio.trim()
                                        : undefined,
                                    })),
                                  });
                                }}
                              >
                                Mitwirkende ohne Konto speichern
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </DashboardFormBlock>
                  </div>
                </>
              ) : null}
            </div>

            {!isExternalProvider ? (
              <div
                id="kurs-form-preise"
                className="dark:border-dark-border dashboard-form-scroll-anchor border-t border-gray-200/80 pt-14"
              >
                <DashboardFormZoneHeader
                  step={5}
                  title="Preise"
                  description="Honorare und Zahlungsarten – und wie sie auf der öffentlichen Anmeldung erscheinen."
                />

                {/* Warning when there are registrations */}
                {hasRegistrations && (
                  <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-600 dark:bg-amber-950/50">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                      <div>
                        <p className="dark:text-dark-text font-medium text-gray-700">
                          Preisänderungen eingeschränkt
                        </p>
                        <p className="mt-1 text-sm text-amber-700 dark:text-amber-200">
                          Es gibt bereits {registrationCount} Teilnehmer für
                          diesen Kurs. Bezeichnung, Preis und Beschreibung der
                          Preiskategorien können nicht mehr geändert werden. Die
                          maximale Teilnehmerzahl (gesamt und pro
                          Preiskategorie) lässt sich weiter anpassen –
                          mindestens auf die Zahl bereits angemeldeter
                          Teilnehmer.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <DashboardFormBlock title="Honorar und Zahlungsweisen">
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

                        <div className="dark:border-dark-border space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-600">
                          <p className="dark:text-dark-text text-sm font-medium text-gray-700">
                            Zahlungsweisen für Teilnehmer
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Mindestens eine Option aktivieren.
                          </p>
                          <label className="flex cursor-pointer items-center gap-3">
                            <input
                              type="checkbox"
                              checked={paymentCashAllowed}
                              onChange={(e) =>
                                setPaymentCashAllowed(e.target.checked)
                              }
                              className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                            />
                            <span className="dark:text-dark-text text-sm text-gray-700">
                              Barzahlung vor Ort
                            </span>
                          </label>
                          <label className="flex cursor-pointer items-center gap-3">
                            <input
                              type="checkbox"
                              checked={paymentInvoiceAllowed}
                              onChange={(e) =>
                                setPaymentInvoiceAllowed(e.target.checked)
                              }
                              className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                            />
                            <span className="dark:text-dark-text text-sm text-gray-700">
                              Überweisung nach Rechnung
                            </span>
                          </label>
                        </div>

                        {canEnableInvoicing ? (
                          <div className="dark:border-dark-border space-y-2 rounded-lg border border-gray-200 p-4">
                            <label className="flex cursor-pointer items-start gap-3">
                              <input
                                type="checkbox"
                                checked={invoicingEnabled}
                                onChange={(e) =>
                                  setInvoicingEnabled(e.target.checked)
                                }
                                className="text-primary focus:ring-primary mt-0.5 h-4 w-4 rounded border-gray-300"
                              />
                              <span>
                                <span className="dark:text-dark-text block text-sm font-medium text-gray-700">
                                  Rechnungsstellung aktivieren
                                </span>
                                <span className="block text-xs text-gray-500 dark:text-gray-400">
                                  Erlaubt dem Kurs-Team, für diesen Kurs
                                  Rechnungen zu erstellen, zu bearbeiten und an
                                  die Anmelder:innen auszustellen.
                                </span>
                              </span>
                            </label>
                          </div>
                        ) : (
                          invoicingEnabled && (
                            <div className="dark:border-dark-border dark:bg-dark-background-secondary rounded-lg border border-gray-200 bg-gray-50 p-4">
                              <p className="dark:text-dark-text text-sm font-medium text-gray-700">
                                Rechnungsstellung ist für diesen Kurs
                                freigeschaltet
                              </p>
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Nur Landes-/Regionalposaunenwarte und
                                Administratoren können diese Einstellung ändern.
                              </p>
                            </div>
                          )
                        )}

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
                                        onClick={() =>
                                          removePriceOption(option.id)
                                        }
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
                                        min={
                                          hasRegistrations
                                            ? Math.max(
                                                1,
                                                participantsByPriceOption[
                                                  option.label
                                                ] ?? 0,
                                              )
                                            : 1
                                        }
                                        max="500"
                                        placeholder="Unbegrenzt"
                                        className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text dark:disabled:bg-dark-background w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:text-gray-500"
                                      />
                                      {hasRegistrations &&
                                      (participantsByPriceOption[
                                        option.label
                                      ] ?? 0) > 0 ? (
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                          {participantsByPriceOption[
                                            option.label
                                          ] ?? 0}{" "}
                                          bereits angemeldet
                                        </p>
                                      ) : null}
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
                </DashboardFormBlock>
              </div>
            ) : null}

            <div
              id="kurs-form-veroeffentlichung"
              className="dark:border-dark-border dashboard-form-scroll-anchor border-t border-gray-200/80 pt-14"
            >
              <DashboardFormZoneHeader
                step={isExternalProvider ? 5 : 6}
                title="Veröffentlichung"
                description="Welchen redaktionellen Stand der Eintrag haben soll – wirkt sich auf die öffentliche Sichtbarkeit aus."
              />

              <DashboardFormBlock title="Redaktionsstatus">
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
                          className="text-primary focus:ring-primary h-4 w-4 border-gray-300"
                        />
                        <span className="dark:text-dark-text text-sm text-gray-700">
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : course?.status === ContentStatus.DRAFT ||
                  course?.status === ContentStatus.REJECTED ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Lege fest, ob der Kurs nur gespeichert oder zur
                      redaktionellen Prüfung eingereicht werden soll.
                    </p>
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="radio"
                        name="status-author"
                        checked={status === ContentStatus.DRAFT}
                        onChange={() => setStatus(ContentStatus.DRAFT)}
                        className="text-primary focus:ring-primary h-4 w-4 border-gray-300"
                      />
                      <span className="dark:text-dark-text text-sm text-gray-700">
                        {statusLabels[ContentStatus.DRAFT]} (nur für dich
                        sichtbar)
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="radio"
                        name="status-author"
                        checked={status === ContentStatus.PENDING}
                        onChange={() => setStatus(ContentStatus.PENDING)}
                        className="text-primary focus:ring-primary h-4 w-4 border-gray-300"
                      />
                      <span className="dark:text-dark-text text-sm text-gray-700">
                        {statusLabels[ContentStatus.PENDING]}
                      </span>
                    </label>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Aktueller Status:{" "}
                    <span className="font-medium">
                      {statusLabels[course?.status ?? ContentStatus.DRAFT]}
                    </span>
                    {course?.status === ContentStatus.APPROVED && (
                      <span className="ml-1">
                        → wird zu &quot;Ausstehend&quot;
                      </span>
                    )}
                  </p>
                )}
              </DashboardFormBlock>
            </div>

            {/* Actions */}
            <div className="dark:border-dark-border mt-16 flex flex-col gap-3 border-t border-gray-200/80 pt-10 sm:flex-row sm:justify-end">
              <Link
                href={`/dashboard/courses/${courseId}`}
                data-skip-warning
                onClick={() => clear()}
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
          </DashboardSectionedFormLayout>
        </form>

        {/* Media Picker Modal */}
        <MediaPickerModal
          isOpen={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onSelect={(url, _alt, mediaId) => {
            if (mediaId) {
              setImageId(mediaId);
            }
            setImageUrl(url);
            setShowMediaPicker(false);
          }}
        />
      </DashboardPage>
    </>
  );
}
