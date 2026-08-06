import type { ReactNode } from "react";
import { GameShell } from "../_components/game-shell";

/** Vollbild-Hülle für alle Einzelspiele — Kopfleiste, Scrollbereich, Aktions-Dock. */
export default function SpielLayout({ children }: { children: ReactNode }) {
  return <GameShell>{children}</GameShell>;
}
