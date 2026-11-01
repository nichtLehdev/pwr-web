import type { BetterAuthPlugin } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";

import { withNativeLoopbackDefault } from "./native-loopback";

/**
 * Wendet {@link withNativeLoopbackDefault} vor `/oauth2/register` an. Als
 * Plugin-Hook mit eigenem Matcher, damit er keine anderen Endpunkte berührt.
 */
export const nativeLoopbackRegistration = () =>
  ({
    id: "native-loopback-registration",
    hooks: {
      before: [
        {
          matcher: (ctx) => ctx.path === "/oauth2/register",
          handler: createAuthMiddleware(async (ctx) => {
            const body = withNativeLoopbackDefault(ctx.body);
            if (body) return { context: { body } };
          }),
        },
      ],
    },
  }) satisfies BetterAuthPlugin;
