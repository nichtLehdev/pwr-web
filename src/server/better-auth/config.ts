import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins/username";
import { twoFactor } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { env } from "@/env";
import { db } from "@/server/db";
import { isEmailConfigured } from "@/server/email";

const getBaseUrl = () => {
  return (
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  );
};

const baseUrl = getBaseUrl();

const normalizeOrigin = (origin: string): string => {
  return origin.trim().replace(/\/+$/, "");
};

const isProduction = process.env.NODE_ENV === "production";

// Origins are trusted exactly as configured — no automatic http:// variants
// (those weaken the CSRF origin check), and dev/LAN origins only outside
// production builds.
const additionalOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS
  ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",").map(normalizeOrigin)
  : [];

const devOrigins = isProduction ? [] : ["http://localhost:3000"];

const trustedOrigins = [
  normalizeOrigin(baseUrl),
  ...(process.env.NEXT_PUBLIC_APP_URL
    ? [normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL)]
    : []),
  ...additionalOrigins,
  ...devOrigins,
]
  .filter(Boolean) // Remove null/empty strings
  .filter((origin, index, self) => self.indexOf(origin) === index); // Remove duplicates

export const auth = betterAuth({
  baseURL: baseUrl,
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true, // Require email verification
    sendResetPassword: async ({
      user,
      url,
    }: {
      user: { email: string; name?: string | null };
      url: string;
    }) => {
      if (!isEmailConfigured()) {
        console.error("[Better Auth] Email service is not configured");
        throw new Error("Email service is not configured");
      }

      // Never log the reset URL or token — container logs must not contain
      // credentials-equivalent secrets.
      let resetUrl = url;
      try {
        const urlObj = new URL(url, baseUrl);
        const token = urlObj.searchParams.get("token");

        if (token) {
          resetUrl = `${baseUrl}/reset-password?token=${token}${user.email ? `&email=${encodeURIComponent(user.email)}` : ""}`;
        } else {
          console.warn(
            "[Better Auth] No token found in reset URL, using original URL",
          );
          resetUrl = url;
        }
      } catch (error) {
        console.error("[Better Auth] Error parsing reset URL:", error);
        resetUrl = url;
      }

      try {
        const { sendPasswordResetEmail } = await import("@/server/email");
        await sendPasswordResetEmail(
          user.email,
          resetUrl,
          user.name || undefined,
        );
      } catch (emailError) {
        console.error(
          "[Better Auth] Error sending password reset email:",
          emailError,
        );
        throw emailError;
      }
    },
  },
  // NOTE: e-mail verification is handled by the custom
  // /api/auth/send-verification + /api/auth/verify-email-custom flow.
  // (A previous `email: { sendVerificationEmail }` block here used a key
  // better-auth does not recognize and was silently ignored.)
  trustedOrigins,
  // Persist rate-limit counters in Postgres (rateLimit table) so login /
  // reset throttling survives restarts and works across instances.
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "rateLimit",
  },
  appName: "Posaunenwerk Rheinland",
  plugins: [
    username(),
    twoFactor({
      issuer: "Posaunenwerk Rheinland",
    }),
  ],
  user: {
    fields: {
      email: "email",
      name: "displayName",
      image: "profileImageId",
    },
    additionalFields: {
      // Only fields the client passes at sign-up may be client-writable.
      // Everything else is `input: false` so the better-auth endpoints
      // (sign-up body, POST /api/auth/update-user) cannot set them — all
      // legitimate profile/admin updates go through the tRPC users router.
      // In particular bezirkId/districtRoleName gate course-edit access and
      // must never be self-assignable.
      username: {
        type: "string",
        required: false,
      },
      firstName: {
        type: "string",
        required: false,
      },
      lastName: {
        type: "string",
        required: false,
      },
      displayName: {
        type: "string",
        required: false,
        input: false,
      },
      phone: {
        type: "string",
        required: false,
        input: false,
      },
      street: {
        type: "string",
        required: false,
        input: false,
      },
      zipCode: {
        type: "string",
        required: false,
        input: false,
      },
      city: {
        type: "string",
        required: false,
        input: false,
      },
      birthDate: {
        type: "date",
        required: false,
        input: false,
      },
      profileImageId: {
        type: "string",
        required: false,
        input: false,
      },
      districtRoleName: {
        type: "string",
        required: false,
        input: false,
      },
      bezirkId: {
        type: "string",
        required: false,
        input: false,
      },
      bio: {
        type: "string",
        required: false,
        input: false,
      },
      preferences: {
        type: "string", // JSON fields are stored as strings
        required: false,
        input: false,
      },
      lastLoginAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
  advanced: {
    // Behind TLS termination a misconfigured BETTER_AUTH_URL (http://…) would
    // otherwise produce non-Secure session cookies in production.
    useSecureCookies: isProduction,
  },
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          await db.user.update({
            where: { id: session.userId },
            data: { lastLoginAt: new Date() },
          });
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
