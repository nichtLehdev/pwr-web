"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
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

  const { data: userPermissions } = api.permissions.getMyPermissions.useQuery(
    undefined,
    { enabled: !!session?.user?.id },
  );

  const hasDashboardAccess =
    Array.isArray(userPermissions) && userPermissions.length > 0;

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/login?callbackUrl=/dashboard/courses");
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
      title="Kurse verwalten"
      description="Erstelle, bearbeite und verwalte deine Kurse und Lehrgänge"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Kurse" },
      ]}
      actions={
        <Link
          href="/dashboard/courses/new"
          className="bg-primary hover:bg-primary-dark inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors"
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
