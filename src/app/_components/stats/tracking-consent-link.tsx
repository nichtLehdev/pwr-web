"use client";

import Link from "next/link";

export function TrackingConsentLink({
  className,
  children = "Nutzungsstatistik",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link href="/settings#nutzungsstatistik" className={className}>
      {children}
    </Link>
  );
}
