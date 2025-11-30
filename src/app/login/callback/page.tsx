"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { useSession } from "@/lib/auth";
import { UserRole } from "~/generated/prisma/enums";

// Roles that should be redirected to dashboard after login
const DASHBOARD_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.LPW,
  UserRole.RPW,
  UserRole.OBLEUTE,
];

export default function LoginCallbackPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  useEffect(() => {
    // Wait until we have session and profile data
    if (sessionLoading || profileLoading) return;

    // If no session, redirect to login
    if (!session?.user) {
      router.push("/login");
      return;
    }

    // Get the stored redirect URL (from OAuth flow)
    const storedRedirect = sessionStorage.getItem("loginRedirect");
    sessionStorage.removeItem("loginRedirect");
    const redirectTo = storedRedirect ?? "/";

    // Redirect based on role
    if (profile?.role && DASHBOARD_ROLES.includes(profile.role as UserRole)) {
      router.push("/dashboard");
    } else {
      router.push(redirectTo);
    }
  }, [session, profile, sessionLoading, profileLoading, router]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="text-center">
        <div className="border-primary mb-4 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent mx-auto" />
        <p className="text-gray-600 dark:text-gray-400">
          Anmeldung wird abgeschlossen...
        </p>
      </div>
    </div>
  );
}
