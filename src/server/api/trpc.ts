/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { auth } from "@/server/better-auth";
import { db } from "@/server/db";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth.api.getSession({
    headers: opts.headers,
  });
  return {
    db,
    session,
    ...opts,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
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

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
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

/**
 * DEPRECATED: Use permissionProcedure from @/server/api/middleware/permissions instead
 *
 * These procedures are kept for backward compatibility during migration.
 * They will be removed once all routers are migrated to use permissions.
 */

/**
 * Admin-only procedure (DEPRECATED)
 *
 * @deprecated Use permissionProcedure(PERMISSIONS.USERS_MANAGE) instead
 */
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const { userHasPermission } = await import("./helpers/permissions");
  const { PERMISSIONS } = await import("@/lib/permissions");

  const hasPermission = await userHasPermission(
    ctx.session.user.id,
    PERMISSIONS.USERS_MANAGE,
  );

  if (!hasPermission) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next({ ctx });
});

/**
 * LPW or Admin procedure (DEPRECATED)
 *
 * @deprecated Use permissionProcedure(PERMISSIONS.EVENTS_APPROVE) instead
 */
export const lpwProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const { userHasPermission } = await import("./helpers/permissions");
  const { PERMISSIONS } = await import("@/lib/permissions");

  const hasPermission = await userHasPermission(
    ctx.session.user.id,
    PERMISSIONS.EVENTS_APPROVE,
  );

  if (!hasPermission) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "LPW or Admin access required",
    });
  }
  return next({ ctx });
});

/**
 * Reviewer procedure (DEPRECATED)
 *
 * @deprecated Use permissionProcedureAny([PERMISSIONS.EVENTS_APPROVE, PERMISSIONS.POSTS_APPROVE]) instead
 */
export const reviewerProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    const { userHasPermission } = await import("./helpers/permissions");
    const { PERMISSIONS } = await import("@/lib/permissions");

    const canApproveEvents = await userHasPermission(
      ctx.session.user.id,
      PERMISSIONS.EVENTS_APPROVE,
    );
    const canApprovePosts = await userHasPermission(
      ctx.session.user.id,
      PERMISSIONS.POSTS_APPROVE,
    );

    if (!canApproveEvents && !canApprovePosts) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Reviewer access required",
      });
    }
    return next({ ctx });
  },
);

/**
 * Posaunenrat procedure (DEPRECATED)
 *
 * @deprecated Use permissionProcedureAny with appropriate permissions instead
 */
export const posaunenratProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    const { getUserPermissions } = await import("./helpers/permissions");
    const { PERMISSIONS } = await import("@/lib/permissions");

    const permissions = await getUserPermissions(ctx.session.user.id);
    const allowedPermissions = [
      PERMISSIONS.EVENTS_CREATE,
      PERMISSIONS.EVENTS_EDIT,
      PERMISSIONS.POSTS_CREATE,
      PERMISSIONS.POSTS_EDIT,
      PERMISSIONS.EVENTS_APPROVE,
      PERMISSIONS.POSTS_APPROVE,
    ] as const;
    const hasAnyPermission = permissions.some((perm) =>
      allowedPermissions.includes(perm as (typeof allowedPermissions)[number]),
    );

    if (!hasAnyPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Posaunenrat access required",
      });
    }
    return next({ ctx });
  },
);

/**
 * Content Creator procedure (DEPRECATED)
 *
 * @deprecated Use permissionProcedureAny([PERMISSIONS.EVENTS_CREATE, PERMISSIONS.POSTS_CREATE]) instead
 */
export const contentCreatorProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    const { userHasPermission } = await import("./helpers/permissions");
    const { PERMISSIONS } = await import("@/lib/permissions");

    const canCreateEvents = await userHasPermission(
      ctx.session.user.id,
      PERMISSIONS.EVENTS_CREATE,
    );
    const canCreatePosts = await userHasPermission(
      ctx.session.user.id,
      PERMISSIONS.POSTS_CREATE,
    );

    if (!canCreateEvents && !canCreatePosts) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Content creator access required",
      });
    }
    return next({ ctx });
  },
);
