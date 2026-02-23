/**
 * For public pages: mask user phone/address based on preferences.
 * Default is to show (backward compatible when preferences are missing).
 */
export function maskUserContact<
  U extends {
    preferences?: unknown;
    phone?: string | null;
    street?: string | null;
    zipCode?: string | null;
    city?: string | null;
  },
>(
  user: U | null | undefined,
): {
  phone: string | null;
  street: string | null;
  zipCode: string | null;
  city: string | null;
} {
  if (!user) {
    return { phone: null, street: null, zipCode: null, city: null };
  }
  let prefs: { showPhonePublicly?: boolean; showAddressPublicly?: boolean } =
    {};
  try {
    const raw = user.preferences;
    prefs =
      typeof raw === "string"
        ? (JSON.parse(raw || "{}") as typeof prefs)
        : ((raw as typeof prefs) ?? {});
  } catch {
    // default: show all
  }
  const showPhone = prefs.showPhonePublicly !== false;
  const showAddress = prefs.showAddressPublicly !== false;
  return {
    phone: showPhone ? (user.phone ?? null) : null,
    street: showAddress ? (user.street ?? null) : null,
    zipCode: showAddress ? (user.zipCode ?? null) : null,
    city: showAddress ? (user.city ?? null) : null,
  };
}
