import { safeInternalPath } from "./safe-redirect";

/**
 * One post-login routing rule for every flow (password login, OAuth
 * callback, 2FA verification): an explicit redirect target always wins;
 * the dashboard is only the fallback for permission-holders who didn't
 * ask to go anywhere specific.
 */
export function resolvePostLoginTarget(
  requestedRedirect: string | null | undefined,
  hasDashboardAccess: boolean,
): string {
  const explicit = safeInternalPath(requestedRedirect, "");
  if (explicit) return explicit;
  return hasDashboardAccess ? "/dashboard" : "/";
}
