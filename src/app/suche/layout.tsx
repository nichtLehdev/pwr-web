import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Suche",
  description:
    "Beiträge, Termine, Chöre und Materialien im Posaunenwerk Rheinland durchsuchen.",
  path: "/suche",
  noIndex: true,
});

/** Metadata holder for the client-rendered page; noindex, since result pages only dilute what they link to. */
export default function SucheLayout({ children }: { children: ReactNode }) {
  return children;
}
