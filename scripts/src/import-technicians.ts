import { db, techniciansTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!GOOGLE_MAPS_API_KEY) throw new Error("GOOGLE_MAPS_API_KEY is required");

const SPECIALTIES: { query: string; label: string }[] = [
  { query: "HVAC technician", label: "HVAC" },
  { query: "licensed plumber", label: "Plumbing" },
  { query: "licensed electrician", label: "Electrical" },
  { query: "appliance repair", label: "Appliance Repair" },
  { query: "locksmith", label: "Locksmith" },
  { query: "pest control", label: "Pest Control" },
];

const CITIES = [
  "New York City, NY",
  "Los Angeles, CA",
  "Chicago, IL",
  "Houston, TX",
  "Phoenix, AZ",
  "Philadelphia, PA",
  "San Antonio, TX",
  "San Diego, CA",
];

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  vicinity?: string;
  geometry?: { location: { lat: number; lng: number } };
  rating?: number;
  types?: string[];
}

interface TextSearchResponse {
  results: PlaceResult[];
  status: string;
  next_page_token?: string;
}

async function searchPlaces(query: string, location: string): Promise<PlaceResult[]> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", `${query} in ${location}`);
  url.searchParams.set("key", GOOGLE_MAPS_API_KEY!);
  url.searchParams.set("type", "establishment");

  const resp = await fetch(url.toString());
  const data = (await resp.json()) as TextSearchResponse;

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error(`Places API error: ${data.status} for query "${query} in ${location}"`);
    return [];
  }
  return data.results ?? [];
}

function cityShortName(city: string): string {
  return city.split(",")[0].trim();
}

function buildBio(name: string, specialty: string, city: string): string {
  const bios = [
    `${name} is a trusted ${specialty.toLowerCase()} professional serving ${city} and the surrounding area.`,
    `With years of experience in ${specialty.toLowerCase()}, ${name} delivers reliable service across ${city}.`,
    `${name} provides expert ${specialty.toLowerCase()} services to residents and businesses in ${city}.`,
  ];
  return bios[Math.floor(Math.random() * bios.length)];
}

async function importCity(city: string): Promise<number> {
  let imported = 0;

  for (const { query, label } of SPECIALTIES) {
    console.log(`  Searching: ${query} in ${city}...`);
    const places = await searchPlaces(query, city);

    for (const place of places.slice(0, 5)) {
      const existing = await db
        .select({ id: techniciansTable.id })
        .from(techniciansTable)
        .where(eq(techniciansTable.googlePlaceId, place.place_id));

      if (existing.length > 0) {
        console.log(`    Skipping duplicate: ${place.name}`);
        continue;
      }

      const shortCity = cityShortName(city);
      const serviceArea = place.vicinity ? `${place.vicinity}, ${shortCity}` : shortCity;

      await db.insert(techniciansTable).values({
        fullName: place.name,
        specialty: label,
        specialties: [label],
        serviceArea,
        bio: buildBio(place.name, label, shortCity),
        hourlyRate: String(Math.floor(Math.random() * 60 + 60)),
        latitude: place.geometry?.location.lat ?? null,
        longitude: place.geometry?.location.lng ?? null,
        googlePlaceId: place.place_id,
        claimed: false,
        claimRequestPending: false,
      });

      console.log(`    Imported: ${place.name} (${label})`);
      imported++;
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  return imported;
}

async function main() {
  console.log("Starting technician import from Google Maps Places API...\n");
  let total = 0;

  const targetCities = process.argv[2] ? [process.argv[2]] : CITIES;

  for (const city of targetCities) {
    console.log(`\nProcessing city: ${city}`);
    const count = await importCity(city);
    console.log(`  Imported ${count} new profiles from ${city}`);
    total += count;
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\nDone. Total imported: ${total} technician profiles`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
