"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import DashboardPostsList from "../../_components/dashboard/dashboard-posts-list";
import { DashboardPage } from "../../_components/dashboard";
import { Plus } from "lucide-react";

export default function DashboardPostsPage() {
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: userPermissions } = api.permissions.getMyPermissions.useQuery(
    undefined,
    { enabled: !!session?.user?.id },
  );

  const hasDashboardAccess =
    Array.isArray(userPermissions) && userPermissions.length > 0;

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/login?callbackUrl=/dashboard/posts");
    }
  }, [isPending, session]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !hasDashboardAccess &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      redirect("/");
    }
  }, [profile, profileLoading, hasDashboardAccess]);

  if (isPending || profileLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !hasDashboardAccess) {
    return null;
  }

  return (
    <DashboardPage
      title="Beiträge verwalten"
      description="Erstelle, bearbeite und verwalte deine Beiträge"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Beiträge" },
      ]}
      actions={
        <Link
          href="/dashboard/posts/new"
          className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <Plus className="h-4 w-4" />
          Neuer Beitrag
        </Link>
      }
    >
      <DashboardPostsList />
    </DashboardPage>
  );
}
