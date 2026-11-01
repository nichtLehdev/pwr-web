import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { twoFactorClient, usernameClient } from "better-auth/client/plugins";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import type { auth } from "@/server/better-auth/config";
import { isOAuthAuthorizeQuery } from "./oauth-flow";

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  changePassword,
  twoFactor,
  oauth2,
} = createAuthClient({
  baseURL: getBaseUrl(),
  plugins: [
    inferAdditionalFields<typeof auth>(),
    usernameClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        // Mitten in einer OAuth-Anmeldung (KI-Client) die signierte Anfrage
        // unverändert mitnehmen; der Code-Schritt setzt die Freigabe dann fort.
        if (isOAuthAuthorizeQuery(window.location.search)) {
          window.location.href = `/verify-2fa${window.location.search}`;
          return;
        }
        const redirectTo =
          new URLSearchParams(window.location.search).get("redirect") || "/";
        window.location.href = `/verify-2fa?redirect=${encodeURIComponent(redirectTo)}`;
      },
    }),
    // Hängt auf /login und /verify-2fa die signierte OAuth-Anfrage an die
    // Anmeldung, damit better-auth danach direkt zur Zustimmung weiterleitet.
    oauthProviderClient(),
  ],
});
