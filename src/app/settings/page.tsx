"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { UserRole } from "~/generated/prisma/enums";
import { getErrorMessage } from "@/lib/utils";
import ProfileImageUpload from "./_components/profile-image-upload";

// Collapsible Section Component
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
        <svg
          className={`text-dark dark:text-dark-text h-5 w-5 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
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

// User preferences type
interface UserPreferences {
  termineDefaultView: "list" | "calendar";
}

const defaultPreferences: UserPreferences = {
  termineDefaultView: "list",
};

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const utils = api.useUtils();

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
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({
    checking: false,
    available: null,
    message: "",
  });

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  // Update profile mutation
  const updateProfile = api.users.updateProfile.useMutation({
    onSuccess: () => {
      setSuccess("Profil erfolgreich aktualisiert");
      setError("");
      void utils.users.getMyProfile.invalidate();
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err) => {
      setError(getErrorMessage(err, "Fehler beim Aktualisieren des Profils"));
      setSuccess("");
    },
  });

  // Populate form with profile data
  useEffect(() => {
    if (profile) {
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
      // Parse preferences from JSON
      if (profile.preferences) {
        try {
          const parsed =
            typeof profile.preferences === "string"
              ? JSON.parse(profile.preferences)
              : profile.preferences;
          setPreferences({ ...defaultPreferences, ...parsed });
        } catch {
          setPreferences(defaultPreferences);
        }
      }
    }
  }, [profile]);

  // Redirect if not logged in
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
    setError("");
    setSuccess("");

    if (
      formData.username &&
      formData.username !== profile?.username &&
      usernameStatus.available === false
    ) {
      setError("Bitte wähle einen verfügbaren Benutzernamen");
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
          {/* Success Message */}
          {success && (
            <div className="mb-6 rounded-md border-l-4 border-green-500 bg-green-50 p-4 dark:bg-green-900/20">
              <div className="flex items-center">
                <svg
                  className="mr-2 h-5 w-5 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  {success}
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-md border-l-4 border-red-500 bg-red-50 p-4 dark:bg-red-900/20">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Section: Profile Image */}
            <CollapsibleSection
              title="Profilbild"
              defaultOpen={true}
              icon={
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
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              }
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
                    <svg
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
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
              icon={
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="firstName"
                    className="text-dark dark:text-dark-text mb-1 block text-sm font-medium"
                  >
                    Vorname
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:ring-1 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="lastName"
                    className="text-dark dark:text-dark-text mb-1 block text-sm font-medium"
                  >
                    Nachname
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:ring-1 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="birthDate"
                    className="text-dark dark:text-dark-text mb-1 block text-sm font-medium"
                  >
                    Geburtsdatum
                  </label>
                  <input
                    id="birthDate"
                    name="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={handleChange}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:ring-1 focus:outline-none"
                  />
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
              icon={
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
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              }
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
              </div>
            </CollapsibleSection>

            {/* Section: Address */}
            <CollapsibleSection
              title="Adresse"
              defaultOpen={false}
              icon={
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
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              }
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
                      maxLength={5}
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
              icon={
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
                    d="M4 6h16M4 12h16M4 18h7"
                  />
                </svg>
              }
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
                  maxLength={500}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:ring-1 focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {formData.bio.length}/500 Zeichen
                </p>
              </div>
            </CollapsibleSection>

            {/* Section: Site Preferences */}
            <CollapsibleSection
              title="Einstellungen"
              defaultOpen={false}
              icon={
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              }
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
                          d="M4 6h16M4 10h16M4 14h16M4 18h16"
                        />
                      </svg>
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
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      Kalender
                    </button>
                  </div>
                </div>
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
