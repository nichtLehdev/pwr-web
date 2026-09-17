"use client";

import { useEffect, useState, useRef } from "react";
import { useTheme } from "./theme-provider";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";

type ThemeOption = {
  value: "light" | "dark" | "system";
  label: string;
  icon: React.ReactNode;
};

const themeOptions: ThemeOption[] = [
  {
    value: "light",
    label: "Hell",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Dunkel",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
    ),
  },
  {
    value: "system",
    label: "System",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
];

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const utils = api.useUtils();
  const { data: profile } = api.users.getMyProfile.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const updatePreferences = api.users.updateMyPreferences.useMutation({
    onSuccess: () => {
      void utils.users.getMyProfile.invalidate();
    },
  });

  const currentIcon =
    themeOptions.find((opt) => opt.value === resolvedTheme)?.icon ||
    themeOptions[0]!.icon;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    setIsOpen(false);

    if (session?.user && profile) {
      try {
        const currentPreferences =
          typeof profile.preferences === "string"
            ? JSON.parse(profile.preferences)
            : profile.preferences || {};

        const updatedPreferences = {
          ...currentPreferences,
          theme: newTheme,
        };

        updatePreferences.mutate({
          preferences: JSON.stringify(updatedPreferences),
        });
      } catch {
        updatePreferences.mutate({
          preferences: JSON.stringify({ theme: newTheme }),
        });
      }
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-ink hover:bg-ink hover:text-paper dark:text-night-text dark:hover:bg-night-text dark:hover:text-night inline-flex h-11 w-11 items-center justify-center transition-colors"
        aria-label="Theme auswählen"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {currentIcon}
      </button>

      {isOpen && (
        <div className="border-ink bg-paper dark:border-night-rule dark:bg-night-raised absolute top-full right-0 z-50 mt-2 w-48 border-2 py-1">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleThemeChange(option.value)}
              aria-pressed={theme === option.value}
              className={`text-ink hover:bg-primary dark:text-night-text dark:hover:text-ink flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                theme === option.value ? "font-semibold" : "font-medium"
              }`}
            >
              {option.icon}
              <span>{option.label}</span>
              {theme === option.value && (
                <svg
                  className="ml-auto h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
