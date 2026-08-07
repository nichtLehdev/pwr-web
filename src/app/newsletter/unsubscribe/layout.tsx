import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Newsletter abbestellen",
  description:
    "Newsletter des Posaunenwerks Rheinland abbestellen.",
  path: "/newsletter/unsubscribe",
  noIndex: true,
});

/**
 * Metadata holder for the client-rendered page in this segment.
 *
 * A transactional page reached from an e-mail link; nothing to rank.
 */
export default function NewsletterUnsubscribeLayout({ children }: { children: ReactNode }) {
  return children;
}
