import { safeInternalPath } from "./safe-redirect";

/**
 * One rule for every login flow (password, OAuth, 2FA): an explicit redirect wins;
 * the dashboard is only the fallback for permission-holders.
 */
export function resolvePostLoginTarget(
  requestedRedirect: string | null | undefined,
  hasDashboardAccess: boolean,
): string {
  const explicit = safeInternalPath(requestedRedirect, "");
  if (explicit) return explicit;
  return hasDashboardAccess ? "/dashboard" : "/";
}
