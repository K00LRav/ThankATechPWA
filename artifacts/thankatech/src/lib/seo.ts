export const SITE_NAME = "ThankATech";
export const SITE_TAGLINE = "Real thanks. Real tips. No ratings.";
export const SITE_URL = "https://www.thankatech.com";

export const CITY_SLUGS: Record<string, string> = {
  "new-york-city": "New York City",
  "los-angeles": "Los Angeles",
  "chicago": "Chicago",
  "houston": "Houston",
  "phoenix": "Phoenix",
  "philadelphia": "Philadelphia",
  "san-antonio": "San Antonio",
  "san-diego": "San Diego",
  "dallas": "Dallas",
  "austin": "Austin",
  "miami": "Miami",
  "seattle": "Seattle",
  "denver": "Denver",
  "boston": "Boston",
  "atlanta": "Atlanta",
  "portland": "Portland",
};

export const SPECIALTY_SLUGS: Record<string, string> = {
  "hvac": "HVAC",
  "plumbing": "Plumbing",
  "electrical": "Electrical",
  "appliance-repair": "Appliance Repair",
  "locksmith": "Locksmith",
  "pest-control": "Pest Control",
  "handyman": "Handyman",
  "cleaning": "Cleaning",
  "roofing": "Roofing",
  "landscaping": "Landscaping",
};

export const ALL_CITIES = Object.entries(CITY_SLUGS);
export const ALL_SPECIALTIES = Object.entries(SPECIALTY_SLUGS);

export function technicianPageTitle(name: string, specialty: string, area: string) {
  return `${name} — ${specialty} in ${area} | ${SITE_NAME}`;
}

export function technicianPageDescription(name: string, specialty: string, area: string, thanks: number) {
  const thanksText = thanks > 0 ? `Thanked ${thanks} time${thanks === 1 ? "" : "s"} by customers.` : "";
  return `${name} is a ${specialty.toLowerCase()} technician serving ${area}. ${thanksText} View their profile and Wall of Thanks on ${SITE_NAME}.`.trim();
}

export function cityPageTitle(city: string, specialty?: string) {
  if (specialty) return `${specialty} Technicians in ${city} | ${SITE_NAME}`;
  return `Trusted Technicians in ${city} | ${SITE_NAME}`;
}

export function cityPageDescription(city: string, specialty?: string) {
  if (specialty) {
    return `Find trusted ${specialty.toLowerCase()} technicians in ${city} on ${SITE_NAME}. Read real thank you messages from customers, no star ratings.`;
  }
  return `Find trusted HVAC, plumbing, electrical and appliance repair technicians in ${city} on ${SITE_NAME}. Real thanks from real customers.`;
}

export function specialtyPageTitle(specialty: string) {
  return `${specialty} Technicians Near You | ${SITE_NAME}`;
}

export function specialtyPageDescription(specialty: string) {
  return `Find trusted ${specialty.toLowerCase()} technicians on ${SITE_NAME}. Browse profiles with real customer thank you messages — no fake star ratings.`;
}

export function canonicalUrl(path: string) {
  return `${SITE_URL}${path}`;
}
