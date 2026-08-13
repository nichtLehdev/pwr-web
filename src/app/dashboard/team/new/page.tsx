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
import { ContactType } from "~/generated/prisma/enums";
import { getErrorMessage } from "@/lib/utils";
import {
  SocialIcon,
  SOCIAL_TYPE_OPTIONS,
} from "@/app/_components/ui/social-icon";
import { PlusIcon, TrashIcon } from "lucide-react";

// Dashboard access is now controlled by permissions

const CONTACT_TYPE_OPTIONS: { value: ContactType | ""; label: string }[] = [
  { value: "", label: "Kein Bereich" },
  { value: ContactType.GESCHAEFTSSTELLE, label: "Geschäftsstelle" },
  { value: ContactType.INTERNET_TEAM, label: "Internet-Team" },
];

type SocialLink = {
  type: string;
  url: string;
  label?: string;
};

export default function NewTeamPage() {
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
    PERMISSIONS.ORGANIZATION_MANAGE_TEAM,
  );

  const [userId, setUserId] = useState<string | null>(null);
  const [userLabel, setUserLabel] = useState("");
  const [person, setPerson] = useState<PersonDetails>(emptyPersonDetails());
  const [role, setRole] = useState("");
  const [contactType, setContactType] = useState<ContactType | "">("");
  const [sortOrder, setSortOrder] = useState(0);
  const [responsibilitiesText, setResponsibilitiesText] = useState("");
  const [socials, setSocials] = useState<SocialLink[]>([]);

  const addSocialLink = () => {
    setSocials([...socials, { type: "website", url: "", label: "" }]);
  };

  const updateSocialLink = (
    index: number,
    field: keyof SocialLink,
    value: string,
  ) => {
    const updated = [...socials];
    const current = updated[index];
    if (current) {
      updated[index] = { ...current, [field]: value };
      setSocials(updated);
    }
  };

  const removeSocialLink = (index: number) => {
    setSocials(socials.filter((_, i) => i !== index));
  };

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const utils = api.useUtils();

  const createMutation = api.organization.createTeamMember.useMutation({
    onSuccess: async (data) => {
      toast.success("Teammitglied erfolgreich erstellt");
      await utils.organization.getTeam.invalidate();
      router.push(`/dashboard/team/${data.id}`);
    },
    onError: (err) => {
      toast.error("Fehler beim Erstellen: " + err.message);
      setError(getErrorMessage(err));
      setIsSubmitting(false);
    },
  });

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/team/new");
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

    const responsibilities = responsibilitiesText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");

    const validSocials = socials.filter((s) => s.url.trim());
    const socialsJson =
      validSocials.length > 0 ? JSON.stringify(validSocials) : undefined;

    createMutation.mutate({
      userId: userId ?? undefined,
      name: person.name.trim() || undefined,
      email: person.email.trim() || undefined,
      phone: person.phone.trim() || undefined,
      bio: person.bio.trim() || undefined,
      imageId: person.imageId ?? undefined,
      role: role.trim() || undefined,
      contactType: contactType === "" ? undefined : contactType,
      sortOrder,
      responsibilities: responsibilities || undefined,
      socials: socialsJson,
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
      title="Neues Teammitglied"
      description="Lege ein Teammitglied an – mit oder ohne Benutzerkonto"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Team", href: "/dashboard/team" },
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
          description="Optional: Verknüpfe das Teammitglied mit einem Benutzerkonto. Leer gelassene Angaben werden dann von dort übernommen. Jedes Konto kann nur einmal im Team sein."
        />

        <PersonDetailsFields
          value={person}
          onChange={(patch) =>
            setPerson((current) => ({ ...current, ...patch }))
          }
          hasLinkedUser={!!userId}
        />

        {/* Role & Contact Type */}
        <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
            Rolle & Bereich
          </h2>
          <div className="space-y-4">
            <div>
              <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                Rolle
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="z.B. Webentwickler, Sachbearbeiter..."
                maxLength={100}
                className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
              />
            </div>

            <div>
              <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                Bereich
              </label>
              <Select
                value={contactType}
                onChange={(e) =>
                  setContactType(e.target.value as ContactType | "")
                }
                className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
              >
                {CONTACT_TYPE_OPTIONS.map((option) => (
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

        {/* Responsibilities */}
        <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
            Aufgaben & Verantwortlichkeiten
          </h2>
          <p className="dark:text-dark-muted mb-3 text-sm text-gray-600">
            Eine Aufgabe pro Zeile
          </p>
          <textarea
            value={responsibilitiesText}
            onChange={(e) => setResponsibilitiesText(e.target.value)}
            rows={5}
            placeholder="Webseite pflegen&#10;Newsletter erstellen&#10;Anmeldungen bearbeiten"
            maxLength={1000}
            className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 focus:ring-1 focus:outline-none"
          />
        </section>

        {/* Socials */}
        <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="dark:text-dark-text text-lg font-semibold text-gray-900">
              Social Media Links
            </h2>
            <button
              type="button"
              onClick={addSocialLink}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <PlusIcon className="h-4 w-4" />
              Link hinzufügen
            </button>
          </div>

          {socials.length === 0 ? (
            <p className="dark:text-dark-muted py-4 text-center text-sm text-gray-500">
              Keine Social Media Links vorhanden.
            </p>
          ) : (
            <div className="space-y-4">
              {socials.map((social, index) => (
                <div
                  key={index}
                  className="dark:border-dark-border flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-start dark:bg-gray-800/50"
                >
                  {/* Type Selector with Icon Preview */}
                  <div className="sm:w-48">
                    <label className="dark:text-dark-muted mb-1 block text-xs font-medium text-gray-500">
                      Typ
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="dark:bg-dark-background-secondary dark:border-dark-border flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white">
                        <SocialIcon
                          type={social.type}
                          className="h-5 w-5 text-gray-600 dark:text-gray-400"
                        />
                      </div>
                      <Select
                        value={social.type}
                        onChange={(e) =>
                          updateSocialLink(index, "type", e.target.value)
                        }
                        className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:outline-none"
                      >
                        {SOCIAL_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  {/* URL Input */}
                  <div className="flex-1">
                    <label className="dark:text-dark-muted mb-1 block text-xs font-medium text-gray-500">
                      URL
                    </label>
                    <input
                      type="url"
                      value={social.url}
                      onChange={(e) =>
                        updateSocialLink(index, "url", e.target.value)
                      }
                      placeholder="https://..."
                      className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:outline-none"
                    />
                  </div>

                  {/* Label Input */}
                  <div className="sm:w-40">
                    <label className="dark:text-dark-muted mb-1 block text-xs font-medium text-gray-500">
                      Anzeigename
                    </label>
                    <input
                      type="text"
                      value={social.label || ""}
                      onChange={(e) =>
                        updateSocialLink(index, "label", e.target.value)
                      }
                      placeholder="@username"
                      className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:outline-none"
                    />
                  </div>

                  {/* Delete Button */}
                  <div className="flex items-end sm:pb-0.5">
                    <button
                      type="button"
                      onClick={() => removeSocialLink(index)}
                      className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                      title="Entfernen"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/dashboard/team"
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
