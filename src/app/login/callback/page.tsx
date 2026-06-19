"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { useSession } from "@/lib/auth";
import { usePermissions } from "@/lib/use-permissions";

export default function LoginCallbackPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { hasDashboardAccess, isLoading: permissionsLoading } =
    usePermissions();

  useEffect(() => {
    if (sessionLoading || profileLoading || permissionsLoading) return;

    if (!session?.user) {
      router.push("/login");
      return;
    }

    const storedRedirect = sessionStorage.getItem("loginRedirect");
    sessionStorage.removeItem("loginRedirect");
    const redirectTo = storedRedirect ?? "/";

    if (hasDashboardAccess) {
      router.push("/dashboard");
    } else {
      router.push(redirectTo);
    }
  }, [
    session,
    profile,
    hasDashboardAccess,
    permissionsLoading,
    sessionLoading,
    profileLoading,
    router,
  ]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="text-center">
        <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        <p className="text-gray-600 dark:text-gray-400">
          Anmeldung wird abgeschlossen...
        </p>
      </div>
    </div>
  );
}
