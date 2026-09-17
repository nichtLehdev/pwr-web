"use client";

import { useEffect, useState } from "react";
import { Share } from "lucide-react";
import { Note } from "@/app/_components/programmheft/note";
import { isIos, isStandalone } from "@/lib/pwa";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Install-Hinweis auf der Spiele-Übersicht: Chromium bekommt einen echten
 * Install-Button (beforeinstallprompt), iOS Safari die "Zum Home-Bildschirm"-
 * Anleitung. In der installierten App unsichtbar.
 */
export function InstallHintCard() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    queueMicrotask(() => setShowIosHint(isIos()));

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!installEvent && !showIosHint)) return null;

  return (
    <Note tone="info" title="Als App aufs Handy" className="mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[46ch]">
          {installEvent ? (
            "Installiere die Spiele als App — sie funktionieren dann auch offline."
          ) : (
            <>
              In Safari:{" "}
              <Share
                className="inline h-4 w-4 align-text-bottom"
                aria-label="Teilen-Symbol"
              />{" "}
              Teilen → „Zum Home-Bildschirm" — die Spiele funktionieren dann
              auch offline.
            </>
          )}
        </p>
        {installEvent ? (
          <button
            type="button"
            onClick={() => {
              void installEvent.prompt();
            }}
            className="border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night semi-condensed inline-flex min-h-12 shrink-0 items-center gap-3 border-2 px-6 text-lg font-semibold transition-colors"
          >
            App installieren
          </button>
        ) : null}
      </div>
    </Note>
  );
}
