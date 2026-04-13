/** Einzelne Spiele unter `/spiele/…` (nicht die Übersicht `/spiele`). */
export function isStandaloneGamePath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname.length > "/spiele".length && pathname.startsWith("/spiele/");
}
