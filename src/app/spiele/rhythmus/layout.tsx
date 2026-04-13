import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Rhythmus",
  description:
    "Rhythmus mitspielen: Vorgegebene Figur im Metronom-Takt tippen und Auswertung sehen.",
};

export default function RhythmusLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="bg-background dark:bg-dark-background flex min-h-0 flex-col overflow-hidden"
      style={{
        minHeight: "calc(100svh - var(--main-padding-top, 5.5rem))",
        height: "calc(100svh - var(--main-padding-top, 5.5rem))",
      }}
    >
      {children}
    </div>
  );
}
