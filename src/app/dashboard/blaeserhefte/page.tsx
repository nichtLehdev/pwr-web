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
import {
  EyeIcon,
  FileIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";

const ALLOWED_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.LPW];

export default function DashboardBlaeserheftePage() {
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
    data: hefte,
    isLoading: hefteLoading,
    refetch,
  } = api.materials.getBlaserhefte.useQuery();

  const deleteMutation = api.materials.deleteBlaserheft.useMutation({
    onSuccess: () => {
      void refetch();
      setDeletingId(null);
      toast.success("Bläserheft erfolgreich gelöscht");
    },
    onError: (error) => {
      setDeletingId(null);
      toast.error("Fehler beim Löschen: " + error.message);
    },
  });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/blaeserhefte");
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
    if (!confirm("Möchtest du dieses Bläserheft wirklich löschen?")) {
      return;
    }
    setDeletingId(id);
    deleteMutation.mutate({ id });
  };

  if (isPending || profileLoading || hefteLoading) {
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
            <li className="dark:text-dark-text text-gray-900">Bläserhefte</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
              Bläserhefte
            </h1>
            <p className="dark:text-dark-muted mt-2 text-gray-600">
              Verwalte die Bläserhefte des Landesposaunenwerks
            </p>
          </div>
          <Link
            href="/dashboard/blaeserhefte/new"
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Neues Bläserheft
          </Link>
        </div>

        {/* Hefte List */}
        {!hefte || hefte.length === 0 ? (
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="dark:text-dark-muted mx-auto mb-4 h-12 w-12 text-gray-400">
              <FileIcon className="h-12 w-12" />
            </div>
            <h3 className="dark:text-dark-text mb-2 text-lg font-semibold text-gray-900">
              Keine Bläserhefte vorhanden
            </h3>
            <p className="dark:text-dark-muted mb-6 text-gray-600">
              Erstelle das erste Bläserheft, um es hier anzuzeigen.
            </p>
            <Link
              href="/dashboard/blaeserhefte/new"
              className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Bläserheft erstellen
            </Link>
          </div>
        ) : (
          <div className="dark:border-dark-border dark:bg-dark-surface overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="dark:border-dark-border dark:bg-dark-background-secondary border-b border-gray-200 bg-gray-50">
                    <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Bläserheft
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Jahr
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Preise
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Verfügbarkeit
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {hefte.map((heft) => (
                    <tr
                      key={heft.id}
                      className="dark:hover:bg-dark-background-secondary hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {heft.image?.url ? (
                            <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded">
                              <Image
                                src={heft.image.url}
                                alt={heft.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-12 w-10 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-500">
                              <FileIcon className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <Link
                              href={`/dashboard/blaeserhefte/${heft.id}`}
                              className="hover:text-primary dark:text-dark-text font-medium text-gray-900"
                            >
                              {heft.title}
                            </Link>
                            <p className="dark:text-dark-muted text-sm text-gray-500">
                              {heft.subtitle}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="dark:bg-dark-background-secondary dark:text-dark-text inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-800">
                          {heft.year}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="dark:text-dark-muted space-y-1 text-sm text-gray-600">
                          {heft.priceBlaeserheft && (
                            <p>Heft: {heft.priceBlaeserheft} €</p>
                          )}
                          {heft.priceBeiheft && (
                            <p>Beiheft: {heft.priceBeiheft} €</p>
                          )}
                          {heft.priceCd && <p>CD: {heft.priceCd} €</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {heft.availableBlaeserheft && (
                            <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              Heft
                            </span>
                          )}
                          {heft.availableBeiheft && (
                            <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              Beiheft
                            </span>
                          )}
                          {heft.availableCd && (
                            <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              CD
                            </span>
                          )}
                          {heft.availableTrompeten && (
                            <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              Trompeten
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/blaeserhefte/${heft.id}`}
                            className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                            title="Details anzeigen"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/dashboard/blaeserhefte/${heft.id}/edit`}
                            className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                            title="Bearbeiten"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(heft.id)}
                            disabled={deletingId === heft.id}
                            className="rounded p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                            title="Löschen"
                          >
                            {deletingId === heft.id ? (
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
