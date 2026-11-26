"use client";

import { useEffect, useRef } from "react";
import type { CapSolveEvent, CapWidget } from "cap-widget";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "cap-widget": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & { [attr: `data-cap-${string}`]: string | undefined };
    }
  }
}

/**
 * Die WASM-Löser liegen in `public/cap/` statt auf jsDelivr: keine Anfrage an
 * Dritte (Datenschutz), keine Lücke in der CSP. Beim Update von `cap-widget`
 * mit der Version von `@cap.js/wasm` abgleichen, die das Widget erwartet.
 */
function configureCap() {
  window.CAP_CUSTOM_WASM_URL = "/cap/cap_wasm_bg.wasm";
  window.CAP_CUSTOM_HASHWX_URL = "/cap/hashwx.wasm";
  window.CAP_SILENT = true;
}

/** Eigene Texte statt der mitgelieferten deutschen — die siezen. */
const I18N = {
  "data-cap-i18n-initial-state": "Ich bin kein Roboter",
  "data-cap-i18n-verifying-label": "Wird geprüft…",
  "data-cap-i18n-solved-label": "Geprüft",
  "data-cap-i18n-error-label": "Fehler – nochmal versuchen",
  "data-cap-i18n-required-label": "Bitte bestätige, dass du kein Roboter bist",
  "data-cap-i18n-verify-aria-label":
    "Klicken, um zu bestätigen, dass du kein Roboter bist",
  "data-cap-i18n-verifying-aria-label": "Wird geprüft, bitte warten",
  "data-cap-i18n-verified-aria-label": "Geprüft",
  "data-cap-i18n-error-aria-label":
    "Prüfung fehlgeschlagen, zum Wiederholen klicken",
  "data-cap-i18n-wasm-disabled":
    "Bitte aktiviere WebAssembly in deinem Browser, um fortzufahren",
};

/**
 * Cap-Captcha (https://trycap.dev). Der Besucher klickt, der Browser rechnet
 * kurz eine Proof-of-Work-Aufgabe, das Token kommt per `onSolve` zurück und
 * geht mit dem Formular an den Server, der es einmalig verbraucht.
 *
 * `resetKey` erzwingt ein neues Widget, etwa nach einem fehlgeschlagenen
 * Absenden: Ein Token gilt nur einmal.
 */
export function CapCaptcha({
  endpoint,
  onSolve,
  onReset,
}: {
  /** Mit abschließendem Schrägstrich, z. B. `/api/cap/newsletter/`. */
  endpoint: string;
  onSolve: (token: string) => void;
  onReset?: () => void;
}) {
  const ref = useRef<CapWidget>(null);
  const onSolveRef = useRef(onSolve);
  const onResetRef = useRef(onReset);
  onSolveRef.current = onSolve;
  onResetRef.current = onReset;

  useEffect(() => {
    configureCap();
    // Erst im Browser laden: Das Paket registriert sofort ein Custom Element.
    void import("cap-widget");

    const el = ref.current;
    if (!el) return;
    const handleSolve = (event: Event) =>
      onSolveRef.current((event as CapSolveEvent).detail.token);
    const handleReset = () => onResetRef.current?.();
    el.addEventListener("solve", handleSolve);
    el.addEventListener("reset", handleReset);
    return () => {
      el.removeEventListener("solve", handleSolve);
      el.removeEventListener("reset", handleReset);
    };
  }, []);

  return (
    <cap-widget
      ref={ref}
      className="cap-captcha"
      data-cap-api-endpoint={endpoint}
      data-cap-lang="de"
      {...I18N}
    />
  );
}
