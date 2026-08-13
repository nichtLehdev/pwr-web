"use client";
import { Select } from "@/app/_components/ui";

import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { AlertTriangleIcon, TrashIcon } from "lucide-react";
import {
  DashboardPage,
  PersonDetailsFields,
  UserLinkField,
  emptyPersonDetails,
  type PersonDetails,
} from "@/app/_components/dashboard";
import { InfoIcon, PlusIcon } from "lucide-react";
import { getErrorMessage } from "@/lib/utils";
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

  const [person, setPerson] = useState<PersonDetails>(emptyPersonDetails());
  const [roleLabel, setRoleLabel] = useState("");
  const [roleType, setRoleType] = useState<PosaunenwartRoleType>(
    PosaunenwartRoleType.RPW,
  );
  const [sortOrder, setSortOrder] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [userLabel, setUserLabel] = useState("");

  const utils = api.useUtils();

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageOrganization = hasPermission(
    PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENWARTE,
  );

  const { data: member, isLoading: memberLoading } =
    api.organization.getPosaunenwart.useQuery({ id }, { enabled: !!id });

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
      // Rohwerte des Datensatzes: was hier steht, wird auch veröffentlicht.
      setPerson({
        name: member.storedName ?? "",
        email: member.storedEmail ?? "",
        phone: member.storedPhone ?? "",
        city: "",
        bio: member.storedBio ?? "",
        imageId: member.imageId,
        imageUrl: member.imageUrl,
      });
      setRoleLabel(member.districtRoleName ?? "");
      setRoleType(
        (member.role as PosaunenwartRoleType) ?? PosaunenwartRoleType.RPW,
      );
      const so =
        "sortOrder" in member
          ? (member as { sortOrder?: number }).sortOrder
          : undefined;
      setSortOrder(so ?? 0);
      setUserId(member.userId ?? null);
      setUserLabel(member.name ?? member.email ?? "");
    }
  }, [member]);

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);
    if (!userId && !person.name.trim()) {
      setFormError("Bitte wähle einen Benutzer aus oder gib einen Namen ein.");
      setIsSubmitting(false);
      return;
    }
    updateMutation.mutate({
      id,
      userId,
      name: person.name.trim() || null,
      email: person.email.trim() || null,
      phone: person.phone.trim() || null,
      bio: person.bio.trim() || null,
      roleLabel: roleLabel.trim() || null,
      roleType,
      sortOrder,
      imageId: person.imageId,
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
      !permissionsLoading &&
      !canManageOrganization &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [
    profile,
    profileLoading,
    permissionsLoading,
    canManageOrganization,
    router,
  ]);

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
        <PersonDetailsFields
          value={person}
          onChange={(patch) =>
            setPerson((current) => ({ ...current, ...patch }))
          }
          hasLinkedUser={!!userId}
        />

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
                Bezeichnung
              </label>
              <input
                type="text"
                value={roleLabel}
                onChange={(e) => setRoleLabel(e.target.value)}
                placeholder="z.B. Landesposaunenwart"
                maxLength={100}
                className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-1 focus:outline-none"
              />
              <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                Erscheint als Badge auf der öffentlichen Seite.
              </p>
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
              <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                Tipp: Die Reihenfolge lässt sich auch direkt in der Liste per
                Pfeiltasten ändern.
              </p>
            </div>
          </div>
        </section>

        <UserLinkField
          userId={userId}
          userLabel={userLabel}
          onSelect={(user) => {
            setUserId(user.id);
            setUserLabel(user.displayName ?? user.email);
          }}
          onClear={() => {
            setUserId(null);
            setUserLabel("");
          }}
          description="Optional: Verknüpfe diesen Posaunenwart mit einem Benutzerkonto. Leer gelassene Angaben werden dann von dort übernommen."
        />

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
    </DashboardPage>
  );
}
