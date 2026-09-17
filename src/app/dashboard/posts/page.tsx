"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
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

  const { hasDashboardAccess } = usePermissions();

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
      <div className="dark:bg-night bg-paper flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
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
          className="bg-primary hover:bg-primary-dark text-ink inline-flex min-h-11 items-center gap-2 px-3.5 text-sm font-semibold transition-colors"
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
