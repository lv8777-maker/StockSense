import { pathToFileURL } from "url";
import { inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { packages, type InsertPackage } from "@shared/schema";

export const packageSeedRows: InsertPackage[] = [
  {
    name: "MTN Home Starter MTM",
    network: "MTN",
    contractDuration: "Month-to-Month",
    pointsAwarded: 100,
    status: "active",
  },
  {
    name: "MTN Home Pro MTM",
    network: "MTN",
    contractDuration: "Month-to-Month",
    pointsAwarded: 200,
    status: "active",
  },
];

export async function seedPackageCatalog(): Promise<{
  inserted: number;
  updated: number;
}> {
  let inserted = 0;
  let updated = 0;

  for (const packageRow of packageSeedRows) {
    await db.transaction(async (tx) => {
      // Serialize this reusable seed even on an older database where the
      // name/duration unique index has not been synchronized yet.
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext('maverick-package-catalog-seed'))`,
      );

      const existingRows = await tx
        .select({ id: packages.id })
        .from(packages)
        .where(
          sql`${packages.name} = ${packageRow.name}
              AND ${packages.contractDuration} = ${packageRow.contractDuration}`,
        );

      if (existingRows.length === 0) {
        await tx.insert(packages).values(packageRow);
        inserted += 1;
        return;
      }

      const [canonical, ...duplicates] = existingRows;
      await tx
        .update(packages)
        .set({
          network: packageRow.network,
          pointsAwarded: packageRow.pointsAwarded,
          status: packageRow.status,
          updatedAt: new Date(),
        })
        .where(sql`${packages.id} = ${canonical.id}`);

      if (duplicates.length > 0) {
        await tx
          .delete(packages)
          .where(inArray(packages.id, duplicates.map(({ id }) => id)));
      }
      updated += 1;
    });
  }

  return { inserted, updated };
}

async function runSeed() {
  const result = await seedPackageCatalog();
  console.log(
    `Package seed complete: ${result.inserted} inserted, ${result.updated} updated.`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runSeed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Package seed failed:", error);
      process.exit(1);
    });
}