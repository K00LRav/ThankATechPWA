const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export interface LatLng {
  lat: number;
  lng: number;
}

export async function geocodeAddress(address: string): Promise<LatLng | null> {
  if (!GOOGLE_MAPS_API_KEY) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json() as {
      status: string;
      results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
    };
    if (data.status === "OK" && data.results.length > 0) {
      return data.results[0].geometry.location;
    }
    return null;
  } catch {
    return null;
  }
}

export function haversineDistanceMiles(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}
