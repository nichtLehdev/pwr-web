"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { DashboardPage } from "@/app/_components/dashboard";
import ExportImportSection from "@/app/_components/dashboard/export-import-section";

export default function ExportImportPage() {
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });
  const { hasAnyPermission, isLoading: permissionsLoading } = usePermissions();
  const canManagePermissions = hasAnyPermission([
    PERMISSIONS.DATA_EXPORT,
    PERMISSIONS.DATA_IMPORT,
  ]);

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/login?callbackUrl=/dashboard/export-import");
    }
  }, [isPending, session]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !permissionsLoading &&
      !canManagePermissions &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      redirect("/dashboard");
    }
  }, [profile, profileLoading, permissionsLoading, canManagePermissions]);

  if (isPending || profileLoading) {
    return (
      <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManagePermissions) {
    return null;
  }

  return (
    <DashboardPage
      title="Export & Import"
      description="Exportieren und importieren Sie Inhalte für Backup oder Migration"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Export & Import" },
      ]}
    >
      {/* Content */}
      <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="p-6">
          <ExportImportSection />
        </div>
      </div>
    </DashboardPage>
  );
}
