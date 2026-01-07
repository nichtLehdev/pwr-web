import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins/username";
import { twoFactor } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { env } from "@/env";
import { db } from "@/server/db";
import { sendVerificationEmail, isEmailConfigured } from "@/server/email";

// Get base URL from environment or default to localhost
const getBaseUrl = () => {
  return (
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  );
};

const baseUrl = getBaseUrl();

// Normalize origin URL (remove trailing slashes, ensure proper format)
const normalizeOrigin = (origin: string): string => {
  return origin.trim().replace(/\/+$/, "");
};

// Add both http and https versions of a URL to handle protocol variations
const addProtocolVariants = (url: string): string[] => {
  const normalized = normalizeOrigin(url);
  const variants: string[] = [normalized];

  // If it's http, also add https variant
  if (normalized.startsWith("http://")) {
    variants.push(normalized.replace("http://", "https://"));
  }
  // If it's https, also add http variant (for local dev)
  else if (normalized.startsWith("https://")) {
    variants.push(normalized.replace("https://", "http://"));
  }

  return variants;
};

// Build trusted origins list - include base URL and common localhost variants
// Also include any additional origins from environment variable (comma-separated)
const additionalOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS
  ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",").flatMap(
      addProtocolVariants,
    )
  : [];

// Always include the base URL and NEXT_PUBLIC_APP_URL if different
// Add both http and https variants to handle protocol variations
const baseUrlVariants = addProtocolVariants(baseUrl);
const nextPublicAppUrlVariants =
  process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL !== baseUrl
    ? addProtocolVariants(process.env.NEXT_PUBLIC_APP_URL)
    : [];

const allOrigins = [
  ...baseUrlVariants,
  ...nextPublicAppUrlVariants,
  ...additionalOrigins,
  "http://localhost:3000",
  "https://localhost:3000",
  "http://192.168.4.136:3000",
  "http://192.168.6.244:3000",
]
  .filter(Boolean) // Remove null/empty strings
  .filter((origin, index, self) => self.indexOf(origin) === index); // Remove duplicates

const trustedOrigins = allOrigins;

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
      console.log("[Better Auth] sendResetPassword called for:", user.email);
      console.log("[Better Auth] Reset URL:", url);

      if (!isEmailConfigured()) {
        console.error("[Better Auth] Email service is not configured");
        throw new Error("Email service is not configured");
      }

      // Better Auth provides a URL that will redirect to redirectTo with the token
      // The URL format Better Auth provides is: /api/auth/reset-password?token=...&redirectTo=...
      // When clicked, Better Auth redirects to redirectTo with ?token=...
      // Since we set redirectTo to /reset-password, Better Auth will redirect there with the token
      // But we want to include the email in the URL for better UX
      let resetUrl = url;
      try {
        const urlObj = new URL(url, baseUrl);
        const token = urlObj.searchParams.get("token");

        console.log("[Better Auth] Original URL from Better Auth:", url);
        console.log(
          "[Better Auth] Extracted token:",
          token ? `${token.substring(0, 20)}...` : "NOT FOUND",
        );

        if (token) {
          // Create our custom reset password page URL with the token
          // Better Auth only needs the token to reset the password, email is optional
          // We include email for better UX (showing it in the form), but it's not required
          resetUrl = `${baseUrl}/reset-password?token=${token}${user.email ? `&email=${encodeURIComponent(user.email)}` : ""}`;
          console.log("[Better Auth] Created reset URL:", resetUrl);
        } else {
          console.warn(
            "[Better Auth] No token found in reset URL, using original URL",
          );
          // If no token found, Better Auth's URL might work as-is (it will redirect)
          resetUrl = url;
        }
      } catch (error) {
        console.error("[Better Auth] Error parsing reset URL:", error);
        // If URL parsing fails, use original URL
        resetUrl = url;
      }

      console.log("[Better Auth] Sending password reset email to:", user.email);
      console.log("[Better Auth] Using reset URL:", resetUrl);

      try {
        const { sendPasswordResetEmail } = await import("@/server/email");
        await sendPasswordResetEmail(
          user.email,
          resetUrl,
          user.name || undefined,
        );
        console.log("[Better Auth] Password reset email sent successfully");
      } catch (emailError) {
        console.error(
          "[Better Auth] Error sending password reset email:",
          emailError,
        );
        throw emailError;
      }
    },
  },
  email: {
    sendVerificationEmail: async ({
      user,
      url,
    }: {
      user: { email: string; name?: string | null };
      url: string;
    }) => {
      if (!isEmailConfigured()) {
        throw new Error("Email service is not configured");
      }

      // Extract token from Better Auth's verification URL
      // Better Auth URL format: /api/auth/verify-email?token=...
      let verificationUrl = url;
      try {
        const urlObj = new URL(url, baseUrl);
        const token = urlObj.searchParams.get("token");

        // Create our custom verification page URL
        verificationUrl = token
          ? `${baseUrl}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`
          : url; // Fallback to original URL if token not found
      } catch {
        // If URL parsing fails, use original URL
        verificationUrl = url;
      }

      await sendVerificationEmail(
        user.email,
        verificationUrl,
        user.name || undefined,
      );
    },
  },
  trustedOrigins,
  appName: "Posaunenwerk Rheinland",
  plugins: [
    username(),
    twoFactor({
      issuer: "Posaunenwerk Rheinland",
    }),
  ],
  socialProviders: {
    github: {
      clientId: env.BETTER_AUTH_GITHUB_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
      redirectURI: `${baseUrl}/api/auth/callback/github`,
    },
  },
  user: {
    fields: {
      email: "email",
      name: "displayName",
      image: "profileImageId",
    },
    additionalFields: {
      username: {
        type: "string",
        required: false,
      },
      displayName: {
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
      phone: {
        type: "string",
        required: false,
      },
      street: {
        type: "string",
        required: false,
      },
      zipCode: {
        type: "string",
        required: false,
      },
      city: {
        type: "string",
        required: false,
      },
      birthDate: {
        type: "date",
        required: false,
      },
      profileImageId: {
        type: "string",
        required: false,
      },
      role: {
        type: "string",
        required: true,
        defaultValue: "USER",
      },
      roleType: {
        type: "string",
        required: false,
      },
      displayRole: {
        type: "string",
        required: false,
      },
      bezirkId: {
        type: "string",
        required: false,
      },
      bio: {
        type: "string",
        required: false,
      },
      preferences: {
        type: "string", // JSON fields are stored as strings
        required: false,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
