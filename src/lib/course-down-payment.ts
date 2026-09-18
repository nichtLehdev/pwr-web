/**
 * Anzahlungen für Kurse — einzige Quelle der Regeln für Formulare, Server, Mails und Rechnung.
 * String-Unions statt Prisma-Enums, damit auch der Client die Datei nutzen kann.
 */
import { roundMoney, SIBLING_DISCOUNT_RATE } from "./sibling-discount";

export type DownPaymentModeValue = "NONE" | "COURSE" | "TICKET";
export type DownPaymentRefundPolicyValue =
  "NON_REFUNDABLE" | "REFUNDABLE" | "CUSTOM";
export type DownPaymentStatusValue = "OPEN" | "PAID" | "REFUNDED" | "RETAINED";

export type DownPaymentCourse = {
  downPaymentMode: DownPaymentModeValue;
  downPaymentAmount: number | null;
  priceOptions: ReadonlyArray<{
    id: string;
    downPaymentAmount?: number | null;
  }>;
};

/** Wort vor Kursnummer und Name im Verwendungszweck. */
export const DOWN_PAYMENT_REFERENCE_PREFIX = "Anzahlung";

export const DOWN_PAYMENT_MODE_LABELS: Record<DownPaymentModeValue, string> = {
  NONE: "Keine Anzahlung",
  COURSE: "Gleicher Betrag pro Teilnehmer",
  TICKET: "Je Preiskategorie",
};

export const DOWN_PAYMENT_REFUND_POLICY_LABELS: Record<
  DownPaymentRefundPolicyValue,
  string
> = {
  NON_REFUNDABLE: "Nicht erstattungsfähig",
  REFUNDABLE: "Erstattungsfähig",
  CUSTOM: "Eigener Hinweis",
};

const REFUND_NOTICES: Record<
  Exclude<DownPaymentRefundPolicyValue, "CUSTOM">,
  string
> = {
  NON_REFUNDABLE: "Die Anzahlung wird bei Stornierung nicht erstattet.",
  REFUNDABLE: "Die Anzahlung wird bei Stornierung erstattet.",
};

export type DownPaymentConfig = {
  downPaymentMode: DownPaymentModeValue;
  downPaymentAmount: number | null;
  downPaymentRefundPolicy: DownPaymentRefundPolicyValue;
  downPaymentRefundText: string | null;
};

/**
 * Leert, was zum gewählten Modus nicht gehört, damit kein alter Betrag stehen
 * bleibt und ein Vergleich vorher/nachher nur echte Änderungen sieht.
 */
export function normalizeDownPaymentConfig(
  config: DownPaymentConfig,
): DownPaymentConfig {
  const mode = config.downPaymentMode;
  const policy =
    mode === "NONE" ? "NON_REFUNDABLE" : config.downPaymentRefundPolicy;
  return {
    downPaymentMode: mode,
    downPaymentAmount:
      mode === "COURSE" ? (config.downPaymentAmount ?? null) : null,
    downPaymentRefundPolicy: policy,
    downPaymentRefundText:
      policy === "CUSTOM" ? config.downPaymentRefundText?.trim() || null : null,
  };
}

/** Betrag, der an einer Preiskategorie gespeichert wird — nur bei TICKET. */
export function priceOptionDownPaymentAmount(
  mode: DownPaymentModeValue,
  amount: number | null | undefined,
): number | null {
  return mode === "TICKET" ? (amount ?? null) : null;
}

/**
 * Ob ein Speichervorgang die Anzahlung verändert (Berechtigung, Sperre bei aktiven
 * Anmeldungen). Eine neue Kategorie zählt nur, wenn sie einen Betrag mitbringt.
 */
export function downPaymentSettingsChanged(
  stored: DownPaymentConfig & {
    priceOptions: ReadonlyArray<{
      id: string;
      downPaymentAmount: number | null;
    }>;
  },
  next: DownPaymentConfig & {
    priceOptions: ReadonlyArray<{
      id?: string;
      downPaymentAmount: number | null;
    }>;
  },
): boolean {
  const before = normalizeDownPaymentConfig(stored);
  const after = normalizeDownPaymentConfig(next);
  if (
    before.downPaymentMode !== after.downPaymentMode ||
    before.downPaymentAmount !== after.downPaymentAmount ||
    before.downPaymentRefundPolicy !== after.downPaymentRefundPolicy ||
    before.downPaymentRefundText !== after.downPaymentRefundText
  ) {
    return true;
  }
  if (after.downPaymentMode !== "TICKET") return false;

  const storedById = new Map(
    stored.priceOptions.map((option) => [option.id, option.downPaymentAmount]),
  );
  return next.priceOptions.some(
    (option) =>
      (option.id ? (storedById.get(option.id) ?? null) : null) !==
      (option.downPaymentAmount ?? null),
  );
}

export function courseHasDownPayment(course: {
  downPaymentMode: DownPaymentModeValue;
}): boolean {
  return course.downPaymentMode !== "NONE";
}

/** Anzahlung für einen Teilnehmer der Kategorie — 0, wenn keine fällig wird. */
export function downPaymentForPriceOption(
  course: DownPaymentCourse,
  priceOptionId: string | null | undefined,
): number {
  switch (course.downPaymentMode) {
    case "COURSE":
      return course.downPaymentAmount ?? 0;
    case "TICKET":
      return (
        course.priceOptions.find((option) => option.id === priceOptionId)
          ?.downPaymentAmount ?? 0
      );
    default:
      return 0;
  }
}

/**
 * Anzahlung einer ganzen Anmeldung; `null` statt 0, wenn nichts fällig wird
 * (wie in `CourseRegistration.downPaymentAmount`).
 */
export function registrationDownPayment(
  course: DownPaymentCourse,
  participants: ReadonlyArray<{ priceOptionId?: string | null }>,
): number | null {
  const total = roundMoney(
    participants.reduce(
      (sum, participant) =>
        sum + downPaymentForPriceOption(course, participant.priceOptionId),
      0,
    ),
  );
  return total > 0 ? total : null;
}

/** "Anzahlung 202704 Anna Muster" — höchstens 140 Zeichen (SEPA). */
export function downPaymentReference(
  courseNumber: string | null | undefined,
  registrantFirstName: string,
  registrantLastName: string,
): string {
  return [
    DOWN_PAYMENT_REFERENCE_PREFIX,
    courseNumber?.trim(),
    `${registrantFirstName} ${registrantLastName}`.trim(),
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 140);
}

export function downPaymentRefundNotice(course: {
  downPaymentRefundPolicy: DownPaymentRefundPolicyValue;
  downPaymentRefundText?: string | null;
}): string {
  if (course.downPaymentRefundPolicy === "CUSTOM") {
    return course.downPaymentRefundText?.trim() ?? "";
  }
  return REFUND_NOTICES[course.downPaymentRefundPolicy];
}

const euro = (value: number) => `${value.toFixed(2).replace(".", ",")} €`;

/**
 * Höchstens der Preis, mit Geschwisterkindrabatt der rabattierte Preis —
 * sonst zahlt ein Geschwisterkind mehr an, als es kostet.
 */
export function maxDownPaymentForPrice(
  price: number,
  allowSiblingDiscount: boolean,
): number {
  return allowSiblingDiscount
    ? roundMoney(price - roundMoney(price * SIBLING_DISCOUNT_RATE))
    : price;
}

export type DownPaymentSettings = {
  downPaymentMode: DownPaymentModeValue;
  downPaymentAmount: number | null | undefined;
  downPaymentRefundPolicy: DownPaymentRefundPolicyValue;
  downPaymentRefundText?: string | null;
  isFree: boolean;
  isExternal: boolean;
  courseNumber: string | null | undefined;
  allowSiblingDiscount: boolean;
  priceOptions: ReadonlyArray<{
    label: string;
    price: number;
    downPaymentAmount?: number | null;
  }>;
};

/** Erste Beanstandung als Satz oder `null`. */
export function validateDownPaymentSettings(
  settings: DownPaymentSettings,
): string | null {
  if (settings.downPaymentMode === "NONE") return null;

  if (settings.isExternal) {
    return "Kurse mit externer Anmeldung können keine Anzahlung verlangen.";
  }
  if (settings.isFree) {
    return "Kostenlose Kurse können keine Anzahlung verlangen.";
  }
  if (!settings.courseNumber?.trim()) {
    return "Für eine Anzahlung braucht der Kurs eine Kursnummer — sie steht im Verwendungszweck.";
  }
  if (
    settings.downPaymentRefundPolicy === "CUSTOM" &&
    !settings.downPaymentRefundText?.trim()
  ) {
    return "Bitte einen Hinweis zur Erstattung der Anzahlung eingeben.";
  }
  if (settings.priceOptions.length === 0) {
    return "Für eine Anzahlung braucht der Kurs mindestens eine Preiskategorie.";
  }

  const tooHigh = (label: string, amount: number, price: number) => {
    const max = maxDownPaymentForPrice(price, settings.allowSiblingDiscount);
    if (amount <= max) return null;
    return settings.allowSiblingDiscount
      ? `Die Anzahlung (${euro(amount)}) ist höher als der Preis von „${label}“ nach Geschwisterkindrabatt (${euro(max)}).`
      : `Die Anzahlung (${euro(amount)}) ist höher als der Preis von „${label}“ (${euro(max)}).`;
  };

  if (settings.downPaymentMode === "COURSE") {
    const amount = settings.downPaymentAmount ?? 0;
    if (!(amount > 0)) {
      return "Bitte einen Anzahlungsbetrag größer als 0 € eingeben.";
    }
    for (const option of settings.priceOptions) {
      const problem = tooHigh(option.label, amount, option.price);
      if (problem) return problem;
    }
    return null;
  }

  let anyAmount = false;
  for (const option of settings.priceOptions) {
    const amount = option.downPaymentAmount;
    if (amount == null) continue;
    if (!(amount > 0)) {
      return `Die Anzahlung für „${option.label}“ muss größer als 0 € sein — oder leer bleiben, wenn keine fällig wird.`;
    }
    anyAmount = true;
    const problem = tooHigh(option.label, amount, option.price);
    if (problem) return problem;
  }
  if (!anyAmount) {
    return "Bitte für mindestens eine Preiskategorie eine Anzahlung eintragen.";
  }
  return null;
}

/**
 * Was Anmeldende (nicht das Kursteam) selbst ändern dürfen: Mit Anzahlung gleiche Teilnehmerzahl,
 * bei TICKET auch gleiche Kategorien. Ohne Anzahlung darf keine neu entstehen, denn deren
 * Hinweise wurden nie bestätigt.
 */
export function registrantEditViolation(args: {
  course: DownPaymentCourse;
  bookedDownPayment: number | null;
  before: ReadonlyArray<{ priceOptionId: string | null }>;
  after: ReadonlyArray<{ priceOptionId: string }>;
}): string | null {
  const { course, bookedDownPayment, before, after } = args;

  if (!bookedDownPayment) {
    return registrationDownPayment(course, after)
      ? "Für diese Preiskategorie wird eine Anzahlung fällig. Bitte wende dich für diese Änderung an das Kursteam."
      : null;
  }

  if (after.length !== before.length) {
    return "Bei Anmeldungen mit Anzahlung können Teilnehmer nur vom Kursteam hinzugefügt oder entfernt werden.";
  }

  if (course.downPaymentMode === "TICKET") {
    const sorted = (ids: ReadonlyArray<string | null>) =>
      [...ids].map((id) => id ?? "").sort();
    const beforeIds = sorted(before.map((p) => p.priceOptionId));
    const afterIds = sorted(after.map((p) => p.priceOptionId));
    if (beforeIds.some((id, index) => id !== afterIds[index])) {
      return "Bei dieser Anmeldung hängt die Anzahlung an der Preiskategorie. Kategorien kann nur das Kursteam ändern.";
    }
  }

  return null;
}

/**
 * Anmeldende dürfen eine Anmeldung mit Anzahlung nicht selbst stornieren —
 * außer auf der Warteliste, wo noch nichts fällig war.
 */
export function registrantMayCancelDownPayment(registration: {
  downPaymentAmount: number | null;
  registrationStatus: "CONFIRMED" | "WAITLIST" | "CANCELLED";
}): boolean {
  return (
    !registration.downPaymentAmount ||
    registration.registrationStatus === "WAITLIST"
  );
}

export type DownPaymentInput = {
  downPaymentAmount: number | null;
  downPaymentStatus: DownPaymentStatusValue | null;
  downPaymentPaidAmount: number | null;
  registrationStatus: "CONFIRMED" | "WAITLIST" | "CANCELLED";
};

export type DownPaymentState =
  | "NONE"
  | "OPEN"
  | "PARTIAL"
  | "PAID"
  /** Storniert, Anzahlung eingegangen — Erstattung noch mit der Kasse klären. */
  | "REFUND_PENDING"
  | "REFUNDED"
  | "RETAINED";

export const DOWN_PAYMENT_STATE_LABELS: Record<DownPaymentState, string> = {
  NONE: "—",
  OPEN: "Offen",
  PARTIAL: "Teilweise bezahlt",
  PAID: "Bezahlt",
  REFUND_PENDING: "Erstattung klären",
  REFUNDED: "Erstattet",
  RETAINED: "Einbehalten",
};

/** Eingegangener Betrag, sofern als bezahlt verbucht (sonst 0). */
export function downPaymentReceived(registration: DownPaymentInput): number {
  if (!registration.downPaymentAmount) return 0;
  if (
    registration.downPaymentStatus !== "PAID" &&
    registration.downPaymentStatus !== "RETAINED"
  ) {
    return 0;
  }
  return registration.downPaymentPaidAmount ?? registration.downPaymentAmount;
}

/**
 * Von der Rechnung abgezogener Betrag. Nur PAID zählt: Erstattetes ist weg,
 * einbehalten wird nur bei Stornos, die keine Rechnung bekommen.
 */
export function downPaymentCredit(registration: DownPaymentInput): number {
  return registration.downPaymentStatus === "PAID"
    ? downPaymentReceived(registration)
    : 0;
}

/** Noch offener Anzahlungsbetrag (0 bei Warteliste, Storno, Erstattung). */
export function downPaymentOpenAmount(registration: DownPaymentInput): number {
  if (
    !registration.downPaymentAmount ||
    registration.registrationStatus !== "CONFIRMED"
  ) {
    return 0;
  }
  if (registration.downPaymentStatus === "OPEN") {
    return registration.downPaymentAmount;
  }
  if (registration.downPaymentStatus === "PAID") {
    return Math.max(
      0,
      roundMoney(
        registration.downPaymentAmount - downPaymentReceived(registration),
      ),
    );
  }
  return 0;
}

export function downPaymentState(
  registration: DownPaymentInput,
): DownPaymentState {
  if (!registration.downPaymentAmount || !registration.downPaymentStatus) {
    return "NONE";
  }
  switch (registration.downPaymentStatus) {
    case "REFUNDED":
      return "REFUNDED";
    case "RETAINED":
      return "RETAINED";
    case "OPEN":
      return "OPEN";
    case "PAID":
      if (registration.registrationStatus === "CANCELLED") {
        return "REFUND_PENDING";
      }
      return downPaymentOpenAmount(registration) > 0 ? "PARTIAL" : "PAID";
  }
}

/**
 * Ändert sich der Betrag einer bezahlten Anmeldung, wird der alte als eingegangen
 * festgeschrieben — `paidAmount = null` hieße sonst „voller neuer Betrag“.
 */
export function pinnedPaidAmountAfterChange(
  registration: Pick<
    DownPaymentInput,
    "downPaymentAmount" | "downPaymentStatus" | "downPaymentPaidAmount"
  >,
  nextAmount: number | null,
): number | null {
  if (
    registration.downPaymentPaidAmount != null ||
    (registration.downPaymentStatus !== "PAID" &&
      registration.downPaymentStatus !== "RETAINED") ||
    registration.downPaymentAmount === nextAmount
  ) {
    return registration.downPaymentPaidAmount;
  }
  return registration.downPaymentAmount;
}
