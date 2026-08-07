import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Bezirke",
  description:
    "Die 13 Bezirke des Posaunenwerks Rheinland: Zuschnitt, Posaunenwarte und Chöre in deiner Region.",
  path: "/ueber-uns/bezirke",
});

/** Metadata holder for the client-rendered page in this segment. */
export default function BezirkeLayout({ children }: { children: ReactNode }) {
  return children;
}
