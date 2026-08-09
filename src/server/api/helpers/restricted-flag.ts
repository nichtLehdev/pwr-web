/**
 * Permission-gated booleans on a form that submits every field.
 *
 * The dashboard forms send their whole state on save, so a flag the user is
 * not allowed to touch still arrives in the payload. Refusing the request
 * because the field is merely *present* therefore blocks every save, not just
 * the forbidden ones — which is exactly what `allowSiblingDiscount` used to do
 * to anyone who could edit a course without also managing its registrations.
 *
 * The permission belongs to the change, not to the mention.
 */
export function changesRestrictedFlag(
  submitted: boolean | undefined,
  stored: boolean,
): boolean {
  return submitted !== undefined && submitted !== stored;
}
