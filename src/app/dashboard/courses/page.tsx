"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import DashboardCoursesList from "../../_components/dashboard/dashboard-courses-list";
import { UserRole } from "~/generated/prisma/enums";

// Roles that have access to the dashboard
const DASHBOARD_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.LPW,
  UserRole.RPW,
  UserRole.OBLEUTE,
];

export default function DashboardCoursesPage() {
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);

  // Fetch user profile for extended fields
  const { data: profile, isLoading: profileLoading } = api.users.getMyProfile.useQuery(undefined, {
    enabled: !!session?.user,
  });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/login?callbackUrl=/dashboard/courses");
    }
  }, [isPending, session]);

  // Redirect if user doesn't have dashboard access
  useEffect(() => {
    if (!profileLoading && profile && !hasRedirected.current) {
      if (!DASHBOARD_ROLES.includes(profile.role)) {
        hasRedirected.current = true;
        redirect("/");
      }
    }
  }, [profile, profileLoading]);

  if (isPending || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-dark-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!session || !profile || !DASHBOARD_ROLES.includes(profile.role)) {
    return null;
  }

  // Get role from profile
  const userRole = profile.role;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-dark-background">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm">
          <ol className="flex items-center gap-2">
            <li>
              <Link
                href="/dashboard"
                className="text-gray-500 hover:text-primary dark:text-dark-muted dark:hover:text-primary"
              >
                Dashboard
              </Link>
            </li>
            <li className="text-gray-400 dark:text-dark-muted">/</li>
            <li className="text-gray-900 dark:text-dark-text">Kurse</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text">
              Kurse verwalten
            </h1>
            <p className="mt-2 text-gray-600 dark:text-dark-muted">
              Erstelle, bearbeite und verwalte deine Kurse und Lehrgänge
            </p>
          </div>
          <Link
            href="/dashboard/courses/new"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Neuer Kurs
          </Link>
        </div>

        {/* Courses List */}
        <DashboardCoursesList userRole={userRole} />
      </div>
    </main>
  );
}
