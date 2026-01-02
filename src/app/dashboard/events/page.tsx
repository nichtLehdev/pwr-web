"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import DashboardEventsList from "../../_components/dashboard/dashboard-events-list";
import SocialMediaExportModal from "../../_components/social-media/social-media-export-modal";
import { UserRole } from "~/generated/prisma/enums";
import { ImageIcon, Plus } from "lucide-react";

const DASHBOARD_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.LPW,
  UserRole.RPW,
  UserRole.OBLEUTE,
];

export default function DashboardEventsPage() {
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);
  const [showSocialMediaModal, setShowSocialMediaModal] = useState(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/login?callbackUrl=/dashboard/events");
    }
  }, [isPending, session]);

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
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !DASHBOARD_ROLES.includes(profile.role)) {
    return null;
  }

  const userRole = profile.role;

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
            <li className="dark:text-dark-text text-gray-900">Termine</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
              Termine verwalten
            </h1>
            <p className="dark:text-dark-muted mt-2 text-gray-600">
              Erstelle, bearbeite und verwalte deine Termine
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowSocialMediaModal(true)}
              className="dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-surface inline-flex items-center gap-2 rounded-md border-2 border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Instagram Posts
            </button>
            <Link
              href="/dashboard/events/new"
              className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              <Plus className="h-4 w-4" />
              Neuer Termin
            </Link>
          </div>
        </div>

        {/* Events List */}
        <DashboardEventsList userRole={userRole} />

        {/* Social Media Export Modal */}
        <SocialMediaExportModal
          isOpen={showSocialMediaModal}
          onClose={() => setShowSocialMediaModal(false)}
        />
      </div>
    </main>
  );
}
