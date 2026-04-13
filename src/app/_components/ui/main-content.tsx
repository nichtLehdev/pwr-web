"use client";

import { useBanner } from "./banner-context";

interface MainContentProps {
  children: React.ReactNode;
}

export function MainContent({ children }: MainContentProps) {
  const { bannerHeight } = useBanner();

  const paddingTop = `calc(${bannerHeight}px + var(--nav-height))`;

  return (
    <main
      className="transition-[padding-top] duration-200"
      style={{
        paddingTop,
        // Für Vollbild-Layouts (z. B. Rhythmus-Spiel): nutzbare Höhe unter Nav/Banner
        ["--main-padding-top" as string]: paddingTop,
      }}
    >
      <style jsx>{`
        main {
          --nav-height: 64px;
        }
        @media (min-width: 1024px) {
          main {
            --nav-height: 80px;
          }
        }
      `}</style>
      {children}
    </main>
  );
}
