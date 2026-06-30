/**
 * Mirrors Prisma `CustomFieldType` string values without importing `@prisma/client`
 * (safe for client components / browser bundles).
 */
export type CourseCustomFieldTypeName =
  "TEXT" | "NUMBER" | "SELECT" | "CHECKBOX" | "TEXTAREA";

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
};

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
  const normalized = normalizeParticipantCustomFieldsValues(
    customFields,
    courseFields,
  );

  for (const cf of courseFields) {
    const value = normalized[cf.fieldName];
    if (cf.isRequired && isRequiredCustomFieldEmpty(cf.fieldType, value)) {
      return {
        ok: false,
        message: `Required field missing: ${cf.fieldName}`,
      };
    }

    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      cf.fieldType === "SELECT"
    ) {
      const opts = parseSelectOptionValues(cf.options);
      if (opts.length > 0 && !opts.includes(String(value))) {
        return { ok: false, message: `Invalid value for ${cf.fieldName}` };
      }
    }

    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      cf.fieldType === "CHECKBOX" &&
      value !== true &&
      value !== false
    ) {
      return { ok: false, message: `Invalid value for ${cf.fieldName}` };
    }
  }

  return { ok: true, customFields: normalized };
}
