export function isExternalCourse(course: {
  externalRegistrationUrl?: string | null;
}): boolean {
  return Boolean(course.externalRegistrationUrl?.trim());
}

export function normalizeExternalRegistrationUrl(
  url: string | null | undefined,
): string | null {
  const trimmed = url?.trim();
  return trimmed ? trimmed : null;
}
