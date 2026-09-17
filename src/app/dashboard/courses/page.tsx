"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import Link from "next/link";
import DashboardCoursesList from "../../_components/dashboard/dashboard-courses-list";
import { DashboardPage } from "../../_components/dashboard";
import { Plus } from "lucide-react";

export default function DashboardCoursesPage() {
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { hasDashboardAccess, isLoading: permissionsLoading } =
    usePermissions();

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/login?callbackUrl=/dashboard/courses");
    }
  }, [isPending, session]);

  useEffect(() => {
    if (!permissionsLoading && !hasDashboardAccess && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/");
    }
  }, [permissionsLoading, hasDashboardAccess]);

  if (isPending || profileLoading || permissionsLoading) {
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
      title="Kurse verwalten"
      description="Erstelle, bearbeite und verwalte deine Kurse und Lehrgänge"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Kurse" },
      ]}
      actions={
        <Link
          href="/dashboard/courses/new"
          className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink inline-flex min-h-11 items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" />
          Neuer Kurs
        </Link>
      }
    >
      <DashboardCoursesList />
    </DashboardPage>
  );
}
