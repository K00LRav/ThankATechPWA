import { db, techniciansTable } from "@workspace/db";
import { isNotNull, eq } from "drizzle-orm";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!GOOGLE_MAPS_API_KEY) throw new Error("GOOGLE_MAPS_API_KEY is required");

interface PlaceDetails {
  formatted_phone_number?: string;
  website?: string;
}

async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "formatted_phone_number,website");
  url.searchParams.set("key", GOOGLE_MAPS_API_KEY!);
  const resp = await fetch(url.toString());
  const data = (await resp.json()) as { result?: PlaceDetails; status: string };
  return data.result ?? {};
}

async function main() {
  console.log("Backfilling phone numbers and websites for imported profiles...\n");

  const rows = await db
    .select({
      id: techniciansTable.id,
      fullName: techniciansTable.fullName,
      googlePlaceId: techniciansTable.googlePlaceId,
      phone: techniciansTable.phone,
      website: techniciansTable.website,
    })
    .from(techniciansTable)
    .where(isNotNull(techniciansTable.googlePlaceId));

  const todo = rows.filter(r => !r.phone && !r.website);
  console.log(`Found ${rows.length} imported profiles, ${todo.length} need phone/website backfill.\n`);

  let updated = 0;
  let failed = 0;

  for (const row of todo) {
    if (!row.googlePlaceId) continue;
    try {
      const details = await fetchPlaceDetails(row.googlePlaceId);
      const phone = details.formatted_phone_number ?? null;
      const website = details.website ?? null;

      await db
        .update(techniciansTable)
        .set({ phone, website })
        .where(eq(techniciansTable.id, row.id));

      const phoneStr = phone ?? "no phone";
      const webStr = website ? "🌐" : "";
      console.log(`  ✓ [${row.id}] ${row.fullName} — ${phoneStr} ${webStr}`);
      updated++;
    } catch (err) {
      console.error(`  ✗ [${row.id}] ${row.fullName}: ${err}`);
      failed++;
    }

    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`\nDone. Updated: ${updated}, Failed: ${failed}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
