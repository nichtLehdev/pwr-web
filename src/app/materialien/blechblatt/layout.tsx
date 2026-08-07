import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Blechblatt",
  description:
    "Das Blechblatt — die Zeitschrift des Posaunenwerks Rheinland mit Berichten, Terminen und Themen aus der Bläserarbeit.",
  path: "/materialien/blechblatt",
});

/** Metadata holder for the client-rendered page in this segment. */
export default function BlechblattLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
