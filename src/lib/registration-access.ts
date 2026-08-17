"use client";

import { useSearchParams } from "next/navigation";

/**
 * Magic-link credential taken from the URL. Present when someone opened their
 * anmeldung straight from an e-mail instead of signing in — the pages then run
 * in "guest mode": no session, no links into the account area, and every tRPC
 * call carries the token so the server can recognise the registrant.
 */
export function useRegistrationAccessToken(): string | undefined {
  const searchParams = useSearchParams();
  return searchParams.get("token") ?? undefined;
}

/** Carries the magic link along when navigating between registration pages. */
export function withAccessToken(
  path: string,
  accessToken: string | undefined,
): string {
  if (!accessToken) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}token=${encodeURIComponent(accessToken)}`;
}
