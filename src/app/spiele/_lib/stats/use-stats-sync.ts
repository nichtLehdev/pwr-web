"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import type { GameId } from "../games";
import {
  loadOutbox,
  mergeServerAggregates,
  OUTBOX_CHANGED_EVENT,
  removeFromOutbox,
} from "./storage";

const FLUSH_BATCH = 50;

/**
 * Hintergrund-Sync für Angemeldete: Outbox-Flush bei Mount, `online`, Sichtbarkeit und neuem
 * Ergebnis; Server-Aggregate per Max-Merge. Anonyme sammeln lokal, die Outbox lädt nach dem
 * ersten Login hoch. Nur einmal mounten (Spiele-Übersicht oder GameShell).
 */
export function useStatsSync() {
  const { data: session } = useSession();
  const loggedIn = Boolean(session?.user);
  const submitResults = api.games.submitResults.useMutation();
  const utils = api.useUtils();
  const flushingRef = useRef(false);

  const flush = useCallback(async () => {
    if (!loggedIn || flushingRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    const outbox = loadOutbox();
    if (outbox.length === 0) return;

    flushingRef.current = true;
    try {
      for (let i = 0; i < outbox.length; i += FLUSH_BATCH) {
        const batch = outbox.slice(i, i + FLUSH_BATCH);
        await submitResults.mutateAsync({
          results: batch.map((e) => ({
            clientId: e.clientId,
            gameId: e.gameId,
            playedAt: new Date(e.playedAt),
            score: e.score,
            maxScore: e.maxScore,
            streak: e.streak,
            durationMs: e.durationMs,
            meta: e.meta,
          })),
        });
        removeFromOutbox(batch.map((e) => e.clientId));
      }
    } catch {
      // Netz weg oder Server down — Outbox bleibt stehen, nächster Trigger versucht es erneut.
    } finally {
      flushingRef.current = false;
    }
  }, [loggedIn, submitResults]);

  const pull = useCallback(async () => {
    if (!loggedIn) return;
    try {
      const stats = await utils.games.getMyStats.fetch();
      for (const row of stats) {
        mergeServerAggregates(row.game as GameId, row);
      }
    } catch {
      /* offline — lokale Werte reichen. */
    }
  }, [loggedIn, utils]);

  useEffect(() => {
    if (!loggedIn) return;
    void flush().then(() => pull());

    const onTrigger = () => void flush();
    const onVisible = () => {
      if (document.visibilityState === "visible") void flush();
    };
    window.addEventListener("online", onTrigger);
    window.addEventListener(OUTBOX_CHANGED_EVENT, onTrigger);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onTrigger);
      window.removeEventListener(OUTBOX_CHANGED_EVENT, onTrigger);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loggedIn, flush, pull]);
}
