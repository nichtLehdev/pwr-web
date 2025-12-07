"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { UserRole } from "~/generated/prisma/enums";
import { getErrorMessage } from "@/lib/utils";
import { useToast } from "@/app/_components/ui/toast";
import MediaPickerModal from "@/app/_components/editor/media-picker-modal";

// User placeholder icon component
const UserPlaceholderIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

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

  const { data: bezirke } = api.bezirke.getAll.useQuery();

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.USER);
  const [displayRole, setDisplayRole] = useState("");
  const [bezirkId, setBezirkId] = useState<string | null>(null);
  const [obleuteRole, setObleuteRole] = useState("");
  const [bio, setBio] = useState("");
  const [profileImageId, setProfileImageId] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form state when user data is loaded
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
      setRole(user.role ?? UserRole.USER);
      setDisplayRole(user.displayRole ?? "");
      setBezirkId(user.bezirkId ?? null);
      setObleuteRole(user.obleuteRole ?? "");
      setBio(user.bio ?? "");
      setProfileImageId(user.profileImageId ?? null);
      setProfileImageUrl(user.profileImage?.url ?? null);
    }
  }, [user]);

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
      displayName: name.trim() || undefined,
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
      profileImageId,
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
      </div>
    </main>
  );
}
