"use client";

import { useBanner } from "./banner-context";

interface MainContentProps {
  children: React.ReactNode;
}

export function MainContent({ children }: MainContentProps) {
  const { bannerHeight } = useBanner();

  // Base padding: 64px (pt-16) on mobile, 80px (pt-20) on desktop
  // Plus dynamic banner height
  return (
    <main
      className="transition-[padding-top] duration-200"
      style={{
        paddingTop: `calc(${bannerHeight}px + var(--nav-height))`,
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
