"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/utils";
import {
  DashboardPage,
  PersonDetailsFields,
  UserLinkField,
  emptyPersonDetails,
  type PersonDetails,
} from "@/app/_components/dashboard";
import { Input, Label, Textarea } from "@/app/_components/ui";

// Dashboard access is now controlled by permissions

export default function EditVorstandPage() {
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
    PERMISSIONS.ORGANIZATION_MANAGE_VORSTAND,
  );

  const { data: member, isLoading: memberLoading } =
    api.organization.getVorstandMember.useQuery(
      { id: memberId },
      { enabled: !!memberId && !!session?.user },
    );

  const [person, setPerson] = useState<PersonDetails>(emptyPersonDetails());
  const [position, setPosition] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
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
        bio: "",
        imageId: member.imageId,
        imageUrl: member.image?.url ?? null,
      });
      setPosition(member.position || "");
      setDescription(member.description || "");
      setColor(member.color || "");
      setSortOrder(member.sortOrder || 0);
      setUserId(member.userId || null);
      setUserLabel(member.user?.displayName ?? member.user?.email ?? "");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [member]);

  const utils = api.useUtils();

  const updateMutation = api.organization.updateVorstandMember.useMutation({
    onSuccess: async () => {
      toast.success("Vorstandsmitglied erfolgreich aktualisiert");
      await utils.organization.getVorstand.invalidate();
      await utils.organization.getVorstandMember.invalidate({ id: memberId });
      router.push(`/dashboard/vorstand/${memberId}`);
    },
    onError: (err) => {
      toast.error("Fehler beim Aktualisieren: " + getErrorMessage(err));
      setError(getErrorMessage(err));
      setIsSubmitting(false);
    },
  });

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/vorstand/${memberId}/edit`);
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

    if (!position.trim()) {
      setError("Bitte gib eine Position ein.");
      setIsSubmitting(false);
      return;
    }

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
      position: position.trim(),
      description: description.trim() || null,
      color: color.trim() || null,
      sortOrder,
      userId,
      imageId: person.imageId,
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
            Vorstandsmitglied nicht gefunden
          </h1>
          <Link
            href="/dashboard/vorstand"
            className="text-primary-ink dark:text-primary mt-4 inline-block hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const memberName = member.name || member.user?.displayName || "Mitglied";

  return (
    <>
      <DashboardPage
        title="Vorstandsmitglied bearbeiten"
        description="Bearbeite die Daten des Vorstandsmitglieds"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Vorstand", href: "/dashboard/vorstand" },
          { label: memberName, href: `/dashboard/vorstand/${memberId}` },
          { label: "Bearbeiten" },
        ]}
        maxWidth="7xl"
      >
        {/* Error Message */}
        {error && (
          <div className="mb-6 border-l-4 border-red-600 bg-red-50 p-4 text-red-700 dark:border-red-400 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <PersonDetailsFields
            value={person}
            onChange={(patch) =>
              setPerson((current) => ({ ...current, ...patch }))
            }
            hasLinkedUser={!!userId}
            showBio={false}
          />

          {/* Position Info */}
          <section className="border-rule dark:border-night-rule dark:bg-night-raised bg-paper border p-6">
            <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
              Position
            </h2>
            <div className="space-y-4">
              <div>
                <Label required>Position</Label>
                <Input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="z.B. Landesobmann, Schriftführer..."
                  required
                />
              </div>

              <div>
                <Label>Beschreibung</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Aufgabenbeschreibung..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Farbe (Tailwind-Klasse)</Label>
                  <Input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="z.B. bg-blue-100 text-blue-800"
                  />
                </div>

                <div>
                  <Label>Reihenfolge</Label>
                  <Input
                    type="number"
                    value={sortOrder}
                    onChange={(e) =>
                      setSortOrder(parseInt(e.target.value) || 0)
                    }
                  />
                  <p className="text-dark dark:text-night-muted mt-1 text-xs">
                    Tipp: Die Reihenfolge lässt sich auch direkt in der Liste
                    per Pfeiltasten ändern.
                  </p>
                </div>
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
            description="Optional: Verknüpfe dieses Vorstandsmitglied mit einem Benutzerkonto. Leer gelassene Angaben werden dann von dort übernommen."
          />

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href={`/dashboard/vorstand/${memberId}`}
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

        {/* Media Picker Modal */}
      </DashboardPage>
    </>
  );
}
