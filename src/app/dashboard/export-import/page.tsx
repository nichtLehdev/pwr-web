"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import { ArrowLeft, Download, Upload } from "lucide-react";
import ExportImportSection from "@/app/_components/dashboard/export-import-section";

export default function ExportImportPage() {
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });
  const { data: canManagePermissions } = api.permissions.canManage.useQuery(
    undefined,
    {
      enabled: !!session?.user && !!profile,
    },
  );

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
      !canManagePermissions &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      redirect("/dashboard");
    }
  }, [profile, profileLoading, canManagePermissions]);

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
    <main className="bg-background-secondary dark:bg-dark-background-secondary min-h-[calc(100vh-4rem)]">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary mb-4 inline-flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zum Dashboard
          </Link>
          <h1 className="text-dark dark:text-dark-text text-3xl font-bold">
            Export & Import
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Exportieren und importieren Sie Inhalte für Backup oder Migration
          </p>
        </div>

        {/* Content */}
        <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="p-6">
            <ExportImportSection />
          </div>
        </div>
      </div>
    </main>
  );
}
