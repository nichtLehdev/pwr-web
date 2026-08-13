"use client";

import { usePathname } from "next/navigation";
import Navigation from "@/app/_components/general/navigation";
import Footer from "@/app/_components/general/footer";
import { BetaBanner } from "@/app/_components/ui/banner";
import { MainContent } from "@/app/_components/ui/main-content";
import { isStandaloneGamePath } from "@/lib/standalone-game-route";

export function AppChrome({
  children,
  showBetaBanner = false,
}: {
  children: React.ReactNode;
  /** Aus dem Layout gereicht: auf der öffentlichen Seite (APP_ENV=production) aus. */
  showBetaBanner?: boolean;
}) {
  const pathname = usePathname();
  const standalone = isStandaloneGamePath(pathname);

  // Vollbild-Spiele bringen ihre eigene Hülle mit (GameShell im (spiel)-Layout).
  if (standalone) {
    return <>{children}</>;
  }

  return (
    <>
      {showBetaBanner && <BetaBanner />}
      <Navigation />
      <MainContent>{children}</MainContent>
      <Footer />
    </>
  );
}
