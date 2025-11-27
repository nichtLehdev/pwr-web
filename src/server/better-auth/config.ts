import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins/username";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { env } from "@/env";
import { db } from "@/server/db";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: ["http://localhost:3000", "http://192.168.4.136:3000"],
  plugins: [username()],
  socialProviders: {
    github: {
      clientId: env.BETTER_AUTH_GITHUB_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
      redirectURI: "http://localhost:3000/api/auth/callback/github",
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
      obleuteRole: {
        type: "string",
        required: false,
      },
      obleuteBezirkId: {
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
