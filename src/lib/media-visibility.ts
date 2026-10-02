import { ContentStatus } from "~/generated/prisma/enums";

/**
 * /api/uploads liefert ungeprüfte oder private Medien nur mit Sitzung aus. Der
 * Bildoptimierer von next/image holt ohne Cookies und bekommt dafür ein 404.
 */
export function needsUnoptimizedImage(
  media:
    { status: ContentStatus | string; isPublic?: boolean } | null | undefined,
): boolean {
  if (!media) return false;
  return media.status !== ContentStatus.APPROVED || media.isPublic === false;
}
