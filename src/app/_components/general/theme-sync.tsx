"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { useTheme } from "./theme-provider";

/**
 * Component that syncs user theme preference from database with ThemeProvider
 * Must be placed inside TRPCReactProvider
 */
export function ThemeSync() {
  const { data: session } = useSession();
  const { setTheme } = useTheme();
  const { data: profile } = api.users.getMyProfile.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (!hasSyncedRef.current && profile?.preferences) {
      try {
        const parsed =
          typeof profile.preferences === "string"
            ? JSON.parse(profile.preferences)
            : profile.preferences;
        if (
          parsed?.theme &&
          ["light", "dark", "system"].includes(parsed.theme)
        ) {
          const userTheme = parsed.theme as "light" | "dark" | "system";
          setTheme(userTheme);
          hasSyncedRef.current = true;
        }
      } catch {}
    } else if (profile && !hasSyncedRef.current) {
      hasSyncedRef.current = true;
    }
  }, [profile, setTheme]);

  return null;
}
