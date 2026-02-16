"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Search, Clock, Eye, Edit, Trash2 } from "lucide-react";

export default function DashboardHistoryTimelinePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const toast = useToast();

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: canManageOrganization } = api.permissions.canManage.useQuery(
    undefined,
    { enabled: !!session?.user },
  );

  const {
    data: historyEvents,
    isLoading: historyLoading,
    refetch,
  } = api.organization.getHistory.useQuery({
    category: categoryFilter
      ? (categoryFilter as
          | "FOUNDING"
          | "MILESTONE"
          | "EXPANSION"
          | "MODERNIZATION"
          | "PARTNERSHIP")
      : undefined,
  });

  const deleteMutation = api.organization.deleteHistoryEvent.useMutation({
    onSuccess: () => {
      void refetch();
      setDeletingId(null);
      toast.success("Ereignis erfolgreich gelöscht");
    },
    onError: (error) => {
      setDeletingId(null);
      toast.error("Fehler beim Löschen: " + error.message);
    },
  });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/history-timeline");
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

  const handleDelete = async (id: string, title: string) => {
    if (
      !confirm(
        `Möchtest du das Ereignis "${title}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      )
    ) {
      return;
    }
    setDeletingId(id);
    deleteMutation.mutate({ id });
  };

  if (isPending || profileLoading || historyLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageOrganization) {
    return null;
  }

  const filteredEvents =
    historyEvents?.filter((event) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        event.title.toLowerCase().includes(searchLower) ||
        event.description.toLowerCase().includes(searchLower) ||
        event.year.toString().includes(searchLower)
      );
    }) ?? [];

  const categoryLabels: Record<string, string> = {
    FOUNDING: "Gründung",
    MILESTONE: "Meilenstein",
    EXPANSION: "Erweiterung",
    MODERNIZATION: "Modernisierung",
    PARTNERSHIP: "Partnerschaft",
  };

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
            <li className="dark:text-dark-text text-gray-900">Historie</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
              Historie
            </h1>
            <p className="dark:text-dark-muted mt-2 text-gray-600">
              Verwalte alle historischen Ereignisse
            </p>
          </div>
          <Link
            href="/dashboard/history-timeline/new"
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
          >
            <Plus className="h-5 w-5" />
            Neues Ereignis
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
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ereignis suchen..."
                  className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {/* Category Filter */}
            <div className="sm:w-64">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Alle Kategorien</option>
                <option value="FOUNDING">Gründung</option>
                <option value="MILESTONE">Meilenstein</option>
                <option value="EXPANSION">Erweiterung</option>
                <option value="MODERNIZATION">Modernisierung</option>
                <option value="PARTNERSHIP">Partnerschaft</option>
              </select>
            </div>
          </div>
        </div>

        {/* History Events List */}
        {filteredEvents.length === 0 ? (
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="dark:text-dark-muted mx-auto mb-4 h-12 w-12 text-gray-400">
              <Clock className="h-12 w-12" />
            </div>
            <h3 className="dark:text-dark-text mb-2 text-lg font-semibold text-gray-900">
              Keine Ereignisse gefunden
            </h3>
            <p className="dark:text-dark-muted mb-6 text-gray-600">
              {search || categoryFilter
                ? "Keine Ereignisse entsprechen deinen Filterkriterien."
                : "Erstelle das erste Ereignis, um es hier anzuzeigen."}
            </p>
            {!search && !categoryFilter && (
              <Link
                href="/dashboard/history-timeline/new"
                className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
              >
                <Plus className="h-5 w-5" />
                Ereignis erstellen
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
                      Jahr
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Ereignis
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Kategorie
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Bild
                    </th>
                    <th className="dark:text-dark-muted px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredEvents.map((event) => (
                    <tr
                      key={event.id}
                      className="dark:hover:bg-dark-background-secondary hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="dark:text-dark-text font-semibold text-gray-900">
                          {event.year}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <Link
                            href={`/dashboard/history-timeline/${event.id}`}
                            className="hover:text-primary dark:text-dark-text font-medium text-gray-900"
                          >
                            {event.title}
                          </Link>
                          <p className="dark:text-dark-muted mt-1 line-clamp-2 text-sm text-gray-500">
                            {event.description}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {event.category ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                            {categoryLabels[event.category] || event.category}
                          </span>
                        ) : (
                          <span className="dark:text-dark-muted text-sm text-gray-400 italic">
                            Keine Kategorie
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {event.image?.url ? (
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded">
                            <Image
                              src={event.image.url}
                              alt={event.imageAlt || event.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <span className="dark:text-dark-muted text-sm text-gray-400 italic">
                            Kein Bild
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/history-timeline/${event.id}`}
                            className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                            title="Details anzeigen"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/dashboard/history-timeline/${event.id}/edit`}
                            className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                            title="Bearbeiten"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(event.id, event.title)}
                            disabled={deletingId === event.id}
                            className="rounded p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                            title="Löschen"
                          >
                            {deletingId === event.id ? (
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
            {/* Results count */}
            <div className="dark:border-dark-border flex flex-col items-center justify-between gap-4 border-t border-gray-200 px-6 py-4 sm:flex-row">
              <div className="dark:text-dark-muted text-sm text-gray-500">
                {filteredEvents.length} Ereignis
                {filteredEvents.length !== 1 && "se"} gefunden
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
