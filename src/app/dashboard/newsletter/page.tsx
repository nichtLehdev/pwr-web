"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
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

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageNewsletter = hasPermission(PERMISSIONS.NEWSLETTER_MANAGE);

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
      !permissionsLoading &&
      !canManageNewsletter &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      redirect("/dashboard");
    }
  }, [profile, profileLoading, permissionsLoading, canManageNewsletter]);

  if (isPending || profileLoading) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
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
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="bg-rule/25 dark:bg-night-raised p-4">
            <p className="text-dark dark:text-night-muted text-sm">
              Gesamt Abonnenten
            </p>
            <p className="text-ink dark:text-night-text mt-2 text-3xl font-bold">
              {statistics.total}
            </p>
          </div>
          <div className="bg-rule/25 dark:bg-night-raised p-4">
            <p className="text-dark dark:text-night-muted text-sm">
              Aktive Abonnenten
            </p>
            <p className="dark:text-night-text text-ink mt-2 text-3xl font-bold">
              {statistics.active}
            </p>
          </div>
          <div className="bg-rule/25 dark:bg-night-raised p-4">
            <p className="text-dark dark:text-night-muted text-sm">
              Inaktive Abonnenten
            </p>
            <p className="text-ink dark:text-night-text mt-2 text-3xl font-bold">
              {statistics.inactive}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/newsletter/compose"
          className="group border-rule dark:border-night-rule hover:border-ink dark:hover:border-night-text border p-6 transition-colors"
        >
          <div className="border-ink dark:border-night-text text-ink dark:text-night-text mb-4 flex h-12 w-12 items-center justify-center border-2">
            <Mail className="h-6 w-6" aria-hidden />
          </div>
          <h3 className="condensed text-ink dark:text-night-text mb-2 text-lg font-bold">
            Newsletter erstellen
          </h3>
          <p className="text-dark dark:text-night-muted text-sm">
            Erstelle einen neuen Newsletter und sende ihn an alle Abonnenten
          </p>
        </Link>

        <Link
          href="/dashboard/newsletter/subscribers"
          className="group border-rule dark:border-night-rule hover:border-ink dark:hover:border-night-text border p-6 transition-colors"
        >
          <div className="border-ink dark:border-night-text text-ink dark:text-night-text mb-4 flex h-12 w-12 items-center justify-center border-2">
            <Users className="h-6 w-6" aria-hidden />
          </div>
          <h3 className="condensed text-ink dark:text-night-text mb-2 text-lg font-bold">
            Abonnenten verwalten
          </h3>
          <p className="text-dark dark:text-night-muted text-sm">
            Verwalte Newsletter-Abonnenten, suche und filtere nach Status
          </p>
        </Link>
      </div>
    </DashboardPage>
  );
}
