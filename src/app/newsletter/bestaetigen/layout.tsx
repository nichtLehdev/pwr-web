import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Newsletter-Anmeldung bestätigen",
  description:
    "Anmeldung zum Newsletter des Posaunenwerks Rheinland bestätigen.",
  path: "/newsletter/bestaetigen",
  noIndex: true,
});

/**
 * Metadata holder for the client-rendered page in this segment.
 *
 * A transactional page reached from an e-mail link; nothing to rank.
 */
export default function NewsletterConfirmLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
