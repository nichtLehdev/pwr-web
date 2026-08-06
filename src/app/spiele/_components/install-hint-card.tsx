"use client";

import { useEffect, useState } from "react";
import { Share, Smartphone } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
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
    <div className="border-dark-border/50 dark:border-dark-border dark:bg-dark-surface/60 mb-8 flex flex-col gap-3 rounded-lg border bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
      <div className="flex items-start gap-3">
        <Smartphone
          className="text-primary mt-0.5 h-5 w-5 shrink-0"
          aria-hidden
        />
        <div>
          <p className="text-dark dark:text-dark-text text-sm font-bold">
            Als App aufs Handy
          </p>
          {installEvent ? (
            <p className="text-dark dark:text-dark-text-secondary text-sm">
              Installiere die Spiele als App — sie funktionieren dann auch
              offline.
            </p>
          ) : (
            <p className="text-dark dark:text-dark-text-secondary text-sm">
              In Safari:{" "}
              <Share
                className="inline h-4 w-4 align-text-bottom"
                aria-label="Teilen-Symbol"
              />{" "}
              Teilen → „Zum Home-Bildschirm" — die Spiele funktionieren dann
              auch offline.
            </p>
          )}
        </div>
      </div>
      {installEvent && (
        <Button
          type="button"
          size="md"
          className="shrink-0"
          onClick={() => {
            void installEvent.prompt();
          }}
        >
          App installieren
        </Button>
      )}
    </div>
  );
}
