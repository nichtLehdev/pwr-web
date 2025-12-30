"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import { UserRole } from "~/generated/prisma/enums";

const ALLOWED_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.LPW];

export default function DashboardNewsletterSubscribersPage() {
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(
    true,
  );

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: subscribersData, isLoading: subscribersLoading } =
    api.newsletter.getSubscribers.useQuery(
      {
        page,
        limit: 50,
        isActive: isActiveFilter,
        search: search || undefined,
      },
      {
        enabled: !!session?.user && !!profile,
      },
    );

  const { data: statistics } = api.newsletter.getStatistics.useQuery(
    undefined,
    {
      enabled: !!session?.user && !!profile,
    },
  );

  const deleteSubscriber = api.newsletter.deleteSubscriber.useMutation({
    onSuccess: () => {
      // Refetch subscribers
      window.location.reload();
    },
  });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/login?callbackUrl=/dashboard/newsletter/subscribers");
    }
  }, [isPending, session]);

  useEffect(() => {
    if (!profileLoading && profile && !hasRedirected.current) {
      if (!ALLOWED_ROLES.includes(profile.role)) {
        hasRedirected.current = true;
        redirect("/dashboard");
      }
    }
  }, [profile, profileLoading]);

  if (isPending || profileLoading) {
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
            <li>
              <Link
                href="/dashboard/newsletter"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Newsletter
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">Abonnenten</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
              Newsletter Abonnenten
            </h1>
            <p className="dark:text-dark-muted mt-2 text-gray-600">
              Verwalte Newsletter-Abonnenten
            </p>
          </div>
          <Link
            href="/dashboard/newsletter/compose"
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
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Newsletter erstellen
          </Link>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700">
              <p className="dark:text-dark-muted text-sm text-gray-600">
                Gesamt
              </p>
              <p className="dark:text-dark-text text-2xl font-bold text-gray-900">
                {statistics.total}
              </p>
            </div>
            <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700">
              <p className="dark:text-dark-muted text-sm text-gray-600">
                Aktiv
              </p>
              <p className="dark:text-dark-text text-2xl font-bold text-green-600">
                {statistics.active}
              </p>
            </div>
            <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700">
              <p className="dark:text-dark-muted text-sm text-gray-600">
                Inaktiv
              </p>
              <p className="dark:text-dark-text text-2xl font-bold text-gray-600">
                {statistics.inactive}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Suche nach E-Mail oder Name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="dark:bg-dark-surface dark:border-dark-border dark:text-dark-text w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsActiveFilter(undefined)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActiveFilter === undefined
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              Alle
            </button>
            <button
              onClick={() => setIsActiveFilter(true)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActiveFilter === true
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              Aktiv
            </button>
            <button
              onClick={() => setIsActiveFilter(false)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActiveFilter === false
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              Inaktiv
            </button>
          </div>
        </div>

        {/* Subscribers List */}
        {subscribersLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
          </div>
        ) : subscribersData && subscribersData.subscribers.length > 0 ? (
          <>
            <div className="dark:bg-dark-surface overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="dark:bg-dark-surface bg-gray-50">
                  <tr>
                    <th className="dark:text-dark-text px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      E-Mail
                    </th>
                    <th className="dark:text-dark-text px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Name
                    </th>
                    <th className="dark:text-dark-text px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="dark:text-dark-text px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Abonniert am
                    </th>
                    <th className="dark:text-dark-text px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="dark:bg-dark-surface bg-white divide-y divide-gray-200 dark:divide-gray-700">
                  {subscribersData.subscribers.map((subscriber) => (
                    <tr key={subscriber.id}>
                      <td className="dark:text-dark-text whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {subscriber.email}
                      </td>
                      <td className="dark:text-dark-text whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {subscriber.name || "-"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {subscriber.isActive ? (
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Aktiv
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                            Inaktiv
                          </span>
                        )}
                      </td>
                      <td className="dark:text-dark-text whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {new Date(subscriber.subscribedAt).toLocaleDateString(
                          "de-DE",
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Möchtest du ${subscriber.email} wirklich löschen?`,
                              )
                            ) {
                              deleteSubscriber.mutate({ id: subscriber.id });
                            }
                          }}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Löschen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {subscribersData.pages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Zurück
                </button>
                <span className="dark:text-dark-text text-sm text-gray-700">
                  Seite {page} von {subscribersData.pages}
                </span>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(subscribersData.pages, p + 1))
                  }
                  disabled={page === subscribersData.pages}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Weiter
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-12 text-center dark:border-gray-700">
            <p className="dark:text-dark-muted text-gray-600">
              Keine Abonnenten gefunden.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

