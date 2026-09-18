/**
 * Rewrites every phone column to its house format (src/lib/phone-number.ts): organisational
 * contacts national ("0176 22994781"), numbers people enter about themselves with country code.
 * Idempotent, runs at app start (deploy/stack.yaml).
 * Usage: npx tsx prisma/backfill-phone-format.ts [--dry-run]
 */
import "dotenv/config";
import { db } from "@/server/db";
import {
  formatPhoneNumberInternationalOrNull,
  formatPhoneNumberOrNull,
} from "@/lib/phone-number";

const DRY_RUN = process.argv.includes("--dry-run");

type Format = "national" | "international";

/** Every phone column in the schema; keep in sync with schema.prisma. */
const PHONE_COLUMNS: Array<{
  model: string;
  fields: string[];
  format: Format;
}> = [
  {
    model: "ensemble",
    fields: ["conductorPhone", "representativePhone"],
    format: "national",
  },
  { model: "bezirkPerson", fields: ["phone"], format: "national" },
  { model: "posaunenwart", fields: ["phone"], format: "national" },
  { model: "teamMember", fields: ["phone"], format: "national" },
  { model: "vorstandMember", fields: ["phone"], format: "national" },
  { model: "posaunenratMember", fields: ["phone"], format: "national" },
  { model: "foerdervereinMember", fields: ["phone"], format: "national" },
  // People, not offices: these two may belong to someone living abroad.
  { model: "user", fields: ["phone"], format: "international" },
  {
    model: "courseRegistration",
    fields: ["registrantPhone"],
    format: "international",
  },
];

type Row = Record<string, unknown> & { id: string };
type Delegate = {
  findMany: (args: unknown) => Promise<Row[]>;
  update: (args: unknown) => Promise<unknown>;
};

async function backfillModel(
  model: string,
  fields: string[],
  format: Format,
): Promise<number> {
  const delegate = (db as unknown as Record<string, Delegate | undefined>)[
    model
  ];
  if (!delegate) {
    console.log(`  ! ${model}: no delegate found, skipped`);
    return 0;
  }

  const reformat =
    format === "international"
      ? formatPhoneNumberInternationalOrNull
      : formatPhoneNumberOrNull;

  const rows = await delegate.findMany({
    where: { OR: fields.map((field) => ({ [field]: { not: null } })) },
    select: { id: true, ...Object.fromEntries(fields.map((f) => [f, true])) },
  });

  let changed = 0;

  for (const row of rows) {
    const data: Record<string, string | null> = {};
    for (const field of fields) {
      const before = row[field];
      if (typeof before !== "string") continue;
      const after = reformat(before);
      if (after !== before) {
        data[field] = after;
        console.log(`  ${model}.${field} ${before} -> ${after}`);
      }
    }

    if (Object.keys(data).length === 0) continue;
    changed++;

    if (!DRY_RUN) {
      await delegate.update({ where: { id: row.id }, data });
    }
  }

  console.log(
    `  ${model} (${format}): ${rows.length} row(s) with a phone, ${changed} to change`,
  );
  return changed;
}

async function main() {
  let total = 0;
  for (const { model, fields, format } of PHONE_COLUMNS) {
    total += await backfillModel(model, fields, format);
  }

  console.log(
    DRY_RUN
      ? `\nDry run: ${total} row(s) would change.`
      : `\n${total} row(s) updated.`,
  );
  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
