"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import Link from "next/link";
import DashboardEventsList from "../../_components/dashboard/dashboard-events-list";
// Lazy: pulls in html-to-image + JSZip, only needed when the modal opens.
import dynamic from "next/dynamic";

const SocialMediaExportModal = dynamic(
  () => import("../../_components/social-media/social-media-export-modal"),
  { ssr: false },
);
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

  const { hasDashboardAccess } = usePermissions();

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
            className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 items-center gap-2 border px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            <InstagramIcon className="h-4 w-4" />
            Instagram Posts
          </button>
          <Link
            href="/dashboard/events/new"
            className="bg-primary hover:bg-primary-dark text-ink inline-flex min-h-11 items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            <Plus className="h-4 w-4" />
            Neuer Termin
          </Link>
        </>
      }
    >
      <DashboardEventsList />

      <SocialMediaExportModal
        isOpen={showSocialMediaModal}
        onClose={() => setShowSocialMediaModal(false)}
      />
    </DashboardPage>
  );
}
