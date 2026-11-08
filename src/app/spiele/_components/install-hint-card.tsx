"use client";

import { useEffect, useState } from "react";
import { isIos, isStandalone } from "@/lib/pwa";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Chromium bekommt einen Install-Button (beforeinstallprompt), iOS Safari die
 * "Zum Home-Bildschirm"-Anleitung; in der installierten App gibt es nichts zu zeigen.
 */
export function useInstallHint(): {
  installEvent: BeforeInstallPromptEvent | null;
  iosHint: boolean;
} {
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

  if (installed) return { installEvent: null, iosHint: false };
  return { installEvent, iosHint: showIosHint };
}
