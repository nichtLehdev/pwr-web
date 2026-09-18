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
      {/* Papier statt Farbverlauf: Der Creme-Blau-Verlauf war das deutlichste
          Fremdsignal im ganzen Bereich. Das Raster bleibt unveraendert. */}
      <div className="programm font-programm bg-paper text-ink dark:bg-night dark:text-night-text grid h-dvh grid-rows-[auto_minmax(0,1fr)_auto] overflow-x-hidden pr-[env(safe-area-inset-right,0px)] pl-[env(safe-area-inset-left,0px)]">
        <header className="border-rule dark:border-night-rule bg-paper dark:bg-night z-20 border-b pt-[env(safe-area-inset-top,0px)]">
          <div className="mx-auto flex h-12 w-full max-w-5xl items-center gap-2 px-3 md:px-5">
            <div className="flex flex-1 items-center justify-start">
              <Link
                href="/spiele"
                className="text-ink hover:bg-rule/25 dark:text-night-text dark:hover:bg-night-raised -ml-2 inline-flex min-h-11 items-center gap-0.5 py-1.5 pr-2.5 pl-1 text-sm font-bold transition-colors"
              >
                <ChevronLeft
                  className="h-5 w-5 shrink-0 stroke-[2.25]"
                  aria-hidden
                />
                Spiele
              </Link>
            </div>
            <h1 className="condensed text-ink dark:text-night-text min-w-0 truncate text-base font-bold">
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
            "flex min-h-0 flex-col overscroll-contain px-3 pt-3 pb-6 md:px-5 md:pt-4",
            scrollLocked ? "overflow-hidden" : "overflow-y-auto",
          )}
        >
          {/* `m-auto` statt `justify-center`: Zentriert, solange Platz ist,
              schneidet aber bei hohem Inhalt nicht den oberen Rand ab — genau
              das passiert mit justify-center in kleinen Fenstern. Gemessen
              standen die Spiele vorher im oberen Drittel, darunter 300-400px
              Leere. */}
          <div className="m-auto w-full">{children}</div>
        </main>

        <div
          ref={setDockEl}
          className="border-rule dark:border-night-rule bg-paper dark:bg-night z-20 border-t px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] empty:hidden md:px-5"
        />
      </div>
    </GameShellProvider>
  );
}
