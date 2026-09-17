"use client";
import { Input, Label, Select } from "@/app/_components/ui";

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
import { Tag } from "@/app/_components/programmheft/tag";
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
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageOrganization) {
    return null;
  }

  if (!member) {
    return (
      <main className="bg-paper dark:bg-night min-h-screen">
        <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="border-rule dark:border-night-rule dark:bg-night-raised bg-paper border p-12 text-center">
            <h2 className="text-ink dark:text-night-text mb-4 text-xl font-semibold">
              Posaunenwart nicht gefunden
            </h2>
            <Link
              href="/dashboard/posaunenwarte"
              className="text-primary-ink dark:text-primary hover:underline"
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
        <div className="mb-6 border-l-4 border-red-600 bg-red-50 p-4 text-red-700 dark:border-red-400 dark:bg-red-900/20 dark:text-red-400">
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

        <section className="border-rule dark:border-night-rule dark:bg-night-raised bg-paper border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
            Rolle
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Art</Label>
              <Select
                value={roleType}
                onChange={(e) =>
                  setRoleType(e.target.value as PosaunenwartRoleType)
                }
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Bezeichnung</Label>
              <Input
                type="text"
                value={roleLabel}
                onChange={(e) => setRoleLabel(e.target.value)}
                placeholder="z.B. Landesposaunenwart"
                maxLength={100}
              />
              <p className="text-dark dark:text-night-muted mt-1 text-xs">
                Erscheint als Badge auf der öffentlichen Seite.
              </p>
            </div>
            <div>
              <Label>Reihenfolge</Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(parseInt(e.target.value, 10) || 0)
                }
              />
              <p className="text-dark dark:text-night-muted mt-1 text-xs">
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
            className="bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted semi-condensed inline-flex min-h-11 items-center justify-center px-6 py-2.5 font-semibold transition-colors disabled:opacity-50"
          >
            {isSubmitting || updateMutation.isPending
              ? "Wird gespeichert..."
              : "Änderungen speichern"}
          </button>
          <Link
            href={`/dashboard/posaunenwarte/${id}`}
            className="border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night semi-condensed inline-flex min-h-11 items-center justify-center border-2 px-6 py-2.5 text-center font-semibold transition-colors"
          >
            Abbrechen
          </Link>
        </div>
      </form>

      {/* Bezirke section */}
      <div className="border-rule dark:border-night-rule mt-10 border-t pt-10">
        <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
          Zuständige Bezirke
        </h2>

        {error && (
          <div className="mb-6 border-l-4 border-red-600 bg-red-50 p-4 dark:border-red-400 dark:bg-red-900/20">
            <div className="flex gap-3">
              <AlertTriangleIcon className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {isLPW && (
          <div className="mb-6 border-l-4 border-blue-600 bg-blue-50 p-4 dark:border-blue-400 dark:bg-blue-900/20">
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

        <div className="border-rule dark:border-night-rule dark:bg-night-raised bg-paper mb-6 border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="condensed text-ink dark:text-night-text text-base font-bold">
              Zugewiesene Bezirke
            </h3>
            <Tag tone="inverse">
              {assignedBezirke.length} Bezirk
              {assignedBezirke.length !== 1 ? "e" : ""}
            </Tag>
          </div>

          {assignedBezirke.length === 0 ? (
            <div className="border-rule dark:border-night-rule bg-rule/25 dark:bg-night-raised border p-6 text-center">
              <p className="text-dark dark:text-night-muted text-sm">
                Keine Bezirke zugewiesen. Wähle unten Bezirke aus, um sie
                hinzuzufügen.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {assignedBezirke.map((bezirk) => (
                <div
                  key={bezirk.id}
                  className="border-rule dark:border-night-rule bg-paper dark:bg-night flex items-center justify-between border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-rule/25 dark:bg-night-raised flex h-10 w-10 items-center justify-center">
                      <span className="text-ink dark:text-night-text font-semibold">
                        {bezirk.number}
                      </span>
                    </div>
                    <div>
                      <p className="text-ink dark:text-night-text text-sm font-medium">
                        Bezirk {bezirk.number}
                      </p>
                      {bezirk.name && (
                        <p className="text-dark dark:text-night-muted text-xs">
                          {bezirk.shortName || bezirk.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRemoveBezirk(bezirk.id)}
                    disabled={saving}
                    className="p-1.5 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    title="Bezirk entfernen"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-rule dark:border-night-rule dark:bg-night-raised bg-paper border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="condensed text-ink dark:text-night-text text-base font-bold">
              Verfügbare Bezirke
            </h3>
            <Tag tone="inverse">{availableBezirke.length} verfügbar</Tag>
          </div>

          {availableBezirke.length === 0 ? (
            <div className="border-rule dark:border-night-rule bg-rule/25 dark:bg-night-raised border p-6 text-center">
              <p className="text-dark dark:text-night-muted text-sm">
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
                  className="border-rule dark:border-night-rule bg-paper dark:bg-night hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 flex items-center gap-3 border p-3 text-left transition-colors disabled:opacity-50"
                >
                  <div className="bg-rule/25 dark:bg-night-raised flex h-10 w-10 items-center justify-center">
                    <span className="text-ink dark:text-night-text font-semibold">
                      {bezirk.number}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-ink dark:text-night-text text-sm font-medium">
                      Bezirk {bezirk.number}
                    </p>
                    {bezirk.name && (
                      <p className="text-dark dark:text-night-muted text-xs">
                        {bezirk.shortName || bezirk.name}
                      </p>
                    )}
                  </div>
                  <PlusIcon className="text-primary-ink dark:text-primary h-5 w-5" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/dashboard/posaunenwarte/${id}`}
            className="bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted semi-condensed inline-flex min-h-11 items-center gap-2 px-4 py-2 font-semibold transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Zur Detailansicht
          </Link>
          <Link
            href="/dashboard/posaunenwarte"
            className="border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night semi-condensed inline-flex min-h-11 items-center gap-2 border-2 px-4 py-2 font-semibold transition-colors"
          >
            Zur Übersicht
          </Link>
        </div>
      </div>
    </DashboardPage>
  );
}
