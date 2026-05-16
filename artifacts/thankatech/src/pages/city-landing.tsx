import { useState, useCallback } from "react";
import { useParams, Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { useListTechnicians } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Navigation, Loader2, ChevronDown } from "lucide-react";
import { SwipeDeck } from "@/components/SwipeDeck";
import {
  CITY_SLUGS,
  SPECIALTY_SLUGS,
  ALL_CITIES,
  ALL_SPECIALTIES,
  cityPageTitle,
  cityPageDescription,
  specialtyPageTitle,
  specialtyPageDescription,
  canonicalUrl,
  SITE_NAME,
} from "@/lib/seo";

const FEATURED_CITY_SLUGS = new Set([
  "new-york-city", "los-angeles", "chicago", "houston", "miami",
  "dallas", "atlanta", "phoenix", "seattle", "boston", "denver", "las-vegas",
]);

function CityFilterList({
  specialtySlug,
  currentCitySlug,
}: {
  specialtySlug: string;
  currentCitySlug?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const featured = ALL_CITIES.filter(([s]) => FEATURED_CITY_SLUGS.has(s) && s !== currentCitySlug);
  const others = ALL_CITIES.filter(([s]) => !FEATURED_CITY_SLUGS.has(s) && s !== currentCitySlug);
  const href = (slug: string) =>
    specialtySlug ? `/browse/city/${slug}/${specialtySlug}` : `/browse/city/${slug}`;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {featured.map(([slug, name]) => (
          <Link key={slug} href={href(slug)}>
            <div className="flex items-center justify-center text-center px-3 py-2.5 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer">
              <span className="text-sm font-medium leading-tight">{name}</span>
            </div>
          </Link>
        ))}
      </div>
      {expanded && (
        <div className="flex flex-wrap gap-1.5 justify-center pt-1">
          {others.map(([slug, name]) => (
            <Link key={slug} href={href(slug)}>
              <Button variant="ghost" size="sm" className="rounded-full h-7 text-xs text-muted-foreground hover:text-foreground">{name}</Button>
            </Link>
          ))}
        </div>
      )}
      {others.length > 0 && (
        <div className="text-center">
          <button
            onClick={() => setExpanded(v => !v)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
            {expanded ? "Show less" : `${others.length} more cities`}
          </button>
        </div>
      )}
    </div>
  );
}

interface TechDeckProps {
  search?: string;
  city?: string;
  storageKey: string;
}

function TechDeck({ search, city, storageKey }: TechDeckProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const { data: technicians, isLoading } = useListTechnicians({
    search: search || undefined,
    lat: userLocation?.lat,
    lng: userLocation?.lng,
  });

  const handleNearMe = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Your browser doesn't support location access.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationError("Couldn't get your location. Please allow location access and try again.");
        setLocating(false);
      }
    );
  }, []);

  const handleClearLocation = useCallback(() => {
    setUserLocation(null);
    setLocationError(null);
  }, []);

  const filtered = city && !userLocation
    ? technicians?.filter((t) => t.serviceArea.toLowerCase().includes(city.toLowerCase()))
    : technicians;

  const deckKey = `${storageKey}:${userLocation ? "near" : ""}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-2">
        {userLocation ? (
          <Button variant="outline" className="h-10 rounded-full px-5 gap-2 border-primary text-primary hover:bg-primary/5" onClick={handleClearLocation}>
            <Navigation size={15} className="fill-primary" />
            Near me — active
          </Button>
        ) : (
          <Button variant="outline" className="h-10 rounded-full px-5 gap-2" onClick={handleNearMe} disabled={locating}>
            {locating ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
            {locating ? "Finding your location…" : "Sort by nearest to me"}
          </Button>
        )}
        {locationError && <p className="text-sm text-destructive text-center">{locationError}</p>}
        {userLocation && <p className="text-sm text-muted-foreground">Sorted by distance from your location</p>}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={32} className="animate-spin text-muted-foreground" />
        </div>
      ) : !filtered?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No technicians found yet — check back soon as we add more.</p>
          <Link href="/browse">
            <Button variant="outline" className="mt-4 rounded-full">Browse all technicians</Button>
          </Link>
        </div>
      ) : (
        <SwipeDeck key={deckKey} techs={filtered} storageKey={deckKey} />
      )}
    </div>
  );
}

export function CityLandingPage() {
  const params = useParams<{ citySlug: string }>();
  const citySlug = params.citySlug ?? "";
  const cityName = CITY_SLUGS[citySlug] ?? citySlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const title = cityPageTitle(cityName);
  const description = cityPageDescription(cityName);

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl(`/browse/city/${citySlug}`)} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
      </Helmet>

      <div className="min-h-[calc(100dvh-4rem)] bg-muted/20 py-12 px-4">
        <div className="container mx-auto max-w-3xl space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <p className="text-sm font-medium text-primary uppercase tracking-wider">Local Technicians</p>
            <h1 className="text-4xl md:text-5xl font-serif font-bold">Trusted Technicians in {cityName}</h1>
            <p className="text-lg text-muted-foreground">
              Browse {cityName}'s top-rated service professionals — backed by real thank you messages, not star ratings.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-center text-muted-foreground">Filter by specialty</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {ALL_SPECIALTIES.map(([slug, label]) => (
                <Link key={slug} href={`/browse/city/${citySlug}/${slug}`}>
                  <Button variant="outline" size="sm" className="rounded-full">{label}</Button>
                </Link>
              ))}
            </div>
          </div>

          <TechDeck city={cityName} storageKey={`city:${citySlug}`} />

          <div className="pt-8 border-t space-y-4">
            <h2 className="text-xl font-serif font-semibold text-center">Browse other cities</h2>
            <CityFilterList specialtySlug="" currentCitySlug={citySlug} />
          </div>
        </div>
      </div>
    </>
  );
}

export function SpecialtyLandingPage() {
  const params = useParams<{ specialty: string }>();
  const specialtySlug = params.specialty ?? "";
  const specialtyName = SPECIALTY_SLUGS[specialtySlug] ?? specialtySlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const title = specialtyPageTitle(specialtyName);
  const description = specialtyPageDescription(specialtyName);

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl(`/browse/specialty/${specialtySlug}`)} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
      </Helmet>

      <div className="min-h-[calc(100dvh-4rem)] bg-muted/20 py-12 px-4">
        <div className="container mx-auto max-w-3xl space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <p className="text-sm font-medium text-primary uppercase tracking-wider">{specialtyName} Specialists</p>
            <h1 className="text-4xl md:text-5xl font-serif font-bold">{specialtyName} Technicians</h1>
            <p className="text-lg text-muted-foreground">
              Find trusted {specialtyName.toLowerCase()} professionals near you — backed by real customer gratitude, not star ratings.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-center text-muted-foreground">Browse by city</p>
            <CityFilterList specialtySlug={specialtySlug} />
          </div>

          <TechDeck search={specialtyName} storageKey={`specialty:${specialtySlug}`} />

          <div className="pt-8 border-t space-y-3">
            <h2 className="text-xl font-serif font-semibold text-center">Browse other specialties</h2>
            <div className="flex flex-wrap gap-3 justify-center">
              {ALL_SPECIALTIES.filter(([slug]) => slug !== specialtySlug).map(([slug, label]) => (
                <Link key={slug} href={`/browse/specialty/${slug}`}>
                  <Button variant="ghost" size="sm" className="rounded-full gap-1">
                    {label} <ChevronRight size={12} />
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function CitySpecialtyLandingPage() {
  const params = useParams<{ citySlug: string; specialty: string }>();
  const citySlug = params.citySlug ?? "";
  const specialtySlug = params.specialty ?? "";
  const cityName = CITY_SLUGS[citySlug] ?? citySlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const specialtyName = SPECIALTY_SLUGS[specialtySlug] ?? specialtySlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const title = cityPageTitle(cityName, specialtyName);
  const description = cityPageDescription(cityName, specialtyName);

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl(`/browse/city/${citySlug}/${specialtySlug}`)} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
      </Helmet>

      <div className="min-h-[calc(100dvh-4rem)] bg-muted/20 py-12 px-4">
        <div className="container mx-auto max-w-3xl space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <p className="text-sm font-medium text-primary uppercase tracking-wider">{specialtyName} · {cityName}</p>
            <h1 className="text-4xl md:text-5xl font-serif font-bold">{specialtyName} Technicians in {cityName}</h1>
            <p className="text-lg text-muted-foreground">
              Discover {cityName}'s trusted {specialtyName.toLowerCase()} professionals with real thank you messages from happy customers.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-center text-muted-foreground">Switch specialty</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {ALL_SPECIALTIES.filter(([slug]) => slug !== specialtySlug).map(([slug, label]) => (
                <Link key={slug} href={`/browse/city/${citySlug}/${slug}`}>
                  <Button variant="outline" size="sm" className="rounded-full">{label}</Button>
                </Link>
              ))}
            </div>
          </div>

          <TechDeck search={specialtyName} city={cityName} storageKey={`city-specialty:${citySlug}:${specialtySlug}`} />

          <div className="flex flex-wrap gap-3 justify-center pt-4">
            <Link href={`/browse/city/${citySlug}`}>
              <Button variant="ghost" size="sm" className="rounded-full">All technicians in {cityName}</Button>
            </Link>
            <Link href={`/browse/specialty/${specialtySlug}`}>
              <Button variant="ghost" size="sm" className="rounded-full">All {specialtyName} technicians</Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export function DirectoryPage() {
  return (
    <>
      <Helmet>
        <title>Find Technicians by City & Specialty | {SITE_NAME}</title>
        <meta name="description" content={`Browse ${SITE_NAME}'s directory of trusted HVAC, plumbing, electrical, and appliance repair technicians across major US cities. Real thank you messages, no star ratings.`} />
        <link rel="canonical" href={canonicalUrl("/browse/directory")} />
      </Helmet>

      <div className="min-h-[calc(100dvh-4rem)] bg-muted/20 py-12 px-4">
        <div className="container mx-auto max-w-4xl space-y-12">
          <div className="text-center space-y-3">
            <h1 className="text-4xl md:text-5xl font-serif font-bold">Technician Directory</h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Find skilled service professionals in your city — all backed by real customer gratitude.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-serif font-bold mb-5">Browse by City</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {ALL_CITIES.map(([slug, name]) => (
                <Link key={slug} href={`/browse/city/${slug}`}>
                  <div className="group rounded-xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer">
                    <p className="font-semibold group-hover:text-primary transition-colors">{name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><ChevronRight size={10} />View technicians</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-serif font-bold mb-5">Browse by Specialty</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ALL_SPECIALTIES.map(([slug, label]) => (
                <Link key={slug} href={`/browse/specialty/${slug}`}>
                  <div className="group rounded-xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer">
                    <p className="font-semibold group-hover:text-primary transition-colors">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><ChevronRight size={10} />Find {label.toLowerCase()} techs</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
