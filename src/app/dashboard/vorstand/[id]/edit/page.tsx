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
            Vorstandsmitglied nicht gefunden
          </h1>
          <Link
            href="/dashboard/vorstand"
            className="text-primary mt-4 inline-block hover:underline"
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
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-400">
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
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Position
            </h2>
            <div className="space-y-4">
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Position *
                </label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="z.B. Landesobmann, Schriftführer..."
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Beschreibung
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Aufgabenbeschreibung..."
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Farbe (Tailwind-Klasse)
                  </label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="z.B. bg-blue-100 text-blue-800"
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Reihenfolge
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) =>
                      setSortOrder(parseInt(e.target.value) || 0)
                    }
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  />
                  <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
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

        {/* Media Picker Modal */}
      </DashboardPage>
    </>
  );
}
