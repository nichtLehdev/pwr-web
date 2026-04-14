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

  if (standalone) {
    return (
      <div className="to-background dark:from-dark-background dark:to-dark-background relative flex min-h-[100svh] min-h-dvh flex-col overflow-x-hidden bg-gradient-to-b from-amber-50/95 via-sky-50/35 dark:via-amber-950/25">
        {children}
      </div>
    );
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
