"use client";

import { useTrackingConsent } from "./tracking-consent-context";
import { BarChart3 } from "lucide-react";

export function TrackingConsentBanner() {
  const { consent, setConsent, hasChosen } = useTrackingConsent();

  if (hasChosen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        aria-hidden
      />
      {/* Popup at bottom */}
      <div
        role="dialog"
        aria-label="Tracking-Einstellung"
        className="fixed right-0 bottom-0 left-0 z-50 p-4 pb-[env(safe-area-inset-bottom)] sm:p-6"
      >
        <div className="dark:bg-dark-surface dark:border-dark-border mx-auto max-w-2xl rounded-t-2xl border border-b-0 border-gray-200 bg-white shadow-2xl shadow-black/25">
          <div className="flex flex-col gap-5 p-5 sm:gap-6 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="bg-primary/15 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <BarChart3 className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h3 className="dark:text-dark-text font-semibold text-gray-900">
                  Nutzungsstatistik
                </h3>
                <p className="dark:text-dark-muted mt-1 text-sm text-gray-600">
                  Wir erfassen anonym die Nutzung unserer Webseite
                  (Seitenaufrufe), um sie zu verbessern. Es werden keine
                  personenbezogenen Daten gespeichert, sofern Sie es nicht
                  erlauben.
                </p>
                <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                  Sie können die Erfassung ablehnen oder zulassen, dass Aufrufe
                  Ihrem Konto zugeordnet werden (nur wenn Sie eingeloggt sind).
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <button
                type="button"
                onClick={() => setConsent("none")}
                className="dark:bg-dark-border dark:text-dark-text dark:hover:bg-dark-background order-3 rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 text-sm font-medium transition hover:bg-gray-200 sm:order-1"
              >
                Ablehnen
              </button>
              <button
                type="button"
                onClick={() => setConsent("anonymous")}
                className="dark:bg-dark-border dark:text-dark-text dark:hover:bg-dark-background order-2 rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 text-sm font-medium transition hover:bg-gray-200 sm:order-2"
              >
                Nur anonym
              </button>
              <button
                type="button"
                onClick={() => setConsent("anonymous_and_user")}
                className="bg-primary hover:bg-primary-dark order-1 rounded-xl px-4 py-3 text-sm font-medium text-white transition sm:order-3"
              >
                Anonym + Zuordnung zu meinem Konto
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
