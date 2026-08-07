import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Suche",
  description:
    "Beiträge, Termine, Chöre und Materialien im Posaunenwerk Rheinland durchsuchen.",
  path: "/suche",
  noIndex: true,
});

/**
 * Metadata holder for the client-rendered page in this segment.
 *
 * Result pages carry no content of their own — indexed they would only dilute the pages they link to.
 */
export default function SucheLayout({ children }: { children: ReactNode }) {
  return children;
}
