import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Noten lesen",
  description:
    "Noten lesen üben: Tonnamen zum Violin- oder Bassschlüssel wählen — mit Schwierigkeitsstufen für Blechblasinstrumente.",
};

export default function NotenLesenLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="bg-background dark:bg-dark-background flex min-h-0 flex-1 flex-col overflow-y-auto">
      {children}
    </div>
  );
}
