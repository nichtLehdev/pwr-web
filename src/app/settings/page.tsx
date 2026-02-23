"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, changePassword } from "@/lib/auth";
import { api } from "@/trpc/react";
import { getErrorMessage } from "@/lib/utils";
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
  ArrowRight,
  Download,
  Save,
  Moon,
  Sun,
  Monitor,
  List,
} from "lucide-react";
import { useTrackingConsent } from "@/app/_components/stats/tracking-consent-context";
import { Input, Label } from "@/app/_components/ui";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";

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
      setFormData({
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
      });

      if (profile.preferences) {
        try {
          const parsed =
            typeof profile.preferences === "string"
              ? JSON.parse(profile.preferences)
              : profile.preferences;
          const newPreferences = { ...defaultPreferences, ...parsed };
          setPreferences(newPreferences);
          if (newPreferences.theme) {
            setCurrentTheme(newPreferences.theme);
          }
        } catch {
          setPreferences(defaultPreferences);
        }
      } else {
        setPreferences({ ...defaultPreferences, theme: currentTheme });
      }
      hasInitializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, setCurrentTheme]);

  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.push("/login");
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
    } finally {
      setIsLoading(false);
    }
  };

  if (sessionLoading || profileLoading) {
    return (
      <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
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

  return (
    <div className="bg-background-secondary dark:bg-dark-background-secondary min-h-[calc(100vh-4rem)]">
      <div className="container mx-auto max-w-7xl overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-dark dark:text-dark-text text-3xl font-bold">
            Einstellungen
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Verwalte dein Profil und deine persönlichen Daten
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-3">
            <nav className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
              <ul className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <li key={tab.id}>
                      <button
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                          activeTab === tab.id
                            ? "bg-primary text-white"
                            : "text-dark dark:text-dark-text hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {tab.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9">
            <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white shadow-sm">
              <form onSubmit={handleSubmit}>
                {/* Profile Tab */}
                {activeTab === "profile" && (
                  <div className="space-y-6 p-4 sm:p-6">
                    <div>
                      <h2 className="text-dark dark:text-dark-text mb-1 text-xl font-semibold">
                        Profil
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Verwalte deine persönlichen Informationen
                      </p>
                    </div>

                    {/* Profile Image */}
                    <div className="space-y-4">
                      <div>
                        <Label>Profilbild</Label>
                        <div className="mt-2">
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
                        </div>
                        {profile && (
                          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                              <p className="text-xs text-amber-700 dark:text-amber-300">
                                <strong>Hinweis:</strong> Dein Profilbild wird
                                auch auf öffentlichen Seiten angezeigt (z.B.
                                Team, Bezirke, Posaunenrat).
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Personal Data */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="firstName">Vorname</Label>
                          <Input
                            id="firstName"
                            name="firstName"
                            type="text"
                            value={formData.firstName}
                            maxLength={100}
                            onChange={handleChange}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="lastName">Nachname</Label>
                          <Input
                            id="lastName"
                            name="lastName"
                            type="text"
                            value={formData.lastName}
                            maxLength={100}
                            onChange={handleChange}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="birthDate">Geburtsdatum</Label>
                          <Input
                            id="birthDate"
                            name="birthDate"
                            type="date"
                            value={formData.birthDate}
                            onChange={(e) => {
                              handleChange(e);
                              if (!e.target.value) {
                                setBirthdateError("");
                              } else if (
                                new Date(e.target.value) >= new Date()
                              ) {
                                setBirthdateError(
                                  "Geburtsdatum muss in der Vergangenheit liegen",
                                );
                              } else {
                                setBirthdateError("");
                              }
                            }}
                            max={new Date().toISOString().split("T")[0]}
                            error={!!birthdateError}
                            className="mt-1"
                          />
                          {birthdateError && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                              {birthdateError}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="displayName">Anzeigename</Label>
                          <Input
                            id="displayName"
                            name="displayName"
                            type="text"
                            value={formData.displayName}
                            maxLength={100}
                            onChange={handleChange}
                            placeholder="Wird anderen Nutzern angezeigt"
                            className="mt-1"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Optional. Falls leer, wird der vollständige Name
                            verwendet.
                          </p>
                        </div>
                      </div>

                      {/* Address */}
                      <div className="space-y-4">
                        <h3 className="text-dark dark:text-dark-text text-base font-semibold">
                          Adresse
                        </h3>
                        <div>
                          <Label htmlFor="street">Straße und Hausnummer</Label>
                          <Input
                            id="street"
                            name="street"
                            type="text"
                            value={formData.street}
                            onChange={handleChange}
                            className="mt-1"
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <div>
                            <Label htmlFor="zipCode">PLZ</Label>
                            <Input
                              id="zipCode"
                              name="zipCode"
                              type="text"
                              value={formData.zipCode}
                              onChange={handleChange}
                              maxLength={20}
                              className="mt-1 w-full"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <Label htmlFor="city">Stadt</Label>
                            <Input
                              id="city"
                              name="city"
                              type="text"
                              value={formData.city}
                              maxLength={100}
                              onChange={handleChange}
                              className="mt-1 w-full"
                            />
                          </div>
                        </div>

                        {/* Privacy: what to show on public pages */}
                        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/30">
                          <p className="text-dark dark:text-dark-text text-sm font-medium">
                            Öffentliche Sichtbarkeit
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Lege fest, ob deine Kontaktdaten auf öffentlichen
                            Seiten (z. B. Vorstand, Bezirke) angezeigt werden.
                          </p>
                          <div className="flex items-center gap-3">
                            <input
                              id="showAddressPublicly"
                              type="checkbox"
                              checked={
                                preferences.showAddressPublicly !== false
                              }
                              onChange={(e) =>
                                setPreferences((prev) => ({
                                  ...prev,
                                  showAddressPublicly: e.target.checked,
                                }))
                              }
                              className="focus:ring-primary text-primary h-4 w-4 rounded border-gray-300 focus:ring-2"
                            />
                            <Label
                              htmlFor="showAddressPublicly"
                              className="cursor-pointer text-sm font-normal"
                            >
                              Adresse anzeigen
                            </Label>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              id="showPhonePublicly"
                              type="checkbox"
                              checked={preferences.showPhonePublicly !== false}
                              onChange={(e) =>
                                setPreferences((prev) => ({
                                  ...prev,
                                  showPhonePublicly: e.target.checked,
                                }))
                              }
                              className="focus:ring-primary text-primary h-4 w-4 rounded border-gray-300 focus:ring-2"
                            />
                            <Label
                              htmlFor="showPhonePublicly"
                              className="cursor-pointer text-sm font-normal"
                            >
                              Telefonnummer anzeigen
                            </Label>
                          </div>
                        </div>
                      </div>

                      {/* Bio */}
                      <div>
                        <Label htmlFor="bio">Biografie</Label>
                        <textarea
                          id="bio"
                          name="bio"
                          rows={4}
                          value={formData.bio}
                          onChange={handleChange}
                          placeholder="Erzähl etwas über dich..."
                          maxLength={2000}
                          className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text mt-1 block w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:ring-1 focus:outline-none"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {formData.bio.length}/2000 Zeichen
                        </p>
                      </div>

                      {/* Save Button */}
                      <div className="flex justify-end border-t border-gray-200 pt-4 dark:border-gray-700">
                        <button
                          type="submit"
                          disabled={isLoading || updateProfile.isPending}
                          className="bg-primary hover:bg-primary-dark inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-2.5 font-semibold text-white shadow-lg transition-colors disabled:opacity-50 sm:w-auto"
                        >
                          <Save className="h-4 w-4" />
                          {isLoading || updateProfile.isPending
                            ? "Speichert..."
                            : "Änderungen speichern"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Account Tab */}
                {activeTab === "account" && (
                  <div className="space-y-6 p-6">
                    <div>
                      <h2 className="text-dark dark:text-dark-text mb-1 text-xl font-semibold">
                        Konto
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Verwalte deine Kontodaten und Sicherheitseinstellungen
                      </p>
                    </div>

                    <div className="space-y-6">
                      {/* Username */}
                      <div>
                        <Label htmlFor="username">Benutzername</Label>
                        <Input
                          id="username"
                          name="username"
                          type="text"
                          value={formData.username}
                          minLength={3}
                          maxLength={30}
                          pattern="[a-zA-Z0-9_.-]+"
                          onChange={handleChange}
                          onBlur={checkUsernameAvailability}
                          className={`mt-1 ${
                            usernameStatus.available === true
                              ? "border-green-500"
                              : usernameStatus.available === false
                                ? "border-red-500"
                                : ""
                          }`}
                        />
                        {usernameStatus.checking ? (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Überprüfe...
                          </p>
                        ) : usernameStatus.message ? (
                          <p
                            className={`mt-1 text-xs ${
                              usernameStatus.available
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {usernameStatus.message}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Kann für die Anmeldung verwendet werden
                          </p>
                        )}
                      </div>

                      {/* Email */}
                      <div>
                        <Label htmlFor="email">E-Mail-Adresse</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          disabled
                          className="mt-1 cursor-not-allowed bg-gray-100 dark:bg-gray-800"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Die E-Mail-Adresse kann derzeit nicht geändert werden
                        </p>
                      </div>

                      {/* Phone */}
                      <div>
                        <Label htmlFor="phone">Telefonnummer</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="+49 123 456789"
                          className="mt-1"
                        />
                      </div>

                      {/* Password Change */}
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/30">
                        <h3 className="text-dark dark:text-dark-text mb-4 text-base font-semibold">
                          Passwort ändern
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="currentPassword">
                              Aktuelles Passwort
                            </Label>
                            <Input
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
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="newPassword">Neues Passwort</Label>
                            <Input
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
                              className="mt-1"
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Mindestens 8 Zeichen
                            </p>
                          </div>

                          <div>
                            <Label htmlFor="confirmPassword">
                              Neues Passwort bestätigen
                            </Label>
                            <Input
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
                              className="mt-1"
                            />
                          </div>

                          {passwordError && (
                            <div className="rounded-md border-l-4 border-red-500 bg-red-50 p-3 dark:border-red-400 dark:bg-red-900/20">
                              <p className="text-sm text-red-800 dark:text-red-300">
                                {passwordError}
                              </p>
                            </div>
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
                                  toast.success(
                                    "Passwort erfolgreich geändert",
                                  );
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
                            className="bg-primary hover:bg-primary-dark rounded-lg px-4 py-2 font-semibold text-white transition-colors disabled:opacity-50"
                          >
                            {isChangingPassword
                              ? "Wird geändert..."
                              : "Passwort ändern"}
                          </button>
                        </div>
                      </div>

                      {/* 2FA */}
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/30">
                        <h3 className="text-dark dark:text-dark-text mb-2 text-base font-semibold">
                          Zwei-Faktor-Authentifizierung (2FA)
                        </h3>
                        {((profile as { twoFactorEnabled?: boolean })
                          ?.twoFactorEnabled ?? false) ? (
                          <div className="space-y-3">
                            <div className="rounded-md border-l-4 border-green-500 bg-green-50 p-3 dark:border-green-400 dark:bg-green-900/20">
                              <p className="text-sm text-green-800 dark:text-green-300">
                                <strong>2FA ist aktiviert</strong> - Dein Konto
                                ist zusätzlich geschützt.
                              </p>
                            </div>
                            <Link
                              href="/settings/two-factor"
                              className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary inline-flex items-center gap-2 text-sm font-medium"
                            >
                              2FA verwalten
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Zwei-Faktor-Authentifizierung fügt eine
                              zusätzliche Sicherheitsebene zu deinem Konto
                              hinzu.
                            </p>
                            <Link
                              href="/settings/two-factor"
                              className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary inline-flex items-center gap-2 text-sm font-medium"
                            >
                              2FA aktivieren
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Preferences Tab */}
                {activeTab === "preferences" && (
                  <div className="space-y-6 p-6">
                    <div>
                      <h2 className="text-dark dark:text-dark-text mb-1 text-xl font-semibold">
                        Einstellungen
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Passe die Website an deine Vorlieben an
                      </p>
                    </div>

                    <div className="space-y-6">
                      {/* Termine Default View */}
                      <div>
                        <Label>Standard-Ansicht für Termine</Label>
                        <p className="mt-1 mb-3 text-xs text-gray-500 dark:text-gray-400">
                          Wähle, wie die Termine-Seite standardmäßig angezeigt
                          werden soll.
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setPreferences((prev) => ({
                                ...prev,
                                termineDefaultView: "list",
                              }))
                            }
                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                              preferences.termineDefaultView === "list"
                                ? "bg-primary text-white"
                                : "text-dark dark:text-dark-text dark:border-dark-border dark:bg-dark-background-secondary dark:hover:bg-dark-background border border-gray-300 bg-white hover:bg-gray-50"
                            }`}
                          >
                            <List className="h-5 w-5" />
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
                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                              preferences.termineDefaultView === "calendar"
                                ? "bg-primary text-white"
                                : "text-dark dark:text-dark-text dark:border-dark-border dark:bg-dark-background-secondary dark:hover:bg-dark-background border border-gray-300 bg-white hover:bg-gray-50"
                            }`}
                          >
                            <Calendar className="h-5 w-5" />
                            Kalender
                          </button>
                        </div>
                      </div>

                      {/* Theme */}
                      <div>
                        <Label>Design-Theme</Label>
                        <p className="mt-1 mb-3 text-xs text-gray-500 dark:text-gray-400">
                          Wähle dein bevorzugtes Design-Theme für die Website.
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const newTheme: "light" | "dark" | "system" =
                                "light";
                              setPreferences((prev) => ({
                                ...prev,
                                theme: newTheme,
                              }));
                              setCurrentTheme(newTheme);
                            }}
                            className={`flex flex-col items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                              preferences.theme === "light" ||
                              (!preferences.theme && currentTheme === "light")
                                ? "bg-primary text-white"
                                : "text-dark dark:text-dark-text dark:border-dark-border dark:bg-dark-background-secondary dark:hover:bg-dark-background border border-gray-300 bg-white hover:bg-gray-50"
                            }`}
                          >
                            <Sun className="h-5 w-5" />
                            Hell
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newTheme: "light" | "dark" | "system" =
                                "dark";
                              setPreferences((prev) => ({
                                ...prev,
                                theme: newTheme,
                              }));
                              setCurrentTheme(newTheme);
                            }}
                            className={`flex flex-col items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                              preferences.theme === "dark" ||
                              (!preferences.theme && currentTheme === "dark")
                                ? "bg-primary text-white"
                                : "text-dark dark:text-dark-text dark:border-dark-border dark:bg-dark-background-secondary dark:hover:bg-dark-background border border-gray-300 bg-white hover:bg-gray-50"
                            }`}
                          >
                            <Moon className="h-5 w-5" />
                            Dunkel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newTheme: "light" | "dark" | "system" =
                                "system";
                              setPreferences((prev) => ({
                                ...prev,
                                theme: newTheme,
                              }));
                              setCurrentTheme(newTheme);
                            }}
                            className={`flex flex-col items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                              preferences.theme === "system" ||
                              (!preferences.theme && currentTheme === "system")
                                ? "bg-primary text-white"
                                : "text-dark dark:text-dark-text dark:border-dark-border dark:bg-dark-background-secondary dark:hover:bg-dark-background border border-gray-300 bg-white hover:bg-gray-50"
                            }`}
                          >
                            <Monitor className="h-5 w-5" />
                            System
                          </button>
                        </div>
                      </div>

                      {/* Tracking Consent */}
                      <TrackingConsentSection />

                      {/* Save Button */}
                      <div className="flex justify-end border-t border-gray-200 pt-4 dark:border-gray-700">
                        <button
                          type="submit"
                          disabled={isLoading || updateProfile.isPending}
                          className="bg-primary hover:bg-primary-dark inline-flex items-center gap-2 rounded-lg px-6 py-2.5 font-semibold text-white shadow-lg transition-colors disabled:opacity-50"
                        >
                          <Save className="h-4 w-4" />
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
                  <div className="space-y-6 p-6">
                    <div>
                      <h2 className="text-dark dark:text-dark-text mb-1 text-xl font-semibold">
                        Meine Daten
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Exportiere deine Daten oder verwalte gespeicherte
                        Teilnehmer
                      </p>
                    </div>

                    <div className="space-y-6">
                      {/* Data Export */}
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                        <div className="flex items-start gap-3">
                          <Download className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                          <div className="flex-1">
                            <h3 className="text-dark dark:text-dark-text mb-1 font-semibold">
                              Daten exportieren
                            </h3>
                            <p className="mb-3 text-sm text-gray-700 dark:text-gray-300">
                              Laden Sie alle Ihre gespeicherten Daten herunter
                              (DSGVO Art. 20 - Recht auf Datenübertragbarkeit).
                              Die Daten werden im JSON-Format bereitgestellt.
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
                                  toast.success(
                                    "Daten erfolgreich exportiert!",
                                  );
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
                              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                            >
                              <Download className="h-4 w-4" />
                              {isExportingData
                                ? "Exportiere..."
                                : "Daten exportieren"}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Saved Participants */}
                      <div>
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <h3 className="text-dark dark:text-dark-text font-semibold">
                              Gespeicherte Teilnehmer
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Teilnehmer, die Sie bei Kursanmeldungen
                              gespeichert haben
                            </p>
                          </div>
                        </div>
                        {savedParticipantsLoading ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Lädt...
                          </p>
                        ) : savedParticipants &&
                          savedParticipants.length > 0 ? (
                          <div className="space-y-2">
                            {savedParticipants.map((participant) => (
                              <div
                                key={participant.id}
                                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                              >
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 dark:text-gray-100">
                                    {participant.firstName}{" "}
                                    {participant.lastName}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(
                                      participant.birthDate,
                                    ).toLocaleDateString("de-DE")}
                                    {participant.city &&
                                      ` • ${participant.city}`}
                                    {participant.instrument &&
                                      ` • ${participant.instrument}`}
                                  </div>
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
                                  className="ml-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:bg-gray-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                  title="Teilnehmer entfernen"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Noch keine Teilnehmer gespeichert. Sie können
                            Teilnehmer bei der Anmeldung zu Kursen speichern.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Danger Zone Tab */}
                {activeTab === "danger" && (
                  <div className="space-y-6 p-6">
                    <div>
                      <h2 className="text-dark dark:text-dark-text mb-1 text-xl font-semibold">
                        Gefahrenzone
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Diese Aktionen können nicht rückgängig gemacht werden
                      </p>
                    </div>

                    <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                        <div className="flex-1">
                          <h3 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-300">
                            Konto löschen
                          </h3>
                          <p className="mb-4 text-sm text-red-700 dark:text-red-400">
                            Wenn Sie Ihr Konto löschen, werden alle Ihre Daten
                            unwiderruflich gelöscht, sofern keine gesetzlichen
                            Aufbewahrungspflichten bestehen. Falls Sie aktive
                            Mitgliedschaften haben oder Inhalte erstellt haben,
                            müssen diese zuerst entfernt oder neu zugewiesen
                            werden.
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowDeleteAccountModal(true)}
                            className="rounded-lg border border-red-600 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-600 hover:text-white dark:border-red-500 dark:text-red-500 dark:hover:bg-red-600 dark:hover:text-white"
                          >
                            Konto löschen
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Delete Account Modal */}
        {showDeleteAccountModal && (
          <ScrollableModal>
            <ScrollableModalCard maxW="md">
              <ScrollableModalBody>
                <h3 className="text-lg font-bold text-red-800 dark:text-red-300">
                  Konto wirklich löschen?
                </h3>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  Diese Aktion kann nicht rückgängig gemacht werden. Alle Ihre
                  Daten werden unwiderruflich gelöscht, sofern keine
                  gesetzlichen Aufbewahrungspflichten bestehen.
                </p>
                <p className="mt-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Hinweis: Falls Sie aktive Mitgliedschaften haben oder Inhalte
                  erstellt haben, müssen diese zuerst entfernt oder neu
                  zugewiesen werden. Bitte kontaktieren Sie den Support, falls
                  Sie Hilfe benötigen.
                </p>
                <div className="mt-4">
                  <Label htmlFor="delete-email-confirm">
                    Geben Sie Ihre E-Mail-Adresse ein, um zu bestätigen:
                  </Label>
                  <Input
                    id="delete-email-confirm"
                    type="email"
                    value={deleteEmailConfirm}
                    onChange={(e) => setDeleteEmailConfirm(e.target.value)}
                    placeholder={profile?.email || ""}
                    className="mt-2"
                  />
                </div>
              </ScrollableModalBody>
              <ScrollableModalFooter>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteAccountModal(false);
                      setDeleteEmailConfirm("");
                    }}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
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
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
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
      </div>
    </div>
  );
}

function TrackingConsentSection() {
  const ctx = useTrackingConsent();
  if (!ctx) return null;
  const { consent, setConsent } = ctx;
  const current = consent ?? "none";
  const hasChosen = consent !== null;

  return (
    <div>
      <Label>Nutzungsstatistik</Label>
      <p className="mt-1 mb-3 text-xs text-gray-500 dark:text-gray-400">
        Wir erfassen anonym die Nutzung unserer Webseite (Seitenaufrufe), um sie
        zu verbessern. Es werden keine personenbezogenen Daten gespeichert,
        sofern Sie es nicht erlauben.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => setConsent("none")}
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            current === "none"
              ? "border-primary bg-primary text-white"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          }`}
        >
          Ablehnen
        </button>
        <button
          type="button"
          onClick={() => setConsent("anonymous")}
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            current === "anonymous"
              ? "border-primary bg-primary text-white"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          }`}
        >
          Nur anonym
        </button>
        <button
          type="button"
          onClick={() => setConsent("anonymous_and_user")}
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            current === "anonymous_and_user"
              ? "border-primary bg-primary text-white"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          }`}
        >
          Anonym + Zuordnung zu meinem Konto
        </button>
      </div>
      {hasChosen && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Aktuelle Einstellung:{" "}
          {current === "none"
            ? "Ablehnen"
            : current === "anonymous"
              ? "Nur anonym"
              : "Anonym + Zuordnung zu meinem Konto"}
        </p>
      )}
    </div>
  );
}
