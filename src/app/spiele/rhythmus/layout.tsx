import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Rhythmus",
  description:
    "Rhythmus mitspielen: Vorgegebene Figur im Metronom-Takt tippen und Auswertung sehen.",
};

export default function RhythmusLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background dark:bg-dark-background flex min-h-0 flex-1 flex-col overflow-y-auto">
      {children}
    </div>
  );
}
