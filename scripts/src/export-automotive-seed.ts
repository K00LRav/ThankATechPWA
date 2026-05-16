import { db, techniciansTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const rows = await db
    .select({
      fullName: techniciansTable.fullName,
      specialty: techniciansTable.specialty,
      serviceArea: techniciansTable.serviceArea,
      bio: techniciansTable.bio,
      hourlyRate: techniciansTable.hourlyRate,
      latitude: techniciansTable.latitude,
      longitude: techniciansTable.longitude,
      googlePlaceId: techniciansTable.googlePlaceId,
      avatarUrl: techniciansTable.avatarUrl,
      phone: techniciansTable.phone,
      website: techniciansTable.website,
    })
    .from(techniciansTable)
    .where(eq(techniciansTable.specialty, "Automotive Repair"));

  console.log(`Exporting ${rows.length} Automotive Repair records...`);

  const outPath = join(process.cwd(), "..", "artifacts", "api-server", "src", "automotive-repair-seed.json");
  writeFileSync(outPath, JSON.stringify(rows, null, 2), "utf-8");
  console.log(`Written to ${outPath}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
