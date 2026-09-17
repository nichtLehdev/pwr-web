"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import {
  DashboardPage,
  DashboardSectionedFormLayout,
  type DashboardSectionNavItem,
} from "@/app/_components/dashboard";
import { getErrorMessage } from "@/lib/utils";
import MediaPickerModal from "@/app/_components/editor/media-picker-modal";
import { ImageIcon, X } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Textarea,
} from "@/app/_components/ui";

const AUSWAHLCHOR_FORM_NAV: DashboardSectionNavItem[] = [
  { href: "#auswahlchor-form-grundlagen", label: "Grundlagen" },
  { href: "#auswahlchor-form-styling", label: "Styling" },
  { href: "#auswahlchor-form-personen", label: "Personen" },
  { href: "#auswahlchor-form-einstellungen", label: "Einstellungen" },
];

export default function NewAuswahlchorPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageAuswahlchoere = hasPermission(
    PERMISSIONS.ORGANIZATION_MANAGE_AUSWAHLCHOERE,
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
  const [color, setColor] = useState("bg-primary");
  const [colorHex, setColorHex] = useState("#faa619");
  const [imageId, setImageId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [conductorId, setConductorId] = useState<string | null>(null);
  const [conductorSearch, setConductorSearch] = useState("");
  const [showConductorDropdown, setShowConductorDropdown] = useState(false);
  const [showApplication, setShowApplication] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const filteredConductorUsers = usersData?.users.filter((user) => {
    if (!conductorSearch.trim()) return true;
    const searchLower = conductorSearch.toLowerCase();
    return (
      user.displayName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  const utils = api.useUtils();

  const createMutation = api.auswahlchoere.create.useMutation({
    onSuccess: async (data) => {
      await utils.auswahlchoere.getAll.invalidate();
      toast.success("Auswahlchor erfolgreich erstellt");
      router.push(`/dashboard/auswahlchoere/${data.id}`);
    },
    onError: (err) => {
      setError(getErrorMessage(err));
      setIsSubmitting(false);
      toast.error("Fehler beim Erstellen: " + err.message);
    },
  });

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/auswahlchoere/new");
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !permissionsLoading &&
      !canManageAuswahlchoere &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [
    profile,
    profileLoading,
    permissionsLoading,
    canManageAuswahlchoere,
    router,
  ]);

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

    createMutation.mutate({
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

  if (sessionLoading || profileLoading) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageAuswahlchoere) {
    return null;
  }

  return (
    <DashboardPage
      title="Neuer Auswahlchor"
      description="Erstelle einen neuen Auswahlchor"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Auswahlchöre", href: "/dashboard/auswahlchoere" },
        { label: "Neu" },
      ]}
      maxWidth="7xl"
    >
      {/* Error */}
      {error && (
        <div className="mb-6 border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
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
            className="dashboard-form-scroll-anchor space-y-6"
          >
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Grundinformationen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Name */}
                  <div>
                    <Label required>Name</Label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      maxLength={255}
                      placeholder="z.B. Con Spirito"
                    />
                  </div>

                  {/* Slug */}
                  <div>
                    <Label required>Slug</Label>
                    <Input
                      type="text"
                      value={slug}
                      onChange={(e) =>
                        setSlug(
                          e.target.value.toLowerCase().replace(/\s+/g, "-"),
                        )
                      }
                      required
                      maxLength={15}
                      placeholder="z.B. conspirito"
                    />
                    <p className="text-dark dark:text-night-muted mt-1 text-xs">
                      URL-freundlicher Name (max. 15 Zeichen, nur
                      Kleinbuchstaben und Bindestriche)
                    </p>
                  </div>

                  {/* Subtitle */}
                  <div>
                    <Label required>Untertitel</Label>
                    <Input
                      type="text"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      required
                      maxLength={200}
                      placeholder="z.B. Das Spitzenensemble"
                    />
                  </div>

                  {/* Founded */}
                  <div>
                    <Label required>Gegründet</Label>
                    <Input
                      type="text"
                      value={founded}
                      onChange={(e) => setFounded(e.target.value)}
                      required
                      maxLength={100}
                      placeholder="z.B. 1995"
                    />
                  </div>

                  {/* Members */}
                  <div>
                    <Label required>Mitglieder</Label>
                    <Input
                      type="text"
                      value={members}
                      onChange={(e) => setMembers(e.target.value)}
                      required
                      maxLength={200}
                      placeholder="z.B. ca. 25 Bläser"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <Label required>Beschreibung</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      rows={6}
                      maxLength={5000}
                      placeholder="Beschreibe den Auswahlchor..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Image */}
            <Card>
              <CardHeader>
                <CardTitle>Bild</CardTitle>
              </CardHeader>
              <CardContent>
                {imageUrl ? (
                  <div className="flex items-start gap-4">
                    <div className="border-rule dark:border-night-rule relative h-24 w-24 overflow-hidden border">
                      <Image
                        src={imageUrl}
                        alt="Auswahlchor Bild"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        onClick={() => setShowMediaPicker(true)}
                        variant="outline"
                        size="sm"
                      >
                        Ändern
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setImageUrl("");
                          setImageId(null);
                        }}
                        variant="outline"
                        size="sm"
                        className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        Entfernen
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowMediaPicker(true)}
                    className="border-ink dark:border-night-text hover:border-primary-ink dark:hover:bg-night-raised text-dark dark:text-night-muted hover:bg-rule/25 flex h-24 w-full items-center justify-center border-2 border-dashed transition-colors"
                  >
                    <div className="text-center">
                      <ImageIcon className="mx-auto h-8 w-8" />
                      <span className="mt-1 block text-sm">Bild auswählen</span>
                    </div>
                  </button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Styling */}
          <div
            id="auswahlchor-form-styling"
            className="border-rule dark:border-night-rule dashboard-form-scroll-anchor border-t pt-10"
          >
            <Card>
              <CardHeader>
                <CardTitle>Styling</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Color */}
                <div>
                  <Label>Tailwind-Farbe</Label>
                  <Input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    maxLength={50}
                    placeholder="z.B. bg-primary"
                  />
                  <p className="text-dark dark:text-night-muted mt-1 text-xs">
                    Tailwind CSS-Klasse für die Farbe
                  </p>
                </div>

                {/* Color Hex */}
                <div>
                  <Label>Hex-Farbe</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="text"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      maxLength={7}
                      placeholder="#faa619"
                    />
                    {colorHex && (
                      <div
                        className="border-rule dark:border-night-rule h-10 w-10 shrink-0 border"
                        style={{ backgroundColor: colorHex }}
                      />
                    )}
                  </div>
                  <p className="text-dark dark:text-night-muted mt-1 text-xs">
                    Hexadezimaler Farbcode (z.B. #faa619)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* People */}
          <div
            id="auswahlchor-form-personen"
            className="border-rule dark:border-night-rule dashboard-form-scroll-anchor border-t pt-10"
          >
            <Card>
              <CardHeader>
                <CardTitle>Personen</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Conductor */}
                <div className="relative" data-dropdown>
                  <Label>Chorleitung</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={conductorSearch}
                      onChange={(e) => {
                        setConductorSearch(e.target.value);
                        setShowConductorDropdown(true);
                        if (!e.target.value) setConductorId(null);
                      }}
                      onFocus={() => setShowConductorDropdown(true)}
                      placeholder="Name oder E-Mail eingeben..."
                      className="pr-10"
                    />
                    {conductorId && (
                      <button
                        type="button"
                        onClick={handleClearConductor}
                        className="text-dark hover:text-ink dark:text-night-muted dark:hover:text-night-text absolute top-1/2 right-3 -translate-y-1/2"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Conductor Dropdown */}
                  {showConductorDropdown && (
                    <div className="border-ink dark:border-night-text dark:bg-night-raised bg-paper absolute z-10 mt-1 w-full overflow-hidden border">
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
                              className="hover:bg-rule/25 dark:hover:bg-night-rule block w-full px-4 py-2 text-left text-sm transition-colors"
                            >
                              <span className="text-ink dark:text-night-text font-medium">
                                {user.displayName || user.email}
                              </span>
                              {user.displayName && (
                                <span className="text-dark dark:text-night-muted">
                                  {" "}
                                  – {user.email}
                                </span>
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="text-dark dark:text-night-muted px-4 py-3 text-sm">
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
                          className="border-rule dark:border-night-rule hover:bg-rule/25 dark:hover:bg-night-rule block w-full border-t px-4 py-2 text-left text-sm font-medium text-red-600 transition-colors dark:text-red-400"
                        >
                          Verknüpfung entfernen
                        </button>
                      )}
                    </div>
                  )}

                  {/* Selected conductor indicator */}
                  {conductorId && (
                    <p className="text-dark dark:text-night-muted mt-2 text-sm">
                      ✓ Chorleitung verknüpft
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Settings */}
          <div
            id="auswahlchor-form-einstellungen"
            className="border-rule dark:border-night-rule dashboard-form-scroll-anchor border-t pt-10"
          >
            <Card>
              <CardHeader>
                <CardTitle>Einstellungen</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Show Application */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showApplication"
                    checked={showApplication}
                    onChange={(e) => setShowApplication(e.target.checked)}
                  />
                  <Label htmlFor="showApplication" className="mb-0">
                    Bewerbung anzeigen
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="border-rule dark:border-night-rule mt-16 flex flex-col gap-3 border-t pt-10 sm:flex-row sm:justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || createMutation.isPending}
              isLoading={isSubmitting || createMutation.isPending}
            >
              Auswahlchor erstellen
            </Button>
            <Link
              href="/dashboard/auswahlchoere"
              className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 items-center justify-center gap-2 border px-4 py-2.5 transition-colors"
            >
              Abbrechen
            </Link>
          </div>
        </DashboardSectionedFormLayout>
      </form>

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaSelect}
      />
    </DashboardPage>
  );
}
