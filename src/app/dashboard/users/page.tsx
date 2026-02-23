"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
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

  const { data: canManageUsers } = api.permissions.canManage.useQuery(
    undefined,
    { enabled: !!session?.user },
  );

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
      !canManageUsers &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      redirect("/dashboard");
    }
  }, [profile, profileLoading, canManageUsers]);

  if (isPending || profileLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
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
          className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-medium text-white transition-colors"
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
