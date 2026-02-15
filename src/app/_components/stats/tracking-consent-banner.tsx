"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTrackingConsent } from "./tracking-consent-context";
import { BarChart3 } from "lucide-react";

export function TrackingConsentBanner() {
  const [mounted, setMounted] = useState(false);
  const ctx = useTrackingConsent();

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!ctx) return null;
  const { setConsent, hasChosen } = ctx;

  if (hasChosen) return null;

  const content = (
    <>
      {/* Backdrop – above nav and toaster so popup is always visible and clickable */}
      <div
        className="fixed inset-0 z-9999 bg-black/40 backdrop-blur-[2px]"
        aria-hidden
      />
      {/* Popup at bottom – pointer-events-auto so buttons receive clicks */}
      <div
        role="dialog"
        aria-label="Tracking-Einstellung"
        className="pointer-events-auto fixed right-0 bottom-0 left-0 z-9999 p-4 pb-[env(safe-area-inset-bottom)] sm:p-6"
      >
        <div className="dark:bg-dark-surface dark:border-dark-border mx-auto max-w-2xl rounded-t-2xl border border-b-0 border-gray-200 bg-white shadow-2xl shadow-black/25 dark:shadow-black/50">
          <div className="flex flex-col gap-5 p-5 sm:gap-6 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="bg-primary/15 text-primary dark:bg-primary/25 dark:text-primary-light flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <BarChart3 className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h3 className="text-dark dark:text-dark-text font-semibold">
                  Nutzungsstatistik
                </h3>
                <p className="dark:text-dark-text-secondary mt-1 text-sm text-gray-600">
                  Wir erfassen anonym die Nutzung unserer Webseite
                  (Seitenaufrufe), um sie zu verbessern. Es werden keine
                  personenbezogenen Daten gespeichert, sofern Sie es nicht
                  erlauben.
                </p>
                <p className="dark:text-dark-text-muted mt-1 text-xs text-gray-500">
                  Sie können die Erfassung ablehnen oder zulassen, dass Aufrufe
                  Ihrem Konto zugeordnet werden (nur wenn Sie eingeloggt sind).
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <button
                type="button"
                onClick={() => setConsent("none")}
                className="dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text dark:hover:bg-dark-surface order-3 rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 text-sm font-medium transition hover:bg-gray-200 sm:order-1"
              >
                Ablehnen
              </button>
              <button
                type="button"
                onClick={() => setConsent("anonymous")}
                className="dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text dark:hover:bg-dark-surface order-2 rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 text-sm font-medium transition hover:bg-gray-200 sm:order-2"
              >
                Nur anonym
              </button>
              <button
                type="button"
                onClick={() => setConsent("anonymous_and_user")}
                className="bg-primary hover:bg-primary-dark dark:bg-primary dark:hover:bg-primary-light order-1 rounded-xl px-4 py-3 text-sm font-medium text-white transition sm:order-3"
              >
                Anonym + Zuordnung zu meinem Konto
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
