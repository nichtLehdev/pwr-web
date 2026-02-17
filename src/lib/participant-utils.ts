/**
 * Utility functions for participant-related calculations
 */

/**
 * Checks if a participant is under 18 years old
 * @param birthDate - The participant's birth date (Date object or string)
 * @returns true if the participant is under 18, false otherwise
 */
export function isParticipantUnder18(birthDate: Date | string | null | undefined): boolean {
  if (!birthDate) return false;
  const birth = new Date(birthDate);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  const dayDiff = today.getDate() - birth.getDate();
  
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    return age - 1 < 18;
  }
  return age < 18;
}
