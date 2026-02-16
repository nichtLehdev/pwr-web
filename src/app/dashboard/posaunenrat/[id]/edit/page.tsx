"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { api } from "@/trpc/react";
import { PosaunenratRole } from "~/generated/prisma/enums";
import { getErrorMessage } from "@/lib/utils";
import { XIcon } from "lucide-react";

const POSAUNENRAT_ROLE_OPTIONS: { value: PosaunenratRole; label: string }[] = [
  { value: PosaunenratRole.VORSTAND, label: "Vorstand" },
  {
    value: PosaunenratRole.LANDESKIRCHENMUSIKDIREKTOR,
    label: "Landeskirchenmusikdirektor",
  },
  { value: PosaunenratRole.SACHVERSTAENDIGER, label: "Sachverständiger" },
  { value: PosaunenratRole.SACHVERSTAENDIGE, label: "Sachverständige" },
];

export default function EditPosaunenratPage() {
  const router = useRouter();
  const params = useParams();
  const memberId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: canManageOrganization } = api.permissions.canManage.useQuery(
    undefined,
    { enabled: !!session?.user },
  );

  const { data: member, isLoading: memberLoading } =
    api.organization.getPosaunenratMember.useQuery(
      { id: memberId },
      { enabled: !!memberId && !!session?.user },
    );

  const { data: users } = api.users.list.useQuery(
    { page: 1, limit: 100 },
    { enabled: !!session?.user },
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<PosaunenratRole>(PosaunenratRole.VORSTAND);
  const [sortOrder, setSortOrder] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (member) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(member.name || "");
      setEmail(member.email || "");
      setRole(member.role as PosaunenratRole);
      setSortOrder(member.sortOrder || 0);
      if (member.user) {
        setUserId(member.user.id);
        setUserSearch(member.user.displayName || member.user.email || "");
      }
    }
  }, [member]);

  const filteredUsers = users?.users.filter((user) => {
    if (!userSearch.trim()) return true;
    const searchLower = userSearch.toLowerCase();
    return (
      user.displayName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  const handleUserSelect = (user: {
    id: string;
    displayName: string | null;
    email: string;
  }) => {
    setUserId(user.id);
    setUserSearch(user.displayName || user.email);
    setShowUserDropdown(false);
  };

  const handleClearUser = () => {
    setUserId(null);
    setUserSearch("");
  };

  const utils = api.useUtils();

  const updateMutation = api.organization.updatePosaunenratMember.useMutation({
    onSuccess: async () => {
      await utils.organization.getPosaunenrat.invalidate();
      await utils.organization.getPosaunenratMember.invalidate({
        id: memberId,
      });
      toast.success("Posaunenratsmitglied erfolgreich aktualisiert");
      router.push(`/dashboard/posaunenrat/${memberId}`);
    },
    onError: (err) => {
      setError(getErrorMessage(err));
      setIsSubmitting(false);
      toast.error("Fehler beim Aktualisieren: " + err.message);
    },
  });

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/posaunenrat/${memberId}/edit`);
    }
  }, [session, sessionLoading, router, memberId]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !canManageOrganization &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, canManageOrganization, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    updateMutation.mutate({
      id: memberId,
      name: name.trim() || undefined,
      email: email.trim() || undefined,
      role,
      sortOrder,
      userId: userId,
    });
  };

  if (sessionLoading || profileLoading || memberLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageOrganization) {
    return null;
  }

  if (!member) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Posaunenratsmitglied nicht gefunden
          </h1>
          <Link
            href="/dashboard/posaunenrat"
            className="text-primary mt-4 inline-block hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const displayName = member.user?.displayName || member.name || "Mitglied";
  const imageUrl = member.user?.profileImage?.url || member.image?.url;

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
                href="/dashboard/posaunenrat"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Posaunenrat
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li>
              <Link
                href={`/dashboard/posaunenrat/${memberId}`}
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                {displayName}
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">Bearbeiten</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
            Posaunenratsmitglied bearbeiten
          </h1>
          <p className="dark:text-dark-muted mt-2 text-gray-600">
            Bearbeite die Daten des Posaunenratsmitglieds
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
          {/* Current User Info (if linked) */}
          {member.user && (
            <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
                Aktuell verknüpfter Benutzer
              </h2>
              <div className="flex items-center gap-4">
                {imageUrl ? (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={imageUrl}
                      alt={displayName}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="dark:bg-dark-background-secondary flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <span className="dark:text-dark-muted text-lg font-medium text-gray-500">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="dark:text-dark-text font-medium text-gray-900">
                    {member.user.displayName || "Unbekannt"}
                  </p>
                  <p className="dark:text-dark-muted text-sm text-gray-500">
                    {member.user.email}
                  </p>
                </div>
                <Link
                  href={`/dashboard/users/${member.user.id}`}
                  className="text-primary ml-auto text-sm hover:underline"
                >
                  Benutzer anzeigen →
                </Link>
              </div>
            </section>
          )}

          {/* Manual Data (if not linked) */}
          {!member.user && (
            <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
                Manuelle Daten
              </h2>
              <p className="dark:text-dark-muted mb-4 text-sm text-gray-600">
                Diese Daten werden verwendet, wenn kein Benutzer verknüpft ist.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Max Mustermann"
                    maxLength={100}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    E-Mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="max@example.de"
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Optional User Link */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Benutzerverknüpfung (optional)
            </h2>
            <p className="dark:text-dark-muted mb-4 text-sm text-gray-600">
              Optional kann ein Benutzerkonto verknüpft werden. Dann werden
              Name, E-Mail und Profilbild vom Benutzer übernommen.
            </p>
            <div className="relative">
              <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                Benutzer suchen
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setShowUserDropdown(true);
                    if (!e.target.value) setUserId(null);
                  }}
                  onFocus={() => setShowUserDropdown(true)}
                  placeholder="Name oder E-Mail eingeben..."
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-gray-900 focus:ring-1 focus:outline-none"
                />
                {userId && (
                  <button
                    type="button"
                    onClick={handleClearUser}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* User Dropdown */}
              {showUserDropdown && (
                <div className="dark:border-dark-border dark:bg-dark-surface absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                  <div
                    className="overflow-y-auto"
                    style={{ maxHeight: "240px" }}
                  >
                    {filteredUsers && filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleUserSelect(user)}
                          className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <span className="dark:text-dark-text font-medium text-gray-900">
                            {user.displayName || user.email}
                          </span>
                          {user.displayName && (
                            <span className="text-gray-500 dark:text-gray-400">
                              {" "}
                              – {user.email}
                            </span>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {userSearch
                          ? "Keine Benutzer gefunden"
                          : "Tippe, um Benutzer zu suchen"}
                      </div>
                    )}
                  </div>
                  {userId && (
                    <button
                      type="button"
                      onClick={handleClearUser}
                      className="dark:border-dark-border block w-full border-t border-gray-200 px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700"
                    >
                      Verknüpfung entfernen
                    </button>
                  )}
                </div>
              )}

              {/* Selected user indicator */}
              {userId && (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                  ✓ Benutzer verknüpft
                </p>
              )}
            </div>
          </section>

          {/* Role & District */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Rolle & Bezirk
            </h2>
            <div className="space-y-4">
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Rolle im Posaunenrat *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as PosaunenratRole)}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                >
                  {POSAUNENRAT_ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Reihenfolge
                </label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href={`/dashboard/posaunenrat/${memberId}`}
              className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-6 py-2.5 text-center font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Abbrechen
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || updateMutation.isPending}
              className="bg-primary hover:bg-primary/90 rounded-lg px-6 py-2.5 font-medium text-white transition-colors disabled:opacity-50"
            >
              {isSubmitting || updateMutation.isPending
                ? "Wird gespeichert..."
                : "Änderungen speichern"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
