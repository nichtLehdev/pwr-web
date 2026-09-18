import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import type { PermissionKey } from "@/lib/permissions";
import { clientKeyFromHeaders, rateLimit } from "@/server/utils/rate-limit";
import { createLogger } from "@/server/utils/logger";
import { isMaintenanceActive } from "@/server/maintenance";

/** @see https://trpc.io/docs/server/context */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth.api.getSession({
    headers: opts.headers,
  });
  return {
    db,
    session,
    permissionCache: new Map<string, Promise<Set<PermissionKey>>>(),
    ...opts,
  };
};

/** ZodErrors are flattened so the frontend gets typed validation errors. */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/** @see https://trpc.io/docs/server/server-side-calls */
export const createCallerFactory = t.createCallerFactory;

/** @see https://trpc.io/docs/router */
export const createTRPCRouter = t.router;

const log = createLogger("tRPC");

/** Only slower calls are logged in production; the rest is debug-only so errors aren't buried. */
const SLOW_PROCEDURE_MS = 1000;

/** Times procedures; in dev, artificial latency helps catch unwanted waterfalls. */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const durationMs = Date.now() - start;
  if (durationMs >= SLOW_PROCEDURE_MS) {
    log.warn(`slow procedure: ${path} took ${durationMs}ms`);
  } else {
    log.debug(`${path} took ${durationMs}ms`);
  }

  return result;
});

/**
 * `stats.recordView` ist Telemetrie und läuft bei jedem Seitenaufruf mit, auch
 * auf der Wartungsseite. Gesperrt würde sie dort nur 503 werfen.
 */
const MAINTENANCE_EXEMPT_MUTATIONS = new Set(["stats.recordView"]);

/**
 * Sperrt öffentliche Mutationen während der Wartung. `protectedProcedure` hängt
 * nicht an dieser Kette, angemeldete Redaktion arbeitet also weiter.
 */
const maintenanceGuard = t.middleware(async ({ next, type, path }) => {
  if (type !== "mutation") return next();
  if (MAINTENANCE_EXEMPT_MUTATIONS.has(path)) return next();

  if (await isMaintenanceActive()) {
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message:
        "Die Seite wird gerade gewartet. Bitte versuche es in Kürze noch einmal.",
    });
  }

  return next();
});

/** Unauthenticated; `ctx.session` is still available when logged in. */
export const publicProcedure = t.procedure
  .use(timingMiddleware)
  .use(maintenanceGuard);

/**
 * Per-client rate limiting for anonymous endpoints that send e-mail, hit
 * external services, or allow enumeration.
 */
export function rateLimitedPublicProcedure(
  name: string,
  options: { maxRequests: number; windowMs: number },
) {
  return publicProcedure.use(async ({ ctx, next }) => {
    const key = `trpc:${name}:${clientKeyFromHeaders(ctx.headers)}`;
    const result = rateLimit(key, options);
    if (!result.success) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Zu viele Anfragen. Bitte versuche es später erneut.",
      });
    }
    return next();
  });
}

/** Guarantees a non-null `ctx.session.user`. */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });
