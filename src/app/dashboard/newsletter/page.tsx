"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import { DashboardPage } from "@/app/_components/dashboard";
import { Mail, Users } from "lucide-react";

export default function DashboardNewsletterPage() {
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: canManageNewsletter } = api.permissions.canManage.useQuery(
    undefined,
    { enabled: !!session?.user },
  );

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
      title="Newsletter"
      description="Verwalte Newsletter-Abonnenten und erstelle Newsletter"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Newsletter" },
      ]}
    >
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
            className="dark:bg-dark-surface group hover:border-primary rounded-lg border border-gray-200 bg-white p-6 shadow transition-all hover:shadow-lg dark:border-gray-700"
          >
            <div className="text-primary bg-primary/10 group-hover:bg-primary mb-4 flex h-12 w-12 items-center justify-center rounded-lg transition-colors group-hover:text-white">
              <Mail className="h-6 w-6" />
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
            className="dark:bg-dark-surface group hover:border-primary rounded-lg border border-gray-200 bg-white p-6 shadow transition-all hover:shadow-lg dark:border-gray-700"
          >
            <div className="text-primary bg-primary/10 group-hover:bg-primary mb-4 flex h-12 w-12 items-center justify-center rounded-lg transition-colors group-hover:text-white">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="dark:text-dark-text mb-2 text-lg font-semibold text-gray-900">
              Abonnenten verwalten
            </h3>
            <p className="dark:text-dark-muted text-sm text-gray-600">
              Verwalte Newsletter-Abonnenten, suche und filtere nach Status
            </p>
          </Link>
        </div>
    </DashboardPage>
  );
}
