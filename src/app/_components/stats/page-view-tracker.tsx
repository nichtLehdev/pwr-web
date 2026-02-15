"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/trpc/react";
import { useSession } from "@/lib/auth";
import { useTrackingConsent } from "./tracking-consent-context";

const THROTTLE_MS = 60_000; // Don't record same path more than once per minute

/**
 * Tracks page views when user has consented. Respects consent (none / anonymous / anonymous_and_user).
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const { consent } = useTrackingConsent() ?? { consent: null };
  const { data: session } = useSession();
  const recordView = api.stats.recordView.useMutation();
  const lastRecorded = useRef<{
    path: string;
    section: string | null;
    at: number;
  } | null>(null);

  useEffect(() => {
    if (!pathname || consent === "none" || consent === null) return;
    const now = Date.now();
    const last = lastRecorded.current;
    if (
      last &&
      last.path === pathname &&
      last.section === null &&
      now - last.at < THROTTLE_MS
    ) {
      return;
    }
    lastRecorded.current = { path: pathname, section: null, at: now };
    const userId =
      consent === "anonymous_and_user" && session?.user?.id
        ? session.user.id
        : undefined;
    recordView.mutate({ path: pathname, consent, userId });
  }, [pathname, consent, session?.user?.id, recordView.mutate]);

  return null;
}

/**
 * Call this from a section (e.g. hero, footer) to record a section view.
 * Respects tracking consent; path defaults to current pathname.
 */
export function useRecordSection(section: string, path?: string) {
  const pathname = usePathname();
  const { consent } = useTrackingConsent() ?? { consent: null };
  const { data: session } = useSession();
  const recordView = api.stats.recordView.useMutation();
  const recorded = useRef(false);

  useEffect(() => {
    if (consent === "none" || consent === null) return;
    const p = path ?? pathname;
    if (!p || !section || recorded.current) return;
    recorded.current = true;
    const userId =
      consent === "anonymous_and_user" && session?.user?.id
        ? session.user.id
        : undefined;
    recordView.mutate({ path: p, section, consent, userId });
  }, [path, pathname, section, consent, session?.user?.id, recordView.mutate]);
}
