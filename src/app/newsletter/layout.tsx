import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Newsletter",
  description:
    "Newsletter des Posaunenwerks Rheinland abonnieren — Termine, Lehrgänge und Neuigkeiten regelmäßig per E-Mail.",
  path: "/newsletter",
});

/** Metadata holder for the client-rendered page in this segment. */
export default function NewsletterLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
