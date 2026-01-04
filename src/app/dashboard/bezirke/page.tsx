"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import { UserRole } from "~/generated/prisma/enums";
import {
  BookIcon,
  CalendarIcon,
  MapPinIcon,
  MusicIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";

const ALLOWED_ROLES: UserRole[] = [UserRole.ADMIN];

export default function DashboardBezirkePage() {
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
    data: bezirke,
    isLoading: bezirkeLoading,
    refetch,
  } = api.bezirke.getAll.useQuery();

  const deleteMutation = api.bezirke.delete.useMutation({
    onSuccess: () => {
      void refetch();
      setDeletingId(null);
      toast.success("Bezirk erfolgreich gelöscht");
    },
    onError: (error) => {
      setDeletingId(null);
      toast.error("Fehler beim Löschen: " + error.message);
    },
  });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/bezirke");
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
      !confirm(
        "Möchtest du diesen Bezirk wirklich löschen? Alle zugehörigen Verknüpfungen werden entfernt.",
      )
    ) {
      return;
    }
    setDeletingId(id);
    deleteMutation.mutate({ id });
  };

  if (isPending || profileLoading || bezirkeLoading) {
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
            <li className="dark:text-dark-text text-gray-900">Bezirke</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
            Bezirke
          </h1>
          <p className="dark:text-dark-muted mt-2 text-gray-600">
            Verwalte die 13 Bezirke des Landesposaunenwerks
          </p>
        </div>

        {/* Bezirke List */}
        {!bezirke || bezirke.length === 0 ? (
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="dark:text-dark-muted mx-auto mb-4 h-12 w-12 text-gray-400">
              <MapPinIcon className="h-12 w-12" />
            </div>
            <h3 className="dark:text-dark-text mb-2 text-lg font-semibold text-gray-900">
              Keine Bezirke vorhanden
            </h3>
            <p className="dark:text-dark-muted text-gray-600">
              Die Bezirke wurden noch nicht in der Datenbank angelegt.
            </p>
          </div>
        ) : (
          <div className="dark:border-dark-border dark:bg-dark-surface overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="dark:border-dark-border dark:bg-dark-background-secondary border-b border-gray-200 bg-gray-50">
                    <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Nr.
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Bezirk
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Obleute
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Statistiken
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {bezirke.map((bezirk) => (
                    <tr
                      key={bezirk.id}
                      className="dark:hover:bg-dark-background-secondary hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                          style={{
                            backgroundColor: `var(--color-district-${bezirk.number})`,
                          }}
                        >
                          {bezirk.number}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <Link
                            href={`/dashboard/bezirke/${bezirk.id}`}
                            className="hover:text-primary dark:text-dark-text font-medium text-gray-900"
                          >
                            {bezirk.name}
                          </Link>
                          <p className="dark:text-dark-muted text-sm text-gray-500">
                            {bezirk.shortName}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {bezirk.users && bezirk.users.length > 0 ? (
                            bezirk.users.slice(0, 2).map((user) => (
                              <span
                                key={user.id}
                                className="dark:text-dark-muted text-sm text-gray-600"
                              >
                                {user.displayName}
                                {user.obleuteRole && (
                                  <span className="ml-1 text-xs text-gray-400">
                                    ({user.obleuteRole})
                                  </span>
                                )}
                              </span>
                            ))
                          ) : (
                            <span className="dark:text-dark-muted text-sm text-gray-400 italic">
                              Keine Obleute zugewiesen
                            </span>
                          )}
                          {bezirk.users && bezirk.users.length > 2 && (
                            <span className="text-xs text-gray-400">
                              +{bezirk.users.length - 2} weitere
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {"_count" in bezirk && (
                            <>
                              <span className="dark:bg-dark-background-secondary dark:text-dark-text inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                                <MusicIcon className="h-3 w-3" />
                                {
                                  (bezirk._count as { ensembles: number })
                                    .ensembles
                                }{" "}
                                Ensembles
                              </span>
                              <span className="dark:bg-dark-background-secondary dark:text-dark-text inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                                <CalendarIcon className="h-3 w-3" />
                                {
                                  (bezirk._count as { events: number }).events
                                }{" "}
                                Termine
                              </span>
                              <span className="dark:bg-dark-background-secondary dark:text-dark-text inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                                <BookIcon className="h-3 w-3" />
                                {
                                  (bezirk._count as { courses: number }).courses
                                }{" "}
                                Kurse
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/bezirke/${bezirk.id}`}
                            className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                            title="Details anzeigen"
                          >
                            <EyeIcon
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </EyeIcon>
                          </Link>
                          <Link
                            href={`/dashboard/bezirke/${bezirk.id}/edit`}
                            className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                            title="Bearbeiten"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(bezirk.id)}
                            disabled={deletingId === bezirk.id}
                            className="rounded p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                            title="Löschen"
                          >
                            {deletingId === bezirk.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                            ) : (
                              <TrashIcon className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
