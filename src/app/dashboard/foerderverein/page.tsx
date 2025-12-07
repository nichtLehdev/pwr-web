"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import Image from "next/image";
import { UserRole } from "~/generated/prisma/enums";

// Only admins can access förderverein management
const ALLOWED_ROLES: UserRole[] = [UserRole.ADMIN];

const FOERDERVEREIN_ROLE_LABELS: Record<string, string> = {
  VORSITZENDER: "Vorsitzender",
  STELLVERTRETER: "Stellvertreter",
  SCHATZMEISTER: "Schatzmeister",
  SCHRIFTFUEHRER: "Schriftführer",
  BEISITZER: "Beisitzer",
  MITGLIED: "Mitglied",
};

export default function DashboardFoerdervereinPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const {
    data: members,
    isLoading: membersLoading,
    refetch,
  } = api.organization.getFoerderverein.useQuery();

  const deleteMutation = api.organization.deleteFoerdervereinMember.useMutation(
    {
      onSuccess: () => {
        void refetch();
        setDeletingId(null);
        toast.success("Fördervereinsmitglied erfolgreich gelöscht");
      },
      onError: (error) => {
        setDeletingId(null);
        toast.error("Fehler beim Löschen: " + error.message);
      },
    },
  );

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/foerderverein");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    if (!profileLoading && profile && !hasRedirected.current) {
      if (!ALLOWED_ROLES.includes(profile.role)) {
        hasRedirected.current = true;
        router.push("/dashboard");
      }
    }
  }, [profile, profileLoading, router]);

  const handleDelete = async (id: string) => {
    if (
      !confirm("Möchtest du dieses Fördervereinsmitglied wirklich löschen?")
    ) {
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

  if (!session || !profile || !ALLOWED_ROLES.includes(profile.role)) {
    return null;
  }

  return (
    <main className="dark:bg-dark-background min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm">
          <ol className="flex items-center gap-2">
            <li>
              <Link
                href="/dashboard"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Dashboard
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">Förderverein</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
              Förderverein
            </h1>
            <p className="dark:text-dark-muted mt-2 text-gray-600">
              Verwalte die Mitglieder des Fördervereins
            </p>
          </div>
          <Link
            href="/dashboard/foerderverein/new"
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-medium text-white transition-colors"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Neues Mitglied
          </Link>
        </div>

        {/* Members List */}
        {!members || members.length === 0 ? (
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="dark:text-dark-muted mx-auto mb-4 h-12 w-12 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>
            <h3 className="dark:text-dark-text mb-2 text-lg font-semibold text-gray-900">
              Keine Fördervereinsmitglieder
            </h3>
            <p className="dark:text-dark-muted mb-6 text-gray-600">
              Es wurden noch keine Fördervereinsmitglieder angelegt.
            </p>
            <Link
              href="/dashboard/foerderverein/new"
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
                      Position / Rolle
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Mitglied seit
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Verknüpfung
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {members.map((member) => {
                    const displayName =
                      member.user?.displayName || member.name || "Unbekannt";
                    const displayEmail =
                      member.user?.email || member.email || "-";
                    const imageUrl =
                      member.user?.profileImage?.url || member.image?.url;

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
                              <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                                <svg
                                  className="h-5 w-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                  />
                                </svg>
                              </div>
                            )}
                            <div>
                              <Link
                                href={`/dashboard/foerderverein/${member.id}`}
                                className="hover:text-primary dark:text-dark-text font-medium text-gray-900"
                              >
                                {displayName}
                              </Link>
                              <p className="dark:text-dark-muted text-sm text-gray-500">
                                {displayEmail}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            {member.position && (
                              <span className="dark:text-dark-text text-sm text-gray-900">
                                {member.position}
                              </span>
                            )}
                            <span className="dark:bg-dark-background-secondary dark:text-dark-muted inline-flex w-fit rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                              {FOERDERVEREIN_ROLE_LABELS[member.role] ||
                                member.role}
                            </span>
                          </div>
                        </td>
                        <td className="dark:text-dark-muted px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                          {member.memberSince
                            ? new Date(member.memberSince).toLocaleDateString(
                                "de-DE",
                                {
                                  year: "numeric",
                                  month: "long",
                                },
                              )
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {member.user ? (
                            <span className="inline-flex items-center gap-1 text-sm text-green-600">
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              Verknüpft
                            </span>
                          ) : (
                            <span className="dark:text-dark-muted inline-flex items-center gap-1 text-sm text-gray-500">
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                              </svg>
                              Manuell
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/dashboard/foerderverein/${member.id}/edit`}
                              className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                              title="Bearbeiten"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </Link>
                            <button
                              onClick={() => handleDelete(member.id)}
                              disabled={deletingId === member.id}
                              className="rounded p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:hover:bg-red-900/20"
                              title="Löschen"
                            >
                              {deletingId === member.id ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                              ) : (
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
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
      </div>
    </main>
  );
}
