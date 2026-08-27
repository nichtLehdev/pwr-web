import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";
import { createLogger } from "@/server/utils/logger";

const log = createLogger("tRPC");

/**
 * Codes that mean the *caller* did something wrong (not logged in, bad input,
 * gone, rate-limited). They are part of normal operation and would otherwise
 * fill the production log, so they only show at debug level. Everything else
 * is an unhandled server-side failure and is always logged as an error.
 */
const EXPECTED_ERROR_CODES = new Set<string>([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "METHOD_NOT_SUPPORTED",
  "TIMEOUT",
  "CONFLICT",
  "PRECONDITION_FAILED",
  "PAYLOAD_TOO_LARGE",
  "UNPROCESSABLE_CONTENT",
  "TOO_MANY_REQUESTS",
  "CLIENT_CLOSED_REQUEST",
]);

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    // Runs in every environment: production errors are only visible in the
    // container log, so never silence this one.
    onError: ({ path, error, type }) => {
      const where = `${type} ${path ?? "<no-path>"}`;

      if (EXPECTED_ERROR_CODES.has(error.code)) {
        log.debug(`${where} → ${error.code}: ${error.message}`);
        return;
      }

      // `cause` holds the original throw (Prisma, fetch, ...) with the useful
      // stack; fall back to the TRPCError wrapper when there is none.
      log.error(
        `${where} → ${error.code}: ${error.message}`,
        error.cause ?? error,
      );
    },
  });

export { handler as GET, handler as POST };
