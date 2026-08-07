import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Chor finden",
  description:
    "Posaunenchor in deiner Nähe finden: Karte und Suche über alle Chöre des Posaunenwerks Rheinland mit Probenzeiten und Kontakt.",
  path: "/mitmachen/chor-finden",
});

/** Metadata holder for the client-rendered page in this segment. */
export default function ChorFindenLayout({ children }: { children: ReactNode }) {
  return children;
}
