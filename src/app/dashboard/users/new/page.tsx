"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { UserRole } from "~/generated/prisma/enums";
import { getErrorMessage } from "@/lib/utils";

const ALLOWED_ROLES: UserRole[] = [UserRole.ADMIN];

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Administrator",
  LPW: "Landesposaunenwart",
  RPW: "Regionalposaunenwart",
  OBLEUTE: "Obleute",
  USER: "Benutzer",
};

export default function NewUserPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: bezirke } = api.bezirke.getAll.useQuery();

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [debouncedEmail, setDebouncedEmail] = useState("");
  const [username, setUsername] = useState("");
  const [debouncedUsername, setDebouncedUsername] = useState("");
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);
  const [role, setRole] = useState<UserRole>(UserRole.USER);
  const [displayRole, setDisplayRole] = useState("");
  const [bezirkId, setBezirkId] = useState<string | null>(null);
  const [obleuteRole, setObleuteRole] = useState("");
  const [bio, setBio] = useState("");

  // Email validation regex (more lenient for checking)
  const isValidEmail = (emailToCheck: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailToCheck);
  };

  // Debounce email
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isValidEmail(email)) {
        setDebouncedEmail(email);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [email]);

  // Debounce username
  useEffect(() => {
    const timer = setTimeout(() => {
      if (username.length >= 3) {
        setDebouncedUsername(username);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  // Check username availability
  const checkUsernameQuery = api.users.checkUsername.useQuery(
    { username: debouncedUsername },
    {
      enabled: debouncedUsername.length >= 3,
      refetchOnWindowFocus: false,
    },
  );

  // Check email availability
  const checkEmailQuery = api.users.checkEmail.useQuery(
    { email: debouncedEmail },
    {
      enabled: isValidEmail(debouncedEmail),
      refetchOnWindowFocus: false,
    },
  );

  // Compute username status from query result (using useMemo to avoid setState in effect)
  const usernameStatus = useMemo(() => {
    if (username.length < 3) {
      return {
        checking: false,
        available: null as boolean | null,
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
          ? "Benutzername ist verfügbar"
          : "Benutzername ist bereits vergeben",
      };
    }
    return { checking: false, available: null as boolean | null, message: "" };
  }, [
    username,
    debouncedUsername,
    checkUsernameQuery.isLoading,
    checkUsernameQuery.data,
  ]);

  // Compute email status from query result (using useMemo to avoid setState in effect)
  const emailStatus = useMemo(() => {
    if (!isValidEmail(email)) {
      return {
        checking: false,
        available: null as boolean | null,
        message: "",
      };
    }
    if (email !== debouncedEmail || checkEmailQuery.isLoading) {
      return {
        checking: true,
        available: null as boolean | null,
        message: "Wird geprüft...",
      };
    }
    if (checkEmailQuery.data) {
      return {
        checking: false,
        available: checkEmailQuery.data.available,
        message: checkEmailQuery.data.available
          ? "E-Mail ist verfügbar"
          : "E-Mail ist bereits registriert",
      };
    }
    return { checking: false, available: null as boolean | null, message: "" };
  }, [email, debouncedEmail, checkEmailQuery.isLoading, checkEmailQuery.data]);

  // Auto-generate username from firstName.lastName
  const generateUsername = (first: string, last: string) => {
    if (!first || !last) return "";
    return `${first.toLowerCase().replace(/\s+/g, "")}.${last.toLowerCase().replace(/\s+/g, "")}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .replace(/[^a-z0-9.]/g, ""); // Keep only alphanumeric and dots
  };

  const handleFirstNameChange = (value: string) => {
    setFirstName(value);
    if (!usernameManuallyEdited) {
      setUsername(generateUsername(value, lastName));
    }
  };

  const handleLastNameChange = (value: string) => {
    setLastName(value);
    if (!usernameManuallyEdited) {
      setUsername(generateUsername(firstName, value));
    }
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setUsernameManuallyEdited(true);
  };

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const utils = api.useUtils();

  const createUserMutation = api.users.create.useMutation({
    onSuccess: async (newUser) => {
      await utils.users.list.invalidate();
      router.push(`/dashboard/users/${newUser.id}`);
    },
    onError: (err) => {
      setError(getErrorMessage(err));
      setIsSubmitting(false);
    },
  });

  // Redirects
  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/users/new");
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!profileLoading && profile && !hasRedirected.current) {
      if (!ALLOWED_ROLES.includes(profile.role)) {
        hasRedirected.current = true;
        router.push("/dashboard");
      }
    }
  }, [profile, profileLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (!firstName.trim()) {
      setError("Bitte gib einen Vornamen ein.");
      setIsSubmitting(false);
      return;
    }

    if (!lastName.trim()) {
      setError("Bitte gib einen Nachnamen ein.");
      setIsSubmitting(false);
      return;
    }

    if (!email.trim()) {
      setError("Bitte gib eine E-Mail-Adresse ein.");
      setIsSubmitting(false);
      return;
    }

    if (emailStatus.available === false) {
      setError("Diese E-Mail-Adresse ist bereits registriert.");
      setIsSubmitting(false);
      return;
    }

    if (username && usernameStatus.available === false) {
      setError("Dieser Benutzername ist bereits vergeben.");
      setIsSubmitting(false);
      return;
    }

    createUserMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      username: username.trim() || undefined,
      role,
      displayRole: displayRole.trim() || undefined,
      bezirkId:
        role === UserRole.OBLEUTE || role === UserRole.ADMIN ? bezirkId : null,
      obleuteRole:
        role === UserRole.OBLEUTE || role === UserRole.ADMIN
          ? obleuteRole.trim() || undefined
          : undefined,
      bio: bio.trim() || undefined,
    });
  };

  if (sessionLoading || profileLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !ALLOWED_ROLES.includes(profile.role)) {
    return null;
  }

  return (
    <main className="dark:bg-dark-background min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm">
          <ol className="flex items-center gap-2">
            <li>
              <Link
                href="/dashboard"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Dashboard
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li>
              <Link
                href="/dashboard/users"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Benutzer
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">
              Neuer Benutzer
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
            Neuen Benutzer erstellen
          </h1>
          <p className="dark:text-dark-muted mt-2 text-gray-600">
            Erstelle ein neues Benutzerkonto mit den gewünschten Berechtigungen
          </p>
        </div>

        {/* Info Box */}
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium">Hinweis zur Anmeldung</p>
              <p className="mt-1">
                Der neue Benutzer kann sich nach der Erstellung über die
                &quot;Passwort vergessen&quot;-Funktion auf der Login-Seite ein
                Passwort setzen. Alternativ kann eine Magic-Link-Anmeldung per
                E-Mail verwendet werden.
              </p>
            </div>
          </div>
        </div>

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
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Vorname *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => handleFirstNameChange(e.target.value)}
                    placeholder="Max"
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Nachname *
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => handleLastNameChange(e.target.value)}
                    placeholder="Mustermann"
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                    required
                  />
                </div>
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
                  className={`focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none ${
                    emailStatus.available === false
                      ? "border-red-500"
                      : emailStatus.available === true
                        ? "border-green-500"
                        : "border-gray-300"
                  }`}
                  required
                />
                {emailStatus.message && (
                  <p
                    className={`mt-1 text-xs ${
                      emailStatus.available === false
                        ? "text-red-600 dark:text-red-400"
                        : emailStatus.available === true
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {emailStatus.checking && (
                      <span className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    )}
                    {emailStatus.message}
                  </p>
                )}
              </div>

              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Benutzername
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="vorname.nachname"
                  className={`focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none ${
                    usernameStatus.available === false
                      ? "border-red-500"
                      : usernameStatus.available === true
                        ? "border-green-500"
                        : "border-gray-300"
                  }`}
                />
                {usernameStatus.message ? (
                  <p
                    className={`mt-1 text-xs ${
                      usernameStatus.available === false
                        ? "text-red-600 dark:text-red-400"
                        : usernameStatus.available === true
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {usernameStatus.checking && (
                      <span className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    )}
                    {usernameStatus.message}
                  </p>
                ) : (
                  <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                    Wird automatisch aus Vor- und Nachname generiert. Kann
                    manuell angepasst werden.
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
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* Role & Permissions */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Rolle & Berechtigungen
            </h2>
            <div className="space-y-4">
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Rolle *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                >
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                  Die Rolle bestimmt die grundlegenden Berechtigungen des
                  Benutzers.
                </p>
              </div>

              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Angezeigte Rolle
                </label>
                <input
                  type="text"
                  value={displayRole}
                  onChange={(e) => setDisplayRole(e.target.value)}
                  placeholder="z.B. Webmaster, Geschäftsführer"
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                />
                <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                  Diese Rolle wird öffentlich angezeigt und hat keine Auswirkung
                  auf Berechtigungen.
                </p>
              </div>

              {(role === UserRole.OBLEUTE || role === UserRole.ADMIN) && (
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Bezirk
                  </label>
                  <select
                    value={bezirkId ?? ""}
                    onChange={(e) => setBezirkId(e.target.value || null)}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  >
                    <option value="">Kein Bezirk</option>
                    {bezirke?.map((bezirk) => (
                      <option key={bezirk.id} value={bezirk.id}>
                        Bezirk {bezirk.number} – {bezirk.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(role === UserRole.OBLEUTE || role === UserRole.ADMIN) && (
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Obleute-Funktion
                  </label>
                  <input
                    type="text"
                    value={obleuteRole}
                    onChange={(e) => setObleuteRole(e.target.value)}
                    placeholder="z.B. Bezirksobmann, Bezirksobfrau"
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard/users"
              className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-6 py-2.5 text-center font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Abbrechen
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || createUserMutation.isPending}
              className="bg-primary hover:bg-primary/90 rounded-lg px-6 py-2.5 font-medium text-white transition-colors disabled:opacity-50"
            >
              {isSubmitting || createUserMutation.isPending
                ? "Wird erstellt..."
                : "Benutzer erstellen"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
