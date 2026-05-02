"use client";

import { useState, useEffect, useRef, useMemo, startTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
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
import { CourseType, CustomFieldType } from "~/generated/prisma/enums";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Lock,
  Trash2,
  TrashIcon,
  ImageIcon,
} from "lucide-react";
import MediaPickerModal from "@/app/_components/editor/media-picker-modal";
import { useAutosave } from "@/lib/useAutosave";
import { useBeforeUnload } from "@/lib/useBeforeUnload";
import {
  registrationOpensMerge,
  registrationOpensSplit,
} from "@/lib/dashboard-registration-opens-at";
import { Button, Select } from "@/app/_components/ui";

const courseTypeLabels: Record<CourseType, string> = {
  LEHRGANG: "Lehrgang",
  FREIZEIT: "Freizeit",
  WORKSHOP: "Workshop",
  KOMPONISTENPORTRAIT: "Komponistenportrait",
  OTHER: "Sonstiges",
};

const customFieldTypeLabels: Record<CustomFieldType, string> = {
  TEXT: "Text",
  NUMBER: "Zahl",
  SELECT: "Auswahl",
  CHECKBOX: "Checkbox",
  TEXTAREA: "Mehrzeiliger Text",
};

const NEW_COURSE_NAV_ITEMS: DashboardSectionNavItem[] = [
  { href: "#kurs-form-inhalt", label: "Inhalt" },
  { href: "#kurs-form-termin", label: "Termin & Ort" },
  { href: "#kurs-form-anmeldung", label: "Anmeldung" },
  { href: "#kurs-form-preise", label: "Preise" },
  { href: "#kurs-form-veroeffentlichung", label: "Veröffentlichung" },
];

// Dashboard access is now controlled by permissions

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

  const { data: userPermissions } = api.permissions.getMyPermissions.useQuery(
    undefined,
    { enabled: !!session?.user?.id },
  );

  const hasDashboardAccess =
    Array.isArray(userPermissions) && userPermissions.length > 0;
  const hasApprovePermission =
    Array.isArray(userPermissions) &&
    userPermissions.some((perm: string) => perm === "courses.approve");
  const isHigherRole = hasApprovePermission;

  const [title, setTitle] = useState("");
  const [motto, setMotto] = useState("");
  const [description, setDescription] = useState("");
  const [courseType, setCourseType] = useState<CourseType>("LEHRGANG");

  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("17:00");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [registrationOpensAt, setRegistrationOpensAt] = useState("");
  const [scheduledRegistrationOpens, setScheduledRegistrationOpens] =
    useState(false);

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
  const [allowSiblingDiscount, setAllowSiblingDiscount] = useState(false);

  const [isFree, setIsFree] = useState(false);
  const [paymentCashAllowed, setPaymentCashAllowed] = useState(true);
  const [paymentInvoiceAllowed, setPaymentInvoiceAllowed] = useState(true);
  const [priceInfo, setPriceInfo] = useState("");
  const [priceOptions, setPriceOptions] = useState<PriceOption[]>([]);

  const [prerequisites, setPrerequisites] = useState("");
  const [whatToBring, setWhatToBring] = useState("");

  const [imageId, setImageId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  const [submitAsDraft, setSubmitAsDraft] = useState(false);
  const [submitAsApproved, setSubmitAsApproved] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasRestoredRef = useRef(false);

  const formData = {
    title,
    motto,
    description,
    courseType,
    startDate,
    endDate,
    registrationDeadline,
    registrationOpensAt,
    scheduledRegistrationOpens,
    locationId,
    bezirkId,
    maxParticipants,
    registrationOpen,
    allowWaitingList,
    allowSiblingDiscount,
    isFree,
    paymentCashAllowed,
    paymentInvoiceAllowed,
    priceInfo,
    priceOptions,
    prerequisites,
    whatToBring,
    imageId,
    customFields,
    submitAsDraft,
    submitAsApproved,
  };

  const { restore, clear } = useAutosave("course-new", formData);
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
    "focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none";

  useEffect(() => {
    if (!hasRestoredRef.current && !sessionLoading && !profileLoading) {
      const saved = restore();
      if (saved) {
        startTransition(() => {
          setTitle(saved.title || "");
          setMotto(saved.motto || "");
          setDescription(saved.description || "");
          setCourseType(saved.courseType || "LEHRGANG");
          setStartDate(saved.startDate || "");
          setEndDate(saved.endDate || "");
          setRegistrationDeadline(saved.registrationDeadline || "");
          const restoredScheduled =
            saved.scheduledRegistrationOpens ??
            Boolean(saved.registrationOpensAt);
          setScheduledRegistrationOpens(restoredScheduled);
          setRegistrationOpensAt(
            restoredScheduled ? (saved.registrationOpensAt || "") : "",
          );
          setLocationId(saved.locationId || "");
          setBezirkId(saved.bezirkId || "");
          setMaxParticipants(saved.maxParticipants || 20);
          setRegistrationOpen(saved.registrationOpen || false);
          setAllowWaitingList(saved.allowWaitingList || false);
          setAllowSiblingDiscount(saved.allowSiblingDiscount || false);
          setIsFree(saved.isFree ?? false);
          setPaymentCashAllowed(saved.paymentCashAllowed ?? true);
          setPaymentInvoiceAllowed(saved.paymentInvoiceAllowed ?? true);
          setPriceInfo(saved.priceInfo || "");
          setPriceOptions(saved.priceOptions || []);
          setPrerequisites(saved.prerequisites || "");
          setWhatToBring(saved.whatToBring || "");
          setImageId(saved.imageId || null);
          setCustomFields(saved.customFields || []);
          setSubmitAsDraft(saved.submitAsDraft || false);
          setSubmitAsApproved(saved.submitAsApproved || false);
        });
      }
      hasRestoredRef.current = true;
    }
  }, [restore, sessionLoading, profileLoading]);

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
      if (registrationDeadline) {
        const dl = new Date(registrationDeadline);
        if (!Number.isNaN(dl.getTime()) && opensDt > dl) {
          setError(
            "Der geplante Anmeldungsbeginn darf nicht nach dem Anmeldeschluss liegen.",
          );
          setIsSubmitting(false);
          return;
        }
      }
    }

    if (!maxParticipants || maxParticipants < 1) {
      setError("Bitte gib eine maximale Teilnehmerzahl ein.");
      setIsSubmitting(false);
      return;
    }

    if (!isFree && !paymentCashAllowed && !paymentInvoiceAllowed) {
      setError(
        "Mindestens eine Zahlungsart (Bar vor Ort oder Rechnung per Überweisung) muss aktiv sein.",
      );
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

    clear();

    createCourseMutation.mutate({
      title: title.trim(),
      motto: motto.trim() || undefined,
      description: description.trim(),
      startDate: new Date(`${startDate}T${startTime}`),
      endDate: new Date(`${endDate}T${endTime}`),
      registrationDeadline: registrationDeadline
        ? new Date(registrationDeadline)
        : undefined,
      registrationOpensAt:
        scheduledRegistrationOpens && registrationOpensAt
          ? new Date(registrationOpensAt)
          : undefined,
      locationId: locationId || undefined,
      bezirkId: bezirkId || undefined,
      courseType,
      maxParticipants,
      registrationOpen,
      allowWaitingList,
      allowSiblingDiscount: isHigherRole ? allowSiblingDiscount : false,
      isFree,
      paymentCashAllowed,
      paymentInvoiceAllowed,
      priceInfo: priceInfo.trim() || undefined,
      priceOptions: preparedPriceOptions,
      prerequisites: prerequisites.trim() || undefined,
      whatToBring: whatToBring.trim() || undefined,
      imageId: imageId || undefined,
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
    <DashboardPage
      title="Neuer Kurs"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Kurse", href: "/dashboard/courses" },
        { label: "Neuer Kurs" },
      ]}
      maxWidth="7xl"
    >
      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Form */}
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
                          className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                        >
                          Titel *
                        </label>
                        <input
                          id="new-course-title"
                          type="text"
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
                          htmlFor="new-course-motto"
                          className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                        >
                          Motto (optional)
                        </label>
                        <input
                          id="new-course-motto"
                          type="text"
                          value={motto}
                          onChange={(e) => setMotto(e.target.value)}
                          className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-1 focus:outline-none"
                          placeholder="z.B. Gemeinsam musizieren"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="new-course-description"
                          className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                        >
                          Beschreibung *
                        </label>
                        <textarea
                          id="new-course-description"
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
                            htmlFor="new-course-type"
                            className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                          >
                            Kurstyp *
                          </label>
                          <Select
                            id="new-course-type"
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
                          htmlFor="new-course-prerequisites"
                          className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                        >
                          Voraussetzungen (optional)
                        </label>
                        <textarea
                          id="new-course-prerequisites"
                          value={prerequisites}
                          onChange={(e) => setPrerequisites(e.target.value)}
                          rows={3}
                          className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-1 focus:outline-none"
                          placeholder="z.B. Grundkenntnisse auf dem Instrument"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="new-course-what-to-bring"
                          className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                        >
                          Mitzubringen (optional)
                        </label>
                        <textarea
                          id="new-course-what-to-bring"
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
                    htmlFor="new-course-start-date"
                    className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                  >
                    Startdatum *
                  </label>
                  <input
                    id="new-course-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-1 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-course-start-time"
                    className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                  >
                    Startzeit *
                  </label>
                  <input
                    id="new-course-start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-1 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-course-end-date"
                    className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
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
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-1 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-course-end-time"
                    className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
                  >
                    Endzeit *
                  </label>
                  <input
                    id="new-course-end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-1 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="new-course-bezirk"
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
                ) : !isHigherRole && !userBezirkId ? (
                  <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
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
                {!isHigherRole && userBezirkId ? (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Du kannst nur Lehrgänge für deinen eigenen Bezirk erstellen.
                  </p>
                ) : null}
              </div>

              <div className="relative" data-dropdown>
                <label
                  htmlFor="new-course-location-search"
                  className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700"
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
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-1 focus:outline-none"
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
          </DashboardFormBlock>
        </div>

        <div
          id="kurs-form-anmeldung"
          className="dark:border-dark-border dashboard-form-scroll-anchor border-t border-gray-200/80 pt-14"
        >
          <DashboardFormZoneHeader
            step={3}
            title="Anmeldung"
            description="Wer sich wann eintragen darf, wie viele Plätze es gibt und welche Extrafragen gestellt werden."
          />
          <div className="space-y-10">
            <DashboardFormBlock title="Anmeldeeinstellungen">
              <div className="space-y-6">
                <fieldset className="dark:border-dark-border rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <legend className="sr-only">
                    Anmeldezeitpunkt und -fenster
                  </legend>
                  <div className="space-y-5">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="new-course-registration-open"
                        checked={registrationOpen}
                        onChange={(e) => setRegistrationOpen(e.target.checked)}
                        className="text-primary focus:ring-primary mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300"
                      />
                      <label
                        htmlFor="new-course-registration-open"
                        className="dark:text-dark-text cursor-pointer text-sm font-medium leading-snug text-gray-700"
                      >
                        Anmeldung geöffnet
                      </label>
                    </div>

                    <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
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
                          className="text-primary focus:ring-primary mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300"
                        />
                        <span className="min-w-0">
                          <span className="dark:text-dark-text block text-sm font-medium leading-snug text-gray-700">
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
                                htmlFor="new-course-registration-opens-date"
                                className="dark:text-dark-text mb-1.5 block text-sm font-medium text-gray-700"
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
                                className="dark:text-dark-text mb-1.5 block text-sm font-medium text-gray-700"
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
                          <p className="max-w-xl text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                            Die Buttons zum Anmelden erscheinen erst ab diesem
                            Zeitpunkt; der Kurstext bleibt sichtbar.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </fieldset>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start sm:gap-6">
                  <div>
                    <label
                      htmlFor="new-course-max-participants"
                      className="dark:text-dark-text mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Maximale Teilnehmerzahl *
                    </label>
                    <input
                      type="number"
                      id="new-course-max-participants"
                      value={maxParticipants}
                      onChange={(e) =>
                        setMaxParticipants(parseInt(e.target.value, 10) || 0)
                      }
                      min="1"
                      max="500"
                      className={registrationFieldInputClass}
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="new-course-registration-deadline"
                      className="dark:text-dark-text mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Anmeldeschluss (optional)
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
                          ? opensScheduleParts.opensDatePart || undefined
                          : undefined
                      }
                      max={startDate || undefined}
                      title="Anmeldeschluss muss vor oder am Startdatum sein"
                      className={registrationFieldInputClass}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="new-course-waiting-list"
                    checked={allowWaitingList}
                    onChange={(e) =>
                      setAllowWaitingList(e.target.checked)
                    }
                    className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                  />
                  <label
                    htmlFor="new-course-waiting-list"
                    className="dark:text-dark-text text-sm font-medium text-gray-700"
                  >
                    Warteliste aktivieren
                  </label>
                </div>

                {isHigherRole ? (
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="new-course-sibling-discount"
                      checked={allowSiblingDiscount}
                      onChange={(e) =>
                        setAllowSiblingDiscount(e.target.checked)
                      }
                      className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                    />
                    <label
                      htmlFor="new-course-sibling-discount"
                      className="dark:text-dark-text text-sm font-medium text-gray-700"
                    >
                      Geschwisterkindrabatt erlauben (20% auf die Gebühr jedes
                      weiteren Geschwisterkindes ab dem zweiten Kind)
                    </label>
                  </div>
                ) : null}
              </div>
            </DashboardFormBlock>

            <DashboardFormBlock
              title="Zusätzliche Anmeldefelder"
              description="Felder, die direkt beim Ausfüllen der Anmeldung abgefragt werden."
            >
              <div className="-mt-2 mb-4 flex justify-end">
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
                      <Select
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
                      </Select>
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
            </DashboardFormBlock>
          </div>
        </div>

        <div
          id="kurs-form-preise"
          className="dark:border-dark-border dashboard-form-scroll-anchor border-t border-gray-200/80 pt-14"
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
                    onChange={(e) => setPaymentCashAllowed(e.target.checked)}
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
                    onChange={(e) => setPaymentInvoiceAllowed(e.target.checked)}
                    className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                  />
                  <span className="dark:text-dark-text text-sm text-gray-700">
                    Überweisung nach Rechnung
                  </span>
                </label>
              </div>
            )}

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
          </DashboardFormBlock>
        </div>

        <div
          id="kurs-form-veroeffentlichung"
          className="dark:border-dark-border dashboard-form-scroll-anchor border-t border-gray-200/80 pt-14"
        >
          <DashboardFormZoneHeader
            step={5}
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
                      <strong>Hinweis:</strong> Nach dem Erstellen wird der Kurs
                      zur Prüfung eingereicht. Ein Redakteur wird den Kurs
                      prüfen und freigeben.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          </DashboardFormBlock>
        </div>

          {/* Actions */}
          <div className="dark:border-dark-border mt-16 flex flex-col gap-3 border-t border-gray-200/80 pt-10 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard/courses"
              data-skip-warning
              onClick={() => clear()}
              className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-6 py-2.5 text-center font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
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
  );
}
