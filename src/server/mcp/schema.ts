import { z } from "zod";

/**
 * Brücke zwischen den Zod-Eingaben der tRPC-Prozeduren und MCP: Die Werkzeuge
 * nutzen exakt die Validierung der Prozeduren, nur Datumswerte reisen in JSON
 * als ISO-Text statt als `Date`.
 */

export type JsonSchemaObject = {
  type: "object";
  properties?: Record<string, object>;
  required?: string[];
  [key: string]: unknown;
};

const EMPTY_OBJECT_SCHEMA: JsonSchemaObject = {
  type: "object",
  properties: {},
};

/** Die Felder der Zod-Definitionen, die zum Durchlaufen gebraucht werden. */
type ZodDefLike = {
  type: string;
  innerType?: unknown;
  in?: unknown;
  getter?: () => unknown;
  element?: unknown;
  shape?: Record<string, unknown>;
  options?: unknown[];
};

function defOf(schema: z.ZodType): ZodDefLike {
  return schema._zod.def as unknown as ZodDefLike;
}

/** JSON Schema der Eingabe; `z.date()` erscheint als `date-time`-Text. */
export function toToolInputSchema(schema: unknown): JsonSchemaObject {
  if (!(schema instanceof z.ZodType)) return EMPTY_OBJECT_SCHEMA;

  const json = z.toJSONSchema(schema, {
    io: "input",
    unrepresentable: "any",
    override: (ctx) => {
      if (ctx.zodSchema._zod.def.type === "date") {
        ctx.jsonSchema.type = "string";
        ctx.jsonSchema.format = "date-time";
      }
    },
  }) as Record<string, unknown>;

  delete json.$schema;
  if (json.type !== "object") return EMPTY_OBJECT_SCHEMA;
  return json as JsonSchemaObject;
}

/** Ohne `optional`/`nullable`/`default`-Hüllen. */
function unwrap(schema: z.ZodType): z.ZodType {
  const def = defOf(schema);
  if (
    (def.type === "optional" ||
      def.type === "nullable" ||
      def.type === "default") &&
    def.innerType instanceof z.ZodType
  ) {
    return unwrap(def.innerType);
  }
  return schema;
}

/**
 * Wandelt Text an den Stellen, an denen das Schema ein Datum erwartet, in
 * `Date` um. Alles andere bleibt unangetastet; die eigentliche Prüfung macht
 * danach die Prozedur selbst.
 */
export function reviveDates(schema: unknown, value: unknown): unknown {
  if (!(schema instanceof z.ZodType) || value === null || value === undefined) {
    return value;
  }
  const def = defOf(schema);

  switch (def.type) {
    case "date": {
      if (typeof value !== "string" && typeof value !== "number") return value;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : date;
    }
    case "optional":
    case "nullable":
    case "default":
    case "prefault":
    case "readonly":
    case "catch":
    case "nonoptional":
      return reviveDates(def.innerType, value);
    case "pipe":
      return reviveDates(def.in, value);
    case "lazy":
      return def.getter ? reviveDates(def.getter(), value) : value;
    case "array":
      return Array.isArray(value)
        ? value.map((item) => reviveDates(def.element, item))
        : value;
    case "object": {
      if (typeof value !== "object" || Array.isArray(value)) return value;
      const shape = def.shape ?? {};
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          key in shape ? reviveDates(shape[key], item) : item,
        ]),
      );
    }
    case "union": {
      // Nur der eindeutige Fall: eine Variante ist ein Datum, der Wert ist Text.
      const dateOption = (def.options ?? []).find(
        (option) =>
          option instanceof z.ZodType && defOf(unwrap(option)).type === "date",
      );
      return dateOption && typeof value === "string"
        ? reviveDates(dateOption, value)
        : value;
    }
    default:
      return value;
  }
}
