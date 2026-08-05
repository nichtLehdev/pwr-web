"use client";

import { useSession } from "@/lib/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { usePermissions } from "@/lib/use-permissions";
import DashboardSidebar from "@/app/_components/dashboard/dashboard-sidebar";

/**
 * Central access guard for every /dashboard route.
 *
 * Waits for BOTH the session and the permissions query before deciding —
 * redirecting as soon as the profile is loaded (while permissions are still
 * in flight) bounced legitimate admins to "/" on every full page load.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending: sessionPending } = useSession();
  const { hasDashboardAccess, isLoading: permissionsLoading } =
    usePermissions();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (hasRedirected.current) return;

    if (!sessionPending && !session) {
      hasRedirected.current = true;
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (session && !permissionsLoading && !hasDashboardAccess) {
      hasRedirected.current = true;
      router.replace("/");
    }
  }, [
    sessionPending,
    session,
    permissionsLoading,
    hasDashboardAccess,
    router,
    pathname,
  ]);

  if (sessionPending || permissionsLoading || !session || !hasDashboardAccess) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <DashboardSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
