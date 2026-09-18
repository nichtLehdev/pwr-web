"use client";
import { Input, Label, Select } from "@/app/_components/ui";

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
import { getErrorMessage } from "@/lib/utils";
import { PosaunenwartRoleType } from "~/generated/prisma/enums";

const ROLE_OPTIONS: { value: PosaunenwartRoleType; label: string }[] = [
  { value: PosaunenwartRoleType.LPW, label: "Landesposaunenwart (LPW)" },
  { value: PosaunenwartRoleType.RPW, label: "Regionalposaunenwart (RPW)" },
];

export default function NewPosaunenwartPage() {
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
    PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENWARTE,
  );

  const [person, setPerson] = useState<PersonDetails>(emptyPersonDetails());
  const [roleLabel, setRoleLabel] = useState("");
  const [roleType, setRoleType] = useState<PosaunenwartRoleType>(
    PosaunenwartRoleType.RPW,
  );
  const [sortOrder, setSortOrder] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [userLabel, setUserLabel] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const utils = api.useUtils();

  const createMutation = api.organization.createPosaunenwart.useMutation({
    onSuccess: async (data) => {
      await utils.organization.getPosaunenwarte.invalidate();
      toast.success("Posaunenwart erfolgreich erstellt");
      router.push(`/dashboard/posaunenwarte/${data.id}`);
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
      router.push("/login?callbackUrl=/dashboard/posaunenwarte/new");
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
      userId: userId || undefined,
      name: person.name.trim() || undefined,
      email: person.email.trim() || undefined,
      phone: person.phone.trim() || undefined,
      bio: person.bio.trim() || undefined,
      imageId: person.imageId || undefined,
      roleLabel: roleLabel.trim() || undefined,
      roleType,
      sortOrder,
    });
  };

  if (sessionLoading || profileLoading) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageOrganization) {
    return null;
  }

  return (
    <DashboardPage
      title="Neuer Posaunenwart"
      description="Posaunenwart anlegen (LPW oder RPW)"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Posaunenwarte", href: "/dashboard/posaunenwarte" },
        { label: "Neu" },
      ]}
      maxWidth="7xl"
    >
      {error && (
        <div className="mb-6 border-l-4 border-red-600 bg-red-50 p-4 text-red-700 dark:border-red-400 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="border-rule dark:border-night-rule dark:bg-night-raised bg-paper border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
            Rolle
          </h2>
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
          <div className="mt-4">
            <Label>Bezeichnung</Label>
            <Input
              type="text"
              value={roleLabel}
              onChange={(e) => setRoleLabel(e.target.value)}
              placeholder="z.B. Landesposaunenwart"
              maxLength={100}
            />
            <p className="text-dark dark:text-night-muted mt-1 text-xs">
              Erscheint als Badge auf der öffentlichen Seite. Leer lassen für
              die Standardbezeichnung der gewählten Art.
            </p>
          </div>
          <div className="mt-4">
            <Label>Reihenfolge</Label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
            />
            <p className="text-dark dark:text-night-muted mt-1 text-xs">
              Tipp: Die Reihenfolge lässt sich auch direkt in der Liste per
              Pfeiltasten ändern.
            </p>
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

        <PersonDetailsFields
          value={person}
          onChange={(patch) =>
            setPerson((current) => ({ ...current, ...patch }))
          }
          hasLinkedUser={!!userId}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/dashboard/posaunenwarte"
            className="border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night semi-condensed inline-flex min-h-11 items-center justify-center border-2 px-6 py-2.5 text-center font-semibold transition-colors"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
            className="bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted semi-condensed inline-flex min-h-11 items-center justify-center px-6 py-2.5 font-semibold transition-colors disabled:opacity-50"
          >
            {isSubmitting || createMutation.isPending
              ? "Wird erstellt..."
              : "Posaunenwart anlegen"}
          </button>
        </div>
      </form>
    </DashboardPage>
  );
}
