"use client";
import { Select } from "@/app/_components/ui";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { PosaunenratRole } from "~/generated/prisma/enums";
import { getErrorMessage } from "@/lib/utils";
import {
  DashboardPage,
  PersonDetailsFields,
  UserLinkField,
  emptyPersonDetails,
  type PersonDetails,
} from "@/app/_components/dashboard";

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

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageOrganization = hasPermission(
    PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENRAT,
  );

  const { data: member, isLoading: memberLoading } =
    api.organization.getPosaunenratMember.useQuery(
      { id: memberId },
      { enabled: !!memberId && !!session?.user },
    );

  const [person, setPerson] = useState<PersonDetails>(emptyPersonDetails());
  const [role, setRole] = useState<PosaunenratRole>(PosaunenratRole.VORSTAND);
  const [sortOrder, setSortOrder] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [userLabel, setUserLabel] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (member) {
      /* eslint-disable react-hooks/set-state-in-effect */
      // Rohwerte des Datensatzes: was hier steht, wird auch veröffentlicht.
      setPerson({
        name: member.name ?? "",
        email: member.email ?? "",
        phone: member.phone ?? "",
        city: "",
        bio: member.bio ?? "",
        imageId: member.imageId,
        imageUrl: member.image?.url ?? null,
      });
      setRole(member.role as PosaunenratRole);
      setSortOrder(member.sortOrder || 0);
      setUserId(member.userId);
      setUserLabel(member.user?.displayName ?? member.user?.email ?? "");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [member]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (!userId && !person.name.trim()) {
      setError("Bitte wähle einen Benutzer aus oder gib einen Namen ein.");
      setIsSubmitting(false);
      return;
    }

    updateMutation.mutate({
      id: memberId,
      name: person.name.trim() || null,
      email: person.email.trim() || null,
      phone: person.phone.trim() || null,
      bio: person.bio.trim() || null,
      imageId: person.imageId,
      role,
      sortOrder,
      userId,
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

  const displayName = member.person.name || "Mitglied";

  return (
    <DashboardPage
      title="Posaunenratsmitglied bearbeiten"
      description="Bearbeite die Daten des Posaunenratsmitglieds"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Posaunenrat", href: "/dashboard/posaunenrat" },
        { label: displayName, href: `/dashboard/posaunenrat/${memberId}` },
        { label: "Bearbeiten" },
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
          description="Optional: Verknüpfe dieses Posaunenratsmitglied mit einem Benutzerkonto. Leer gelassene Angaben werden dann von dort übernommen."
        />

        <PersonDetailsFields
          value={person}
          onChange={(patch) =>
            setPerson((current) => ({ ...current, ...patch }))
          }
          hasLinkedUser={!!userId}
        />

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
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as PosaunenratRole)}
                className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
              >
                {POSAUNENRAT_ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
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
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
              />
              <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                Tipp: Die Reihenfolge lässt sich auch direkt in der Liste per
                Pfeiltasten ändern.
              </p>
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
    </DashboardPage>
  );
}
