"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import DashboardEventsList from "../../_components/dashboard/dashboard-events-list";
import SocialMediaExportModal from "../../_components/social-media/social-media-export-modal";
import { InstagramIcon, Plus } from "lucide-react";

export default function DashboardEventsPage() {
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);
  const [showSocialMediaModal, setShowSocialMediaModal] = useState(false);

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
      redirect("/login?callbackUrl=/dashboard/events");
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

  // User permissions are checked via hasDashboardAccess

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
              <InstagramIcon className="h-4 w-4" />
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
        <DashboardEventsList />

        {/* Social Media Export Modal */}
        <SocialMediaExportModal
          isOpen={showSocialMediaModal}
          onClose={() => setShowSocialMediaModal(false)}
        />
      </div>
    </main>
  );
}
