"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { api } from "@/trpc/react";
import { UserRole } from "~/generated/prisma/enums";
import { getErrorMessage } from "@/lib/utils";
import MediaPickerModal from "@/app/_components/editor/media-picker-modal";
import { User, XIcon } from "lucide-react";

const ALLOWED_ROLES: UserRole[] = [UserRole.ADMIN];

const UserPlaceholderIcon = ({ className }: { className?: string }) => (
  <User className={className} />
);

export default function NewVorstandPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: users } = api.users.list.useQuery(
    { page: 1, limit: 100 },
    { enabled: !!session?.user },
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [imageId, setImageId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

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

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const utils = api.useUtils();

  const createMutation = api.organization.createVorstandMember.useMutation({
    onSuccess: async (data) => {
      toast.success("Vorstandsmitglied erfolgreich erstellt");
      await utils.organization.getVorstand.invalidate();
      router.push(`/dashboard/vorstand/${data.id}`);
    },
    onError: (err) => {
      toast.error("Fehler beim Erstellen: " + getErrorMessage(err));
      setError(getErrorMessage(err));
      setIsSubmitting(false);
    },
  });

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/vorstand/new");
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

    if (!position.trim()) {
      setError("Bitte gib eine Position ein.");
      setIsSubmitting(false);
      return;
    }

    createMutation.mutate({
      name: name.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      position: position.trim(),
      description: description.trim() || undefined,
      color: color.trim() || undefined,
      sortOrder,
      userId: userId || undefined,
      imageId: imageId || undefined,
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
                href="/dashboard/vorstand"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Vorstand
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">Neu</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
            Neues Vorstandsmitglied
          </h1>
          <p className="dark:text-dark-muted mt-2 text-gray-600">
            Erstelle ein neues Vorstandsmitglied
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
          {/* Image */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Bild
            </h2>
            <div className="flex items-center gap-6">
              {imageUrl ? (
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full">
                  <Image
                    src={imageUrl}
                    alt="Vorstandsbild"
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
                  {imageUrl ? "Bild ändern" : "Bild auswählen"}
                </button>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageId(null);
                      setImageUrl(null);
                    }}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Bild entfernen
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Position Info */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Position
            </h2>
            <div className="space-y-4">
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Position *
                </label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="z.B. Landesobmann, Schriftführer..."
                  maxLength={100}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Beschreibung
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Aufgabenbeschreibung..."
                  maxLength={1000}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Farbe (Tailwind-Klasse)
                  </label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="z.B. bg-blue-100 text-blue-800"
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
            </div>
          </section>

          {/* Link to User */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Benutzerverknüpfung
            </h2>
            <p className="dark:text-dark-muted mb-4 text-sm text-gray-600">
              Optional: Verknüpfe dieses Vorstandsmitglied mit einem
              Benutzerkonto. Kontaktdaten werden dann vom Benutzer übernommen.
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
                    <XIcon
                      className="h-4 w-4" 
                    />
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

          {/* Manual Contact Info (if no user linked) */}
          {!userId && (
            <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
                Kontaktinformationen
              </h2>
              <p className="dark:text-dark-muted mb-4 text-sm text-gray-600">
                Diese Felder werden nur verwendet, wenn kein Benutzer verknüpft
                ist.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Name
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
                    E-Mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+49 123 456789"
                    maxLength={50}
                    pattern="[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*"
                    title="Bitte geben Sie eine gültige Telefonnummer ein"
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard/vorstand"
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

        {/* Media Picker Modal */}
        <MediaPickerModal
          isOpen={isMediaPickerOpen}
          onClose={() => setIsMediaPickerOpen(false)}
          onSelect={(url, _alt, mediaId) => {
            if (mediaId) {
              setImageId(mediaId);
            }
            setImageUrl(url);
            setIsMediaPickerOpen(false);
          }}
        />
      </div>
    </main>
  );
}
