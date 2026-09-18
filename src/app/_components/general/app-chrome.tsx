"use client";

import { usePathname } from "next/navigation";
import Navigation from "@/app/_components/general/navigation";
import Footer from "@/app/_components/general/footer";
import { BetaBanner } from "@/app/_components/ui/banner";
import { MainContent } from "@/app/_components/ui/main-content";
import { isStandaloneGamePath } from "@/lib/standalone-game-route";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const standalone = isStandaloneGamePath(pathname);

  // Vollbild-Spiele bringen ihre eigene Hülle mit (GameShell im (spiel)-Layout).
  if (standalone) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Skip-Link als erstes fokussierbares Element. Verschoben statt `sr-only`:
          `sr-only`/`not-sr-only` streiten sich um dieselbe `position`-Eigenschaft. */}
      <a
        href="#inhalt"
        className="programm bg-ink text-paper dark:bg-night-text dark:text-night fixed top-2 left-2 z-[60] -translate-y-24 px-4 py-2 text-sm font-semibold opacity-0 transition-transform focus:translate-y-0 focus:opacity-100"
      >
        Zum Inhalt springen
      </a>
      {/* Blendet sich auf der öffentlichen Seite (APP_ENV=production) selbst aus. */}
      <BetaBanner />
      <Navigation />
      <MainContent>{children}</MainContent>
      <Footer />
    </>
  );
}
