import { maskUserContact } from "@/lib/mask-user-contact";

type LinkedUser = {
  email: string;
  phone?: string | null;
  street?: string | null;
  zipCode?: string | null;
  city?: string | null;
  preferences?: unknown;
} | null;

export type ResolvedPublicContact = {
  email: string | null;
  phone: string | null;
  street: string | null;
  zipCode: string | null;
  city: string | null;
};

/** Prefer ensemble-specific contact fields; fall back to linked user data (masked by privacy prefs). */
export function resolveRolePublicContact(
  customEmail: string | null | undefined,
  customPhone: string | null | undefined,
  user: LinkedUser,
): ResolvedPublicContact {
  const masked = maskUserContact(user ?? undefined);
  const email =
    customEmail?.trim() || (user?.email?.trim() ? user.email : null) || null;
  const phone = customPhone?.trim() || masked.phone || null;
  return {
    email,
    phone,
    street: masked.street,
    zipCode: masked.zipCode,
    city: masked.city,
  };
}

export function formatPublicAddress(contact: ResolvedPublicContact): string | null {
  const line = [
    contact.street,
    [contact.zipCode, contact.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  return line || null;
}

export function hasPublicContactDetails(contact: ResolvedPublicContact): boolean {
  return !!(
    contact.email ||
    contact.phone ||
    contact.street ||
    contact.zipCode ||
    contact.city
  );
}
