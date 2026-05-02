"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { api } from "@/trpc/react";
import { getErrorMessage } from "@/lib/utils";
import MediaPickerModal from "@/app/_components/editor/media-picker-modal";
import {
  DashboardPage,
  DashboardSectionedFormLayout,
  type DashboardSectionNavItem,
} from "@/app/_components/dashboard";
import { ImageIcon, X } from "lucide-react";

const AUSWAHLCHOR_FORM_NAV: DashboardSectionNavItem[] = [
  { href: "#auswahlchor-form-grundlagen", label: "Grundlagen" },
  { href: "#auswahlchor-form-styling", label: "Styling" },
  { href: "#auswahlchor-form-personen", label: "Personen" },
  { href: "#auswahlchor-form-einstellungen", label: "Einstellungen" },
];

export default function EditAuswahlchorPage() {
  const router = useRouter();
  const params = useParams();
  const auswahlchorId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: canManageAuswahlchoere } = api.permissions.canManage.useQuery(
    undefined,
    { enabled: !!session?.user },
  );

  const { data: auswahlchor, isLoading: auswahlchorLoading } =
    api.auswahlchoere.getById.useQuery(
      { id: auswahlchorId },
      { enabled: !!auswahlchorId && !!session?.user },
    );

  const { data: usersData } = api.users.list.useQuery(
    { page: 1, limit: 100 },
    { enabled: !!session?.user },
  );

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [founded, setFounded] = useState("");
  const [members, setMembers] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [colorHex, setColorHex] = useState("");
  const [imageId, setImageId] = useState<string | null>("");
  const [imageUrl, setImageUrl] = useState("");
  const [conductorId, setConductorId] = useState<string | null>(null);
  const [conductorSearch, setConductorSearch] = useState("");
  const [showConductorDropdown, setShowConductorDropdown] = useState(false);
  const [showApplication, setShowApplication] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const filteredConductorUsers = usersData?.users.filter((user) => {
    if (!conductorSearch.trim()) return true;
    const searchLower = conductorSearch.toLowerCase();
    return (
      user.displayName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  useEffect(() => {
    if (auswahlchor && !initialized) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(auswahlchor.name);
      setSlug(auswahlchor.slug);
      setSubtitle(auswahlchor.subtitle);
      setFounded(auswahlchor.founded);
      setMembers(auswahlchor.members);
      setDescription(auswahlchor.description);
      setColor(auswahlchor.color);
      setColorHex(auswahlchor.colorHex);
      setImageId(auswahlchor.imageId);
      setImageUrl(auswahlchor.image?.url ?? "");
      setConductorId(auswahlchor.conductorId);
      setShowApplication(auswahlchor.showApplication);

      if (auswahlchor.conductor) {
        setConductorSearch(auswahlchor.conductor.displayName || "");
      }

      setInitialized(true);
    }
  }, [auswahlchor, initialized]);

  const utils = api.useUtils();

  const updateMutation = api.auswahlchoere.update.useMutation({
    onSuccess: async () => {
      await utils.auswahlchoere.getAll.invalidate();
      await utils.auswahlchoere.getById.invalidate({ id: auswahlchorId });
      toast.success("Auswahlchor erfolgreich aktualisiert");
      router.push(`/dashboard/auswahlchoere/${auswahlchorId}`);
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
      router.push(
        `/login?callbackUrl=/dashboard/auswahlchoere/${auswahlchorId}/edit`,
      );
    }
  }, [session, sessionLoading, router, auswahlchorId]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !canManageAuswahlchoere &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, canManageAuswahlchoere, router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-dropdown]")) {
        setShowConductorDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleConductorSelect = (user: {
    id: string;
    displayName: string | null;
    email: string;
  }) => {
    setConductorId(user.id);
    setConductorSearch(user.displayName || user.email);
    setShowConductorDropdown(false);
  };

  const handleClearConductor = () => {
    setConductorId(null);
    setConductorSearch("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    updateMutation.mutate({
      id: auswahlchorId,
      name: name.trim(),
      slug: slug.trim(),
      subtitle: subtitle.trim(),
      founded: founded.trim(),
      members: members.trim(),
      description: description.trim(),
      color: color.trim() || undefined,
      colorHex: colorHex.trim() || undefined,
      imageId: imageId || undefined,
      conductorId: conductorId || undefined,
      showApplication,
    });
  };

  const handleMediaSelect = (url: string, alt: string, mediaId?: string) => {
    setImageUrl(url);
    setImageId(mediaId ?? null);
    setShowMediaPicker(false);
  };

  if (sessionLoading || profileLoading || auswahlchorLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageAuswahlchoere) {
    return null;
  }

  if (!auswahlchor) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Auswahlchor nicht gefunden
          </h1>
          <Link
            href="/dashboard/auswahlchoere"
            className="text-primary mt-4 inline-block hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardPage
        title="Auswahlchor bearbeiten"
        description="Bearbeite die Informationen des Auswahlchors"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Auswahlchöre", href: "/dashboard/auswahlchoere" },
          {
            label: auswahlchor.name,
            href: `/dashboard/auswahlchoere/${auswahlchorId}`,
          },
          { label: "Bearbeiten" },
        ]}
        maxWidth="7xl"
      >
        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <DashboardSectionedFormLayout
            navItems={AUSWAHLCHOR_FORM_NAV}
            contentClassName="space-y-6"
          >
            <div
              id="auswahlchor-form-grundlagen"
              className="dashboard-form-scroll-anchor"
            >
              {/* Basic Information */}
              <div className="dark:border-dark-border dark:bg-dark-surface space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="dark:text-dark-text text-lg font-semibold text-gray-900">
                  Grundinformationen
                </h2>

                {/* Name */}
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={255}
                    className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. Con Spirito"
                  />
                </div>

                {/* Slug */}
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Slug *
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) =>
                      setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))
                    }
                    required
                    maxLength={15}
                    className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. conspirito"
                  />
                  <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                    URL-freundlicher Name (max. 15 Zeichen, nur Kleinbuchstaben
                    und Bindestriche)
                  </p>
                </div>

                {/* Subtitle */}
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Untertitel *
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    required
                    maxLength={200}
                    className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. Das Spitzenensemble"
                  />
                </div>

                {/* Founded */}
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Gegründet *
                  </label>
                  <input
                    type="text"
                    value={founded}
                    onChange={(e) => setFounded(e.target.value)}
                    required
                    maxLength={100}
                    className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. 1995"
                  />
                </div>

                {/* Members */}
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Mitglieder *
                  </label>
                  <input
                    type="text"
                    value={members}
                    onChange={(e) => setMembers(e.target.value)}
                    required
                    maxLength={200}
                    className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. ca. 25 Bläser"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Beschreibung *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={6}
                    maxLength={5000}
                    className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="Beschreibe den Auswahlchor..."
                  />
                </div>

                {/* Image */}
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Bild
                  </label>
                  {imageUrl ? (
                    <div className="flex items-start gap-4">
                      <div className="relative h-24 w-24 overflow-hidden rounded-lg">
                        <Image
                          src={imageUrl}
                          alt="Auswahlchor Bild"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setShowMediaPicker(true)}
                          className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Ändern
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setImageUrl("");
                            setImageId(null);
                          }}
                          className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          Entfernen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowMediaPicker(true)}
                      className="dark:border-dark-border dark:text-dark-text flex h-24 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-600"
                    >
                      <div className="text-center">
                        <ImageIcon className="mx-auto h-8 w-8" />
                        <span className="mt-1 block text-sm">
                          Bild auswählen
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Styling */}
            <div
              id="auswahlchor-form-styling"
              className="dark:border-dark-border dashboard-form-scroll-anchor border-t border-gray-200/80 pt-10"
            >
              <div className="dark:border-dark-border dark:bg-dark-surface space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="dark:text-dark-text text-lg font-semibold text-gray-900">
                  Styling
                </h2>

                {/* Color */}
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Tailwind-Farbe
                  </label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    maxLength={50}
                    className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. bg-primary"
                  />
                  <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                    Tailwind CSS-Klasse für die Farbe
                  </p>
                </div>

                {/* Color Hex */}
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Hex-Farbe
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      maxLength={7}
                      className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      placeholder="#faa619"
                    />
                    {colorHex && (
                      <div
                        className="h-10 w-10 rounded border border-gray-300"
                        style={{ backgroundColor: colorHex }}
                      />
                    )}
                  </div>
                  <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                    Hexadezimaler Farbcode (z.B. #faa619)
                  </p>
                </div>
              </div>
            </div>

            {/* People */}
            <div
              id="auswahlchor-form-personen"
              className="dark:border-dark-border dashboard-form-scroll-anchor border-t border-gray-200/80 pt-10"
            >
              <div className="dark:border-dark-border dark:bg-dark-surface space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="dark:text-dark-text text-lg font-semibold text-gray-900">
                  Personen
                </h2>

                {/* Conductor */}
                <div className="relative" data-dropdown>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Chorleitung
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={conductorSearch}
                      onChange={(e) => {
                        setConductorSearch(e.target.value);
                        setShowConductorDropdown(true);
                        if (!e.target.value) setConductorId(null);
                      }}
                      onFocus={() => setShowConductorDropdown(true)}
                      placeholder="Name oder E-Mail eingeben..."
                      className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                    {conductorId && (
                      <button
                        type="button"
                        onClick={handleClearConductor}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Conductor Dropdown */}
                  {showConductorDropdown && (
                    <div className="dark:border-dark-border dark:bg-dark-surface absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                      <div
                        className="overflow-y-auto"
                        style={{ maxHeight: "240px" }}
                      >
                        {filteredConductorUsers &&
                        filteredConductorUsers.length > 0 ? (
                          filteredConductorUsers.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => handleConductorSelect(user)}
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
                            {conductorSearch
                              ? "Keine Benutzer gefunden"
                              : "Tippe, um Benutzer zu suchen"}
                          </div>
                        )}
                      </div>
                      {conductorId && (
                        <button
                          type="button"
                          onClick={handleClearConductor}
                          className="dark:border-dark-border block w-full border-t border-gray-200 px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700"
                        >
                          Verknüpfung entfernen
                        </button>
                      )}
                    </div>
                  )}

                  {/* Selected conductor indicator */}
                  {conductorId && (
                    <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                      ✓ Chorleitung verknüpft
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Settings */}
            <div
              id="auswahlchor-form-einstellungen"
              className="dark:border-dark-border dashboard-form-scroll-anchor border-t border-gray-200/80 pt-10"
            >
              <div className="dark:border-dark-border dark:bg-dark-surface space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="dark:text-dark-text text-lg font-semibold text-gray-900">
                  Einstellungen
                </h2>

                {/* Show Application */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showApplication"
                    checked={showApplication}
                    onChange={(e) => setShowApplication(e.target.checked)}
                    className="text-primary h-4 w-4 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="showApplication"
                    className="dark:text-dark-text text-sm font-medium text-gray-700"
                  >
                    Bewerbung anzeigen
                  </label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="dark:border-dark-border mt-16 flex flex-col gap-3 border-t border-gray-200/80 pt-10 sm:flex-row sm:justify-end">
              <button
                type="submit"
                disabled={isSubmitting || updateMutation.isPending}
                className="bg-primary hover:bg-primary/90 rounded-lg px-6 py-2.5 font-medium text-white transition-colors disabled:opacity-50"
              >
                {isSubmitting || updateMutation.isPending
                  ? "Wird gespeichert..."
                  : "Änderungen speichern"}
              </button>
              <Link
                href={`/dashboard/auswahlchoere/${auswahlchorId}`}
                className="dark:border-dark-border dark:text-dark-text inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Abbrechen
              </Link>
            </div>
          </DashboardSectionedFormLayout>
        </form>
      </DashboardPage>
      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaSelect}
      />
    </>
  );
}
