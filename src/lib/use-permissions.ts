"use client";

import { api } from "@/trpc/react";
import { useSession } from "@/lib/auth";
import type { PermissionKey } from "@/lib/permissions";

export function usePermissions() {
  // getMyPermissions is a protected procedure — only ask once a session
  // exists, otherwise every logged-out visitor produces UNAUTHORIZED errors.
  const { data: session, isPending: sessionLoading } = useSession();

  const { data: userPermissions, isLoading: permissionsLoading } =
    api.permissions.getMyPermissions.useQuery(undefined, {
      staleTime: 5 * 60 * 1000,
      enabled: !!session?.user,
      retry: false,
    });

  const permissions = new Set<PermissionKey>(
    (userPermissions as PermissionKey[] | undefined) ?? [],
  );

  return {
    permissions,
    isLoading: sessionLoading || (!!session?.user && permissionsLoading),
    hasPermission: (key: PermissionKey) => permissions.has(key),
    hasAnyPermission: (keys: PermissionKey[]) =>
      keys.some((k) => permissions.has(k)),
    hasAllPermissions: (keys: PermissionKey[]) =>
      keys.every((k) => permissions.has(k)),
    hasDashboardAccess: permissions.size > 0,
  };
}
