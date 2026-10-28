/**
 * Mirrors Prisma `CustomFieldType` string values without importing `@prisma/client`
 * (safe for client components / browser bundles).
 */
export type CourseCustomFieldTypeName =
  | "TEXT"
  | "NUMBER"
  | "SELECT"
  | "CHECKBOX"
  | "TEXTAREA"
  | "DATE"
  | "YEAR"
  | "TIME"
  | "MULTISELECT"
  | "PHONE"
  | "EMAIL";

/** Field types whose definition needs a non-empty option list. */
export function customFieldTypeNeedsOptions(
  fieldType: CourseCustomFieldTypeName | string,
): boolean {
  return fieldType === "SELECT" || fieldType === "MULTISELECT";
}

/** Parsed option values for SELECT fields (comma string or JSON array from Prisma Json). */
export function parseSelectOptionValues(options: unknown): string[] {
  if (options == null) return [];
  if (typeof options === "string") {
    return options
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  if (Array.isArray(options)) {
    return options.map((o) => String(o).trim()).filter((s) => s.length > 0);
  }
  return [];
}

export type CourseCustomFieldRule = {
  fieldName: string;
  /** Prisma enum serializes to these strings at runtime. */
  fieldType: CourseCustomFieldTypeName | string;
  options: unknown;
  isRequired: boolean;
  helpText?: string | null;
  /** Rohwert aus Prisma Json; siehe `parseCustomFieldCondition`. */
  showIf?: unknown;
};

/**
 * Bedingung eines Zusatzfelds: Es erscheint nur, wenn das Feld `fieldName`
 * einen der `values` hat. Checkboxen vergleichen gegen "true" / "false".
 */
export type CustomFieldCondition = {
  fieldName: string;
  values: string[];
};

/** Feldtypen, von deren Wert andere Felder abhängen können. */
export function customFieldTypeCanControl(
  fieldType: CourseCustomFieldTypeName | string,
): boolean {
  return (
    fieldType === "SELECT" ||
    fieldType === "MULTISELECT" ||
    fieldType === "CHECKBOX"
  );
}

/** Werte, die eine Bedingung auf dieses Feld wählen kann. */
export function customFieldConditionValues(field: {
  fieldType: CourseCustomFieldTypeName | string;
  options: unknown;
}): { value: string; label: string }[] {
  if (field.fieldType === "CHECKBOX") {
    return [
      { value: "true", label: "angehakt" },
      { value: "false", label: "nicht angehakt" },
    ];
  }
  if (customFieldTypeNeedsOptions(field.fieldType)) {
    return parseSelectOptionValues(field.options).map((value) => ({
      value,
      label: value,
    }));
  }
  return [];
}

/** Liest `showIf` aus Prisma Json; alles Unvollständige heißt: immer sichtbar. */
export function parseCustomFieldCondition(
  raw: unknown,
): CustomFieldCondition | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const { fieldName, values } = raw as Record<string, unknown>;
  if (typeof fieldName !== "string" || !fieldName.trim()) return null;
  if (!Array.isArray(values)) return null;
  const cleaned = values.map((v) => String(v)).filter((v) => v.length > 0);
  if (cleaned.length === 0) return null;
  return { fieldName, values: cleaned };
}

function conditionMatches(
  controller: CourseCustomFieldRule,
  value: unknown,
  values: readonly string[],
): boolean {
  if (controller.fieldType === "CHECKBOX") {
    const checked = value === true || value === "true";
    return values.includes(checked ? "true" : "false");
  }
  if (controller.fieldType === "MULTISELECT") {
    return (
      Array.isArray(value) && value.some((v) => values.includes(String(v)))
    );
  }
  if (value === undefined || value === null || value === "") return false;
  return values.includes(String(value));
}

/**
 * Felder, die bei diesen Werten angezeigt werden, in Kursreihenfolge. Ein
 * Feld ist nur sichtbar, wenn auch sein auslösendes Feld sichtbar ist; fehlt
 * das auslösende Feld, bleibt das abhängige verborgen.
 */
export function visibleCustomFields<T extends CourseCustomFieldRule>(
  fields: readonly T[],
  values: Record<string, unknown> | undefined,
): T[] {
  const byName = new Map(fields.map((f) => [f.fieldName, f]));
  const memo = new Map<string, boolean>();
  const isVisible = (field: T, seen: Set<string>): boolean => {
    const cached = memo.get(field.fieldName);
    if (cached !== undefined) return cached;
    const condition = parseCustomFieldCondition(field.showIf);
    let visible = true;
    if (condition) {
      const controller = byName.get(condition.fieldName);
      visible =
        !!controller &&
        !seen.has(controller.fieldName) &&
        isVisible(controller, new Set(seen).add(field.fieldName)) &&
        conditionMatches(
          controller,
          values?.[controller.fieldName],
          condition.values,
        );
    }
    memo.set(field.fieldName, visible);
    return visible;
  };
  return fields.filter((f) => isVisible(f, new Set()));
}

/** Namen der sichtbaren Pflichtfelder ohne Wert. */
export function missingRequiredCustomFieldNames(
  fields: readonly CourseCustomFieldRule[],
  values: Record<string, unknown> | undefined,
): string[] {
  return visibleCustomFields(fields, values)
    .filter(
      (f) =>
        f.isRequired &&
        isRequiredCustomFieldEmpty(f.fieldType, values?.[f.fieldName]),
    )
    .map((f) => f.fieldName);
}

/** Entfernt Werte von Feldern, die bei den übrigen Werten verborgen sind. */
export function dropHiddenCustomFieldValues(
  values: Record<string, unknown>,
  fields: readonly CourseCustomFieldRule[],
): Record<string, unknown> {
  const visible = new Set(
    visibleCustomFields(fields, values).map((f) => f.fieldName),
  );
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    const field = fields.find((f) => f.fieldName === key);
    // Unbekannte Schlüssel (alte Felder) bleiben wie bisher erhalten.
    if (field && !visible.has(key)) continue;
    out[key] = value;
  }
  return out;
}

/**
 * Ältere Kurse führen „Anmerkungen“ als eigenes Zusatzfeld. Dort entfällt das
 * eingebaute Anmerkungsfeld je Teilnehmer, sonst stünde es doppelt da.
 */
export function courseHasCustomNotesField(
  customFields: readonly { fieldName: string }[] | null | undefined,
): boolean {
  return (customFields ?? []).some(
    (field) => field.fieldName.trim().toLowerCase() === "anmerkungen",
  );
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Native <input type="time"> emits HH:MM (may include seconds in edge cases).
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const YEAR_RE = /^\d{4}$/;
export const YEAR_MIN = 1900;
export const YEAR_MAX = 2100;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Permissive international phone check: leading + optional, then digits with
// common separators, at least 6 digits total.
const PHONE_RE = /^\+?[0-9\s\-/().]*$/;

function countDigits(value: string): number {
  return (value.match(/\d/g) ?? []).length;
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(time)) return false;
  // Reject silently-rolled-over dates like 2026-02-31.
  return new Date(time).toISOString().slice(0, 10) === value;
}

/** True when `value` is an acceptable non-empty value for the field type. */
export function isValidCustomFieldValueFormat(
  fieldType: CourseCustomFieldTypeName | string,
  value: string,
): boolean {
  switch (fieldType) {
    case "DATE":
      return isValidIsoDate(value);
    case "TIME":
      return TIME_RE.test(value);
    case "YEAR": {
      if (!YEAR_RE.test(value)) return false;
      const year = Number(value);
      return year >= YEAR_MIN && year <= YEAR_MAX;
    }
    case "EMAIL":
      return EMAIL_RE.test(value);
    case "PHONE":
      return PHONE_RE.test(value) && countDigits(value) >= 6;
    default:
      return true;
  }
}

/** Multi-select values arrive as arrays; legacy/free-form input may be a comma string. */
function normalizeMultiSelectValue(raw: unknown, opts: string[]): string[] {
  const candidates = Array.isArray(raw)
    ? raw.map((v) => String(v).trim())
    : typeof raw === "string"
      ? raw.split(",").map((s) => s.trim())
      : [];
  const unique: string[] = [];
  for (const c of candidates) {
    if (!c || unique.includes(c)) continue;
    if (opts.length > 0 && !opts.includes(c)) continue;
    unique.push(c);
  }
  // Keep the course-defined option order for stable display/export.
  if (opts.length > 0) {
    return opts.filter((o) => unique.includes(o));
  }
  return unique;
}

/** Coerce legacy / saved-participant values so SELECT and CHECKBOX match persisted course rules. */
export function normalizeParticipantCustomFieldsValues(
  customFields: Record<string, unknown> | undefined,
  courseFields: readonly CourseCustomFieldRule[],
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(customFields ?? {}) };
  for (const field of courseFields) {
    const raw = out[field.fieldName];
    if (raw === undefined || raw === null) continue;

    if (field.fieldType === "SELECT") {
      const opts = parseSelectOptionValues(field.options);
      if (opts.length === 0) continue;
      const asString = (v: unknown) =>
        typeof v === "boolean" ? (v ? "true" : "false") : String(v).trim();
      const s = asString(raw);
      if (opts.includes(s)) {
        out[field.fieldName] = s;
        continue;
      }
      if (raw === true) {
        const hit =
          opts.find((o) => /^ja$/i.test(o)) ??
          opts.find((o) => /^yes$/i.test(o));
        if (hit) out[field.fieldName] = hit;
      } else if (raw === false) {
        const hit =
          opts.find((o) => /^nein$/i.test(o)) ??
          opts.find((o) => /^no$/i.test(o));
        if (hit) out[field.fieldName] = hit;
      }
    } else if (field.fieldType === "MULTISELECT") {
      out[field.fieldName] = normalizeMultiSelectValue(
        raw,
        parseSelectOptionValues(field.options),
      );
    } else if (field.fieldType === "CHECKBOX") {
      if (raw === "true" || raw === true) out[field.fieldName] = true;
      else if (raw === "false" || raw === false) out[field.fieldName] = false;
    }
  }
  return out;
}

/** Required-field semantics: CHECKBOX must be checked (true); empty string counts as missing for text-like fields. */
export function isRequiredCustomFieldEmpty(
  fieldType: CourseCustomFieldTypeName | string,
  value: unknown,
): boolean {
  if (fieldType === "CHECKBOX") {
    return value !== true;
  }
  if (fieldType === "MULTISELECT") {
    return !Array.isArray(value) || value.length === 0;
  }
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && !value.trim()) return true;
  return false;
}

export function resolveParticipantCustomFieldsForPersist(
  customFields: Record<string, unknown> | undefined,
  courseFields: readonly CourseCustomFieldRule[],
):
  | { ok: true; customFields: Record<string, unknown> }
  | { ok: false; message: string } {
  // Verborgene Felder zählen nicht: weder Pflicht noch gespeicherter Wert.
  const normalized = dropHiddenCustomFieldValues(
    normalizeParticipantCustomFieldsValues(customFields, courseFields),
    courseFields,
  );

  for (const cf of visibleCustomFields(courseFields, normalized)) {
    const value = normalized[cf.fieldName];
    if (cf.isRequired && isRequiredCustomFieldEmpty(cf.fieldType, value)) {
      return {
        ok: false,
        message: `Required field missing: ${cf.fieldName}`,
      };
    }

    if (value === undefined || value === null || value === "") continue;

    if (cf.fieldType === "SELECT") {
      const opts = parseSelectOptionValues(cf.options);
      if (opts.length > 0 && !opts.includes(String(value))) {
        return { ok: false, message: `Invalid value for ${cf.fieldName}` };
      }
    } else if (cf.fieldType === "MULTISELECT") {
      // normalizeMultiSelectValue already dropped unknown options; only the
      // shape can still be wrong here.
      if (!Array.isArray(value)) {
        return { ok: false, message: `Invalid value for ${cf.fieldName}` };
      }
    } else if (cf.fieldType === "CHECKBOX") {
      if (value !== true && value !== false) {
        return { ok: false, message: `Invalid value for ${cf.fieldName}` };
      }
    } else if (
      typeof value === "string" &&
      !isValidCustomFieldValueFormat(cf.fieldType, value.trim())
    ) {
      return { ok: false, message: `Invalid value for ${cf.fieldName}` };
    }
  }

  return { ok: true, customFields: normalized };
}

/**
 * Human-readable value for tables, detail pages, and Excel export.
 * Handles booleans (Ja/Nein), MULTISELECT arrays, and ISO dates (de-DE).
 */
export function formatCustomFieldValueForDisplay(value: unknown): string {
  if (value === undefined || value === null || value === "") return "–";
  if (typeof value === "boolean") return value ? "Ja" : "Nein";
  if (Array.isArray(value)) {
    const parts = value.map((v) => String(v)).filter((s) => s.length > 0);
    return parts.length > 0 ? parts.join(", ") : "–";
  }
  const s = String(value);
  if (isValidIsoDate(s)) {
    const [year, month, day] = s.split("-");
    return `${day}.${month}.${year}`;
  }
  return s;
}
