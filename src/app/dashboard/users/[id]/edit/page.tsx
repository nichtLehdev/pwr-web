"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { UserRole } from "~/generated/prisma/enums";

const ALLOWED_ROLES: UserRole[] = [UserRole.ADMIN];

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Administrator",
  LPW: "Landesposaunenwart",
  RPW: "Regionalposaunenwart",
  OBLEUTE: "Obleute",
  USER: "Benutzer",
};

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: user, isLoading: userLoading } = api.users.getById.useQuery(
    { id: userId },
    { enabled: !!userId && !!session?.user },
  );

  const { data: bezirke } = api.bezirke.getAll.useQuery();

  // Form state
  const [name, setName] = useState(
    user?.displayName ??
      `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ??
      "",
  );
  const [email, setEmail] = useState(user?.email ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [role, setRole] = useState<UserRole>(user?.role ?? UserRole.USER);
  const [displayRole, setDisplayRole] = useState(user?.displayRole ?? "");
  const [obleuteBezirkId, setObleuteBezirkId] = useState<string | null>(
    user?.obleuteBezirkId ?? null,
  );
  const [obleuteRole, setObleuteRole] = useState(user?.obleuteRole ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const utils = api.useUtils();

  const updateUserMutation = api.users.update.useMutation({
    onSuccess: async () => {
      await utils.users.getById.invalidate({ id: userId });
      await utils.users.list.invalidate();
      router.push(`/dashboard/users/${userId}`);
    },
    onError: (err) => {
      setError(err.message || "Ein Fehler ist aufgetreten.");
      setIsSubmitting(false);
    },
  });

  // Redirects
  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/users/${userId}/edit`);
    }
  }, [session, sessionLoading, router, userId]);

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

    if (!email.trim()) {
      setError("Bitte gib eine E-Mail-Adresse ein.");
      setIsSubmitting(false);
      return;
    }

    updateUserMutation.mutate({
      id: userId,
      name: name.trim() || undefined,
      email: email.trim(),
      username: username.trim() || undefined,
      role,
      displayRole: displayRole.trim() || undefined,
      obleuteBezirkId: role === UserRole.OBLEUTE ? obleuteBezirkId : null,
      obleuteRole:
        role === UserRole.OBLEUTE ? obleuteRole.trim() || undefined : undefined,
      bio: bio.trim() || undefined,
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
            <li>
              <Link
                href={`/dashboard/users/${userId}`}
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                {user.displayName ??
                  (`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
                    user.email)}
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">Bearbeiten</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
            Benutzer bearbeiten
          </h1>
          <p className="dark:text-dark-muted mt-2 text-gray-600">
            Bearbeite die Benutzerdaten und Berechtigungen
          </p>
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
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Anzeigename
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Vollständiger Name"
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
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                />
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

              {role === UserRole.OBLEUTE && (
                <>
                  <div>
                    <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                      Bezirk
                    </label>
                    <select
                      value={obleuteBezirkId ?? ""}
                      onChange={(e) =>
                        setObleuteBezirkId(e.target.value || null)
                      }
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

                  <div>
                    <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                      Obleute-Funktion
                    </label>
                    <input
                      type="text"
                      value={obleuteRole}
                      onChange={(e) => setObleuteRole(e.target.value)}
                      placeholder="z.B. 1. Obmann, 2. Obfrau"
                      className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                    />
                  </div>
                </>
              )}
            </div>
          </section>

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
      </div>
    </main>
  );
}
