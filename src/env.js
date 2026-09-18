import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Positive integer that also falls back on "": deployment templates render unset values
 * as "", which `.default()` would reject as NaN and fail the boot.
 *
 * @param {number} fallback
 */
const positiveIntWithDefault = (fallback) =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? fallback : value),
    z.coerce.number().int().min(1),
  );

export const env = createEnv({
  server: {
    // Required everywhere: otherwise better-auth uses a known default secret.
    BETTER_AUTH_SECRET: z.string().min(32),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    /**
     * Welches Deployment läuft; NODE_ENV ist auf beiden Servern "production".
     * Nur "production" ist die öffentliche Seite, alles andere Vorab-Umgebung.
     */
    APP_ENV: z
      .enum(["development", "next", "production"])
      .default("development"),
    /** Feedback page → GitHub issues. Unset: the page redirects to /kontakt. */
    GITHUB_TOKEN: z.string().optional(),
    GITHUB_REPO: z.string().optional(),
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().default(587).optional(),
    SMTP_SECURE: z
      .string()
      .optional()
      .transform((val) => {
        if (val === undefined) return undefined;
        return val === "true" || val === "1";
      }),
    SMTP_USER: z.string().email().optional(),
    SMTP_PASSWORD: z.string().min(1).optional(),
    SMTP_FROM: z.string().email().optional(),
    /**
     * SMTP pool size, bounded by the relay's limit: beyond it messages are
     * rejected and never retried.
     */
    SMTP_MAX_CONNECTIONS: positiveIntWithDefault(3),
    /** Burst ceiling across the whole pool. Keep under the relay's rate limit. */
    SMTP_MAX_MESSAGES_PER_SECOND: positiveIntWithDefault(5),
    /** Recipient for messages from the public contact form. */
    CONTACT_EMAIL: z.string().email().optional(),
    /** Secret for /api/cron/* routes (Bearer token or ?secret=). */
    CRON_SECRET: z.string().min(16).optional(),
  },

  client: {},

  /** `process.env` can't be destructured in edge runtimes or on the client. */
  runtimeEnv: {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    APP_ENV: process.env.APP_ENV,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_REPO: process.env.GITHUB_REPO,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    SMTP_FROM: process.env.SMTP_FROM,
    SMTP_MAX_CONNECTIONS: process.env.SMTP_MAX_CONNECTIONS,
    SMTP_MAX_MESSAGES_PER_SECOND: process.env.SMTP_MAX_MESSAGES_PER_SECOND,
    CONTACT_EMAIL: process.env.CONTACT_EMAIL,
    CRON_SECRET: process.env.CRON_SECRET,
  },
  /** For Docker builds. */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
