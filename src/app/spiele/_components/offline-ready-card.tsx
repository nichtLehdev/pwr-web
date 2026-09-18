"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CloudDownload } from "lucide-react";
import { GAMES } from "../_lib/games";

type WarmupState = "idle" | "warming" | "ready";

/**
 * Macht die Spiele offline verfügbar: unter einem Service Worker werden im Leerlauf die
 * Spiel-Dokumente gecacht und die Spiel-Module importiert, damit ihre Chunks in den SW-Cache laufen.
 */
export function OfflineReadyCard() {
  const [state, setState] = useState<WarmupState>("idle");

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (!navigator.onLine) return;
    let cancelled = false;

    const warmup = async () => {
      const registration = await navigator.serviceWorker.ready;
      if (cancelled || !registration.active) return;
      setState("warming");

      registration.active.postMessage({
        type: "WARM_GAMES",
        urls: ["/spiele", "/offline", ...GAMES.map((g) => `/spiele/${g.slug}`)],
      });

      // Die eigentlichen Spiel-Chunks (inkl. VexFlow mit eingebetteten Fonts)
      // durch echte Imports anfordern — der SW cacht sie cache-first.
      await Promise.allSettled([
        import("../(spiel)/rhythmus/_components/rhythm-game"),
        import("../(spiel)/noten-lesen/_components/note-reading-game"),
        import("../(spiel)/griffe/_components/fingering-game"),
        import("../(spiel)/notenwaage/_components/note-value-game"),
        import("vexflow/bravura"),
      ]);

      if (!cancelled) setState("ready");
    };

    // requestIdleCallback fehlt in älteren Safari-Versionen.
    const hasIdle = typeof window.requestIdleCallback === "function";
    const handle = hasIdle
      ? window.requestIdleCallback(() => void warmup(), { timeout: 8000 })
      : window.setTimeout(() => void warmup(), 2500);
    return () => {
      cancelled = true;
      if (hasIdle) {
        window.cancelIdleCallback(handle);
      } else {
        window.clearTimeout(handle);
      }
    };
  }, []);

  if (state === "idle") return null;

  return (
    <p
      className="text-dark dark:text-night-muted mb-8 flex items-center gap-2 text-sm"
      role="status"
    >
      {state === "warming" ? (
        <>
          <CloudDownload
            className="h-4 w-4 shrink-0 motion-safe:animate-pulse"
            aria-hidden
          />
          Spiele werden für die Offline-Nutzung vorbereitet …
        </>
      ) : (
        <>
          <CheckCircle2
            className="text-ink dark:text-night-text h-4 w-4 shrink-0"
            aria-hidden
          />
          Spiele sind offline verfügbar.
        </>
      )}
    </p>
  );
}
