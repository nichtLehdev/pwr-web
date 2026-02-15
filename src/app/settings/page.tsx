"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, changePassword } from "@/lib/auth";
import { api } from "@/trpc/react";
import { UserRole } from "~/generated/prisma/enums";
import { getErrorMessage } from "@/lib/utils";
import ProfileImageUpload from "./_components/profile-image-upload";
import { useToast } from "@/app/_components/ui/toast";
import { useTheme } from "@/app/_components/general/theme-provider";
import {
  ChevronDown,
  ImageIcon,
  User,
  Key,
  MapPin,
  Menu,
  Settings,
  Calendar,
  AlertTriangle,
  Users,
  Trash2,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { useTrackingConsent } from "@/app/_components/stats/tracking-consent-context";
import { Input, Label } from "@/app/_components/ui";

function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="dark:border-dark-border overflow-hidden rounded-lg border border-gray-200">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="dark:hover:bg-dark-background-secondary flex w-full items-center justify-between px-4 py-4 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <span className="text-primary">{icon}</span>
          <h2 className="text-dark dark:text-dark-text text-lg font-semibold">
            {title}
          </h2>
        </div>
        <ChevronDown
          className={`text-dark dark:text-dark-text h-5 w-5 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`transition-all duration-200 ease-in-out ${
          isOpen
            ? "max-h-[1000px] opacity-100"
            : "max-h-0 overflow-hidden opacity-0"
        }`}
      >
        <div className="dark:border-dark-border border-t border-gray-200 px-4 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

interface UserPreferences {
  termineDefaultView: "list" | "calendar";
  theme?: "light" | "dark" | "system";
}

const defaultPreferences: UserPreferences = {
  termineDefaultView: "list",
  theme: "system",
};

function TrackingConsentSection() {
  const ctx = useTrackingConsent();
  if (!ctx) return null;
  const { consent, setConsent } = ctx;
  const current = consent ?? "none";
  const hasChosen = consent !== null;

  return (
    <CollapsibleSection
      title="Nutzungsstatistik"
      defaultOpen={false}
      icon={<BarChart3 className="h-5 w-5" />}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Wir erfassen anonym die Nutzung der Webseite (Seitenaufrufe), um sie
          zu verbessern. Du kannst die Erfassung ablehnen, nur anonym zulassen
          oder Aufrufe deinem Konto zuordnen (nur wenn du eingeloggt bist).
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setConsent("none")}
            className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
              current === "none"
                ? "border-primary bg-primary/10 text-primary dark:border-primary dark:bg-primary/25 dark:text-primary-light"
                : "dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text dark:hover:bg-dark-surface border border-gray-300 bg-white hover:bg-gray-50"
            }`}
          >
            <span>Ablehnen</span>
            {current === "none" && hasChosen && (
              <span className="text-primary dark:text-primary-light text-xs">
                Aktuell
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setConsent("anonymous")}
            className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
              current === "anonymous"
                ? "border-primary bg-primary/10 text-primary dark:border-primary dark:bg-primary/25 dark:text-primary-light"
                : "dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text dark:hover:bg-dark-surface border border-gray-300 bg-white hover:bg-gray-50"
            }`}
          >
            <span>Nur anonym</span>
            {current === "anonymous" && hasChosen && (
              <span className="text-primary dark:text-primary-light text-xs">
                Aktuell
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setConsent("anonymous_and_user")}
            className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
              current === "anonymous_and_user"
                ? "border-primary bg-primary/10 text-primary dark:border-primary dark:bg-primary/25 dark:text-primary-light"
                : "dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text dark:hover:bg-dark-surface border border-gray-300 bg-white hover:bg-gray-50"
            }`}
          >
            <span>Anonym + Zuordnung zu meinem Konto</span>
            {current === "anonymous_and_user" && hasChosen && (
              <span className="text-primary dark:text-primary-light text-xs">
                Aktuell
              </span>
            )}
          </button>
        </div>
      </div>
    </CollapsibleSection>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const utils = api.useUtils();
  const toast = useToast();
  const { theme: currentTheme, setTheme: setCurrentTheme } = useTheme();

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
    } else if (profile && hasInitializedRef.current) {
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
        <div className="text-dark dark:text-dark-text">Lädt...</div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="bg-background-secondary dark:bg-dark-background-secondary min-h-[calc(100vh-4rem)] px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-dark dark:text-dark-text text-3xl font-bold">
            Einstellungen
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Verwalte dein Profil und deine persönlichen Daten
          </p>
        </div>

        {/* Profile Card */}
        <div className="dark:bg-dark-surface rounded-lg bg-white p-6 shadow-lg md:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Section: Profile Image */}
            <CollapsibleSection
              title="Profilbild"
              defaultOpen={true}
              icon={<ImageIcon className="h-5 w-5" />}
            >
              <ProfileImageUpload
                currentImage={profile?.profileImage}
                onImageUploaded={(mediaId) => {
                  setFormData((prev) => ({ ...prev, profileImageId: mediaId }));
                }}
                onImageRemoved={() => {
                  setFormData((prev) => ({ ...prev, profileImageId: null }));
                }}
              />
              {profile?.role && profile.role !== UserRole.USER && (
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      <strong>Hinweis:</strong> Dein Profilbild wird auch auf
                      öffentlichen Seiten angezeigt (z.B. Team, Bezirke,
                      Posaunenrat). Eine Änderung hier aktualisiert das Bild
                      automatisch auf allen Seiten.
                    </p>
                  </div>
                </div>
              )}
            </CollapsibleSection>

            {/* Section: Personal Data */}
            <CollapsibleSection
              title="Persönliche Daten"
              defaultOpen={false}
              icon={<User className="h-5 w-5" />}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="firstName">Vorname</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    maxLength={100}
                    onChange={handleChange}
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
                      } else if (new Date(e.target.value) >= new Date()) {
                        setBirthdateError(
                          "Geburtsdatum muss in der Vergangenheit liegen",
                        );
                      } else {
                        setBirthdateError("");
                      }
                    }}
                    max={new Date().toISOString().split("T")[0]}
                    title="Geburtsdatum muss in der Vergangenheit liegen"
                    error={!!birthdateError}
                  />
                  {birthdateError && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {birthdateError}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label
                  htmlFor="displayName"
                  className="text-dark dark:text-dark-text mb-1 block text-sm font-medium"
                >
                  Anzeigename
                </label>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  value={formData.displayName}
                  maxLength={100}
                  onChange={handleChange}
                  placeholder="Wird anderen Nutzern angezeigt"
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:ring-1 focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Optional. Falls leer, wird der vollständige Name verwendet.
                </p>
              </div>
            </CollapsibleSection>

            {/* Section: Account */}
            <CollapsibleSection
              title="Konto"
              defaultOpen={false}
              icon={<Key className="h-5 w-5" />}
            >
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="username"
                    className="text-dark dark:text-dark-text mb-1 block text-sm font-medium"
                  >
                    Benutzername
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    minLength={3}
                    maxLength={30}
                    pattern="[a-zA-Z0-9_.-]+"
                    title="Buchstaben, Zahlen, Bindestrich, Unterstrich und Punkt erlaubt"
                    onChange={handleChange}
                    onBlur={checkUsernameAvailability}
                    className={`focus:border-primary focus:ring-primary dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-md border bg-white px-3 py-2 shadow-sm focus:ring-1 focus:outline-none ${
                      usernameStatus.available === true
                        ? "border-green-500"
                        : usernameStatus.available === false
                          ? "border-red-500"
                          : "dark:border-dark-border border-gray-300"
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

                <div>
                  <label
                    htmlFor="email"
                    className="text-dark dark:text-dark-text mb-1 block text-sm font-medium"
                  >
                    E-Mail-Adresse
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="dark:border-dark-border block w-full cursor-not-allowed rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-500 shadow-sm dark:bg-gray-800 dark:text-gray-400"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Die E-Mail-Adresse kann derzeit nicht geändert werden
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="text-dark dark:text-dark-text mb-1 block text-sm font-medium"
                  >
                    Telefonnummer
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+49 123 456789"
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:ring-1 focus:outline-none"
                  />
                </div>

                {/* Password Change Section */}
                <div className="dark:border-dark-border mt-6 border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-4 text-base font-semibold">
                    Passwort ändern
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="currentPassword"
                        className="text-dark dark:text-dark-text mb-1 block text-sm font-medium"
                      >
                        Aktuelles Passwort
                      </label>
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
                        className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:ring-1 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="newPassword"
                        className="text-dark dark:text-dark-text mb-1 block text-sm font-medium"
                      >
                        Neues Passwort
                      </label>
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
                        className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:ring-1 focus:outline-none"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Mindestens 8 Zeichen
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="confirmPassword"
                        className="text-dark dark:text-dark-text mb-1 block text-sm font-medium"
                      >
                        Neues Passwort bestätigen
                      </label>
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
                        className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:ring-1 focus:outline-none"
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
                      className="bg-primary hover:bg-primary-dark dark:bg-primary-light dark:hover:bg-primary rounded-lg px-4 py-2 font-semibold text-white shadow-lg transition-colors disabled:opacity-50"
                    >
                      {isChangingPassword
                        ? "Wird geändert..."
                        : "Passwort ändern"}
                    </button>
                  </div>
                </div>
              </div>

              {/* 2FA Section */}
              <div className="dark:border-dark-border mt-6 border-t border-gray-200 pt-6">
                <h3 className="text-dark dark:text-dark-text mb-4 text-base font-semibold">
                  Zwei-Faktor-Authentifizierung (2FA)
                </h3>
                <div className="space-y-4">
                  {((profile as { twoFactorEnabled?: boolean })
                    ?.twoFactorEnabled ?? false) ? (
                    <div className="space-y-4">
                      <div className="rounded-md border-l-4 border-green-500 bg-green-50 p-3 dark:border-green-400 dark:bg-green-900/20">
                        <p className="text-sm text-green-800 dark:text-green-300">
                          <strong>2FA ist aktiviert</strong> - Dein Konto ist
                          zusätzlich geschützt.
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
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Zwei-Faktor-Authentifizierung fügt eine zusätzliche
                        Sicherheitsebene zu deinem Konto hinzu.
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
            </CollapsibleSection>

            {/* Section: Address */}
            <CollapsibleSection
              title="Adresse"
              defaultOpen={false}
              icon={<MapPin className="h-5 w-5" />}
            >
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="street"
                    className="text-dark dark:text-dark-text mb-1 block text-sm font-medium"
                  >
                    Straße und Hausnummer
                  </label>
                  <input
                    id="street"
                    name="street"
                    type="text"
                    value={formData.street}
                    onChange={handleChange}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:ring-1 focus:outline-none"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label
                      htmlFor="zipCode"
                      className="text-dark dark:text-dark-text mb-1 block text-sm font-medium"
                    >
                      PLZ
                    </label>
                    <input
                      id="zipCode"
                      name="zipCode"
                      type="text"
                      value={formData.zipCode}
                      onChange={handleChange}
                      maxLength={20}
                      className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:ring-1 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label
                      htmlFor="city"
                      className="text-dark dark:text-dark-text mb-1 block text-sm font-medium"
                    >
                      Stadt
                    </label>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      value={formData.city}
                      maxLength={100}
                      onChange={handleChange}
                      className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:ring-1 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Section: Bio */}
            <CollapsibleSection
              title="Über mich"
              defaultOpen={false}
              icon={<Menu className="h-5 w-5" />}
            >
              <div>
                <label
                  htmlFor="bio"
                  className="text-dark dark:text-dark-text mb-1 block text-sm font-medium"
                >
                  Biografie
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Erzähl etwas über dich..."
                  maxLength={2000}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:ring-1 focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {formData.bio.length}/2000 Zeichen
                </p>
              </div>
            </CollapsibleSection>

            {/* Section: Site Preferences */}
            <CollapsibleSection
              title="Einstellungen"
              defaultOpen={false}
              icon={<Settings className="h-5 w-5" />}
            >
              <div className="space-y-4">
                <div>
                  <label className="text-dark dark:text-dark-text mb-2 block text-sm font-medium">
                    Standard-Ansicht für Termine
                  </label>
                  <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                    Wähle, wie die Termine-Seite standardmäßig angezeigt werden
                    soll.
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
                      <Menu className="h-5 w-5" />
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

                <div>
                  <label className="text-dark dark:text-dark-text mb-2 block text-sm font-medium">
                    Design-Theme
                  </label>
                  <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                    Wähle dein bevorzugtes Design-Theme für die Website.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const newTheme: "light" | "dark" | "system" = "light";
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
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                      Hell
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newTheme: "light" | "dark" | "system" = "dark";
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
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                        />
                      </svg>
                      Dunkel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newTheme: "light" | "dark" | "system" = "system";
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
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      System
                    </button>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Section: Nutzungsstatistik (Tracking Consent) */}
            <TrackingConsentSection />

            {/* Section: Saved Participants */}
            <CollapsibleSection
              title="Gespeicherte Teilnehmer"
              defaultOpen={false}
              icon={<Users className="h-5 w-5" />}
            >
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Hier können Sie gespeicherte Teilnehmer löschen, welche Sie
                  bei der Anmeldung zu Kursen gespeichert haben.
                </p>
                {savedParticipantsLoading ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Lädt...
                  </p>
                ) : savedParticipants && savedParticipants.length > 0 ? (
                  <div className="space-y-2">
                    {savedParticipants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {participant.firstName} {participant.lastName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(participant.birthDate).toLocaleDateString(
                              "de-DE",
                            )}
                            {participant.city && ` • ${participant.city}`}
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
                    Noch keine Teilnehmer gespeichert. Sie können Teilnehmer bei
                    der Anmeldung zu Kursen speichern.
                  </p>
                )}
              </div>
            </CollapsibleSection>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-4 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="text-dark dark:text-dark-text dark:border-dark-border dark:hover:bg-dark-background-secondary rounded-lg border border-gray-300 px-4 py-2.5 font-semibold transition-colors hover:bg-gray-100"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isLoading || updateProfile.isPending}
                className="bg-primary hover:bg-primary-dark dark:bg-primary-light dark:hover:bg-primary rounded-lg px-6 py-2.5 font-semibold text-white shadow-lg transition-colors disabled:opacity-50"
              >
                {isLoading || updateProfile.isPending
                  ? "Speichert..."
                  : "Änderungen speichern"}
              </button>
            </div>
          </form>
        </div>

        {/* Danger Zone - Only show for regular users */}
        {profile?.role === UserRole.USER && (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">
              Gefahrenzone
            </h2>
            <p className="mt-2 text-sm text-red-700 dark:text-red-400">
              Diese Aktionen können nicht rückgängig gemacht werden.
            </p>
            <div className="mt-4">
              <button
                type="button"
                className="rounded-lg border border-red-600 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-600 hover:text-white dark:border-red-500 dark:text-red-500 dark:hover:bg-red-600 dark:hover:text-white"
              >
                Konto löschen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
