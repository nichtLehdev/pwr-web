import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Materialien",
  description:
    "Noten, Bläserhefte, Downloads und Arbeitshilfen des Posaunenwerks Rheinland für Chöre und Chorleitung.",
  path: "/materialien",
});

/** Metadata holder for the client-rendered page in this segment. */
export default function MaterialienLayout({ children }: { children: ReactNode }) {
  return children;
}
