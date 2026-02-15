"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/trpc/react";

const THROTTLE_MS = 60_000; // Don't record same path more than once per minute

/**
 * Tracks anonymous page views. Call recordSection from sections you want to track (e.g. hero, footer).
 * Page path is recorded automatically on mount/navigation.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const recordView = api.stats.recordView.useMutation();
  const lastRecorded = useRef<{ path: string; section: string | null; at: number } | null>(null);

  useEffect(() => {
    if (!pathname) return;
    const now = Date.now();
    const last = lastRecorded.current;
    if (last && last.path === pathname && last.section === null && now - last.at < THROTTLE_MS) {
      return;
    }
    lastRecorded.current = { path: pathname, section: null, at: now };
    recordView.mutate({ path: pathname });
  }, [pathname, recordView.mutate]);

  return null;
}

/**
 * Call this from a section (e.g. hero, footer) to record a section view.
 * path is optional; if not provided, current pathname is used (call from client with usePathname).
 */
export function useRecordSection(section: string, path?: string) {
  const pathname = usePathname();
  const recordView = api.stats.recordView.useMutation();
  const recorded = useRef(false);

  useEffect(() => {
    const p = path ?? pathname;
    if (!p || !section || recorded.current) return;
    recorded.current = true;
    recordView.mutate({ path: p, section });
  }, [path, pathname, section, recordView.mutate]);
}
