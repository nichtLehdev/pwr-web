"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CloudDownload } from "lucide-react";
import { GAMES } from "../_lib/games";

type WarmupState = "idle" | "warming" | "ready";

/**
 * Macht die Spiele offline verfügbar: sobald ein Service Worker die Seite
 * kontrolliert, werden im Leerlauf (a) die Spiel-Dokumente SW-seitig gecacht
 * und (b) die Spiel-Module inkl. VexFlow wirklich importiert, damit genau die
 * benötigten Chunks durchs Netz — und damit in den SW-Cache — laufen.
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
      className="text-dark dark:text-dark-text-muted mb-6 flex items-center justify-center gap-2 text-sm"
      role="status"
    >
      {state === "warming" ? (
        <>
          <CloudDownload
            className="h-4 w-4 shrink-0 animate-pulse"
            aria-hidden
          />
          Spiele werden für die Offline-Nutzung vorbereitet …
        </>
      ) : (
        <>
          <CheckCircle2
            className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden
          />
          Spiele sind offline verfügbar.
        </>
      )}
    </p>
  );
}
