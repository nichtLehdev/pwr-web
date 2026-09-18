"use client";

import { useSearchParams } from "next/navigation";

/**
 * Magic-link token from the e-mail. With it the pages run in guest mode (no session,
 * no account links) and every tRPC call carries the token.
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
