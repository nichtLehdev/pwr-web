"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/utils";
import { useToast } from "@/app/_components/ui/toast";
import { DashboardPage } from "@/app/_components/dashboard";
import MediaPickerModal from "@/app/_components/editor/media-picker-modal";
import { User } from "lucide-react";

const UserPlaceholderIcon = ({ className }: { className?: string }) => (
  <User className={className} />
);

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: user, isLoading: userLoading } = api.users.getById.useQuery(
    { id: userId },
    { enabled: !!userId && !!session?.user },
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [debouncedUsername, setDebouncedUsername] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [profileImageId, setProfileImageId] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [showAddressPublicly, setShowAddressPublicly] = useState(true);
  const [showPhonePublicly, setShowPhonePublicly] = useState(true);
  // Zugehörigkeit: wo die Person im Werk verortet ist. Zusammen mit
  // districtRoleName ergibt das ein öffentlich sichtbares Amt. Nicht zu
  // verwechseln mit bezirkScopeIds weiter unten — das ist die Zuständigkeit
  // fürs Anlegen von Inhalten und hängt nicht am Amt.
  const [bezirkId, setBezirkId] = useState<string>("");
  const [districtRoleName, setDistrictRoleName] = useState("");
  const [bezirkScopeIds, setBezirkScopeIds] = useState<string[]>([]);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(
        user.displayName ??
          `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ??
          "",
      );
      setEmail(user.email ?? "");
      setUsername(user.username ?? "");
      setBio(user.bio ?? "");
      setPhone(user.phone ?? "");
      setStreet(user.street ?? "");
      setZipCode(user.zipCode ?? "");
      setCity(user.city ?? "");
      setProfileImageId(user.profileImageId ?? null);
      setProfileImageUrl(user.profileImage?.url ?? null);
      setBezirkId(user.bezirkId ?? "");
      setDistrictRoleName(user.districtRoleName ?? "");
      setBezirkScopeIds(user.bezirkScopes?.map((s) => s.bezirkId) ?? []);
      try {
        const prefs =
          typeof user.preferences === "string"
            ? JSON.parse(user.preferences ?? "{}")
            : (user.preferences ?? {});
        setShowAddressPublicly(prefs.showAddressPublicly !== false);
        setShowPhonePublicly(prefs.showPhonePublicly !== false);
      } catch {
        setShowAddressPublicly(true);
        setShowPhonePublicly(true);
      }
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (username.length >= 3) {
        setDebouncedUsername(username);
      } else {
        setDebouncedUsername("");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  const checkUsernameQuery = api.users.checkUsername.useQuery(
    { username: debouncedUsername },
    {
      enabled: debouncedUsername.length >= 3,
      refetchOnWindowFocus: false,
    },
  );

  const usernameStatus = useMemo(() => {
    if (username.length === 0) {
      return {
        checking: false,
        available: null as boolean | null,
        message: "",
      };
    }
    if (username.length < 3) {
      return {
        checking: false,
        available: null as boolean | null,
        message: "Mindestens 3 Zeichen",
      };
    }
    if (username === user?.username) {
      return {
        checking: false,
        available: true as boolean | null,
        message: "",
      };
    }
    if (username !== debouncedUsername || checkUsernameQuery.isLoading) {
      return {
        checking: true,
        available: null as boolean | null,
        message: "Wird geprüft...",
      };
    }
    if (checkUsernameQuery.data) {
      return {
        checking: false,
        available: checkUsernameQuery.data.available,
        message: checkUsernameQuery.data.available
          ? "✓ Benutzername verfügbar"
          : "✗ Benutzername bereits vergeben",
      };
    }
    return { checking: false, available: null as boolean | null, message: "" };
  }, [
    username,
    debouncedUsername,
    checkUsernameQuery.isLoading,
    checkUsernameQuery.data,
    user?.username,
  ]);

  const utils = api.useUtils();

  const updateUserMutation = api.users.update.useMutation({
    onSuccess: async () => {
      await utils.users.getById.invalidate({ id: userId });
      await utils.users.list.invalidate();
      toast.success("Benutzer erfolgreich aktualisiert");
      router.push(`/dashboard/users/${userId}`);
    },
    onError: (err) => {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      toast.error("Fehler beim Aktualisieren: " + errorMessage);
      setIsSubmitting(false);
    },
  });

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/users/${userId}/edit`);
    }
  }, [session, sessionLoading, router, userId]);

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageUsers = hasPermission(PERMISSIONS.USERS_MANAGE);
  const canEditRoles = hasPermission(PERMISSIONS.USERS_EDIT_ROLES);

  const { data: bezirke } = api.bezirke.getAll.useQuery(undefined, {
    enabled: canManageUsers,
  });
  const updateRoleMutation = api.users.updateRole.useMutation({
    onError: (err) => {
      toast.error(
        getErrorMessage(err, "Zuständigkeit konnte nicht gespeichert werden."),
      );
    },
  });

  const toggleBezirkScope = (bezirkId: string) => {
    setBezirkScopeIds((current) =>
      current.includes(bezirkId)
        ? current.filter((id) => id !== bezirkId)
        : [...current, bezirkId],
    );
  };

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !permissionsLoading &&
      !canManageUsers &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, permissionsLoading, canManageUsers, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");
    setIsSubmitting(true);

    if (!email.trim()) {
      setError("Bitte gib eine E-Mail-Adresse ein.");
      setIsSubmitting(false);
      return;
    }

    if (username.trim()) {
      if (username.trim().length < 3) {
        setError("Benutzername muss mindestens 3 Zeichen haben.");
        setIsSubmitting(false);
        return;
      }
      if (username.trim().length > 30) {
        setError("Benutzername darf maximal 30 Zeichen haben.");
        setIsSubmitting(false);
        return;
      }
      if (!/^[a-zA-Z0-9_.-]+$/.test(username.trim())) {
        setError(
          "Benutzername darf nur Buchstaben, Zahlen, Unterstrich, Bindestrich und Punkt enthalten.",
        );
        setIsSubmitting(false);
        return;
      }
      if (
        username.trim() !== user?.username &&
        usernameStatus.available === false
      ) {
        setError("Bitte wähle einen verfügbaren Benutzernamen.");
        setIsSubmitting(false);
        return;
      }
    }

    const existingPrefs =
      typeof user.preferences === "string"
        ? (() => {
            try {
              return JSON.parse(user.preferences ?? "{}") as Record<
                string,
                unknown
              >;
            } catch {
              return {};
            }
          })()
        : ((user.preferences as Record<string, unknown> | null) ?? {});

    if (canEditRoles) {
      updateRoleMutation.mutate({
        userId,
        bezirkScopeIds,
      });
    }

    updateUserMutation.mutate({
      id: userId,
      displayName: name.trim() || undefined,
      email: email.trim(),
      username: username.trim() || undefined,
      districtRoleName: districtRoleName.trim() || null,
      bezirkId: bezirkId || null,
      bio: bio.trim() || undefined,
      phone: phone.trim() || undefined,
      profileImageId,
      street: street.trim() || undefined,
      zipCode: zipCode.trim() || undefined,
      city: city.trim() || undefined,
      preferences: JSON.stringify({
        ...existingPrefs,
        showAddressPublicly,
        showPhonePublicly,
      }),
    });
  };

  if (sessionLoading || profileLoading || userLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !user) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Benutzer nicht gefunden
          </h1>
          <Link
            href="/dashboard/users"
            className="text-primary mt-4 inline-block hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const userName =
    user.displayName ??
    (`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email);

  return (
    <>
      <DashboardPage
        title="Benutzer bearbeiten"
        description="Bearbeite die Benutzerdaten und Berechtigungen"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Benutzer", href: "/dashboard/users" },
          { label: userName, href: `/dashboard/users/${userId}` },
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
          {/* Profile Image */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Profilbild
            </h2>
            <div className="flex items-center gap-6">
              {profileImageUrl ? (
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full">
                  <Image
                    src={profileImageUrl}
                    alt="Profilbild"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="dark:bg-dark-background-secondary flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <UserPlaceholderIcon className="dark:text-dark-muted h-12 w-12 text-gray-400" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setIsMediaPickerOpen(true)}
                  className="bg-primary hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
                >
                  {profileImageUrl ? "Bild ändern" : "Bild auswählen"}
                </button>
                {profileImageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileImageId(null);
                      setProfileImageUrl(null);
                    }}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Bild entfernen
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Basic Info */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Grundinformationen
            </h2>
            <div className="space-y-4">
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Anzeigename
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Vollständiger Name"
                  maxLength={100}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                />
              </div>

              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  E-Mail *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Benutzername
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="benutzername"
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9_.-]+"
                  title="Nur Buchstaben, Zahlen, Unterstrich, Bindestrich und Punkt erlaubt"
                  className={`focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none ${
                    usernameStatus.available === true
                      ? "border-green-500"
                      : usernameStatus.available === false
                        ? "border-red-500"
                        : "border-gray-300"
                  }`}
                />
                {usernameStatus.message ? (
                  <p
                    className={`mt-1 flex items-center gap-1 text-xs ${
                      usernameStatus.checking
                        ? "text-gray-500 dark:text-gray-400"
                        : usernameStatus.available
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {usernameStatus.checking && (
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    )}
                    {usernameStatus.message}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Kann für die Anmeldung verwendet werden
                  </p>
                )}
              </div>

              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Kurze Beschreibung..."
                  maxLength={2000}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                />
              </div>

              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Telefonnummer
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+49 123 456789"
                  maxLength={50}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* Address */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Adresse
            </h2>
            <div className="space-y-4">
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Straße und Hausnummer
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Musterstraße 1"
                  maxLength={200}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    PLZ
                  </label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="12345"
                    maxLength={20}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Stadt
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Musterstadt"
                    maxLength={100}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  />
                </div>
              </div>

              <div className="dark:border-dark-border mt-4 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:bg-gray-800/30">
                <p className="dark:text-dark-text text-sm font-medium text-gray-900">
                  Öffentliche Sichtbarkeit
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Ob Adresse und Telefon auf öffentlichen Seiten (z. B.
                  Vorstand, Bezirke) angezeigt werden.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    id="edit-showAddressPublicly"
                    type="checkbox"
                    checked={showAddressPublicly}
                    onChange={(e) => setShowAddressPublicly(e.target.checked)}
                    className="focus:ring-primary text-primary h-4 w-4 rounded border-gray-300 focus:ring-2"
                  />
                  <label
                    htmlFor="edit-showAddressPublicly"
                    className="dark:text-dark-text cursor-pointer text-sm text-gray-700"
                  >
                    Adresse anzeigen
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    id="edit-showPhonePublicly"
                    type="checkbox"
                    checked={showPhonePublicly}
                    onChange={(e) => setShowPhonePublicly(e.target.checked)}
                    className="focus:ring-primary text-primary h-4 w-4 rounded border-gray-300 focus:ring-2"
                  />
                  <label
                    htmlFor="edit-showPhonePublicly"
                    className="dark:text-dark-text cursor-pointer text-sm text-gray-700"
                  >
                    Telefonnummer anzeigen
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-1 text-lg font-semibold text-gray-900">
              Bezirkszugehörigkeit
            </h2>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Zu welchem Bezirk gehört diese Person, und in welchem Amt? Beides
              erscheint auf den öffentlichen Seiten. Wer nur Inhalte für einen
              Bezirk pflegen soll, braucht hier nichts — dafür ist die
              Zuständigkeit weiter unten da.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="edit-bezirk"
                  className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700"
                >
                  Bezirk
                </label>
                <select
                  id="edit-bezirk"
                  value={bezirkId}
                  onChange={(e) => setBezirkId(e.target.value)}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                >
                  <option value="">Keinem Bezirk zugeordnet</option>
                  {bezirke?.map((bezirk) => (
                    <option key={bezirk.id} value={bezirk.id}>
                      Bezirk {bezirk.number} – {bezirk.shortName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="edit-districtRoleName"
                  className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700"
                >
                  Amtsbezeichnung
                </label>
                <input
                  id="edit-districtRoleName"
                  type="text"
                  value={districtRoleName}
                  onChange={(e) => setDistrictRoleName(e.target.value)}
                  placeholder="z. B. Bezirksobmann"
                  maxLength={100}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Wird als Bezeichnung angezeigt, wo die Person öffentlich
                  auftaucht.
                </p>
              </div>
            </div>
          </section>

          {canEditRoles && (
            <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="dark:text-dark-text mb-1 text-lg font-semibold text-gray-900">
                Zuständigkeit für Bezirke
              </h2>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                Für welche Bezirke darf dieser Benutzer Termine, Beiträge und
                Kurse anlegen? Das ist unabhängig davon, ob er Obmann oder
                Obfrau ist — auch eine einmalige Ausnahme lässt sich hier
                eintragen. Ohne Anlage-Berechtigung bleibt die Auswahl
                folgenlos; wer freigeben darf, arbeitet ohnehin
                bezirksübergreifend.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {bezirke?.map((bezirk) => (
                  <label
                    key={bezirk.id}
                    className="dark:border-dark-border flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={bezirkScopeIds.includes(bezirk.id)}
                      onChange={() => toggleBezirkScope(bezirk.id)}
                      className="focus:ring-primary text-primary h-4 w-4 rounded border-gray-300 focus:ring-2"
                    />
                    <span className="dark:text-dark-text text-sm text-gray-700">
                      Bezirk {bezirk.number} – {bezirk.shortName}
                    </span>
                  </label>
                ))}
              </div>
              {bezirkScopeIds.length === 0 && (
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  Keine Zuständigkeit: der Benutzer kann keine bezirksgebundenen
                  Inhalte anlegen.
                </p>
              )}
            </section>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href={`/dashboard/users/${userId}`}
              className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-6 py-2.5 text-center font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Abbrechen
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || updateUserMutation.isPending}
              className="bg-primary hover:bg-primary/90 rounded-lg px-6 py-2.5 font-medium text-white transition-colors disabled:opacity-50"
            >
              {isSubmitting || updateUserMutation.isPending
                ? "Wird gespeichert..."
                : "Änderungen speichern"}
            </button>
          </div>
        </form>

        {/* Media Picker Modal */}
        <MediaPickerModal
          isOpen={isMediaPickerOpen}
          onClose={() => setIsMediaPickerOpen(false)}
          onSelect={(url, _alt, mediaId) => {
            if (mediaId) {
              setProfileImageId(mediaId);
            }
            setProfileImageUrl(url);
            setIsMediaPickerOpen(false);
          }}
        />
      </DashboardPage>
    </>
  );
}
