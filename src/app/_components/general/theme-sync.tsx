"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { useTheme } from "./theme-provider";

/**
 * Component that syncs user theme preference from database with ThemeProvider
 * Must be placed inside TRPCReactProvider
 */
export function ThemeSync() {
  const { data: session } = useSession();
  const { theme: currentTheme, setTheme } = useTheme();
  const { data: profile } = api.users.getMyProfile.useQuery(undefined, {
    enabled: !!session?.user,
  });

  useEffect(() => {
    if (profile?.preferences) {
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
          if (userTheme !== currentTheme) {
            setTheme(userTheme);
            localStorage.setItem("theme", userTheme);
          }
        }
      } catch {}
    }
  }, [profile, currentTheme, setTheme]);

  return null;
}
