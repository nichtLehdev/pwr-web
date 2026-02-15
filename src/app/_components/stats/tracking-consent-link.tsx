"use client";

import { useTrackingConsent } from "./tracking-consent-context";

export function TrackingConsentLink({
  className,
  children = "Tracking-Einstellung",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const ctx = useTrackingConsent();
  if (!ctx) return null;

  return (
    <button type="button" onClick={ctx.clearConsent} className={className}>
      {children}
    </button>
  );
}
