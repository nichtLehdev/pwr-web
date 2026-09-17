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
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        {/* Der Kreis bleibt rund: „keine Rundungen“ gilt Kästen, nicht einem
            Ladezeiger. Die Farbe wird Tinte — Orange trug hier zu viel
            Aufmerksamkeit für einen Zustand, der Sekundenbruchteile dauert. */}
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Ohne diesen Sprung kostet der Weg zum Inhalt 29 Tabulatorschritte durch
          die Seitenleiste — auf jeder Dashboard-Seite aufs Neue. Verschoben
          statt `sr-only`: `sr-only`/`not-sr-only` streiten sich um dieselbe
          `position`-Eigenschaft, die Verschiebung tut das nicht. */}
      <a
        href="#dashboard-inhalt"
        className="programm bg-ink text-paper dark:bg-night-text dark:text-night fixed top-2 left-2 z-50 -translate-y-24 px-4 py-2 text-sm font-semibold opacity-0 transition-transform focus:translate-y-0 focus:opacity-100"
      >
        Zum Inhalt springen
      </a>
      <DashboardSidebar />
      <div id="dashboard-inhalt" tabIndex={-1} className="min-w-0 flex-1">
        {children}
      </div>
    </div>
  );
}
