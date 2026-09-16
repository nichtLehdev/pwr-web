"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession, changePassword } from "@/lib/auth";
import { api } from "@/trpc/react";
import { getErrorMessage, cn } from "@/lib/utils";
import ProfileImageUpload from "./_components/profile-image-upload";
import { useToast } from "@/app/_components/ui/toast";
import { useTheme } from "@/app/_components/general/theme-provider";
import {
  User,
  Key,
  Settings,
  Calendar,
  AlertTriangle,
  Trash2,
  Download,
  Save,
  Moon,
  Sun,
  Monitor,
  List,
} from "lucide-react";
import { useTrackingPreference } from "@/app/_components/stats/tracking-consent-context";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import PublicPage from "@/app/_components/general/public-page";
import { PageSection } from "@/app/_components/programmheft/page-section";
import {
  Heading,
  ArrowLink,
} from "@/app/_components/programmheft/section-head";
import { Note } from "@/app/_components/programmheft/note";
import {
  FieldLabel,
  FieldHint,
  FieldError,
  Checkbox,
  fieldControlClasses,
} from "@/app/_components/programmheft/field";

interface UserPreferences {
  termineDefaultView: "list" | "calendar";
  theme?: "light" | "dark" | "system";
  /** Show address (street, zip, city) on public pages (e.g. Bezirke). Default true */
  showAddressPublicly?: boolean;
  /** Show phone number on public pages (e.g. Vorstand, Bezirke). Default true */
  showPhonePublicly?: boolean;
}

const defaultPreferences: UserPreferences = {
  termineDefaultView: "list",
  theme: "system",
  showAddressPublicly: true,
  showPhonePublicly: true,
};

type SettingsTab = "profile" | "account" | "preferences" | "data" | "danger";

/**
 * Schaltflächen- und Feld-Stimmen des Programmhefts, lokal wiederholt wie auf
 * den übrigen öffentlichen Formularseiten (z. B. /anmeldung-verwalten,
 * /mitmachen/mitgliedschaft).
 */
const BTN_PRIMARY =
  "bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper semi-condensed inline-flex min-h-12 items-center justify-center gap-2 px-6 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
const BTN_OUTLINE =
  "border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night semi-condensed inline-flex min-h-12 items-center justify-center gap-2 border-2 px-6 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
/** Kopf über einer Gruppe von Auswahl-Schaltflächen, ohne eigenes Feld (kein `htmlFor`). */
const FIELD_LABEL_CLASS =
  "semi-condensed text-ink dark:text-night-text block text-base font-semibold";

/** Auswahl-Schaltfläche (Liste/Kalender, Hell/Dunkel/System, Tracking): gefüllt, wenn aktiv. */
function choiceButtonClass(active: boolean) {
  return cn(
    "semi-condensed inline-flex min-h-11 items-center justify-center gap-2 border-2 px-4 text-sm font-semibold transition-colors",
    active
      ? "bg-ink text-paper border-ink dark:bg-night-text dark:text-night dark:border-night-text"
      : "border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night",
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const utils = api.useUtils();
  const toast = useToast();
  const { theme: currentTheme, setTheme: setCurrentTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    displayName: "",
    username: "",
    email: "",
    phone: "",
    street: "",
    zipCode: "",
    city: "",
    bio: "",
    birthDate: "",
    profileImageId: null as string | null,
  });
  const [preferences, setPreferences] =
    useState<UserPreferences>(defaultPreferences);
  const [savedState, setSavedState] = useState<{
    formData: typeof formData;
    preferences: UserPreferences;
  } | null>(null);
  const [pendingTab, setPendingTab] = useState<SettingsTab | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [birthdateError, setBirthdateError] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({
    checking: false,
    available: null,
    message: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteEmailConfirm, setDeleteEmailConfirm] = useState("");
  const [isExportingData, setIsExportingData] = useState(false);
  const hasInitializedRef = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const updateProfile = api.users.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profil erfolgreich aktualisiert");
      void utils.users.getMyProfile.invalidate();
    },
    onError: (err) => {
      toast.error(
        getErrorMessage(err, "Fehler beim Aktualisieren des Profils"),
      );
    },
  });

  const saveThemePreference = api.users.updateProfile.useMutation({
    onError: (err) => {
      toast.error(
        getErrorMessage(err, "Fehler beim Speichern des Design-Themes"),
      );
    },
  });

  const { data: savedParticipants, isLoading: savedParticipantsLoading } =
    api.savedParticipants.getAll.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const deleteSavedParticipant = api.savedParticipants.delete.useMutation({
    onSuccess: () => {
      toast.success("Teilnehmer entfernt");
      void utils.savedParticipants.getAll.invalidate();
    },
    onError: (err) => {
      toast.error(
        getErrorMessage(err, "Fehler beim Entfernen des Teilnehmers"),
      );
    },
  });

  const deleteMyAccount = api.users.deleteMyAccount.useMutation({
    onError: (err) => {
      toast.error(getErrorMessage(err, "Fehler beim Löschen des Kontos"));
    },
  });

  useEffect(() => {
    if (profile && !hasInitializedRef.current) {
      const initialFormData = {
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        displayName: profile.displayName || "",
        username: profile.username || "",
        email: profile.email || "",
        phone: profile.phone || "",
        street: profile.street || "",
        zipCode: profile.zipCode || "",
        city: profile.city || "",
        bio: profile.bio || "",
        birthDate: profile.birthDate
          ? new Date(profile.birthDate).toISOString().split("T")[0]!
          : "",
        profileImageId: profile.profileImageId || null,
      };
      setFormData(initialFormData);

      let initialPreferences: UserPreferences;
      if (profile.preferences) {
        try {
          const parsed =
            typeof profile.preferences === "string"
              ? JSON.parse(profile.preferences)
              : profile.preferences;
          initialPreferences = { ...defaultPreferences, ...parsed };
          if (initialPreferences.theme) {
            setCurrentTheme(initialPreferences.theme);
          }
        } catch {
          initialPreferences = defaultPreferences;
        }
      } else {
        initialPreferences = { ...defaultPreferences, theme: currentTheme };
      }
      setPreferences(initialPreferences);
      setSavedState({
        formData: initialFormData,
        preferences: initialPreferences,
      });
      hasInitializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, setCurrentTheme]);

  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.push("/login?redirect=%2Fsettings");
    }
  }, [session, sessionLoading, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "username") {
      setUsernameStatus({
        checking: false,
        available: null,
        message: "",
      });
    }
  };

  const checkUsernameAvailability = async () => {
    if (
      !formData.username ||
      formData.username.length < 3 ||
      formData.username === profile?.username
    ) {
      return;
    }

    setUsernameStatus({ checking: true, available: null, message: "" });

    try {
      const response = await fetch(
        `/api/trpc/users.checkUsername?input=${encodeURIComponent(JSON.stringify({ username: formData.username }))}`,
      );
      const data = await response.json();
      const available = data.result.data.available;

      setUsernameStatus({
        checking: false,
        available,
        message: available
          ? "✓ Benutzername verfügbar"
          : "✗ Benutzername bereits vergeben",
      });
    } catch {
      setUsernameStatus({
        checking: false,
        available: null,
        message: "",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      formData.username &&
      formData.username !== profile?.username &&
      usernameStatus.available === false
    ) {
      toast.error("Bitte wähle einen verfügbaren Benutzernamen");
      return;
    }

    setIsLoading(true);

    try {
      await updateProfile.mutateAsync({
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        displayName: formData.displayName || undefined,
        username: formData.username || undefined,
        phone: formData.phone || undefined,
        street: formData.street || undefined,
        zipCode: formData.zipCode || undefined,
        city: formData.city || undefined,
        bio: formData.bio || undefined,
        birthDate: formData.birthDate || undefined,
        profileImageId: formData.profileImageId || undefined,
        preferences: JSON.stringify(preferences),
      });
      setSavedState({
        formData: { ...formData },
        preferences: { ...preferences },
      });
    } catch {
      // Fehler wird bereits über die onError-Toast-Meldung angezeigt
    } finally {
      setIsLoading(false);
    }
  };

  const hasUnsavedChanges =
    savedState !== null &&
    (JSON.stringify(formData) !== JSON.stringify(savedState.formData) ||
      JSON.stringify(preferences) !== JSON.stringify(savedState.preferences));

  const handleTabSelect = (tab: SettingsTab) => {
    if (tab === activeTab) return;
    if (hasUnsavedChanges) {
      setPendingTab(tab);
    } else {
      setActiveTab(tab);
    }
  };

  const handleThemeSelect = (newTheme: "light" | "dark" | "system") => {
    setPreferences((prev) => ({ ...prev, theme: newTheme }));
    setCurrentTheme(newTheme);
    // Theme sofort speichern, damit die Auswahl nicht verloren geht
    saveThemePreference.mutate({
      preferences: JSON.stringify({
        ...(savedState?.preferences ?? preferences),
        theme: newTheme,
      }),
    });
    setSavedState((prev) =>
      prev
        ? { ...prev, preferences: { ...prev.preferences, theme: newTheme } }
        : prev,
    );
  };

  if (sessionLoading || profileLoading) {
    return (
      <div className="bg-paper dark:bg-night text-ink dark:text-night-text flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="semi-condensed text-lg font-semibold">Lädt...</p>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const tabs = [
    { id: "profile" as SettingsTab, label: "Profil", icon: User },
    { id: "account" as SettingsTab, label: "Konto", icon: Key },
    {
      id: "preferences" as SettingsTab,
      label: "Einstellungen",
      icon: Settings,
    },
    { id: "data" as SettingsTab, label: "Daten", icon: Download },
    { id: "danger" as SettingsTab, label: "Gefahrenzone", icon: AlertTriangle },
  ];

  const twoFactorEnabled =
    (profile as { twoFactorEnabled?: boolean })?.twoFactorEnabled ?? false;

  return (
    <PublicPage
      title="Einstellungen"
      breadcrumbs={[{ label: "Start", href: "/" }, { label: "Einstellungen" }]}
      heroSize="compact"
      description={<p>Verwalte dein Profil und deine persönlichen Daten</p>}
    >
      <PageSection>
        <nav
          aria-label="Einstellungsbereiche"
          className="border-ink dark:border-night-text -mx-1 flex gap-1 overflow-x-auto border-b-2 px-1 sm:gap-2"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabSelect(tab.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "semi-condensed inline-flex shrink-0 items-center gap-2 border-b-[3px] px-3 py-3 text-[1.0625rem] font-semibold whitespace-nowrap transition-colors",
                  active
                    ? "border-primary text-ink dark:text-night-text"
                    : "text-dark hover:border-ink hover:text-ink dark:text-night-muted dark:hover:border-night-text dark:hover:text-night-text border-transparent",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* 48rem war zu eng — das Formular klebte als schmale Säule am linken
            Rand, während die halbe Seite leer blieb. Die volle Satzbreite
            wäre das andere Extrem: 650px pro Feld für Vor- und Nachname. */}
        <div className="mt-10 max-w-5xl">
          <form onSubmit={handleSubmit}>
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-10">
                <div>
                  <Heading as="h2" size="list" rule>
                    Profil
                  </Heading>
                  <p className="text-dark dark:text-night-muted mt-3 text-sm">
                    Verwalte deine persönlichen Informationen
                  </p>
                </div>

                {/* Profile Image */}
                <div>
                  <p className={cn(FIELD_LABEL_CLASS, "mb-2")}>Profilbild</p>
                  <ProfileImageUpload
                    currentImage={profile?.profileImage}
                    onImageUploaded={(mediaId) => {
                      setFormData((prev) => ({
                        ...prev,
                        profileImageId: mediaId,
                      }));
                    }}
                    onImageRemoved={() => {
                      setFormData((prev) => ({
                        ...prev,
                        profileImageId: null,
                      }));
                    }}
                  />
                  {profile && (
                    <Note tone="info" className="mt-4">
                      <p>
                        <strong className="font-semibold">Hinweis:</strong> Dein
                        Profilbild wird auch auf öffentlichen Seiten angezeigt
                        (z.B. Team, Bezirke, Posaunenrat).
                      </p>
                    </Note>
                  )}
                </div>

                {/* Personal Data */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="firstName">Vorname</FieldLabel>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      maxLength={100}
                      onChange={handleChange}
                      className={fieldControlClasses}
                    />
                  </div>

                  <div>
                    <FieldLabel htmlFor="lastName">Nachname</FieldLabel>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      maxLength={100}
                      onChange={handleChange}
                      className={fieldControlClasses}
                    />
                  </div>

                  <div>
                    <FieldLabel htmlFor="birthDate">Geburtsdatum</FieldLabel>
                    <input
                      id="birthDate"
                      name="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => {
                        handleChange(e);
                        if (!e.target.value) {
                          setBirthdateError("");
                        } else if (new Date(e.target.value) >= new Date()) {
                          setBirthdateError(
                            "Geburtsdatum muss in der Vergangenheit liegen",
                          );
                        } else {
                          setBirthdateError("");
                        }
                      }}
                      max={new Date().toISOString().split("T")[0]}
                      aria-invalid={!!birthdateError}
                      aria-describedby={
                        birthdateError ? "birthDate-error" : undefined
                      }
                      className={cn(
                        fieldControlClasses,
                        birthdateError &&
                          "border-red-700! dark:border-red-400!",
                      )}
                    />
                    {birthdateError && (
                      <FieldError id="birthDate-error">
                        {birthdateError}
                      </FieldError>
                    )}
                  </div>

                  <div>
                    <FieldLabel htmlFor="displayName">Anzeigename</FieldLabel>
                    <input
                      id="displayName"
                      name="displayName"
                      type="text"
                      value={formData.displayName}
                      maxLength={100}
                      onChange={handleChange}
                      placeholder="Wird anderen Nutzern angezeigt"
                      className={fieldControlClasses}
                    />
                    <FieldHint>
                      Optional. Falls leer, wird der vollständige Name
                      verwendet.
                    </FieldHint>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <Heading as="h3" size="list" className="text-[1.375rem]">
                    Adresse
                  </Heading>
                  <div className="mt-5 space-y-6">
                    <div>
                      <FieldLabel htmlFor="street">
                        Straße und Hausnummer
                      </FieldLabel>
                      <input
                        id="street"
                        name="street"
                        type="text"
                        value={formData.street}
                        onChange={handleChange}
                        className={fieldControlClasses}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                      <div>
                        <FieldLabel htmlFor="zipCode">PLZ</FieldLabel>
                        <input
                          id="zipCode"
                          name="zipCode"
                          type="text"
                          value={formData.zipCode}
                          onChange={handleChange}
                          maxLength={20}
                          className={fieldControlClasses}
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <FieldLabel htmlFor="city">Stadt</FieldLabel>
                        <input
                          id="city"
                          name="city"
                          type="text"
                          value={formData.city}
                          maxLength={100}
                          onChange={handleChange}
                          className={fieldControlClasses}
                        />
                      </div>
                    </div>

                    {/* Privacy: what to show on public pages */}
                    <div className="border-rule dark:border-night-rule border-t pt-6">
                      <p className="text-ink dark:text-night-text text-sm font-semibold">
                        Öffentliche Sichtbarkeit
                      </p>
                      <p className="text-dark dark:text-night-muted mt-1 text-xs">
                        Lege fest, ob deine Kontaktdaten auf öffentlichen Seiten
                        (z. B. Vorstand, Bezirke) angezeigt werden.
                      </p>
                      <div className="mt-4 space-y-3">
                        <Checkbox
                          id="showAddressPublicly"
                          checked={preferences.showAddressPublicly !== false}
                          onChange={(e) =>
                            setPreferences((prev) => ({
                              ...prev,
                              showAddressPublicly: e.target.checked,
                            }))
                          }
                        >
                          Adresse anzeigen
                        </Checkbox>
                        <Checkbox
                          id="showPhonePublicly"
                          checked={preferences.showPhonePublicly !== false}
                          onChange={(e) =>
                            setPreferences((prev) => ({
                              ...prev,
                              showPhonePublicly: e.target.checked,
                            }))
                          }
                        >
                          Telefonnummer anzeigen
                        </Checkbox>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <FieldLabel htmlFor="bio">Biografie</FieldLabel>
                  <textarea
                    id="bio"
                    name="bio"
                    rows={4}
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Erzähl etwas über dich..."
                    maxLength={2000}
                    className={cn(fieldControlClasses, "resize-none")}
                  />
                  <FieldHint>{formData.bio.length}/2000 Zeichen</FieldHint>
                </div>

                {/* Save Button */}
                <div className="border-rule dark:border-night-rule flex justify-end border-t pt-6">
                  <button
                    type="submit"
                    disabled={isLoading || updateProfile.isPending}
                    className={cn(BTN_PRIMARY, "w-full sm:w-auto")}
                  >
                    <Save className="h-4 w-4" aria-hidden />
                    {isLoading || updateProfile.isPending
                      ? "Speichert..."
                      : "Änderungen speichern"}
                  </button>
                </div>
              </div>
            )}

            {/* Account Tab */}
            {activeTab === "account" && (
              <div className="space-y-10">
                <div>
                  <Heading as="h2" size="list" rule>
                    Konto
                  </Heading>
                  <p className="text-dark dark:text-night-muted mt-3 text-sm">
                    Verwalte deine Kontodaten und Sicherheitseinstellungen
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Username */}
                  <div>
                    <FieldLabel htmlFor="username">Benutzername</FieldLabel>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      value={formData.username}
                      minLength={3}
                      maxLength={30}
                      pattern="[a-zA-Z0-9_.-]+"
                      onChange={handleChange}
                      onBlur={checkUsernameAvailability}
                      aria-describedby="username-hint"
                      className={cn(
                        fieldControlClasses,
                        usernameStatus.available === false &&
                          "border-red-700! dark:border-red-400!",
                      )}
                    />
                    {usernameStatus.checking ? (
                      <FieldHint id="username-hint">Überprüfe...</FieldHint>
                    ) : usernameStatus.message ? (
                      usernameStatus.available ? (
                        <FieldHint id="username-hint">
                          {usernameStatus.message}
                        </FieldHint>
                      ) : (
                        <FieldError id="username-hint">
                          {usernameStatus.message}
                        </FieldError>
                      )
                    ) : (
                      <FieldHint id="username-hint">
                        Kann für die Anmeldung verwendet werden
                      </FieldHint>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <FieldLabel htmlFor="email">E-Mail-Adresse</FieldLabel>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className={cn(fieldControlClasses, "cursor-not-allowed")}
                    />
                    <FieldHint>
                      Die E-Mail-Adresse kann derzeit nicht geändert werden
                    </FieldHint>
                  </div>

                  {/* Phone */}
                  <div>
                    <FieldLabel htmlFor="phone">Telefonnummer</FieldLabel>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+49 123 456789"
                      className={fieldControlClasses}
                    />
                  </div>

                  {/* Password Change */}
                  <div className="border-rule dark:border-night-rule border-t pt-6">
                    <Heading as="h3" size="list" className="text-[1.375rem]">
                      Passwort ändern
                    </Heading>
                    <div className="mt-5 space-y-5">
                      <div>
                        <FieldLabel htmlFor="currentPassword">
                          Aktuelles Passwort
                        </FieldLabel>
                        <input
                          id="currentPassword"
                          name="currentPassword"
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) =>
                            setPasswordData((prev) => ({
                              ...prev,
                              currentPassword: e.target.value,
                            }))
                          }
                          className={fieldControlClasses}
                        />
                      </div>

                      <div>
                        <FieldLabel htmlFor="newPassword">
                          Neues Passwort
                        </FieldLabel>
                        <input
                          id="newPassword"
                          name="newPassword"
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            setPasswordData((prev) => ({
                              ...prev,
                              newPassword: e.target.value,
                            }))
                          }
                          minLength={8}
                          className={fieldControlClasses}
                        />
                        <FieldHint>Mindestens 8 Zeichen</FieldHint>
                      </div>

                      <div>
                        <FieldLabel htmlFor="confirmPassword">
                          Neues Passwort bestätigen
                        </FieldLabel>
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) =>
                            setPasswordData((prev) => ({
                              ...prev,
                              confirmPassword: e.target.value,
                            }))
                          }
                          minLength={8}
                          className={fieldControlClasses}
                        />
                      </div>

                      {passwordError && (
                        <Note tone="error">
                          <p>{passwordError}</p>
                        </Note>
                      )}

                      <button
                        type="button"
                        onClick={async () => {
                          setPasswordError("");

                          if (!passwordData.currentPassword) {
                            setPasswordError(
                              "Bitte gib dein aktuelles Passwort ein",
                            );
                            return;
                          }

                          if (passwordData.newPassword.length < 8) {
                            setPasswordError(
                              "Das neue Passwort muss mindestens 8 Zeichen lang sein",
                            );
                            return;
                          }

                          if (
                            passwordData.newPassword !==
                            passwordData.confirmPassword
                          ) {
                            setPasswordError(
                              "Die neuen Passwörter stimmen nicht überein",
                            );
                            return;
                          }

                          setIsChangingPassword(true);

                          try {
                            const result = await changePassword({
                              currentPassword: passwordData.currentPassword,
                              newPassword: passwordData.newPassword,
                              revokeOtherSessions: false,
                            });

                            if (result.error) {
                              setPasswordError(
                                result.error.message ||
                                  "Fehler beim Ändern des Passworts",
                              );
                            } else {
                              toast.success("Passwort erfolgreich geändert");
                              setPasswordData({
                                currentPassword: "",
                                newPassword: "",
                                confirmPassword: "",
                              });
                            }
                          } catch (error) {
                            setPasswordError(
                              error instanceof Error
                                ? error.message
                                : "Fehler beim Ändern des Passworts",
                            );
                          } finally {
                            setIsChangingPassword(false);
                          }
                        }}
                        disabled={isChangingPassword}
                        className={BTN_PRIMARY}
                      >
                        {isChangingPassword
                          ? "Wird geändert..."
                          : "Passwort ändern"}
                      </button>
                    </div>
                  </div>

                  {/* 2FA */}
                  <div className="border-rule dark:border-night-rule border-t pt-6">
                    <Heading as="h3" size="list" className="text-[1.375rem]">
                      Zwei-Faktor-Authentifizierung (2FA)
                    </Heading>
                    {twoFactorEnabled ? (
                      <div className="mt-4 space-y-4">
                        <Note tone="info">
                          <p>
                            <strong className="font-semibold">
                              2FA ist aktiviert
                            </strong>{" "}
                            - Dein Konto ist zusätzlich geschützt.
                          </p>
                        </Note>
                        <ArrowLink href="/settings/two-factor">
                          2FA verwalten
                        </ArrowLink>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-4">
                        <p className="text-dark dark:text-night-muted text-sm">
                          Zwei-Faktor-Authentifizierung fügt eine zusätzliche
                          Sicherheitsebene zu deinem Konto hinzu.
                        </p>
                        <ArrowLink href="/settings/two-factor">
                          2FA aktivieren
                        </ArrowLink>
                      </div>
                    )}
                  </div>

                  {/* Save Button */}
                  <div className="border-rule dark:border-night-rule flex justify-end border-t pt-6">
                    <button
                      type="submit"
                      disabled={isLoading || updateProfile.isPending}
                      className={cn(BTN_PRIMARY, "w-full sm:w-auto")}
                    >
                      <Save className="h-4 w-4" aria-hidden />
                      {isLoading || updateProfile.isPending
                        ? "Speichert..."
                        : "Änderungen speichern"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === "preferences" && (
              <div className="space-y-10">
                <div>
                  <Heading as="h2" size="list" rule>
                    Einstellungen
                  </Heading>
                  <p className="text-dark dark:text-night-muted mt-3 text-sm">
                    Passe die Website an deine Vorlieben an
                  </p>
                </div>

                <div className="space-y-8">
                  {/* Termine Default View */}
                  <div>
                    <p className={FIELD_LABEL_CLASS}>
                      Standard-Ansicht für Termine
                    </p>
                    <p className="text-dark dark:text-night-muted mt-1 mb-3 text-xs">
                      Wähle, wie die Termine-Seite standardmäßig angezeigt
                      werden soll.
                    </p>
                    <div
                      role="group"
                      aria-label="Standard-Ansicht für Termine"
                      className="flex gap-2"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setPreferences((prev) => ({
                            ...prev,
                            termineDefaultView: "list",
                          }))
                        }
                        aria-pressed={preferences.termineDefaultView === "list"}
                        className={cn(
                          choiceButtonClass(
                            preferences.termineDefaultView === "list",
                          ),
                          "flex-1",
                        )}
                      >
                        <List className="h-5 w-5" aria-hidden />
                        Liste
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPreferences((prev) => ({
                            ...prev,
                            termineDefaultView: "calendar",
                          }))
                        }
                        aria-pressed={
                          preferences.termineDefaultView === "calendar"
                        }
                        className={cn(
                          choiceButtonClass(
                            preferences.termineDefaultView === "calendar",
                          ),
                          "flex-1",
                        )}
                      >
                        <Calendar className="h-5 w-5" aria-hidden />
                        Kalender
                      </button>
                    </div>
                  </div>

                  {/* Theme */}
                  <div>
                    <p className={FIELD_LABEL_CLASS}>Design-Theme</p>
                    <p className="text-dark dark:text-night-muted mt-1 mb-3 text-xs">
                      Wähle dein bevorzugtes Design-Theme für die Website. Die
                      Auswahl wird sofort gespeichert.
                    </p>
                    <div
                      role="group"
                      aria-label="Design-Theme"
                      className="grid grid-cols-3 gap-2"
                    >
                      <button
                        type="button"
                        onClick={() => handleThemeSelect("light")}
                        aria-pressed={
                          preferences.theme === "light" ||
                          (!preferences.theme && currentTheme === "light")
                        }
                        className={cn(
                          choiceButtonClass(
                            preferences.theme === "light" ||
                              (!preferences.theme && currentTheme === "light"),
                          ),
                          "flex-col",
                        )}
                      >
                        <Sun className="h-5 w-5" aria-hidden />
                        Hell
                      </button>
                      <button
                        type="button"
                        onClick={() => handleThemeSelect("dark")}
                        aria-pressed={
                          preferences.theme === "dark" ||
                          (!preferences.theme && currentTheme === "dark")
                        }
                        className={cn(
                          choiceButtonClass(
                            preferences.theme === "dark" ||
                              (!preferences.theme && currentTheme === "dark"),
                          ),
                          "flex-col",
                        )}
                      >
                        <Moon className="h-5 w-5" aria-hidden />
                        Dunkel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleThemeSelect("system")}
                        aria-pressed={
                          preferences.theme === "system" ||
                          (!preferences.theme && currentTheme === "system")
                        }
                        className={cn(
                          choiceButtonClass(
                            preferences.theme === "system" ||
                              (!preferences.theme && currentTheme === "system"),
                          ),
                          "flex-col",
                        )}
                      >
                        <Monitor className="h-5 w-5" aria-hidden />
                        System
                      </button>
                    </div>
                  </div>

                  {/* Tracking Consent */}
                  <TrackingConsentSection />

                  {/* Save Button */}
                  <div className="border-rule dark:border-night-rule flex justify-end border-t pt-6">
                    <button
                      type="submit"
                      disabled={isLoading || updateProfile.isPending}
                      className={BTN_PRIMARY}
                    >
                      <Save className="h-4 w-4" aria-hidden />
                      {isLoading || updateProfile.isPending
                        ? "Speichert..."
                        : "Einstellungen speichern"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Data Tab */}
            {activeTab === "data" && (
              <div className="space-y-10">
                <div>
                  <Heading as="h2" size="list" rule>
                    Meine Daten
                  </Heading>
                  <p className="text-dark dark:text-night-muted mt-3 text-sm">
                    Exportiere deine Daten oder verwalte gespeicherte Teilnehmer
                  </p>
                </div>

                <div className="space-y-10">
                  {/* Data Export */}
                  <div>
                    <Heading as="h3" size="list" className="text-[1.375rem]">
                      Daten exportieren
                    </Heading>
                    <p className="text-ink dark:text-night-text mt-3 max-w-[65ch] text-base leading-relaxed">
                      Laden Sie alle Ihre gespeicherten Daten herunter (DSGVO
                      Art. 20 - Recht auf Datenübertragbarkeit). Die Daten
                      werden im JSON-Format bereitgestellt.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        setIsExportingData(true);
                        try {
                          const response = await fetch(
                            `/api/users/${session?.user?.id}/export`,
                          );
                          if (!response.ok) {
                            throw new Error("Export fehlgeschlagen");
                          }
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `meine-daten-export-${new Date().toISOString().split("T")[0]}.json`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                          toast.success("Daten erfolgreich exportiert!");
                        } catch (error) {
                          toast.error(
                            "Fehler beim Exportieren der Daten. Bitte versuchen Sie es erneut.",
                          );
                          console.error("Export error:", error);
                        } finally {
                          setIsExportingData(false);
                        }
                      }}
                      disabled={isExportingData}
                      className={cn(BTN_PRIMARY, "mt-5")}
                    >
                      <Download className="h-4 w-4" aria-hidden />
                      {isExportingData ? "Exportiere..." : "Daten exportieren"}
                    </button>
                  </div>

                  {/* Saved Participants */}
                  <div className="border-rule dark:border-night-rule border-t pt-8">
                    <Heading as="h3" size="list" className="text-[1.375rem]">
                      Gespeicherte Teilnehmer
                    </Heading>
                    <p className="text-dark dark:text-night-muted mt-2 text-sm">
                      Teilnehmer, die Sie bei Kursanmeldungen gespeichert haben
                    </p>

                    {savedParticipantsLoading ? (
                      <p className="text-dark dark:text-night-muted mt-4 text-sm">
                        Lädt...
                      </p>
                    ) : savedParticipants && savedParticipants.length > 0 ? (
                      <ul className="border-rule dark:border-night-rule mt-4 border-t">
                        {savedParticipants.map((participant) => (
                          <li
                            key={participant.id}
                            className="border-rule dark:border-night-rule flex items-center justify-between gap-3 border-b py-3"
                          >
                            <div className="min-w-0">
                              <p className="text-ink dark:text-night-text font-semibold">
                                {participant.firstName} {participant.lastName}
                              </p>
                              <p className="text-dark dark:text-night-muted text-xs">
                                {new Date(
                                  participant.birthDate,
                                ).toLocaleDateString("de-DE")}
                                {participant.city && ` · ${participant.city}`}
                                {participant.instrument &&
                                  ` · ${participant.instrument}`}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Möchten Sie ${participant.firstName} ${participant.lastName} wirklich entfernen?`,
                                  )
                                ) {
                                  deleteSavedParticipant.mutate({
                                    id: participant.id,
                                  });
                                }
                              }}
                              disabled={deleteSavedParticipant.isPending}
                              className="text-ink hover:bg-ink hover:text-paper dark:text-night-text dark:hover:bg-night-text dark:hover:text-night inline-flex h-11 w-11 shrink-0 items-center justify-center transition-colors disabled:opacity-50"
                              title="Teilnehmer entfernen"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                              <span className="sr-only">
                                {participant.firstName} {participant.lastName}{" "}
                                entfernen
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-dark dark:text-night-muted mt-4 text-sm">
                        Noch keine Teilnehmer gespeichert. Sie können Teilnehmer
                        bei der Anmeldung zu Kursen speichern.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Danger Zone Tab */}
            {activeTab === "danger" && (
              <div className="space-y-10">
                <div>
                  <Heading as="h2" size="list" rule>
                    Gefahrenzone
                  </Heading>
                  <p className="text-dark dark:text-night-muted mt-3 text-sm">
                    Diese Aktionen können nicht rückgängig gemacht werden
                  </p>
                </div>

                <Note tone="error" title="Konto löschen" titleAs="h3">
                  <p>
                    Wenn Sie Ihr Konto löschen, werden alle Ihre Daten
                    unwiderruflich gelöscht, sofern keine gesetzlichen
                    Aufbewahrungspflichten bestehen. Falls Sie aktive
                    Mitgliedschaften haben oder Inhalte erstellt haben, müssen
                    diese zuerst entfernt oder neu zugewiesen werden.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowDeleteAccountModal(true)}
                    className={cn(BTN_OUTLINE, "mt-5")}
                  >
                    Konto löschen
                  </button>
                </Note>
              </div>
            )}
          </form>
        </div>

        {/* Unsaved Changes Modal */}
        {pendingTab !== null && (
          <ScrollableModal onBackdropClick={() => setPendingTab(null)}>
            <ScrollableModalCard
              maxW="md"
              className="border-ink dark:border-night-text rounded-none! border-2 shadow-none!"
            >
              <ScrollableModalBody>
                <Heading as="h2" size="list" className="text-[1.375rem]">
                  Ungespeicherte Änderungen
                </Heading>
                <p className="text-ink dark:text-night-text mt-4">
                  Du hast ungespeicherte Änderungen. Wenn du den Tab wechselst,
                  ohne zu speichern, gehen deine Änderungen verloren.
                </p>
              </ScrollableModalBody>
              <ScrollableModalFooter className="border-rule dark:border-night-rule">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setPendingTab(null)}
                    className={cn(BTN_OUTLINE, "flex-1")}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (savedState) {
                        setFormData({ ...savedState.formData });
                        setPreferences({ ...savedState.preferences });
                      }
                      setActiveTab(pendingTab);
                      setPendingTab(null);
                    }}
                    className={cn(BTN_PRIMARY, "flex-1")}
                  >
                    Änderungen verwerfen
                  </button>
                </div>
              </ScrollableModalFooter>
            </ScrollableModalCard>
          </ScrollableModal>
        )}

        {/* Delete Account Modal */}
        {showDeleteAccountModal && (
          <ScrollableModal>
            <ScrollableModalCard
              maxW="md"
              className="border-ink dark:border-night-text rounded-none! border-2 shadow-none!"
            >
              <ScrollableModalBody>
                <Heading as="h2" size="list" className="text-[1.375rem]">
                  Konto wirklich löschen?
                </Heading>
                <p className="text-ink dark:text-night-text mt-4">
                  Diese Aktion kann nicht rückgängig gemacht werden. Alle Ihre
                  Daten werden unwiderruflich gelöscht, sofern keine
                  gesetzlichen Aufbewahrungspflichten bestehen.
                </p>
                <p className="text-ink dark:text-night-text mt-4 font-semibold">
                  Hinweis: Falls Sie aktive Mitgliedschaften haben oder Inhalte
                  erstellt haben, müssen diese zuerst entfernt oder neu
                  zugewiesen werden. Bitte kontaktieren Sie den Support, falls
                  Sie Hilfe benötigen.
                </p>
                <div className="mt-5">
                  <FieldLabel htmlFor="delete-email-confirm">
                    Geben Sie Ihre E-Mail-Adresse ein, um zu bestätigen:
                  </FieldLabel>
                  <input
                    id="delete-email-confirm"
                    type="email"
                    value={deleteEmailConfirm}
                    onChange={(e) => setDeleteEmailConfirm(e.target.value)}
                    placeholder={profile?.email || ""}
                    className={fieldControlClasses}
                  />
                </div>
              </ScrollableModalBody>
              <ScrollableModalFooter className="border-rule dark:border-night-rule">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteAccountModal(false);
                      setDeleteEmailConfirm("");
                    }}
                    className={cn(BTN_OUTLINE, "flex-1")}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (deleteEmailConfirm !== profile?.email) {
                        toast.error("Die E-Mail-Adresse stimmt nicht überein.");
                        return;
                      }

                      try {
                        await deleteMyAccount.mutateAsync({
                          confirmEmail: deleteEmailConfirm,
                        });
                        toast.success(
                          "Ihr Konto wurde erfolgreich gelöscht. Sie werden jetzt abgemeldet.",
                        );
                        // Logout and redirect
                        setTimeout(() => {
                          window.location.href = "/";
                        }, 2000);
                      } catch (error: unknown) {
                        const errorMessage =
                          error instanceof Error
                            ? error.message
                            : "Fehler beim Löschen des Kontos";
                        toast.error(errorMessage);
                      }
                    }}
                    disabled={deleteMyAccount.isPending}
                    className={cn(BTN_PRIMARY, "flex-1")}
                  >
                    {deleteMyAccount.isPending
                      ? "Löschen..."
                      : "Endgültig löschen"}
                  </button>
                </div>
              </ScrollableModalFooter>
            </ScrollableModalCard>
          </ScrollableModal>
        )}
      </PageSection>
    </PublicPage>
  );
}

function TrackingConsentSection() {
  const ctx = useTrackingPreference();
  if (!ctx) return null;
  const { preference, setPreference } = ctx;

  return (
    <div id="nutzungsstatistik">
      <p className={FIELD_LABEL_CLASS}>Nutzungsstatistik</p>
      <p className="text-dark dark:text-night-muted mt-1 mb-3 text-xs">
        Seitenaufrufe werden immer anonym erfasst, um die Webseite zu
        verbessern. Optional können Aufrufe Ihrem Konto zugeordnet werden (nur
        wenn Sie eingeloggt sind).
      </p>
      <div
        role="group"
        aria-label="Nutzungsstatistik"
        className="flex flex-col gap-2 sm:flex-row"
      >
        <button
          type="button"
          onClick={() => setPreference("anonymous")}
          aria-pressed={preference === "anonymous"}
          className={choiceButtonClass(preference === "anonymous")}
        >
          Nur anonym
        </button>
        <button
          type="button"
          onClick={() => setPreference("anonymous_and_user")}
          aria-pressed={preference === "anonymous_and_user"}
          className={choiceButtonClass(preference === "anonymous_and_user")}
        >
          Anonym + Zuordnung zu meinem Konto
        </button>
      </div>
      <p className="text-dark dark:text-night-muted mt-3 text-xs">
        Aktuelle Einstellung:{" "}
        {preference === "anonymous"
          ? "Nur anonym"
          : "Anonym + Zuordnung zu meinem Konto"}
      </p>
    </div>
  );
}
