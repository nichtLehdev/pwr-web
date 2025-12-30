"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import { UserRole } from "~/generated/prisma/enums";

const ALLOWED_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.LPW];

export default function DashboardNewsletterPage() {
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: statistics } = api.newsletter.getStatistics.useQuery(
    undefined,
    {
      enabled: !!session?.user && !!profile,
    },
  );

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/login?callbackUrl=/dashboard/newsletter");
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
            <li className="dark:text-dark-text text-gray-900">Newsletter</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
            Newsletter
          </h1>
          <p className="dark:text-dark-muted mt-2 text-gray-600">
            Verwalte Newsletter-Abonnenten und erstelle Newsletter
          </p>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700">
              <p className="dark:text-dark-muted text-sm text-gray-600">
                Gesamt Abonnenten
              </p>
              <p className="dark:text-dark-text mt-2 text-3xl font-bold text-gray-900">
                {statistics.total}
              </p>
            </div>
            <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700">
              <p className="dark:text-dark-muted text-sm text-gray-600">
                Aktive Abonnenten
              </p>
              <p className="dark:text-dark-text mt-2 text-3xl font-bold text-green-600">
                {statistics.active}
              </p>
            </div>
            <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700">
              <p className="dark:text-dark-muted text-sm text-gray-600">
                Inaktive Abonnenten
              </p>
              <p className="dark:text-dark-text mt-2 text-3xl font-bold text-gray-600">
                {statistics.inactive}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Link
            href="/dashboard/newsletter/compose"
            className="dark:bg-dark-surface group rounded-lg border border-gray-200 bg-white p-6 shadow transition-all hover:border-primary hover:shadow-lg dark:border-gray-700"
          >
            <div className="text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary group-hover:text-white transition-colors">
              <svg
                className="h-6 w-6"
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
            </div>
            <h3 className="dark:text-dark-text mb-2 text-lg font-semibold text-gray-900">
              Newsletter erstellen
            </h3>
            <p className="dark:text-dark-muted text-sm text-gray-600">
              Erstelle einen neuen Newsletter und sende ihn an alle Abonnenten
            </p>
          </Link>

          <Link
            href="/dashboard/newsletter/subscribers"
            className="dark:bg-dark-surface group rounded-lg border border-gray-200 bg-white p-6 shadow transition-all hover:border-primary hover:shadow-lg dark:border-gray-700"
          >
            <div className="text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary group-hover:text-white transition-colors">
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="dark:text-dark-text mb-2 text-lg font-semibold text-gray-900">
              Abonnenten verwalten
            </h3>
            <p className="dark:text-dark-muted text-sm text-gray-600">
              Verwalte Newsletter-Abonnenten, suche und filtere nach Status
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}

