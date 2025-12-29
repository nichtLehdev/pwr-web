import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins/username";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { env } from "@/env";
import { db } from "@/server/db";

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
  ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",").flatMap(addProtocolVariants)
  : [];

// Always include the base URL and NEXT_PUBLIC_APP_URL if different
// Add both http and https variants to handle protocol variations
const baseUrlVariants = addProtocolVariants(baseUrl);
const nextPublicAppUrlVariants = process.env.NEXT_PUBLIC_APP_URL && 
  process.env.NEXT_PUBLIC_APP_URL !== baseUrl
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

// Log trusted origins in development for debugging (remove sensitive info in production)
if (process.env.NODE_ENV === "development") {
  console.log("[Better Auth] Trusted origins:", trustedOrigins);
}

export const auth = betterAuth({
  baseURL: baseUrl,
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins,
  plugins: [username()],
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
