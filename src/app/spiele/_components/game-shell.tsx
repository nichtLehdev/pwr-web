"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { gameBySlug } from "../_lib/games";
import { GameShellProvider } from "./game-shell-context";
import { StatsSyncRunner } from "./stats-sync-runner";

/**
 * Gemeinsame Vollbild-Hülle aller Spiele: schlanke Kopfleiste (zurück, Titel,
 * Status-Slot), scrollender Inhalt und unteres Aktions-Dock — als 100dvh-Grid,
 * damit nichts abgeschnitten wird und ausschließlich der Inhalt scrollt.
 */
export function GameShell({ children }: { children: ReactNode }) {
  const segment = useSelectedLayoutSegment();
  const title = gameBySlug(segment)?.title ?? "Spiel";

  const [barSlotEl, setBarSlotEl] = useState<HTMLElement | null>(null);
  const [dockEl, setDockEl] = useState<HTMLElement | null>(null);
  const [scrollLocked, setScrollLocked] = useState(false);

  const ctx = useMemo(
    () => ({ barSlotEl, dockEl, setScrollLocked }),
    [barSlotEl, dockEl],
  );

  return (
    <GameShellProvider value={ctx}>
      <StatsSyncRunner />
      <div className="bg-background dark:bg-dark-background to-background dark:from-dark-background dark:to-dark-background grid h-dvh grid-rows-[auto_minmax(0,1fr)_auto] overflow-x-hidden bg-gradient-to-b from-amber-50/95 via-sky-50/35 pr-[env(safe-area-inset-right,0px)] pl-[env(safe-area-inset-left,0px)] dark:via-amber-950/25">
        <header className="border-dark-border/40 dark:border-dark-border bg-background/85 dark:bg-dark-surface/85 z-20 border-b pt-[env(safe-area-inset-top,0px)] backdrop-blur-sm">
          <div className="mx-auto flex h-12 w-full max-w-5xl items-center gap-2 px-3 md:px-5">
            <div className="flex flex-1 items-center justify-start">
              <Link
                href="/spiele"
                className="text-dark hover:bg-background-secondary dark:text-dark-text dark:hover:bg-dark-background -ml-2 inline-flex items-center gap-0.5 rounded-lg py-1.5 pr-2.5 pl-1 text-sm font-bold transition-colors"
              >
                <ChevronLeft
                  className="h-5 w-5 shrink-0 stroke-[2.25]"
                  aria-hidden
                />
                Spiele
              </Link>
            </div>
            <h1 className="text-dark dark:text-dark-text min-w-0 truncate text-base font-bold">
              {title}
            </h1>
            <div
              ref={setBarSlotEl}
              className="flex flex-1 items-center justify-end gap-2"
            />
          </div>
        </header>

        <main
          aria-label={title}
          className={cn(
            "min-h-0 overscroll-contain px-3 pt-3 pb-6 md:px-5 md:pt-4",
            scrollLocked ? "overflow-hidden" : "overflow-y-auto",
          )}
        >
          {children}
        </main>

        <div
          ref={setDockEl}
          className="border-dark-border/40 dark:border-dark-border dark:bg-dark-surface/90 z-20 border-t bg-white/90 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(0,0,0,0.08)] backdrop-blur-sm empty:hidden md:px-5 dark:shadow-[0_-8px_32px_rgba(0,0,0,0.35)]"
        />
      </div>
    </GameShellProvider>
  );
}
