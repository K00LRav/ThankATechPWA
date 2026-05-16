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
  "Dallas, TX",
  "Miami, FL",
  "Atlanta, GA",
  "Seattle, WA",
  "Denver, CO",
  "Boston, MA",
  "Minneapolis, MN",
  "Austin, TX",
  "Las Vegas, NV",
  "Nashville, TN",
  "Tampa, FL",
  "Orlando, FL",
  "Charlotte, NC",
  "Pittsburgh, PA",
  "Columbus, OH",
  "Indianapolis, IN",
  "Kansas City, MO",
  "San Francisco, CA",
  "Portland, OR",
  "Raleigh, NC",
  "Sacramento, CA",
  "Detroit, MI",
  "New Orleans, LA",
  "Cleveland, OH",
  "San Jose, CA",
  // Expanded cities
  "Baltimore, MD",
  "Louisville, KY",
  "Memphis, TN",
  "Richmond, VA",
  "Oklahoma City, OK",
  "Tucson, AZ",
  "Fresno, CA",
  "Albuquerque, NM",
  "Omaha, NE",
  "Tulsa, OK",
  "Bakersfield, CA",
  "Aurora, CO",
  "Anaheim, CA",
  "Santa Ana, CA",
  "Corpus Christi, TX",
  "Riverside, CA",
  "St. Louis, MO",
  "Lexington, KY",
  "Cincinnati, OH",
  "Stockton, CA",
  "Greensboro, NC",
  "Anchorage, AK",
  "Newark, NJ",
  "Plano, TX",
  "Henderson, NV",
  "Fort Worth, TX",
  "Jacksonville, FL",
  "Virginia Beach, VA",
  "Colorado Springs, CO",
  "Salt Lake City, UT",
];

interface PlacePhoto {
  photo_reference: string;
  height: number;
  width: number;
}

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  vicinity?: string;
  geometry?: { location: { lat: number; lng: number } };
  rating?: number;
  types?: string[];
  photos?: PlacePhoto[];
}

interface PlaceDetails {
  formatted_phone_number?: string;
  website?: string;
}

interface TextSearchResponse {
  results: PlaceResult[];
  status: string;
  next_page_token?: string;
}

function buildPhotoUrl(photoReference: string): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${GOOGLE_MAPS_API_KEY}`;
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

async function searchPlacesPage(query: string, location: string, pageToken?: string): Promise<TextSearchResponse> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  if (pageToken) {
    url.searchParams.set("pagetoken", pageToken);
  } else {
    url.searchParams.set("query", `${query} in ${location}`);
  }
  url.searchParams.set("key", GOOGLE_MAPS_API_KEY!);

  const resp = await fetch(url.toString());
  return (await resp.json()) as TextSearchResponse;
}

async function searchPlaces(query: string, location: string, maxPages = 3): Promise<PlaceResult[]> {
  const all: PlaceResult[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    if (page > 0) {
      // Google requires a short delay before using next_page_token
      await new Promise((r) => setTimeout(r, 2000));
    }

    const data = await searchPlacesPage(query, location, pageToken);

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error(`  Places API error: ${data.status} for "${query} in ${location}" page ${page + 1}`);
      break;
    }

    all.push(...(data.results ?? []));
    pageToken = data.next_page_token;

    if (!pageToken) break;
  }

  return all;
}

function cityShortName(city: string): string {
  return city.split(",")[0].trim();
}

function buildServiceArea(place: PlaceResult, shortCity: string): string {
  if (place.formatted_address) {
    const parts = place.formatted_address.split(",");
    if (parts.length >= 2) {
      return `${parts[0].trim()}, ${shortCity}`;
    }
  }
  if (place.vicinity) return `${place.vicinity}, ${shortCity}`;
  return shortCity;
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
    const places = await searchPlaces(query, city, 3);
    console.log(`    Found ${places.length} results`);

    for (const place of places) {
      const existing = await db
        .select({ id: techniciansTable.id })
        .from(techniciansTable)
        .where(eq(techniciansTable.googlePlaceId, place.place_id));

      if (existing.length > 0) {
        continue;
      }

      const shortCity = cityShortName(city);
      const serviceArea = buildServiceArea(place, shortCity);
      const photoRef = place.photos?.[0]?.photo_reference ?? null;
      const avatarUrl = photoRef ? buildPhotoUrl(photoRef) : null;

      const details = await fetchPlaceDetails(place.place_id);
      await new Promise((r) => setTimeout(r, 100));

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
        avatarUrl,
        phone: details.formatted_phone_number ?? null,
        website: details.website ?? null,
        claimed: false,
        claimRequestPending: false,
      });

      const photoStatus = avatarUrl ? "📷" : "  ";
      const phoneStatus = details.formatted_phone_number ? "📞" : "  ";
      const webStatus = details.website ? "🌐" : "";
      console.log(`    ✓ ${place.name} (${label}) ${photoStatus}${phoneStatus}${webStatus}`);
      imported++;
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  return imported;
}

async function main() {
  console.log("Starting expanded technician import from Google Maps Places API...\n");
  let total = 0;

  const targetCities = process.argv.length > 2 ? process.argv.slice(2) : CITIES;
  console.log(`Processing ${targetCities.length} cities × ${SPECIALTIES.length} specialties × up to 3 pages\n`);

  for (const city of targetCities) {
    console.log(`\n[${targetCities.indexOf(city) + 1}/${targetCities.length}] ${city}`);
    const count = await importCity(city);
    console.log(`  → ${count} new profiles imported from ${city} (running total: ${total + count})`);
    total += count;
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\nDone. Total imported: ${total} new technician profiles`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
