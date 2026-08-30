// One-off seed: migrates the original hardcoded vaccine lists into the new
// VaccineOption table. Run with `npx tsx prisma/seed.ts` from server/.
import { PrismaClient } from "@prisma/client";
import { VACCINE_TYPES, VACCINE_TYPES_HCP } from "../../shared/src/schemas.js";

const prisma = new PrismaClient();

async function main() {
  const rows = [
    ...VACCINE_TYPES.map((o, i) => ({ value: o.value, label: o.label, audience: "public", sortOrder: i })),
    ...VACCINE_TYPES_HCP.map((o, i) => ({ value: o.value, label: o.label, audience: "hcp", sortOrder: i })),
  ];

  for (const row of rows) {
    await prisma.vaccineOption.upsert({
      where: { audience_value: { audience: row.audience, value: row.value } },
      update: { label: row.label, sortOrder: row.sortOrder },
      create: row,
    });
  }

  console.log(`Seeded ${rows.length} vaccine options.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
