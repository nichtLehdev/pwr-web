"use client";
import { Input, Label, Select, Textarea } from "@/app/_components/ui";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { FoerdervereinRole } from "~/generated/prisma/enums";
import { getErrorMessage } from "@/lib/utils";
import {
  DashboardPage,
  PersonDetailsFields,
  UserLinkField,
  emptyPersonDetails,
  type PersonDetails,
} from "@/app/_components/dashboard";

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

export default function EditFoerdervereinPage() {
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
    PERMISSIONS.ORGANIZATION_MANAGE_FOERDERVEREIN,
  );

  const { data: member, isLoading: memberLoading } =
    api.organization.getFoerdervereinMember.useQuery(
      { id: memberId },
      { enabled: !!memberId && !!session?.user },
    );

  const [person, setPerson] = useState<PersonDetails>(emptyPersonDetails());
  const [position, setPosition] = useState("");
  const [role, setRole] = useState<FoerdervereinRole>(
    FoerdervereinRole.MITGLIED,
  );
  const [description, setDescription] = useState("");
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
        city: member.city ?? "",
        bio: "",
        imageId: member.imageId,
        imageUrl: member.image?.url ?? null,
      });
      setPosition(member.position || "");
      setRole(member.role as FoerdervereinRole);
      setDescription(member.description || "");
      setSortOrder(member.sortOrder || 0);
      setUserId(member.userId);
      setUserLabel(member.user?.displayName ?? member.user?.email ?? "");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [member]);

  const utils = api.useUtils();

  const updateMutation = api.organization.updateFoerdervereinMember.useMutation(
    {
      onSuccess: async () => {
        await utils.organization.getFoerderverein.invalidate();
        await utils.organization.getFoerdervereinMember.invalidate({
          id: memberId,
        });
        toast.success("Fördervereinsmitglied erfolgreich aktualisiert");
        router.push(`/dashboard/foerderverein/${memberId}`);
      },
      onError: (err) => {
        setError(getErrorMessage(err));
        setIsSubmitting(false);
        toast.error("Fehler beim Aktualisieren: " + err.message);
      },
    },
  );

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(
        `/login?callbackUrl=/dashboard/foerderverein/${memberId}/edit`,
      );
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
      city: person.city.trim() || null,
      imageId: person.imageId,
      position: position.trim() || null,
      role,
      description: description.trim() || null,
      sortOrder,
      userId,
    });
  };

  if (sessionLoading || profileLoading || memberLoading) {
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
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-ink dark:text-night-text text-xl font-semibold">
            Fördervereinsmitglied nicht gefunden
          </h1>
          <Link
            href="/dashboard/foerderverein"
            className="text-primary-ink dark:text-primary mt-4 inline-block hover:underline"
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
      title="Fördervereinsmitglied bearbeiten"
      description="Bearbeite die Daten des Fördervereinsmitglieds"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Förderverein", href: "/dashboard/foerderverein" },
        { label: displayName, href: `/dashboard/foerderverein/${memberId}` },
        { label: "Bearbeiten" },
      ]}
      maxWidth="7xl"
    >
      {error && (
        <div className="mb-6 border-l-4 border-red-600 bg-red-50 p-4 text-red-700 dark:border-red-400 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

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
          description="Optional: Verknüpfe dieses Mitglied mit einem Benutzerkonto. Leer gelassene Angaben werden dann von dort übernommen."
        />

        <PersonDetailsFields
          value={person}
          onChange={(patch) =>
            setPerson((current) => ({ ...current, ...patch }))
          }
          hasLinkedUser={!!userId}
          showBio={false}
          showCity
        />

        <section className="border-rule dark:border-night-rule dark:bg-night-raised bg-paper border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
            Position & Rolle
          </h2>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Position (Freitext)</Label>
                <Input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="z.B. 1. Vorsitzender"
                  maxLength={100}
                />
              </div>

              <div>
                <Label required>Rolle</Label>
                <Select
                  value={role}
                  onChange={(e) => setRole(e.target.value as FoerdervereinRole)}
                >
                  {FOERDERVEREIN_ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Reihenfolge</Label>
                <Input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                />
                <p className="text-dark dark:text-night-muted mt-1 text-xs">
                  Tipp: Die Reihenfolge lässt sich auch direkt in der Liste per
                  Pfeiltasten ändern.
                </p>
              </div>
            </div>

            <div>
              <Label>Beschreibung</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Zusätzliche Informationen zum Mitglied..."
                maxLength={1000}
              />
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            href={`/dashboard/foerderverein/${memberId}`}
            className="border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night semi-condensed inline-flex min-h-11 items-center justify-center border-2 px-6 py-2.5 text-center font-semibold transition-colors"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || updateMutation.isPending}
            className="bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted semi-condensed inline-flex min-h-11 items-center justify-center px-6 py-2.5 font-semibold transition-colors disabled:opacity-50"
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
