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
import { ContactType } from "~/generated/prisma/enums";
import { getErrorMessage } from "@/lib/utils";
import {
  SocialIcon,
  SOCIAL_TYPE_OPTIONS,
} from "@/app/_components/ui/social-icon";
import {
  DashboardPage,
  PersonDetailsFields,
  UserLinkField,
  emptyPersonDetails,
  type PersonDetails,
} from "@/app/_components/dashboard";
import { Plus, TrashIcon } from "lucide-react";

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

export default function EditTeamPage() {
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
    PERMISSIONS.ORGANIZATION_MANAGE_TEAM,
  );

  const { data: member, isLoading: memberLoading } =
    api.organization.getTeamMember.useQuery(
      { id: memberId },
      { enabled: !!memberId && !!session?.user },
    );

  const [userId, setUserId] = useState<string | null>(null);
  const [userLabel, setUserLabel] = useState("");
  const [person, setPerson] = useState<PersonDetails>(emptyPersonDetails());
  const [role, setRole] = useState("");
  const [contactType, setContactType] = useState<ContactType | "">("");
  const [sortOrder, setSortOrder] = useState(0);
  const [responsibilitiesText, setResponsibilitiesText] = useState("");
  const [socials, setSocials] = useState<SocialLink[]>([]);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (member) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setRole(member.role || "");
      setContactType(member.contactType || "");
      setSortOrder(member.sortOrder || 0);
      setUserId(member.userId);
      setUserLabel(member.user?.displayName ?? member.user?.email ?? "");
      setPerson({
        // Rohwerte des Datensatzes — nicht das gegen den Benutzer aufgelöste
        // Ergebnis, sonst würden dessen Daten beim Speichern festgeschrieben.
        name: member.name ?? "",
        email: member.email ?? "",
        phone: member.phone ?? "",
        city: "",
        bio: member.bio ?? "",
        imageId: member.imageId,
        imageUrl: member.image?.url ?? null,
      });

      if (member.responsibilities && member.responsibilities.length > 0) {
        setResponsibilitiesText(member.responsibilities.join("\n"));
      }

      if (member.socials && member.socials.length > 0) {
        setSocials(member.socials);
      }
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [member]);

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

  const utils = api.useUtils();

  const updateMutation = api.organization.updateTeamMember.useMutation({
    onSuccess: async () => {
      toast.success("Teammitglied erfolgreich aktualisiert");
      await utils.organization.getTeam.invalidate();
      await utils.organization.getTeamMember.invalidate({ id: memberId });
      router.push(`/dashboard/team/${memberId}`);
    },
    onError: (err) => {
      toast.error("Fehler beim Aktualisieren: " + err.message);
      setError(getErrorMessage(err));
      setIsSubmitting(false);
    },
  });

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/team/${memberId}/edit`);
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

    const responsibilities = responsibilitiesText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");

    const validSocials = socials.filter((s) => s.url.trim());
    const socialsJson =
      validSocials.length > 0 ? JSON.stringify(validSocials) : undefined;

    if (!userId && !person.name.trim()) {
      setError("Bitte wähle einen Benutzer aus oder gib einen Namen ein.");
      setIsSubmitting(false);
      return;
    }

    updateMutation.mutate({
      id: memberId,
      userId,
      name: person.name.trim() || null,
      email: person.email.trim() || null,
      phone: person.phone.trim() || null,
      bio: person.bio.trim() || null,
      imageId: person.imageId,
      role: role.trim() || undefined,
      contactType: contactType === "" ? null : contactType,
      sortOrder,
      responsibilities: responsibilities || undefined,
      socials: socialsJson,
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
            Teammitglied nicht gefunden
          </h1>
          <Link
            href="/dashboard/team"
            className="text-primary-ink dark:text-primary mt-4 inline-block hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const memberName = member.person.name || "Mitglied";

  return (
    <DashboardPage
      title="Teammitglied bearbeiten"
      description="Bearbeite die Daten des Teammitglieds"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Team", href: "/dashboard/team" },
        { label: memberName, href: `/dashboard/team/${memberId}` },
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
          description="Optional: Verknüpfe das Teammitglied mit einem Benutzerkonto. Leer gelassene Angaben werden dann von dort übernommen. Jedes Konto kann nur einmal im Team sein."
        />

        <PersonDetailsFields
          value={person}
          onChange={(patch) =>
            setPerson((current) => ({ ...current, ...patch }))
          }
          hasLinkedUser={!!userId}
        />

        <section className="border-rule dark:border-night-rule dark:bg-night-raised bg-paper border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
            Rolle & Bereich
          </h2>
          <div className="space-y-4">
            <div>
              <Label>Rolle</Label>
              <Input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="z.B. Webentwickler, Sachbearbeiter..."
                maxLength={100}
              />
            </div>

            <div>
              <Label>Bereich</Label>
              <Select
                value={contactType}
                onChange={(e) =>
                  setContactType(e.target.value as ContactType | "")
                }
              >
                {CONTACT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

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
        </section>

        <section className="border-rule dark:border-night-rule dark:bg-night-raised bg-paper border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
            Aufgaben & Verantwortlichkeiten
          </h2>
          <p className="text-dark dark:text-night-muted mb-3 text-sm">
            Eine Aufgabe pro Zeile
          </p>
          <Textarea
            value={responsibilitiesText}
            onChange={(e) => setResponsibilitiesText(e.target.value)}
            rows={5}
            placeholder="Webseite pflegen&#10;Newsletter erstellen&#10;Anmeldungen bearbeiten"
            maxLength={1000}
            className="font-mono"
          />
        </section>

        <section className="border-rule dark:border-night-rule dark:bg-night-raised bg-paper border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="condensed text-ink dark:text-night-text text-lg font-bold">
              Social Media Links
            </h2>
            <button
              type="button"
              onClick={addSocialLink}
              className="bg-rule/60 text-ink hover:bg-rule dark:bg-night-rule dark:text-night-text dark:hover:bg-night-muted dark:hover:text-night semi-condensed inline-flex min-h-11 items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors"
            >
              <Plus className="h-4 w-4" />
              Link hinzufügen
            </button>
          </div>

          {socials.length === 0 ? (
            <p className="text-dark dark:text-night-muted py-4 text-center text-sm">
              Keine Social Media Links vorhanden.
            </p>
          ) : (
            <div className="space-y-4">
              {socials.map((social, index) => (
                <div
                  key={index}
                  className="border-rule dark:border-night-rule bg-rule/25 dark:bg-night-raised flex flex-col gap-3 border p-4 sm:flex-row sm:items-start"
                >
                  <div className="sm:w-48">
                    <label className="text-dark dark:text-night-muted mb-1 block text-xs font-medium">
                      Typ
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="border-rule dark:border-night-rule bg-paper dark:bg-night flex h-9 w-9 items-center justify-center border">
                        <SocialIcon
                          type={social.type}
                          className="text-dark dark:text-night-muted h-5 w-5"
                        />
                      </div>
                      <Select
                        value={social.type}
                        onChange={(e) =>
                          updateSocialLink(index, "type", e.target.value)
                        }
                        className="flex-1"
                      >
                        {SOCIAL_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div className="flex-1">
                    <label className="text-dark dark:text-night-muted mb-1 block text-xs font-medium">
                      URL
                    </label>
                    <Input
                      type="url"
                      value={social.url}
                      onChange={(e) =>
                        updateSocialLink(index, "url", e.target.value)
                      }
                      placeholder="https://..."
                    />
                  </div>

                  <div className="sm:w-40">
                    <label className="text-dark dark:text-night-muted mb-1 block text-xs font-medium">
                      Anzeigename
                    </label>
                    <Input
                      type="text"
                      value={social.label || ""}
                      onChange={(e) =>
                        updateSocialLink(index, "label", e.target.value)
                      }
                      placeholder="@username"
                    />
                  </div>

                  <div className="flex items-end sm:pb-0.5">
                    <button
                      type="button"
                      onClick={() => removeSocialLink(index)}
                      className="p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
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

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            href={`/dashboard/team/${memberId}`}
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
