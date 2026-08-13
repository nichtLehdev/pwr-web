import { maskUserContact } from "./mask-user-contact";

/**
 * Personen auf öffentlichen Seiten (Posaunenwarte, Obleute, Vorstand,
 * Posaunenrat, Förderverein, Team) müssen ohne Benutzerkonto pflegbar sein.
 * Jeder dieser Datensätze trägt daher eigene Felder und optional eine
 * Verknüpfung zu einem User.
 *
 * Regel: Ein am Datensatz gesetztes Feld gewinnt, sonst greifen die Nutzerdaten.
 * So bleibt das Eingegebene das Angezeigte, auch wenn später ein Konto
 * verknüpft wird. Nutzerdaten laufen weiterhin durch maskUserContact, damit die
 * Privatsphäre-Einstellungen der Person greifen; eigene Felder sind bewusst
 * gepflegte Veröffentlichungsdaten und werden nicht maskiert.
 */

type ImageLike = { url: string };

export interface PersonUserLike<TImage extends ImageLike = ImageLike> {
  id?: string;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  street?: string | null;
  zipCode?: string | null;
  city?: string | null;
  bio?: string | null;
  districtRoleName?: string | null;
  profileImage?: TImage | null;
  preferences?: unknown;
}

export interface PersonRecordLike<TImage extends ImageLike = ImageLike> {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  street?: string | null;
  zipCode?: string | null;
  city?: string | null;
  bio?: string | null;
  image?: TImage | null;
}

export interface ResolvedPerson<TImage extends ImageLike = ImageLike> {
  name: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  zipCode: string | null;
  city: string | null;
  /** Straße + PLZ/Ort in einer Zeile, sofern etwas davon sichtbar ist. */
  address: string | null;
  bio: string | null;
  image: TImage | null;
  userId: string | null;
  districtRoleName: string | null;
}

/** Leerstrings zählen wie "nicht gesetzt" — Formulare senden gerne "". */
function firstFilled(...values: (string | null | undefined)[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return null;
}

function userDisplayName(user: PersonUserLike | null | undefined) {
  if (!user) return null;
  const fullName = [user.firstName, user.lastName]
    .filter((part) => part && part.trim().length > 0)
    .join(" ")
    .trim();
  return firstFilled(user.displayName, fullName);
}

export function formatAddress(parts: {
  street?: string | null;
  zipCode?: string | null;
  city?: string | null;
}): string | null {
  const cityLine = [parts.zipCode, parts.city]
    .filter((part) => part && part.trim().length > 0)
    .join(" ");
  const line = [parts.street, cityLine]
    .filter((part) => part && part.trim().length > 0)
    .join(", ");
  return line.length > 0 ? line : null;
}

export function resolvePerson<TImage extends ImageLike = ImageLike>(
  record: PersonRecordLike<TImage> | null | undefined,
  user?: PersonUserLike<TImage> | null,
): ResolvedPerson<TImage> {
  const masked = maskUserContact(user);

  const street = firstFilled(record?.street, masked.street);
  const zipCode = firstFilled(record?.zipCode, masked.zipCode);
  const city = firstFilled(record?.city, masked.city);

  return {
    name: firstFilled(record?.name, userDisplayName(user)),
    email: firstFilled(record?.email, user?.email),
    phone: firstFilled(record?.phone, masked.phone),
    street,
    zipCode,
    city,
    address: formatAddress({ street, zipCode, city }),
    bio: firstFilled(record?.bio, user?.bio),
    image: record?.image ?? user?.profileImage ?? null,
    userId: user?.id ?? null,
    districtRoleName: user?.districtRoleName ?? null,
  };
}
