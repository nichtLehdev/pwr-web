import { TRPCError } from "@trpc/server";
import { getBaseUrl } from "@/server/utils/get-base-url";
import { clientKeyFromHeaders, rateLimit } from "@/server/utils/rate-limit";
import {
  createRegistrationAccessToken,
  verifyRegistrationAccessToken,
} from "@/server/utils/registration-access-token";

/**
 * Anyone can register for a course without an account, so "my registration"
 * cannot always mean "signed in as the registrant". A magic link — a signed,
 * expiring token bound to the registration and the registrant's address —
 * grants the same ownership the registrant would have when logged in.
 *
 * Everything else still applies unchanged: the edit deadline, the cancelled
 * check, capacity. The token only answers "is this the registrant?".
 */
type AccessContext = {
  headers: Headers;
  session?: { user: { id: string; email: string } } | null;
};

type OwnedRegistration = {
  id: string;
  registrantEmail: string;
};

/**
 * Guessing a HMAC-SHA256 signature is hopeless, but an unauthenticated
 * endpoint should not hand out unlimited attempts either.
 */
function assertTokenAttemptAllowed(headers: Headers): void {
  const key = `trpc:registrations.accessToken:${clientKeyFromHeaders(headers)}`;
  const { success } = rateLimit(key, {
    maxRequests: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (!success) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Zu viele Anfragen. Bitte versuche es später erneut.",
    });
  }
}

/** The registrant themselves — signed in with their address, or via magic link. */
export function isRegistrationOwner(
  ctx: AccessContext,
  registration: OwnedRegistration,
  accessToken?: string,
): boolean {
  const sessionEmail = ctx.session?.user.email;
  if (sessionEmail && registration.registrantEmail === sessionEmail) {
    return true;
  }

  if (!accessToken) return false;
  assertTokenAttemptAllowed(ctx.headers);

  return verifyRegistrationAccessToken(
    registration.id,
    registration.registrantEmail,
    accessToken,
  );
}

/**
 * Course staff are always account holders, so staff checks need a viewer id.
 * Magic-link callers have none and are never staff.
 */
export function viewerId(ctx: AccessContext): string | null {
  return ctx.session?.user.id ?? null;
}

/** Landing page of a magic link: the registration's detail view. */
export function registrationAccessUrl(
  registration: OwnedRegistration,
  options: { edit?: boolean } = {},
): string {
  const token = createRegistrationAccessToken(
    registration.id,
    registration.registrantEmail,
  );
  const path = options.edit
    ? `/registrations/${registration.id}/edit`
    : `/registrations/${registration.id}`;
  return `${getBaseUrl()}${path}?token=${encodeURIComponent(token)}`;
}
