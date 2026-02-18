"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { api } from "@/trpc/react";
import { DashboardPage } from "@/app/_components/dashboard";
import { FoerdervereinRole } from "~/generated/prisma/enums";
import { getErrorMessage } from "@/lib/utils";
import { XIcon } from "lucide-react";

const FOERDERVEREIN_ROLE_OPTIONS: {
  value: FoerdervereinRole;
  label: string;
}[] = [
  { value: FoerdervereinRole.VORSITZENDER, label: "Vorsitzender" },
  { value: FoerdervereinRole.STELLVERTRETER, label: "Stellvertreter" },
  { value: FoerdervereinRole.SCHATZMEISTER, label: "Schatzmeister" },
  { value: FoerdervereinRole.SCHRIFTFUEHRER, label: "Schriftführer" },
  { value: FoerdervereinRole.BEISITZER, label: "Beisitzer" },
  { value: FoerdervereinRole.MITGLIED, label: "Mitglied" },
];

export default function NewFoerdervereinPage() {
  const router = useRouter();
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

  const { data: users } = api.users.list.useQuery(
    { page: 1, limit: 100 },
    { enabled: !!session?.user },
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [role, setRole] = useState<FoerdervereinRole>(
    FoerdervereinRole.MITGLIED,
  );
  const [memberSince, setMemberSince] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const createMutation = api.organization.createFoerdervereinMember.useMutation(
    {
      onSuccess: async (data) => {
        await utils.organization.getFoerderverein.invalidate();
        toast.success("Fördervereinsmitglied erfolgreich erstellt");
        router.push(`/dashboard/foerderverein/${data.id}`);
      },
      onError: (err) => {
        setError(getErrorMessage(err));
        setIsSubmitting(false);
        toast.error("Fehler beim Erstellen: " + err.message);
      },
    },
  );

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/foerderverein/new");
    }
  }, [session, sessionLoading, router]);

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

    if (!userId && !name.trim()) {
      setError("Bitte wähle einen Benutzer aus oder gib einen Namen ein.");
      setIsSubmitting(false);
      return;
    }

    createMutation.mutate({
      name: name.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      position: position.trim() || undefined,
      role,
      memberSince: memberSince ? new Date(memberSince) : undefined,
      description: description.trim() || undefined,
      sortOrder,
      userId: userId || undefined,
    });
  };

  if (sessionLoading || profileLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageOrganization) {
    return null;
  }

  return (
    <DashboardPage
      title="Neues Fördervereinsmitglied"
      description="Füge ein neues Mitglied zum Förderverein hinzu"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Förderverein", href: "/dashboard/foerderverein" },
        { label: "Neu" },
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
          {/* User Link (optional) */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Benutzer verknüpfen (optional)
            </h2>
            <p className="dark:text-dark-muted mb-4 text-sm text-gray-600">
              Du kannst ein bestehendes Benutzerkonto verknüpfen. Dann werden
              Name, E-Mail und Profilbild automatisch übernommen. Alternativ
              kannst du die Daten manuell eingeben.
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
                      Auswahl entfernen
                    </button>
                  )}
                </div>
              )}

              {/* Selected user indicator */}
              {userId && (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                  ✓ Benutzer ausgewählt
                </p>
              )}
            </div>
          </section>

          {/* Manual Data */}
          {!userId && (
            <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
                Manuelle Daten
              </h2>
              <p className="dark:text-dark-muted mb-4 text-sm text-gray-600">
                Wenn kein Benutzer verknüpft ist, gib die Daten manuell ein.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Name *
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

          {/* Position & Role */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Position & Rolle
            </h2>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Position (Freitext)
                  </label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="z.B. 1. Vorsitzender"
                    maxLength={100}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Rolle *
                  </label>
                  <select
                    value={role}
                    onChange={(e) =>
                      setRole(e.target.value as FoerdervereinRole)
                    }
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  >
                    {FOERDERVEREIN_ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="z.B. +49 123 456789"
                  maxLength={50}
                  pattern="[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*"
                  title="Bitte geben Sie eine gültige Telefonnummer ein"
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Mitglied seit
                  </label>
                  <input
                    type="date"
                    value={memberSince}
                    onChange={(e) => setMemberSince(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    title="Datum kann nicht in der Zukunft liegen"
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Reihenfolge
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) =>
                      setSortOrder(parseInt(e.target.value) || 0)
                    }
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Beschreibung
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Zusätzliche Informationen zum Mitglied..."
                  maxLength={1000}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard/foerderverein"
              className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-6 py-2.5 text-center font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Abbrechen
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || createMutation.isPending}
              className="bg-primary hover:bg-primary/90 rounded-lg px-6 py-2.5 font-medium text-white transition-colors disabled:opacity-50"
            >
              {isSubmitting || createMutation.isPending
                ? "Wird erstellt..."
                : "Mitglied erstellen"}
            </button>
          </div>
        </form>
    </DashboardPage>
  );
}
