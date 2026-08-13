"use client";
import { Select } from "@/app/_components/ui";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import {
  DashboardPage,
  PersonDetailsFields,
  UserLinkField,
  emptyPersonDetails,
  type PersonDetails,
} from "@/app/_components/dashboard";
import { PosaunenratRole } from "~/generated/prisma/enums";
import { getErrorMessage } from "@/lib/utils";

const POSAUNENRAT_ROLE_OPTIONS: { value: PosaunenratRole; label: string }[] = [
  { value: PosaunenratRole.VORSTAND, label: "Vorstand" },
  {
    value: PosaunenratRole.LANDESKIRCHENMUSIKDIREKTOR,
    label: "Landeskirchenmusikdirektor",
  },
  { value: PosaunenratRole.SACHVERSTAENDIGER, label: "Sachverständiger" },
  { value: PosaunenratRole.SACHVERSTAENDIGE, label: "Sachverständige" },
];

export default function NewPosaunenratPage() {
  const router = useRouter();
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

  const [person, setPerson] = useState<PersonDetails>(emptyPersonDetails());
  const [role, setRole] = useState<PosaunenratRole>(PosaunenratRole.VORSTAND);
  const [sortOrder, setSortOrder] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [userLabel, setUserLabel] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const utils = api.useUtils();

  const createMutation = api.organization.createPosaunenratMember.useMutation({
    onSuccess: async (data) => {
      await utils.organization.getPosaunenrat.invalidate();
      toast.success("Posaunenratsmitglied erfolgreich erstellt");
      router.push(`/dashboard/posaunenrat/${data.id}`);
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
      router.push("/login?callbackUrl=/dashboard/posaunenrat/new");
    }
  }, [session, sessionLoading, router]);

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

    createMutation.mutate({
      name: person.name.trim() || undefined,
      email: person.email.trim() || undefined,
      phone: person.phone.trim() || undefined,
      bio: person.bio.trim() || undefined,
      imageId: person.imageId || undefined,
      role,
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
      title="Neues Posaunenratsmitglied"
      description="Füge ein neues Mitglied zum Posaunenrat hinzu"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Posaunenrat", href: "/dashboard/posaunenrat" },
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
            href="/dashboard/posaunenrat"
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
