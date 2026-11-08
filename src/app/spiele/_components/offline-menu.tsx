"use client";

import { useId, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  CloudDownload,
  Share,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Note } from "@/app/_components/programmheft/note";
import { useInstallHint } from "./install-hint-card";
import { useOfflineWarmup } from "./offline-ready-card";

/** Offline-Stand und App-Installation hinter einem kleinen Knopf, statt zwei großer Hinweise. */
export function OfflineMenu() {
  const warmup = useOfflineWarmup();
  const { installEvent, iosHint } = useInstallHint();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const canInstall = Boolean(installEvent) || iosHint;
  if (warmup === "idle" && !canInstall) return null;

  return (
    <div className="mb-8">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night semi-condensed inline-flex min-h-11 items-center gap-2 border-2 px-4 text-sm font-semibold transition-colors"
      >
        {warmup === "warming" ? (
          <CloudDownload
            className="h-4 w-4 shrink-0 motion-safe:animate-pulse"
            aria-hidden
          />
        ) : warmup === "ready" ? (
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
        )}
        Offline spielen
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <div id={panelId} className="mt-3">
          <Note tone="info">
            <div className="flex flex-col gap-4">
              <p role="status">
                {warmup === "ready"
                  ? "Die Spiele sind auf diesem Gerät offline verfügbar. Fortschritt wird übertragen, sobald du wieder online bist."
                  : warmup === "warming"
                    ? "Die Spiele werden gerade für die Offline-Nutzung vorbereitet …"
                    : "Offline geht es, sobald die Spiele einmal geladen sind."}
              </p>
              {installEvent ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-[46ch]">
                    Als App auf dem Handy startest du die Spiele mit einem Tipp.
                  </p>
                  <button
                    type="button"
                    onClick={() => void installEvent.prompt()}
                    className="border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night semi-condensed inline-flex min-h-12 shrink-0 items-center gap-3 border-2 px-6 text-lg font-semibold transition-colors"
                  >
                    App installieren
                  </button>
                </div>
              ) : iosHint ? (
                <p className="max-w-[46ch]">
                  Als App aufs Handy: In Safari{" "}
                  <Share
                    className="inline h-4 w-4 align-text-bottom"
                    aria-label="Teilen-Symbol"
                  />{" "}
                  Teilen → „Zum Home-Bildschirm“.
                </p>
              ) : null}
            </div>
          </Note>
        </div>
      )}
    </div>
  );
}
