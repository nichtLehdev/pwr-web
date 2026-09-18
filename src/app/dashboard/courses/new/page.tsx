"use client";

import { useState, useEffect, useRef, useMemo, startTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { parseDeadlineEndOfDay } from "@/lib/date-input";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions";
import { districtFieldState } from "@/lib/district-scope";
import {
  DashboardPage,
  DashboardSectionedFormLayout,
  DashboardFormMediaSplit,
  DashboardFormZoneHeader,
  DashboardFormBlock,
  CourseCustomFieldsEditor,
  DraftRestorePrompt,
  PriceOptionAgeLimits,
  SlugField,
  type CourseCustomFieldDraft,
  type DashboardSectionNavItem,
  NewLocationForm,
} from "@/app/_components/dashboard";
import { getErrorMessage } from "@/lib/utils";
import { datedSlugBase, slugify } from "@/lib/slug";
import { customFieldTypeNeedsOptions } from "@/lib/course-custom-fields";
import { useToast } from "@/app/_components/ui/toast";
import { ContentStatus, CourseType } from "~/generated/prisma/enums";
import { Lock, Trash2, ImageIcon } from "lucide-react";
import MediaPickerModal from "@/app/_components/editor/media-picker-modal";
import RichTextEditor from "@/app/_components/editor/rich-text-editor-lazy";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/description";
import { useAutosave } from "@/lib/useAutosave";
import { useBeforeUnload } from "@/lib/useBeforeUnload";
import {
  registrationOpensMerge,
  registrationOpensSplit,
} from "@/lib/dashboard-registration-opens-at";
import { Button, Select } from "@/app/_components/ui";
import {
  needsDistinguishingDescription,
  validatePriceOptionDistinctness,
} from "@/lib/course-price-options";
import { validatePriceOptionAgeRanges } from "@/lib/course-price-option-age";
import { CourseDownPaymentSettings } from "@/app/_components/dashboard/course-down-payment-settings";
import {
  validateDownPaymentSettings,
  type DownPaymentModeValue,
  type DownPaymentRefundPolicyValue,
} from "@/lib/course-down-payment";

const courseTypeLabels: Record<CourseType, string> = {
  LEHRGANG: "Lehrgang",
  FREIZEIT: "Freizeit",
  WORKSHOP: "Workshop",
  KOMPONISTENPORTRAIT: "Komponistenportrait",
  VERANSTALTUNG: "Veranstaltung",
  OTHER: "Sonstiges",
};

const NEW_COURSE_NAV_ITEMS: DashboardSectionNavItem[] = [
  { href: "#kurs-form-inhalt", label: "Inhalt" },
  { href: "#kurs-form-termin", label: "Termin & Ort" },
  { href: "#kurs-form-anmeldung", label: "Anmeldung" },
  { href: "#kurs-form-preise", label: "Preise" },
  { href: "#kurs-form-veroeffentlichung", label: "Veröffentlichung" },
];

interface PriceOption {
  id: string;
  price: number;
  label: string;
  description: string;
  maxParticipants?: number;
  /** Vollendete Jahre am ersten Kurstag; undefined heißt „keine Grenze“. */
  minAge?: number;
  maxAge?: number;
  /** Anzahlung pro Teilnehmer, nur bei Anzahlung "je Preiskategorie". */
  downPaymentAmount?: number | null;
}

export default function NewCoursePage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, { enabled: !!session?.user });

  const {
    hasDashboardAccess,
    hasPermission,
    isLoading: permissionsLoading,
  } = usePermissions();

  const hasApprovePermission = hasPermission(
    "courses.approve" as PermissionKey,
  );
  const hasCreatePermission = hasPermission("courses.create" as PermissionKey);
  const isHigherRole = hasApprovePermission;
  const canEnableInvoicing = hasPermission(
    "courses.enable_invoicing" as PermissionKey,
  );
  // Anzahlung und Kursnummer — dieselbe Berechtigung prüft courses.create.
  const canEnableDownPayment = hasPermission(
    PERMISSIONS.COURSES_ENABLE_DOWN_PAYMENT,
  );
  // Dieselbe Berechtigung, die courses.create/update serverseitig prüft.
  const canManageSiblingDiscount = hasPermission(
    PERMISSIONS.REGISTRATIONS_MANAGE_SIBLING_DISCOUNT,
  );

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [motto, setMotto] = useState("");
  const [description, setDescription] = useState("");
  const [courseType, setCourseType] = useState<CourseType>("LEHRGANG");

  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("17:00");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [hasRegistrationDeadline, setHasRegistrationDeadline] = useState(false);
  const [registrationOpensAt, setRegistrationOpensAt] = useState("");
  const [scheduledRegistrationOpens, setScheduledRegistrationOpens] =
    useState(false);

  const [locationId, setLocationId] = useState<string>("");
  const [locationSearch, setLocationSearch] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showNewLocationForm, setShowNewLocationForm] = useState(false);
  const [bezirkId, setBezirkId] = useState<string>("");
  const scopedBezirkIds = profile?.bezirkScopes?.map((s) => s.bezirkId) ?? [];
  // Zuständigkeit statt Zugehörigkeit: `profile.bezirkId` ist ein öffentliches
  // Amt, keine Schreibberechtigung.
  const { lockedBezirkId, hasNoDistrict, selectableBezirkIds } =
    districtFieldState(isHigherRole, scopedBezirkIds);

  const [isExternalProvider, setIsExternalProvider] = useState(false);
  const [externalProviderName, setExternalProviderName] = useState("");
  const [externalRegistrationUrl, setExternalRegistrationUrl] = useState("");
  const [maxParticipants, setMaxParticipants] = useState<number>(20);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [allowWaitingList, setAllowWaitingList] = useState(false);
  const [allowSiblingDiscount, setAllowSiblingDiscount] = useState(false);

  const [isFree, setIsFree] = useState(false);
  const [paymentCashAllowed, setPaymentCashAllowed] = useState(true);
  const [paymentInvoiceAllowed, setPaymentInvoiceAllowed] = useState(true);
  const [invoicingEnabled, setInvoicingEnabled] = useState(false);
  const [courseNumber, setCourseNumber] = useState("");
  const [downPaymentMode, setDownPaymentMode] =
    useState<DownPaymentModeValue>("NONE");
  const [downPaymentAmount, setDownPaymentAmount] = useState<number | null>(
    null,
  );
  const [downPaymentRefundPolicy, setDownPaymentRefundPolicy] =
    useState<DownPaymentRefundPolicyValue>("NON_REFUNDABLE");
  const [downPaymentRefundText, setDownPaymentRefundText] = useState("");
  const [priceInfo, setPriceInfo] = useState("");
  const [priceOptions, setPriceOptions] = useState<PriceOption[]>([]);

  const [prerequisites, setPrerequisites] = useState("");
  const [whatToBring, setWhatToBring] = useState("");

  const [imageId, setImageId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const [customFields, setCustomFields] = useState<CourseCustomFieldDraft[]>(
    [],
  );

  const [submitAsDraft, setSubmitAsDraft] = useState(false);
  const [submitAsApproved, setSubmitAsApproved] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      courseNumber,
      downPaymentMode,
      downPaymentAmount,
      downPaymentRefundPolicy,
      downPaymentRefundText,
      priceInfo,
      priceOptions,
      prerequisites,
      whatToBring,
      imageId,
      imageUrl,
      customFields,
      submitAsDraft,
      submitAsApproved,
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
      courseNumber,
      downPaymentMode,
      downPaymentAmount,
      downPaymentRefundPolicy,
      downPaymentRefundText,
      priceInfo,
      priceOptions,
      prerequisites,
      whatToBring,
      imageId,
      imageUrl,
      customFields,
      submitAsDraft,
      submitAsApproved,
    ],
  );

  const { pendingDraft, restoreDraft, discardDraft, clear, storageFailed } =
    useAutosave({
      name: "course-new",
      data: formData,
      userId: session?.user?.id,
      ready: !sessionLoading && !profileLoading,
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

  const hasUnsavedChanges = Boolean(
    title.trim() || description.trim() || startDate,
  );
  useBeforeUnload(hasUnsavedChanges && !isSubmitting);

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
    "border-ink dark:border-night-text dark:bg-night dark:text-night-text w-full border bg-paper px-3 py-2 text-ink";

  const handleRestoreDraft = () => {
    const saved = restoreDraft();
    if (!saved) return;
    startTransition(() => {
      setTitle(saved.title || "");
      setSlug(saved.slug || "");
      setMotto(saved.motto || "");
      setDescription(saved.description || "");
      setCourseType(saved.courseType || "LEHRGANG");
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
      setMaxParticipants(saved.maxParticipants || 20);
      setRegistrationOpen(saved.registrationOpen || false);
      setAllowWaitingList(saved.allowWaitingList || false);
      setAllowSiblingDiscount(saved.allowSiblingDiscount || false);
      setIsFree(saved.isFree ?? false);
      setPaymentCashAllowed(saved.paymentCashAllowed ?? true);
      setPaymentInvoiceAllowed(saved.paymentInvoiceAllowed ?? true);
      setInvoicingEnabled(saved.invoicingEnabled ?? false);
      setCourseNumber(saved.courseNumber || "");
      setDownPaymentMode(saved.downPaymentMode ?? "NONE");
      setDownPaymentAmount(saved.downPaymentAmount ?? null);
      setDownPaymentRefundPolicy(
        saved.downPaymentRefundPolicy ?? "NON_REFUNDABLE",
      );
      setDownPaymentRefundText(saved.downPaymentRefundText || "");
      setPriceInfo(saved.priceInfo || "");
      setPriceOptions(saved.priceOptions || []);
      setPrerequisites(saved.prerequisites || "");
      setWhatToBring(saved.whatToBring || "");
      setImageId(saved.imageId || null);
      setImageUrl(saved.imageUrl || null);
      setCustomFields(saved.customFields || []);
      setSubmitAsDraft(saved.submitAsDraft || false);
      setSubmitAsApproved(saved.submitAsApproved || false);
    });
  };

  const { data: locationsData } = api.locations.getAll.useQuery({
    limit: 100,
    search: locationSearch || undefined,
  });

  const { data: bezirke } = api.bezirke.getAll.useQuery();
  const selectableBezirke = selectableBezirkIds
    ? (bezirke?.filter((b) => selectableBezirkIds.includes(b.id)) ?? [])
    : (bezirke ?? []);

  const createCourseMutation = api.courses.create.useMutation({
    onSuccess: (course) => {
      clear();
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
    // Nicht nur "irgendein Dashboard-Recht": ohne das Anlage-Recht lehnt der
    // Server ab, das Formular soll gar nicht erst aufgehen.
    if (
      !permissionsLoading &&
      (!hasDashboardAccess || !hasCreatePermission) &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [permissionsLoading, hasDashboardAccess, hasCreatePermission, router]);

  useEffect(() => {
    if (!isHigherRole && lockedBezirkId && !bezirkId) {
      setBezirkId(lockedBezirkId);
    }
  }, [isHigherRole, lockedBezirkId, bezirkId]);

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

    // Das Textfeld hat kein `maxLength`; sonst käme erst die englische
    // Zod-Meldung vom Server.
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      setError(
        `Die Beschreibung ist zu lang (${description.length} von ${MAX_DESCRIPTION_LENGTH} Zeichen).`,
      );
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
    } else if (!maxParticipants || maxParticipants < 1) {
      setError("Bitte gib eine maximale Teilnehmerzahl ein.");
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
            .filter((opt) => opt.label.trim())
            .map(
              ({
                label,
                price,
                description,
                maxParticipants,
                minAge,
                maxAge,
                downPaymentAmount: optionDownPayment,
              }) => ({
                label: label.trim(),
                price,
                description: description.trim() || undefined,
                maxParticipants: maxParticipants || undefined,
                minAge: minAge ?? null,
                maxAge: maxAge ?? null,
                downPaymentAmount:
                  downPaymentMode === "TICKET"
                    ? (optionDownPayment ?? null)
                    : null,
              }),
            )
        : undefined;

    const priceOptionProblem = preparedPriceOptions
      ? (validatePriceOptionDistinctness(preparedPriceOptions) ??
        validatePriceOptionAgeRanges(preparedPriceOptions))
      : null;
    if (priceOptionProblem) {
      setError(priceOptionProblem);
      setIsSubmitting(false);
      return;
    }

    // Wie auf dem Server: kostenlose und externe Kurse haben keine Anzahlung.
    const effectiveDownPaymentMode: DownPaymentModeValue =
      isExternalProvider || isFree ? "NONE" : downPaymentMode;
    const downPaymentProblem = canEnableDownPayment
      ? validateDownPaymentSettings({
          downPaymentMode: effectiveDownPaymentMode,
          downPaymentAmount,
          downPaymentRefundPolicy,
          downPaymentRefundText,
          isFree,
          isExternal: isExternalProvider,
          courseNumber,
          allowSiblingDiscount:
            canManageSiblingDiscount && allowSiblingDiscount,
          priceOptions: preparedPriceOptions ?? [],
        })
      : null;
    if (downPaymentProblem) {
      setError(downPaymentProblem);
      setIsSubmitting(false);
      return;
    }

    const preparedCustomFields = isExternalProvider
      ? []
      : customFields
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
              options: customFieldTypeNeedsOptions(fieldType)
                ? options.trim()
                : undefined,
              isRequired,
              helpText: helpText.trim() || undefined,
              sortOrder,
            }),
          );

    // Der Entwurf wird erst in onSuccess verworfen — schlägt das Anlegen
    // fehl, bleibt er als Sicherung erhalten.
    createCourseMutation.mutate({
      title: title.trim(),
      slug: slug.trim() || undefined,
      motto: motto.trim() || undefined,
      description: description.trim(),
      startDate: new Date(`${startDate}T${startTime}`),
      endDate: new Date(`${endDate}T${endTime}`),
      registrationDeadline:
        hasRegistrationDeadline && registrationDeadline
          ? parseDeadlineEndOfDay(registrationDeadline)
          : undefined,
      registrationOpensAt:
        scheduledRegistrationOpens && registrationOpensAt
          ? new Date(registrationOpensAt)
          : undefined,
      locationId: locationId || undefined,
      bezirkId: bezirkId || undefined,
      courseType,
      externalProviderName: isExternalProvider
        ? externalProviderName.trim() || undefined
        : undefined,
      externalRegistrationUrl: isExternalProvider
        ? externalRegistrationUrl.trim()
        : undefined,
      maxParticipants: isExternalProvider ? undefined : maxParticipants,
      registrationOpen,
      allowWaitingList: isExternalProvider ? false : allowWaitingList,
      allowSiblingDiscount:
        isExternalProvider || !canManageSiblingDiscount
          ? false
          : allowSiblingDiscount,
      isFree: isExternalProvider ? true : isFree,
      paymentCashAllowed,
      paymentInvoiceAllowed,
      invoicingEnabled:
        isExternalProvider || !canEnableInvoicing ? false : invoicingEnabled,
      courseNumber:
        isExternalProvider || (!canEnableInvoicing && !canEnableDownPayment)
          ? undefined
          : courseNumber.trim(),
      ...(canEnableDownPayment && {
        downPaymentMode: effectiveDownPaymentMode,
        downPaymentAmount:
          effectiveDownPaymentMode === "COURSE" ? downPaymentAmount : null,
        downPaymentRefundPolicy,
        downPaymentRefundText: downPaymentRefundText.trim() || null,
      }),
      priceInfo: priceInfo.trim() || undefined,
      priceOptions: preparedPriceOptions,
      prerequisites: prerequisites.trim() || undefined,
      whatToBring: whatToBring.trim() || undefined,
      imageId: imageId || undefined,
      customFields:
        preparedCustomFields.length > 0 ? preparedCustomFields : undefined,
      status: submitAsDraft
        ? ContentStatus.DRAFT
        : submitAsApproved
          ? ContentStatus.APPROVED
          : ContentStatus.PENDING,
    });
  };

  if (sessionLoading || profileLoading || permissionsLoading) {
    return (
      <div className="dark:bg-night bg-paper flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardPage
      title="Neuer Kurs"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Kurse", href: "/dashboard/courses" },
        { label: "Neuer Kurs" },
      ]}
      maxWidth="7xl"
    >
      <DraftRestorePrompt
        draft={pendingDraft}
        onRestore={handleRestoreDraft}
        onDiscard={discardDraft}
        storageFailed={storageFailed}
      />

      {error && (
        <div className="mb-6 border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <DashboardSectionedFormLayout
          navItems={NEW_COURSE_NAV_ITEMS}
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
                          htmlFor="new-course-title"
                          className="dark:text-night-text text-ink mb-2 block text-sm font-medium"
                        >
                          Titel *
                        </label>
                        <input
                          id="new-course-title"
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper text-ink w-full border px-4 py-2.5"
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
                      />

                      <div>
                        <label
                          htmlFor="new-course-motto"
                          className="dark:text-night-text text-ink mb-2 block text-sm font-medium"
                        >
                          Motto (optional)
                        </label>
                        <input
                          id="new-course-motto"
                          type="text"
                          value={motto}
                          onChange={(e) => setMotto(e.target.value)}
                          className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper text-ink w-full border px-4 py-2.5"
                          placeholder="z.B. Gemeinsam musizieren"
                        />
                      </div>

                      <div>
                        <label className="dark:text-night-text text-ink mb-2 block text-sm font-medium">
                          Beschreibung *
                        </label>
                        {/* Markdown-Schreibfläche; die Pflicht prüft `handleSubmit`. */}
                        <RichTextEditor
                          variant="beschreibung"
                          ariaLabel="Beschreibung"
                          ariaRequired
                          content={description}
                          onChange={setDescription}
                          placeholder="Beschreibe den Kurs..."
                        />
                        <p className="text-dark dark:text-night-muted mt-2 text-xs">
                          Überschriften, Listen, Links und Hervorhebungen sind
                          möglich.
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="new-course-type"
                            className="dark:text-night-text text-ink mb-2 block text-sm font-medium"
                          >
                            Kurstyp *
                          </label>
                          <Select
                            id="new-course-type"
                            value={courseType}
                            onChange={(e) =>
                              setCourseType(e.target.value as CourseType)
                            }
                            className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper text-ink w-full border px-4 py-2.5"
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
                          htmlFor="new-course-prerequisites"
                          className="dark:text-night-text text-ink mb-2 block text-sm font-medium"
                        >
                          Voraussetzungen (optional)
                        </label>
                        <textarea
                          id="new-course-prerequisites"
                          value={prerequisites}
                          onChange={(e) => setPrerequisites(e.target.value)}
                          rows={3}
                          className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper text-ink w-full border px-4 py-2.5"
                          placeholder="z.B. Grundkenntnisse auf dem Instrument"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="new-course-what-to-bring"
                          className="dark:text-night-text text-ink mb-2 block text-sm font-medium"
                        >
                          Mitzubringen (optional)
                        </label>
                        <textarea
                          id="new-course-what-to-bring"
                          value={whatToBring}
                          onChange={(e) => setWhatToBring(e.target.value)}
                          rows={3}
                          className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper text-ink w-full border px-4 py-2.5"
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
                        <div className="dark:border-night-rule border-rule relative aspect-video w-full overflow-hidden border">
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
                            className="border-rule dark:border-night-rule dark:text-night-text text-ink hover:bg-rule/25 dark:hover:bg-night-raised border px-4 py-2 text-sm font-medium transition-colors"
                          >
                            Bild ändern
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setImageId(null);
                              setImageUrl(null);
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
                        className="dark:border-night-rule hover:border-primary dark:hover:bg-night-raised border-rule hover:bg-rule/25 flex w-full flex-col items-center justify-center border-2 border-dashed p-6 transition-colors sm:p-8"
                      >
                        <ImageIcon className="text-dark dark:text-night-muted h-10 w-10 sm:h-12 sm:w-12" />
                        <span className="dark:text-night-text text-ink mt-2 text-sm font-medium">
                          Bild auswählen
                        </span>
                        <span className="text-dark dark:text-night-muted mt-1 text-center text-xs">
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
            className="dark:border-night-rule dashboard-form-scroll-anchor border-rule border-t pt-14"
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
                      htmlFor="new-course-start-date"
                      className="dark:text-night-text text-ink mb-2 block text-sm font-medium"
                    >
                      Startdatum *
                    </label>
                    <input
                      id="new-course-start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper text-ink w-full border px-4 py-2.5"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="new-course-start-time"
                      className="dark:text-night-text text-ink mb-2 block text-sm font-medium"
                    >
                      Startzeit *
                    </label>
                    <input
                      id="new-course-start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper text-ink w-full border px-4 py-2.5"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="new-course-end-date"
                      className="dark:text-night-text text-ink mb-2 block text-sm font-medium"
                    >
                      Enddatum *
                    </label>
                    <input
                      id="new-course-end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || undefined}
                      title="Enddatum muss nach oder gleich dem Startdatum sein"
                      className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper text-ink w-full border px-4 py-2.5"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="new-course-end-time"
                      className="dark:text-night-text text-ink mb-2 block text-sm font-medium"
                    >
                      Endzeit *
                    </label>
                    <input
                      id="new-course-end-time"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper text-ink w-full border px-4 py-2.5"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="new-course-bezirk"
                    className="dark:text-night-text text-ink mb-2 block text-sm font-medium"
                  >
                    Bezirk
                  </label>
                  {!isHigherRole && lockedBezirkId ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={
                          bezirke?.find((b) => b.id === lockedBezirkId)
                            ? `Bezirk ${bezirke.find((b) => b.id === lockedBezirkId)?.number} – ${bezirke.find((b) => b.id === lockedBezirkId)?.name}`
                            : "Wird geladen..."
                        }
                        disabled
                        className="dark:border-night-rule dark:bg-night-raised dark:text-night-text border-rule bg-rule/40 text-ink w-full cursor-not-allowed border px-4 py-2.5 opacity-60"
                      />
                      <Lock className="text-dark dark:text-night-muted h-5 w-5 shrink-0" />
                    </div>
                  ) : hasNoDistrict ? (
                    // Hinweis, kein Alarm: bewusst ohne Signalfarbe.
                    <div className="border-ink dark:border-night-text border-l-2 py-1 pl-4">
                      <p className="text-dark dark:text-night-muted text-sm">
                        <strong>Hinweis:</strong> Du bist keinem Bezirk
                        zugeordnet. Bitte wende dich an einen Administrator, um
                        Lehrgänge erstellen zu können.
                      </p>
                    </div>
                  ) : (
                    <Select
                      id="new-course-bezirk"
                      value={bezirkId}
                      onChange={(e) => setBezirkId(e.target.value)}
                      className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper text-ink w-full border px-4 py-2.5"
                    >
                      {selectableBezirkIds === null && (
                        <option value="">Übergreifend / Kein Bezirk</option>
                      )}
                      {selectableBezirke.map((bezirk) => (
                        <option key={bezirk.id} value={bezirk.id}>
                          Bezirk {bezirk.number} – {bezirk.shortName}
                        </option>
                      ))}
                    </Select>
                  )}
                  {!isHigherRole && lockedBezirkId ? (
                    <p className="text-dark dark:text-night-muted mt-2 text-xs">
                      Du kannst nur Lehrgänge für deinen eigenen Bezirk
                      erstellen.
                    </p>
                  ) : null}
                </div>

                <div className="relative" data-dropdown>
                  <label
                    htmlFor="new-course-location-search"
                    className="dark:text-night-text text-ink mb-2 block text-sm font-medium"
                  >
                    Veranstaltungsort (optional)
                  </label>
                  <input
                    id="new-course-location-search"
                    type="text"
                    value={locationSearch}
                    onChange={(e) => {
                      setLocationSearch(e.target.value);
                      setShowLocationDropdown(true);
                      if (!e.target.value) setLocationId("");
                    }}
                    onFocus={() => setShowLocationDropdown(true)}
                    placeholder="Suche nach Ort…"
                    autoComplete="off"
                    className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper text-ink w-full border px-4 py-2.5"
                  />

                  {showLocationDropdown && locationsData && (
                    <div className="border-ink bg-paper dark:border-night-text dark:bg-night-raised absolute z-10 mt-1 w-full overflow-hidden border-2">
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
                                className="hover:bg-rule/60 dark:hover:bg-night-rule block w-full px-4 py-2 text-left text-sm"
                              >
                                <span className="dark:text-night-text text-ink font-medium">
                                  {location.name || location.city}
                                </span>
                                {location.name && (
                                  <span className="text-dark dark:text-night-muted">
                                    {" "}
                                    – {location.city}
                                  </span>
                                )}
                                {location.street && (
                                  <span className="text-dark/70 dark:text-night-muted/70 block text-xs">
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
                        className="text-primary-ink border-rule hover:bg-rule/60 dark:border-night-rule dark:text-primary dark:hover:bg-night-rule block w-full border-t px-4 py-2 text-left text-sm font-semibold"
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
              </div>
            </DashboardFormBlock>
          </div>

          <div
            id="kurs-form-anmeldung"
            className="dark:border-night-rule dashboard-form-scroll-anchor border-rule border-t pt-14"
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
                  <div className="dark:border-night-rule border-rule border p-4">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        id="new-course-external-provider"
                        checked={isExternalProvider}
                        onChange={(e) =>
                          setIsExternalProvider(e.target.checked)
                        }
                        className="text-primary border-rule dark:border-night-text mt-0.5 h-4 w-4 shrink-0"
                      />
                      <span className="min-w-0">
                        <span className="dark:text-night-text text-ink block text-sm leading-snug font-medium">
                          Externer Anbieter
                        </span>
                        <span className="text-dark dark:text-night-muted mt-1 block text-xs leading-relaxed">
                          Die Anmeldung erfolgt auf einer externen Website. Es
                          gibt kein Anmeldeformular und keine
                          Teilnehmerverwaltung hier.
                        </span>
                      </span>
                    </label>

                    {isExternalProvider ? (
                      <div className="dark:border-night-rule border-rule mt-4 space-y-4 border-t pt-4">
                        <div>
                          <label
                            htmlFor="new-course-external-provider-name"
                            className="dark:text-night-text text-ink mb-1.5 block text-sm font-medium"
                          >
                            Name des Anbieters (optional)
                          </label>
                          <input
                            type="text"
                            id="new-course-external-provider-name"
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
                            htmlFor="new-course-external-registration-url"
                            className="dark:text-night-text text-ink mb-1.5 block text-sm font-medium"
                          >
                            Link zur Anmeldung *
                          </label>
                          <input
                            type="url"
                            id="new-course-external-registration-url"
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
                            htmlFor="new-course-external-price-info"
                            className="dark:text-night-text text-ink mb-1.5 block text-sm font-medium"
                          >
                            Hinweis zu Kosten (optional)
                          </label>
                          <input
                            type="text"
                            id="new-course-external-price-info"
                            value={priceInfo}
                            onChange={(e) => setPriceInfo(e.target.value)}
                            placeholder="z.B. Kosten auf Anfrage beim Anbieter"
                            className={registrationFieldInputClass}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <fieldset className="dark:border-night-rule border-rule border p-4">
                    <legend className="sr-only">
                      Anmeldezeitpunkt und -fenster
                    </legend>
                    <div className="space-y-5">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="new-course-registration-open"
                          checked={registrationOpen}
                          onChange={(e) =>
                            setRegistrationOpen(e.target.checked)
                          }
                          className="text-primary border-rule dark:border-night-text mt-0.5 h-4 w-4 shrink-0"
                        />
                        <label
                          htmlFor="new-course-registration-open"
                          className="dark:text-night-text text-ink cursor-pointer text-sm leading-snug font-medium"
                        >
                          Anmeldung geöffnet
                        </label>
                      </div>

                      <div className="dark:border-night-rule border-rule border-t pt-4">
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            id="new-course-scheduled-opens"
                            checked={scheduledRegistrationOpens}
                            onChange={(e) => {
                              const on = e.target.checked;
                              setScheduledRegistrationOpens(on);
                              if (!on) setRegistrationOpensAt("");
                            }}
                            className="text-primary border-rule dark:border-night-text mt-0.5 h-4 w-4 shrink-0"
                          />
                          <span className="min-w-0">
                            <span className="dark:text-night-text text-ink block text-sm leading-snug font-medium">
                              Anmeldebeginn später planen
                            </span>
                            <span className="text-dark dark:text-night-muted mt-1 block text-xs leading-relaxed">
                              {scheduledRegistrationOpens
                                ? "Datum und Uhrzeit vor Kursbeginn wählen; Kursbeschreibung ist schon vorher sichtbar."
                                : "Ohne Planung gilt der normale Zeitpunkt, sobald die Anmeldung freigeschaltet ist."}
                            </span>
                          </span>
                        </label>

                        {scheduledRegistrationOpens ? (
                          <div className="mt-4 space-y-2">
                            <p className="dark:text-night-text text-ink text-sm font-medium">
                              Anmeldung öffnet ab
                            </p>
                            <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                              <div>
                                <label
                                  htmlFor="new-course-registration-opens-date"
                                  className="dark:text-night-text text-ink mb-1.5 block text-sm font-medium"
                                >
                                  Datum
                                </label>
                                <input
                                  type="date"
                                  id="new-course-registration-opens-date"
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
                                  htmlFor="new-course-registration-opens-time"
                                  className="dark:text-night-text text-ink mb-1.5 block text-sm font-medium"
                                >
                                  Uhrzeit
                                </label>
                                <input
                                  type="time"
                                  id="new-course-registration-opens-time"
                                  value={opensScheduleParts.opensTimePart}
                                  max={
                                    opensScheduleParts.opensTimeMax ?? undefined
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
                            <p className="text-dark dark:text-night-muted max-w-xl text-xs leading-relaxed">
                              Die Buttons zum Anmelden erscheinen erst ab diesem
                              Zeitpunkt; der Kurstext bleibt sichtbar.
                            </p>
                          </div>
                        ) : null}
                      </div>

                      <div className="dark:border-night-rule border-rule border-t pt-4">
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            id="new-course-has-registration-deadline"
                            checked={hasRegistrationDeadline}
                            onChange={(e) => {
                              const on = e.target.checked;
                              setHasRegistrationDeadline(on);
                              if (!on) setRegistrationDeadline("");
                            }}
                            className="text-primary border-rule dark:border-night-text mt-0.5 h-4 w-4 shrink-0"
                          />
                          <span className="min-w-0">
                            <span className="dark:text-night-text text-ink block text-sm leading-snug font-medium">
                              Anmeldeschluss festlegen
                            </span>
                            <span className="text-dark dark:text-night-muted mt-1 block text-xs leading-relaxed">
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
                              htmlFor="new-course-registration-deadline"
                              className="dark:text-night-text text-ink mb-1.5 block text-sm font-medium"
                            >
                              Anmeldeschluss
                            </label>
                            <input
                              type="date"
                              id="new-course-registration-deadline"
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
                          htmlFor="new-course-max-participants"
                          className="dark:text-night-text text-ink mb-1.5 block text-sm font-medium"
                        >
                          Maximale Teilnehmerzahl *
                        </label>
                        <input
                          type="number"
                          id="new-course-max-participants"
                          value={maxParticipants}
                          onChange={(e) =>
                            setMaxParticipants(
                              parseInt(e.target.value, 10) || 0,
                            )
                          }
                          min="1"
                          max="500"
                          className={registrationFieldInputClass}
                          required
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="new-course-waiting-list"
                          checked={allowWaitingList}
                          onChange={(e) =>
                            setAllowWaitingList(e.target.checked)
                          }
                          className="text-primary border-rule dark:border-night-text h-4 w-4"
                        />
                        <label
                          htmlFor="new-course-waiting-list"
                          className="dark:text-night-text text-ink text-sm font-medium"
                        >
                          Warteliste aktivieren
                        </label>
                      </div>

                      {canManageSiblingDiscount ? (
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="new-course-sibling-discount"
                            checked={allowSiblingDiscount}
                            onChange={(e) =>
                              setAllowSiblingDiscount(e.target.checked)
                            }
                            className="text-primary border-rule dark:border-night-text h-4 w-4"
                          />
                          <label
                            htmlFor="new-course-sibling-discount"
                            className="dark:text-night-text text-ink text-sm font-medium"
                          >
                            Geschwisterkindrabatt erlauben (20% auf die Gebühr
                            jedes weiteren Geschwisterkindes ab dem zweiten
                            Kind)
                          </label>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </DashboardFormBlock>

              {!isExternalProvider ? (
                <DashboardFormBlock
                  title="Zusätzliche Anmeldefelder"
                  description="Felder, die direkt beim Ausfüllen der Anmeldung abgefragt werden."
                >
                  <CourseCustomFieldsEditor
                    fields={customFields}
                    onChange={setCustomFields}
                  />
                </DashboardFormBlock>
              ) : null}
            </div>
          </div>

          {!isExternalProvider ? (
            <div
              id="kurs-form-preise"
              className="dark:border-night-rule dashboard-form-scroll-anchor border-rule border-t pt-14"
            >
              <DashboardFormZoneHeader
                step={4}
                title="Preise"
                description="Honorare und Zahlungsarten – und wie sie auf der öffentlichen Anmeldung erscheinen."
              />
              <DashboardFormBlock title="Honorar und Zahlungsweisen">
                <div className="space-y-4">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isFree}
                      onChange={(e) => setIsFree(e.target.checked)}
                      className="text-primary border-rule dark:border-night-text h-4 w-4"
                    />
                    <span className="dark:text-night-text text-ink text-sm">
                      Kostenloser Kurs
                    </span>
                  </label>

                  <div>
                    <label className="dark:text-night-text text-ink mb-1 block text-sm font-medium">
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
                      className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper text-ink block w-full border px-3 py-2"
                    />
                  </div>

                  {!isFree && (
                    <div className="dark:border-night-rule border-rule space-y-3 border p-4">
                      <p className="dark:text-night-text text-ink text-sm font-medium">
                        Zahlungsweisen für Teilnehmer
                      </p>
                      <p className="text-dark dark:text-night-muted text-xs">
                        Mindestens eine Option aktivieren.
                      </p>
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={paymentCashAllowed}
                          onChange={(e) =>
                            setPaymentCashAllowed(e.target.checked)
                          }
                          className="text-primary border-rule dark:border-night-text h-4 w-4"
                        />
                        <span className="dark:text-night-text text-ink text-sm">
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
                          className="text-primary border-rule dark:border-night-text h-4 w-4"
                        />
                        <span className="dark:text-night-text text-ink text-sm">
                          Überweisung nach Rechnung
                        </span>
                      </label>
                    </div>
                  )}

                  {!isFree && (canEnableInvoicing || canEnableDownPayment) && (
                    <div className="dark:border-night-rule border-rule space-y-2 border p-4">
                      {canEnableInvoicing && (
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={invoicingEnabled}
                            onChange={(e) =>
                              setInvoicingEnabled(e.target.checked)
                            }
                            className="text-primary border-rule dark:border-night-text mt-0.5 h-4 w-4"
                          />
                          <span>
                            <span className="dark:text-night-text text-ink block text-sm font-medium">
                              Rechnungsstellung aktivieren
                            </span>
                            <span className="text-dark dark:text-night-muted block text-xs">
                              Erlaubt dem Kurs-Team, für diesen Kurs Rechnungen
                              zu erstellen, zu bearbeiten und an die
                              Anmelder:innen auszustellen.
                            </span>
                          </span>
                        </label>
                      )}

                      <div
                        className={
                          canEnableInvoicing
                            ? "dark:border-night-rule border-rule border-t pt-3"
                            : undefined
                        }
                      >
                        <label
                          htmlFor="courseNumber"
                          className="dark:text-night-text text-ink mb-1 block text-sm font-medium"
                        >
                          Kursnummer{" "}
                          <span className="text-dark dark:text-night-muted font-normal">
                            (optional)
                          </span>
                        </label>
                        <input
                          id="courseNumber"
                          type="text"
                          inputMode="numeric"
                          value={courseNumber}
                          onChange={(e) =>
                            setCourseNumber(
                              e.target.value.replace(/\D/g, "").slice(0, 10),
                            )
                          }
                          placeholder="z.B. 2601"
                          className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper text-ink w-full max-w-[12rem] border px-4 py-2.5"
                        />
                        <p className="text-dark dark:text-night-muted mt-1 text-xs">
                          Interne Nummer für die Buchhaltung. Mit Kursnummer
                          lauten die Rechnungsnummern dieses Kurses RE-
                          {courseNumber || "<Nr.>"}-001, RE-
                          {courseNumber || "<Nr.>"}-002 … und der
                          Verwendungszweck nennt zusätzlich „Bläserlehrgang{" "}
                          {courseNumber || "<Nr.>"}“. Ohne Nummer bleibt es bei
                          der fortlaufenden Jahresnummer.
                        </p>
                      </div>
                    </div>
                  )}

                  {!isFree && (
                    <CourseDownPaymentSettings
                      mode={downPaymentMode}
                      onModeChange={setDownPaymentMode}
                      amount={downPaymentAmount}
                      onAmountChange={setDownPaymentAmount}
                      refundPolicy={downPaymentRefundPolicy}
                      onRefundPolicyChange={setDownPaymentRefundPolicy}
                      refundText={downPaymentRefundText}
                      onRefundTextChange={setDownPaymentRefundText}
                      priceOptions={priceOptions}
                      onPriceOptionAmountChange={(id, amount) =>
                        updatePriceOption(
                          id,
                          "downPaymentAmount",
                          amount ?? undefined,
                        )
                      }
                      canEdit={canEnableDownPayment}
                      locked={false}
                      allowSiblingDiscount={
                        canManageSiblingDiscount && allowSiblingDiscount
                      }
                      courseNumber={courseNumber}
                    />
                  )}

                  {!isFree && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="dark:text-night-text text-ink text-sm font-medium">
                          Preiskategorien
                        </label>
                        <button
                          type="button"
                          onClick={addPriceOption}
                          className="text-primary-ink dark:text-primary text-sm font-medium underline-offset-2 hover:underline"
                        >
                          + Kategorie hinzufügen
                        </button>
                      </div>

                      {priceOptions.length === 0 ? (
                        <p className="text-dark dark:text-night-muted text-sm">
                          Noch keine Preiskategorien angelegt. Füge mindestens
                          eine hinzu.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {priceOptions.map((option) => (
                            <div
                              key={option.id}
                              className="dark:border-night-rule border-rule flex items-start gap-3 border p-3"
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
                                    className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper border px-3 py-1.5 text-sm"
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
                                      className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper w-24 border px-3 py-1.5 text-sm"
                                    />
                                    <span className="text-dark dark:text-night-muted text-sm">
                                      €
                                    </span>
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
                                    className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper border px-3 py-1.5 text-sm"
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
                                  className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper w-full border px-3 py-1.5 text-sm"
                                />
                                {needsDistinguishingDescription(
                                  option,
                                  priceOptions,
                                ) && (
                                  <p className="text-primary-ink dark:text-primary mt-1 text-xs">
                                    Dieser Name kommt mehrfach vor — ohne
                                    unterscheidende Beschreibung sind die
                                    Kategorien bei der Anmeldung nicht
                                    auseinanderzuhalten.
                                  </p>
                                )}
                                <PriceOptionAgeLimits
                                  option={option}
                                  onChange={(field, value) =>
                                    updatePriceOption(option.id, field, value)
                                  }
                                  inputClassName="border-ink dark:border-night-text dark:bg-night dark:text-night-text w-full border bg-paper px-3 py-1.5 text-sm"
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
          ) : null}

          <div
            id="kurs-form-veroeffentlichung"
            className="dark:border-night-rule dashboard-form-scroll-anchor border-rule border-t pt-14"
          >
            <DashboardFormZoneHeader
              step={isExternalProvider ? 4 : 5}
              title="Veröffentlichung"
              description="Welchen redaktionellen Stand der Eintrag haben soll – wirkt sich auf die öffentliche Sichtbarkeit aus."
            />
            <DashboardFormBlock title="Redaktionsstatus">
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
                        className="text-primary border-rule dark:border-night-text mt-0.5 h-4 w-4"
                      />
                      <div>
                        <span className="dark:text-night-text text-ink font-medium">
                          Direkt veröffentlichen
                        </span>
                        <p className="text-dark dark:text-night-muted text-sm">
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
                        className="text-primary border-rule dark:border-night-text mt-0.5 h-4 w-4"
                      />
                      <div>
                        <span className="dark:text-night-text text-ink font-medium">
                          Zur Prüfung einreichen
                        </span>
                        <p className="text-dark dark:text-night-muted text-sm">
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
                        className="text-primary border-rule dark:border-night-text mt-0.5 h-4 w-4"
                      />
                      <div>
                        <span className="dark:text-night-text text-ink font-medium">
                          Als Entwurf speichern
                        </span>
                        <p className="text-dark dark:text-night-muted text-sm">
                          Der Kurs wird noch nicht veröffentlicht und ist nur
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
                        className="text-primary border-rule dark:border-night-text mt-0.5 h-4 w-4"
                      />
                      <div>
                        <span className="dark:text-night-text text-ink font-medium">
                          Als Entwurf speichern
                        </span>
                        <p className="text-dark dark:text-night-muted text-sm">
                          Der Kurs wird noch nicht zur Prüfung eingereicht und
                          ist nur für dich sichtbar.
                        </p>
                      </div>
                    </label>

                    {!submitAsDraft && (
                      <div className="bg-blue-50 p-3 dark:bg-blue-900/20">
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
            </DashboardFormBlock>
          </div>

          <div className="dark:border-night-rule border-rule mt-16 flex flex-col gap-3 border-t pt-10 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard/courses"
              data-skip-warning
              onClick={() => clear()}
              className="border-rule dark:border-night-rule dark:text-night-text text-ink hover:bg-rule/25 dark:hover:bg-night-raised border px-6 py-2.5 text-center font-medium transition-colors"
            >
              Abbrechen
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting || createCourseMutation.isPending}
              isLoading={isSubmitting || createCourseMutation.isPending}
            >
              {submitAsDraft
                ? "Entwurf speichern"
                : submitAsApproved
                  ? "Veröffentlichen"
                  : "Kurs einreichen"}
            </Button>
          </div>
        </DashboardSectionedFormLayout>
      </form>

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
  );
}
