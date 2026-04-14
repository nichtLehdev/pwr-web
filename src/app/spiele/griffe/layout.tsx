import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Griffe",
  description:
    "Griffe üben: Note im System — Ventile oder Zugposition wählen, mit Merkhilfen und Modi für Blechblasinstrumente.",
};

export default function GriffeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background dark:bg-dark-background flex min-h-0 flex-1 flex-col overflow-y-auto">
      {children}
    </div>
  );
}
