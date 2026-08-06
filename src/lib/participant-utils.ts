/**
 * Utility functions for participant-related calculations
 */

/**
 * Checks if a participant is under 18 years old.
 * @param birthDate - The participant's birth date (Date object or string)
 * @param referenceDate - The date to evaluate the age at. Pass a stable date
 *   (e.g. the course start date) when the result feeds pricing, so a
 *   participant turning 18 between registration and invoicing doesn't change
 *   the outcome. Defaults to "now" for display purposes.
 * @returns true if the participant is under 18, false otherwise
 */
export function isParticipantUnder18(
  birthDate: Date | string | null | undefined,
  referenceDate: Date = new Date(),
): boolean {
  if (!birthDate) return false;
  const birth = new Date(birthDate);
  const at = referenceDate;
  const age = at.getFullYear() - birth.getFullYear();
  const monthDiff = at.getMonth() - birth.getMonth();
  const dayDiff = at.getDate() - birth.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    return age - 1 < 18;
  }
  return age < 18;
}
