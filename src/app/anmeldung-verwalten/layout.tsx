import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Anmeldung verwalten",
  description:
    "Zugangslink anfordern, um eine Kursanmeldung ohne Benutzerkonto zu ändern oder zu stornieren.",
  path: "/anmeldung-verwalten",
  noIndex: true,
});

/**
 * Metadata holder for the client-rendered page in this segment.
 *
 * A transactional self-service page; nothing to rank.
 */
export default function ManageRegistrationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
