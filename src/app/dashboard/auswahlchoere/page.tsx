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
  Plus,
  Search,
  Music,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const ALLOWED_ROLES: UserRole[] = [UserRole.ADMIN];

export default function DashboardAuswahlchoerePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const toast = useToast();

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const {
    data: auswahlchoereData,
    isLoading: auswahlchoereLoading,
    refetch,
  } = api.auswahlchoere.getAll.useQuery({
    search: search || undefined,
    page,
    limit,
  });

  const deleteMutation = api.auswahlchoere.delete.useMutation({
    onSuccess: () => {
      void refetch();
      setDeletingId(null);
      toast.success("Auswahlchor erfolgreich gelöscht");
    },
    onError: (error) => {
      setDeletingId(null);
      toast.error("Fehler beim Löschen: " + error.message);
    },
  });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/auswahlchoere");
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

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Möchtest du den Auswahlchor "${name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      )
    ) {
      return;
    }
    setDeletingId(id);
    deleteMutation.mutate({ id });
  };

  if (isPending || profileLoading || auswahlchoereLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !ALLOWED_ROLES.includes(profile.role)) {
    return null;
  }

  const auswahlchoere = auswahlchoereData?.auswahlchoere ?? [];

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
            <li className="dark:text-dark-text text-gray-900">Auswahlchöre</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
              Auswahlchöre
            </h1>
            <p className="dark:text-dark-muted mt-2 text-gray-600">
              Verwalte alle Auswahlchöre
            </p>
          </div>
          <Link
            href="/dashboard/auswahlchoere/new"
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
          >
            <Plus className="h-5 w-5" />
            Neuer Auswahlchor
          </Link>
        </div>

        {/* Filters */}
        <div className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Auswahlchor suchen..."
                  className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Auswahlchöre List */}
        {auswahlchoere.length === 0 ? (
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="dark:text-dark-muted mx-auto mb-4 h-12 w-12 text-gray-400">
              <Music className="h-12 w-12" />
            </div>
            <h3 className="dark:text-dark-text mb-2 text-lg font-semibold text-gray-900">
              Keine Auswahlchöre gefunden
            </h3>
            <p className="dark:text-dark-muted mb-6 text-gray-600">
              {search
                ? "Keine Auswahlchöre entsprechen deinen Filterkriterien."
                : "Erstelle den ersten Auswahlchor, um ihn hier anzuzeigen."}
            </p>
            {!search && (
              <Link
                href="/dashboard/auswahlchoere/new"
                className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
              >
                <Plus className="h-5 w-5" />
                Auswahlchor erstellen
              </Link>
            )}
          </div>
        ) : (
          <div className="dark:border-dark-border dark:bg-dark-surface overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="dark:border-dark-border dark:bg-dark-background-secondary border-b border-gray-200 bg-gray-50">
                    <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Auswahlchor
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Untertitel
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Leitung
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Bewerbung
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {auswahlchoere.map((chor) => (
                    <tr
                      key={chor.id}
                      className="dark:hover:bg-dark-background-secondary hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {chor.image?.url ? (
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded">
                              <Image
                                src={chor.image.url}
                                alt={chor.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-10 w-10 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-500">
                              <Music className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <Link
                              href={`/dashboard/auswahlchoere/${chor.id}`}
                              className="hover:text-primary dark:text-dark-text font-medium text-gray-900"
                            >
                              {chor.name}
                            </Link>
                            <p className="dark:text-dark-muted text-sm text-gray-500">
                              {chor.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="dark:text-dark-text text-sm text-gray-900">
                          {chor.subtitle}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {chor.conductor ? (
                          <span className="dark:text-dark-text text-sm text-gray-900">
                            {chor.conductor.displayName || chor.conductor.email}
                          </span>
                        ) : (
                          <span className="dark:text-dark-muted text-sm text-gray-400 italic">
                            Keine Leitung
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            chor.showApplication
                              ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {chor.showApplication ? "Aktiv" : "Inaktiv"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/auswahlchoere/${chor.id}`}
                            className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                            title="Details anzeigen"
                          >
                            {chor.showApplication ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </Link>
                          <Link
                            href={`/dashboard/auswahlchoere/${chor.id}/edit`}
                            className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                            title="Bearbeiten"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(chor.id, chor.name)}
                            disabled={deletingId === chor.id}
                            className="rounded p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                            title="Löschen"
                          >
                            {deletingId === chor.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination & Results count */}
            <div className="dark:border-dark-border flex flex-col items-center justify-between gap-4 border-t border-gray-200 px-6 py-4 sm:flex-row">
              <div className="dark:text-dark-muted text-sm text-gray-500">
                {auswahlchoereData?.total} Auswahlchor
                {auswahlchoereData?.total !== 1 && "e"} gefunden
                {auswahlchoereData && auswahlchoereData.pages > 1 && (
                  <span>
                    {" "}
                    · Seite {page} von {auswahlchoereData.pages}
                  </span>
                )}
              </div>
              {auswahlchoereData && auswahlchoereData.pages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="dark:border-dark-border dark:text-dark-text inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Zurück
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from(
                      { length: Math.min(5, auswahlchoereData.pages) },
                      (_, i) => {
                        let pageNum: number;
                        if (auswahlchoereData.pages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= auswahlchoereData.pages - 2) {
                          pageNum = auswahlchoereData.pages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                              page === pageNum
                                ? "bg-primary text-white"
                                : "dark:text-dark-text text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      },
                    )}
                  </div>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(auswahlchoereData.pages, p + 1))
                    }
                    disabled={page === auswahlchoereData.pages}
                    className="dark:border-dark-border dark:text-dark-text inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
                  >
                    Weiter
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
