"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import Link from "next/link";
import DashboardUsersList from "@/app/_components/dashboard/dashboard-users-list";
import { DashboardPage } from "@/app/_components/dashboard";
import { Plus } from "lucide-react";

export default function DashboardUsersPage() {
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageUsers = hasPermission(PERMISSIONS.USERS_MANAGE);

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/login?callbackUrl=/dashboard/users");
    }
  }, [isPending, session]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !permissionsLoading &&
      !canManageUsers &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      redirect("/dashboard");
    }
  }, [profile, profileLoading, permissionsLoading, canManageUsers]);

  if (isPending || profileLoading) {
    return (
      <div className="dark:bg-night bg-paper flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageUsers) {
    return null;
  }

  return (
    <DashboardPage
      title="Benutzerverwaltung"
      description="Verwalte Benutzerkonten, Rollen und Berechtigungen"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Benutzer" },
      ]}
      actions={
        <Link
          href="/dashboard/users/new"
          className="on-orange bg-primary text-ink hover:bg-primary-dark inline-flex min-h-11 items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors"
        >
          <Plus className="h-5 w-5" />
          Neuer Benutzer
        </Link>
      }
    >
      <DashboardUsersList />
    </DashboardPage>
  );
}
