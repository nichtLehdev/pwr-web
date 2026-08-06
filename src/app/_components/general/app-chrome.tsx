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
      <BetaBanner />
      <Navigation />
      <MainContent>{children}</MainContent>
      <Footer />
    </>
  );
}
