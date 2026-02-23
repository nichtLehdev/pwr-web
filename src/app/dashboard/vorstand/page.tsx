"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import Image from "next/image";
import { DashboardPage } from "@/app/_components/dashboard";
import { EditIcon, PlusIcon } from "lucide-react";
import { TrashIcon } from "lucide-react";
import { UsersIcon } from "lucide-react";

export default function DashboardVorstandPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: canManageOrganization } = api.permissions.canManage.useQuery(
    undefined,
    { enabled: !!session?.user },
  );

  const {
    data: vorstandMembers,
    isLoading: membersLoading,
    refetch,
  } = api.organization.getVorstand.useQuery();

  const deleteMutation = api.organization.deleteVorstandMember.useMutation({
    onSuccess: () => {
      toast.success("Vorstandsmitglied erfolgreich gelöscht");
      void refetch();
      setDeletingId(null);
    },
    onError: (error) => {
      toast.error("Fehler beim Löschen: " + error.message);
      setDeletingId(null);
    },
  });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/vorstand");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !canManageOrganization &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, canManageOrganization, router]);

  const handleDelete = async (id: string) => {
    if (!confirm("Möchtest du dieses Vorstandsmitglied wirklich löschen?")) {
      return;
    }
    setDeletingId(id);
    deleteMutation.mutate({ id });
  };

  if (isPending || profileLoading || membersLoading) {
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
      title="Vorstand"
      description="Verwalte die Mitglieder des Vorstands"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Vorstand" },
      ]}
      actions={
        <Link
          href="/dashboard/vorstand/new"
          className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-medium text-white transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Neues Mitglied
        </Link>
      }
    >
      {/* Members List */}
      {!vorstandMembers || vorstandMembers.length === 0 ? (
        <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="dark:text-dark-muted mx-auto mb-4 h-12 w-12 text-gray-400">
            <UsersIcon className="h-12 w-12" />
          </div>
          <h3 className="dark:text-dark-text mb-2 text-lg font-semibold text-gray-900">
            Keine Vorstandsmitglieder
          </h3>
          <p className="dark:text-dark-muted mb-6 text-gray-600">
            Es wurden noch keine Vorstandsmitglieder angelegt.
          </p>
          <Link
            href="/dashboard/vorstand/new"
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
          >
            Erstes Mitglied anlegen
          </Link>
        </div>
      ) : (
        <div className="dark:border-dark-border dark:bg-dark-surface overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="dark:border-dark-border dark:bg-dark-background-secondary border-b border-gray-200 bg-gray-50">
                  <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Mitglied
                  </th>
                  <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Position
                  </th>
                  <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Kontakt
                  </th>
                  <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Verknüpft
                  </th>
                  <th className="dark:text-dark-muted px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {vorstandMembers.map((member) => {
                  const displayName =
                    member.user?.displayName || member.name || "Unbekannt";
                  const displayEmail =
                    member.user?.email || member.email || "-";
                  const imageUrl =
                    member.image?.url || member.user?.profileImage?.url;

                  return (
                    <tr
                      key={member.id}
                      className="dark:hover:bg-dark-background-secondary hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {imageUrl ? (
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                              <Image
                                src={imageUrl}
                                alt={displayName}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="dark:bg-dark-background-secondary flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
                              <span className="dark:text-dark-muted text-sm font-medium text-gray-500">
                                {displayName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <Link
                              href={`/dashboard/vorstand/${member.id}`}
                              className="hover:text-primary dark:text-dark-text font-medium text-gray-900"
                            >
                              {displayName}
                            </Link>
                            <p className="dark:text-dark-muted text-sm text-gray-500">
                              Reihenfolge: {member.sortOrder}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            member.color ||
                            "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {member.position}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="dark:text-dark-text text-sm text-gray-900">
                          {displayEmail}
                        </p>
                        {member.phone && (
                          <p className="dark:text-dark-muted text-sm text-gray-500">
                            {member.phone}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {member.userId ? (
                          <Link
                            href={`/dashboard/users/${member.userId}`}
                            className="text-primary text-sm hover:underline"
                          >
                            Benutzer verknüpft
                          </Link>
                        ) : (
                          <span className="dark:text-dark-muted text-sm text-gray-500">
                            Nicht verknüpft
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/vorstand/${member.id}/edit`}
                            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                            title="Bearbeiten"
                          >
                            <EditIcon className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(member.id)}
                            disabled={deletingId === member.id}
                            className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:hover:bg-red-900/20"
                            title="Löschen"
                          >
                            {deletingId === member.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                            ) : (
                              <TrashIcon className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardPage>
  );
}
