"use client";

import { api } from "@/trpc/react";
import { useSession } from "@/lib/auth";
import type { PermissionKey } from "@/lib/permissions";

export function usePermissions() {
  const { data: session } = useSession();

  const { data: userPermissions, isLoading } =
    api.permissions.getMyPermissions.useQuery(undefined, {
      staleTime: 5 * 60 * 1000,
      enabled: !!session?.user,
    });

  const permissions = new Set<PermissionKey>(
    (userPermissions as PermissionKey[] | undefined) ?? [],
  );

  return {
    permissions,
    isLoading,
    hasPermission: (key: PermissionKey) => permissions.has(key),
    hasAnyPermission: (keys: PermissionKey[]) =>
      keys.some((k) => permissions.has(k)),
    hasAllPermissions: (keys: PermissionKey[]) =>
      keys.every((k) => permissions.has(k)),
    hasDashboardAccess: permissions.size > 0,
  };
}
