"use client";

import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type GameShellContextValue = {
  /** Portal-Ziel rechts in der Spiel-Kopfleiste. */
  barSlotEl: HTMLElement | null;
  /** Portal-Ziel für die untere Aktionsleiste (Dock). */
  dockEl: HTMLElement | null;
  /** Sperrt das Scrollen des Spielinhalts (z. B. während der Tipp-Phase). */
  setScrollLocked: (locked: boolean) => void;
};

const GameShellContext = createContext<GameShellContextValue | null>(null);

export const GameShellProvider = GameShellContext.Provider;

export function useGameShell(): GameShellContextValue {
  const ctx = useContext(GameShellContext);
  if (!ctx) {
    throw new Error("useGameShell muss innerhalb von GameShell genutzt werden");
  }
  return ctx;
}

/** Rendert Inhalte rechts in der Spiel-Kopfleiste (z. B. Punktestand). */
export function GameBarSlot({ children }: { children: ReactNode }) {
  const { barSlotEl } = useGameShell();
  if (!barSlotEl) return null;
  return createPortal(children, barSlotEl);
}

/** Rendert Inhalte im unteren Aktions-Dock, oberhalb der Home-Geste. */
export function GameDock({ children }: { children: ReactNode }) {
  const { dockEl } = useGameShell();
  if (!dockEl) return null;
  return createPortal(
    <div className="mx-auto w-full max-w-5xl">{children}</div>,
    dockEl,
  );
}
