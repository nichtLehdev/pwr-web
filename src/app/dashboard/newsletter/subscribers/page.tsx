"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import { DashboardPage } from "@/app/_components/dashboard";
import { Mail } from "lucide-react";

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

  const { data: canManageNewsletter } = api.permissions.canManage.useQuery(
    undefined,
    { enabled: !!session?.user },
  );

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
    if (
      !profileLoading &&
      profile &&
      !canManageNewsletter &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      redirect("/dashboard");
    }
  }, [profile, profileLoading, canManageNewsletter]);

  if (isPending || profileLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageNewsletter) {
    return null;
  }

  return (
    <DashboardPage
      title="Newsletter Abonnenten"
      description="Verwalte Newsletter-Abonnenten"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Newsletter", href: "/dashboard/newsletter" },
        { label: "Abonnenten" },
      ]}
      actions={
        <Link
          href="/dashboard/newsletter/compose"
          className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-medium text-white transition-colors"
        >
          <Mail className="h-5 w-5" />
          Newsletter erstellen
        </Link>
      }
    >
      {/* Statistics */}
      {statistics && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700">
            <p className="dark:text-dark-muted text-sm text-gray-600">Gesamt</p>
            <p className="dark:text-dark-text text-2xl font-bold text-gray-900">
              {statistics.total}
            </p>
          </div>
          <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700">
            <p className="dark:text-dark-muted text-sm text-gray-600">Aktiv</p>
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
            className="dark:bg-dark-surface dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:outline-none"
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
                  <th className="dark:text-dark-text px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    E-Mail
                  </th>
                  <th className="dark:text-dark-text px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="dark:text-dark-text px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="dark:text-dark-text px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Abonniert am
                  </th>
                  <th className="dark:text-dark-text px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="dark:bg-dark-surface divide-y divide-gray-200 bg-white dark:divide-gray-700">
                {subscribersData.subscribers.map((subscriber) => (
                  <tr key={subscriber.id}>
                    <td className="dark:text-dark-text px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                      {subscriber.email}
                    </td>
                    <td className="dark:text-dark-text px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                      {subscriber.name || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
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
                    <td className="dark:text-dark-text px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                      {new Date(subscriber.subscribedAt).toLocaleDateString(
                        "de-DE",
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
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
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
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
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
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
    </DashboardPage>
  );
}
