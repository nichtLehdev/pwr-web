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

  // Load theme from user preferences when profile is available
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
          // Only update if different from current theme to avoid unnecessary updates
          if (userTheme !== currentTheme) {
            setTheme(userTheme);
            localStorage.setItem("theme", userTheme);
          }
        }
      } catch {
        // Ignore parsing errors
      }
    }
  }, [profile, currentTheme, setTheme]);

  return null;
}

