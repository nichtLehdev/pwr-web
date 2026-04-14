import type { ReactNode } from "react";

/** Layout für alle Routen unter /spiele — Vollbild-Spiele ohne Site-Chrome steuert `AppChrome`. */
export default function SpieleLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
