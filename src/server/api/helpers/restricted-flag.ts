/**
 * Dashboard forms submit every field, so a permission-gated flag counts only when
 * its value changes, not when it is merely present in the payload.
 */
export function changesRestrictedFlag(
  submitted: boolean | undefined,
  stored: boolean,
): boolean {
  return submitted !== undefined && submitted !== stored;
}
