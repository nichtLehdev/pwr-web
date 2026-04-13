"use client";

import Link from "next/link";

type GameExitLinkProps = {
  href?: string;
  label?: string;
};

/** Minimaler Ausstieg aus einem Vollbild-Spiel (kein Site-Header). */
export function GameExitLink({
  href = "/spiele",
  label = "← Spiele",
}: GameExitLinkProps) {
  return (
    <Link
      href={href}
      className="border-dark-border/60 bg-background/85 text-dark hover:border-primary/50 hover:bg-background dark:border-dark-border dark:bg-dark-surface/90 dark:text-dark-text dark:hover:border-primary/40 fixed left-3 z-[100] rounded-full border px-3 py-2 text-sm font-bold shadow-md backdrop-blur-sm transition-colors"
      style={{
        top: "max(0.75rem, env(safe-area-inset-top, 0px))",
      }}
    >
      {label}
    </Link>
  );
}
