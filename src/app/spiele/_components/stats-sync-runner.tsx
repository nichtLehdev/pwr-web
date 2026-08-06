"use client";

import { useStatsSync } from "../_lib/stats/use-stats-sync";

/** Unsichtbar — hält den Outbox-Sync am Laufen (GameShell + Spiele-Übersicht). */
export function StatsSyncRunner() {
  useStatsSync();
  return null;
}
