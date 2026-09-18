"use client";

import { useEffect } from "react";

/**
 * Registriert public/sw.js nur im Production-Build, sonst stört der Cache Turbopack-Dev.
 * Hängt lokal ein alter SW fest: chrome://serviceworker-internals → Unregister.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registrierung fehlgeschlagen (z. B. privater Modus) — Seite läuft normal weiter.
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
