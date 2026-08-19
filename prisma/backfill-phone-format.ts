/**
 * Backfill Script: Normalise ensemble phone numbers
 *
 * The chor lists arrived from a dozen different district spreadsheets, so the
 * same number could be written "0176/22994781", "01575-2362265" or
 * "+49 171-9530 373". This rewrites them all to the house format — area code,
 * one space, subscriber number — see src/lib/phone-number.ts.
 *
 * Rows already in that format are left alone, and formatPhoneNumber is
 * idempotent, so the script is safe to rerun. Since the router normalises on
 * write too, it should only ever have work to do for data that predates it.
 *
 * Usage: npx tsx prisma/backfill-phone-format.ts
 *        npx tsx prisma/backfill-phone-format.ts --dry-run
 */
import "dotenv/config";
import { db } from "@/server/db";
import { formatPhoneNumberOrNull } from "@/lib/phone-number";

const DRY_RUN = process.argv.includes("--dry-run");

async function backfillEnsemblePhones() {
  const ensembles = await db.ensemble.findMany({
    where: {
      OR: [
        { conductorPhone: { not: null } },
        { representativePhone: { not: null } },
      ],
    },
    select: {
      id: true,
      name: true,
      conductorPhone: true,
      representativePhone: true,
    },
    orderBy: { name: "asc" },
  });

  console.log(`Ensembles with at least one phone number: ${ensembles.length}`);

  let changed = 0;

  for (const ensemble of ensembles) {
    const conductorPhone = formatPhoneNumberOrNull(ensemble.conductorPhone);
    const representativePhone = formatPhoneNumberOrNull(
      ensemble.representativePhone,
    );

    const data: {
      conductorPhone?: string | null;
      representativePhone?: string | null;
    } = {};
    if (conductorPhone !== ensemble.conductorPhone) {
      data.conductorPhone = conductorPhone;
    }
    if (representativePhone !== ensemble.representativePhone) {
      data.representativePhone = representativePhone;
    }

    if (Object.keys(data).length === 0) continue;

    changed++;
    for (const [field, value] of Object.entries(data)) {
      const before =
        field === "conductorPhone"
          ? ensemble.conductorPhone
          : ensemble.representativePhone;
      console.log(`  ${ensemble.name} [${field}] ${before} -> ${value}`);
    }

    if (!DRY_RUN) {
      await db.ensemble.update({ where: { id: ensemble.id }, data });
    }
  }

  console.log(
    DRY_RUN
      ? `\nDry run: ${changed} ensemble(s) would change.`
      : `\n${changed} ensemble(s) updated.`,
  );
}

async function main() {
  await backfillEnsemblePhones();
  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
