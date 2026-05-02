"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import DashboardEventsList from "../../_components/dashboard/dashboard-events-list";
import SocialMediaExportModal from "../../_components/social-media/social-media-export-modal";
import { DashboardPage } from "../../_components/dashboard";
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
    <DashboardPage
      title="Termine verwalten"
      description="Erstelle, bearbeite und verwalte deine Termine"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Termine" },
      ]}
      actions={
        <>
          <button
            type="button"
            onClick={() => setShowSocialMediaModal(true)}
            className="dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-surface inline-flex items-center gap-2 rounded-lg border border-gray-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <InstagramIcon className="h-4 w-4" />
            Instagram Posts
          </button>
          <Link
            href="/dashboard/events/new"
            className="bg-primary hover:bg-primary-dark inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Neuer Termin
          </Link>
        </>
      }
    >
      <DashboardEventsList />

      {/* Social Media Export Modal */}
      <SocialMediaExportModal
        isOpen={showSocialMediaModal}
        onClose={() => setShowSocialMediaModal(false)}
      />
    </DashboardPage>
  );
}
