"use client";
import { Select } from "@/app/_components/ui";

import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeftIcon, UserIcon } from "lucide-react";
import { AlertTriangleIcon, TrashIcon } from "lucide-react";
import { DashboardPage } from "@/app/_components/dashboard";
import { InfoIcon, PlusIcon, XIcon } from "lucide-react";
import { getErrorMessage } from "@/lib/utils";
import MediaPickerModal from "@/app/_components/editor/media-picker-modal";
import { PosaunenwartRoleType } from "~/generated/prisma/enums";

const ROLE_OPTIONS: { value: PosaunenwartRoleType; label: string }[] = [
  { value: PosaunenwartRoleType.LPW, label: "Landesposaunenwart (LPW)" },
  { value: PosaunenwartRoleType.RPW, label: "Regionalposaunenwart (RPW)" },
];

export default function DashboardPosaunenwarteEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { data: session, isPending } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleType, setRoleType] = useState<PosaunenwartRoleType>(
    PosaunenwartRoleType.RPW,
  );
  const [sortOrder, setSortOrder] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [imageId, setImageId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  const utils = api.useUtils();

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: canManageOrganization } = api.permissions.canManage.useQuery(
    undefined,
    { enabled: !!session?.user },
  );

  const { data: member, isLoading: memberLoading } =
    api.organization.getPosaunenwart.useQuery({ id }, { enabled: !!id });

  const { data: users } = api.users.list.useQuery(
    { page: 1, limit: 100 },
    { enabled: !!session?.user },
  );

  const { data: bezirke, isLoading: bezirkeLoading } =
    api.bezirke.getAll.useQuery();

  const updateMutation = api.organization.updatePosaunenwart.useMutation({
    onSuccess: async () => {
      toast.success("Posaunenwart erfolgreich aktualisiert");
      await utils.organization.getPosaunenwart.invalidate({ id });
      await utils.organization.getPosaunenwarte.invalidate();
      setIsSubmitting(false);
    },
    onError: (err) => {
      setFormError(getErrorMessage(err));
      toast.error("Fehler: " + err.message);
      setIsSubmitting(false);
    },
  });

  const addResponsibility =
    api.organization.addPosaunenwartResponsibility.useMutation({
      onSuccess: () => {
        void utils.organization.getPosaunenwart.invalidate({ id });
        void utils.organization.getPosaunenwarte.invalidate();
        toast.success("Verantwortung erfolgreich hinzugefügt");
      },
      onError: (err) => {
        setError(err.message);
        toast.error("Fehler: " + err.message);
      },
    });

  const removeResponsibility =
    api.organization.removePosaunenwartResponsibility.useMutation({
      onSuccess: () => {
        void utils.organization.getPosaunenwart.invalidate({ id });
        void utils.organization.getPosaunenwarte.invalidate();
        toast.success("Verantwortung erfolgreich entfernt");
      },
      onError: (err) => {
        setError(err.message);
        toast.error("Fehler: " + err.message);
      },
    });

  useEffect(() => {
    if (member) {
      setName(member.storedName ?? member.name ?? "");
      setEmail(member.storedEmail ?? member.email ?? "");
      setPhone(member.storedPhone ?? member.phone ?? "");
      setRoleType(
        (member.role as PosaunenwartRoleType) ?? PosaunenwartRoleType.RPW,
      );
      const so =
        "sortOrder" in member
          ? (member as { sortOrder?: number }).sortOrder
          : undefined;
      setSortOrder(so ?? 0);
      setUserId(member.userId ?? null);
      setUserSearch(member.name ?? member.email ?? "");
      setImageId(member.imageId ?? null);
      setImageUrl(member.imageUrl ?? null);
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

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);
    if (!userId && !name.trim()) {
      setFormError("Bitte wähle einen Benutzer aus oder gib einen Namen ein.");
      setIsSubmitting(false);
      return;
    }
    updateMutation.mutate({
      id,
      userId: userId || undefined,
      name: name.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      roleType,
      sortOrder,
      imageId: imageId,
    });
  };

  const handleAddBezirk = async (bezirkId: string) => {
    if (!member) return;
    setSaving(true);
    setError(null);
    try {
      await addResponsibility.mutateAsync({
        posaunenwartId: id,
        bezirkId,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBezirk = async (bezirkId: string) => {
    setSaving(true);
    setError(null);
    try {
      await removeResponsibility.mutateAsync({
        posaunenwartId: id,
        bezirkId,
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/posaunenwarte/${id}/edit`);
    }
  }, [isPending, session, router, id]);

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

  if (isPending || profileLoading || memberLoading || bezirkeLoading) {
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
      <main className="dark:bg-dark-background min-h-screen bg-gray-50">
        <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-xl font-semibold text-gray-900">
              Posaunenwart nicht gefunden
            </h2>
            <Link
              href="/dashboard/posaunenwarte"
              className="text-primary hover:text-primary/80"
            >
              Zurück zur Übersicht
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isLPW = member.role === "LPW";
  const displayName = member.name || "Unbekannt";

  const assignedBezirkIds = new Set(member.bezirke?.map((b) => b.id) || []);
  const assignedBezirke =
    bezirke?.filter((b) => assignedBezirkIds.has(b.id)) || [];
  const availableBezirke =
    bezirke?.filter((b) => !assignedBezirkIds.has(b.id)) || [];

  return (
    <DashboardPage
      title="Posaunenwart bearbeiten"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Posaunenwarte", href: "/dashboard/posaunenwarte" },
        { label: displayName, href: `/dashboard/posaunenwarte/${id}` },
        { label: "Bearbeiten" },
      ]}
      maxWidth="7xl"
    >
      {formError && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {formError}
        </div>
      )}

      {/* Form: Posaunenwart-Daten */}
      <form onSubmit={handleSubmitForm} className="space-y-8">
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
                  alt={displayName}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <UserIcon className="h-12 w-12" />
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

        {/* Role & Sort */}
        <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
            Rolle
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                Art
              </label>
              <Select
                value={roleType}
                onChange={(e) =>
                  setRoleType(e.target.value as PosaunenwartRoleType)
                }
                className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-1 focus:outline-none"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                Reihenfolge
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(parseInt(e.target.value, 10) || 0)
                }
                className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-1 focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* User link */}
        <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
            Benutzerverknüpfung
          </h2>
          <p className="dark:text-dark-muted mb-4 text-sm text-gray-600">
            Optional: Verknüpfe mit einem Benutzerkonto. Kontaktdaten werden
            dann vom Benutzer übernommen.
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
                className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 focus:ring-1 focus:outline-none"
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
            {showUserDropdown && (
              <div className="dark:border-dark-border dark:bg-dark-surface absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
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
            )}
            {userId && (
              <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                ✓ Benutzer verknüpft
              </p>
            )}
          </div>
        </section>

        {/* Contact (when no user) */}
        {!userId && (
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Kontaktdaten
            </h2>
            <p className="dark:text-dark-muted mb-4 text-sm text-gray-600">
              Diese Felder werden nur verwendet, wenn kein Benutzer verknüpft
              ist.
            </p>
            <div className="space-y-4">
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Vollständiger Name"
                  maxLength={100}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-1 focus:outline-none"
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
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-1 focus:outline-none"
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
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-1 focus:outline-none"
                />
              </div>
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
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
            href={`/dashboard/posaunenwarte/${id}`}
            className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-6 py-2.5 text-center font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Abbrechen
          </Link>
        </div>
      </form>

      {/* Bezirke section */}
      <div className="dark:border-dark-border mt-10 border-t border-gray-200 pt-10">
        <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
          Zuständige Bezirke
        </h2>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex gap-3">
              <AlertTriangleIcon className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {isLPW && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="flex gap-3">
              <InfoIcon className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium">Hinweis für Landesposaunenwart</p>
                <p className="mt-1">
                  Als Landesposaunenwart ist diese Person automatisch für alle
                  Bezirke zuständig. Die Bezirkszuordnungen hier sind nur für
                  spezielle Verantwortlichkeiten gedacht.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="dark:text-dark-text text-base font-semibold text-gray-900">
              Zugewiesene Bezirke
            </h3>
            <span className="dark:bg-dark-background-secondary dark:text-dark-muted rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-600">
              {assignedBezirke.length} Bezirk
              {assignedBezirke.length !== 1 ? "e" : ""}
            </span>
          </div>

          {assignedBezirke.length === 0 ? (
            <div className="dark:border-dark-border dark:bg-dark-background-secondary rounded-lg border border-gray-100 bg-gray-50 p-6 text-center">
              <p className="dark:text-dark-muted text-sm text-gray-600">
                Keine Bezirke zugewiesen. Wähle unten Bezirke aus, um sie
                hinzuzufügen.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {assignedBezirke.map((bezirk) => (
                <div
                  key={bezirk.id}
                  className="dark:border-dark-border flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:bg-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="dark:bg-dark-background-secondary flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                      <span className="dark:text-dark-text font-semibold text-gray-700">
                        {bezirk.number}
                      </span>
                    </div>
                    <div>
                      <p className="dark:text-dark-text text-sm font-medium text-gray-900">
                        Bezirk {bezirk.number}
                      </p>
                      {bezirk.name && (
                        <p className="dark:text-dark-muted text-xs text-gray-500">
                          {bezirk.shortName || bezirk.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRemoveBezirk(bezirk.id)}
                    disabled={saving}
                    className="rounded p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    title="Bezirk entfernen"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="dark:text-dark-text text-base font-semibold text-gray-900">
              Verfügbare Bezirke
            </h3>
            <span className="dark:bg-dark-background-secondary dark:text-dark-muted rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-600">
              {availableBezirke.length} verfügbar
            </span>
          </div>

          {availableBezirke.length === 0 ? (
            <div className="dark:border-dark-border dark:bg-dark-background-secondary rounded-lg border border-gray-100 bg-gray-50 p-6 text-center">
              <p className="dark:text-dark-muted text-sm text-gray-600">
                Alle Bezirke wurden bereits zugewiesen.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {availableBezirke.map((bezirk) => (
                <button
                  key={bezirk.id}
                  type="button"
                  onClick={() => void handleAddBezirk(bezirk.id)}
                  disabled={saving}
                  className="dark:border-dark-border flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:border-green-300 hover:bg-green-50 disabled:opacity-50 dark:bg-gray-800 dark:hover:border-green-600 dark:hover:bg-green-900/20"
                >
                  <div className="dark:bg-dark-background-secondary flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    <span className="dark:text-dark-text font-semibold text-gray-700">
                      {bezirk.number}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="dark:text-dark-text text-sm font-medium text-gray-900">
                      Bezirk {bezirk.number}
                    </p>
                    {bezirk.name && (
                      <p className="dark:text-dark-muted text-xs text-gray-500">
                        {bezirk.shortName || bezirk.name}
                      </p>
                    )}
                  </div>
                  <PlusIcon className="h-5 w-5 text-green-500" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/dashboard/posaunenwarte/${id}`}
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Zur Detailansicht
          </Link>
          <Link
            href="/dashboard/posaunenwarte"
            className="dark:border-dark-border dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Zur Übersicht
          </Link>
        </div>
      </div>

      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={(url, _alt, mediaId) => {
          if (mediaId) setImageId(mediaId);
          setImageUrl(url);
          setIsMediaPickerOpen(false);
        }}
      />
    </DashboardPage>
  );
}
