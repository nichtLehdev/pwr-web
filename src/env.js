import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * A positive integer that falls back to `fallback` when the variable is
 * missing *or* set to an empty string. Deployment templates routinely render
 * an unset value as "", which plain `.default()` would treat as present and
 * then reject as NaN — turning an optional tuning knob into a boot failure.
 *
 * @param {number} fallback
 */
const positiveIntWithDefault = (fallback) =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? fallback : value),
    z.coerce.number().int().min(1),
  );

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    // Required in every environment: without it better-auth falls back to a
    // known default secret and unsubscribe-token signing throws.
    BETTER_AUTH_SECRET: z.string().min(32),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    /**
     * Welches Deployment hier läuft. NODE_ENV taugt dafür nicht: dasselbe
     * gebaute Image läuft mit NODE_ENV=production auf BEIDEN Servern
     * (mittwald und Pre-Release). Nur "production" ist die öffentliche Seite,
     * alles andere gilt als Vorab-Umgebung (z. B. Beta-Banner sichtbar).
     */
    APP_ENV: z
      .enum(["development", "next", "production"])
      .default("development"),
    /**
     * GitHub integration for the feedback page (feedback -> GitHub issues).
     * Leave unset to disable the feedback page entirely — it then redirects
     * to /kontakt (production behavior).
     */
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
     * SMTP connection pool, sized for what the relay tolerates rather than
     * for how fast we would like to be. A newsletter blast holds this many
     * connections open at once; going past the relay's limit gets the
     * remaining messages rejected, and a rejected message is never retried.
     */
    SMTP_MAX_CONNECTIONS: positiveIntWithDefault(3),
    /** Burst ceiling across the whole pool. Keep under the relay's rate limit. */
    SMTP_MAX_MESSAGES_PER_SECOND: positiveIntWithDefault(5),
    /** Recipient for messages from the public contact form. */
    CONTACT_EMAIL: z.string().email().optional(),
    /** Secret for /api/cron/* routes (Bearer token or ?secret=). */
    CRON_SECRET: z.string().min(16).optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {},

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
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
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
