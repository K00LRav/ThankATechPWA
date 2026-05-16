import { useState, useCallback } from "react";
import { useParams, Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { useListTechnicians } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Heart, Wrench, ChevronRight, Navigation, Loader2 } from "lucide-react";
import { TechAvatar } from "@/components/TechAvatar";
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

interface TechGridProps {
  search?: string;
  city?: string;
}

function TechGrid({ search, city }: TechGridProps) {
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
    ? technicians?.filter((t) =>
        t.serviceArea.toLowerCase().includes(city.toLowerCase())
      )
    : technicians;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2">
        {userLocation ? (
          <Button
            variant="outline"
            className="h-10 rounded-full px-5 gap-2 border-primary text-primary hover:bg-primary/5"
            onClick={handleClearLocation}
          >
            <Navigation size={15} className="fill-primary" />
            Near me — active
          </Button>
        ) : (
          <Button
            variant="outline"
            className="h-10 rounded-full px-5 gap-2"
            onClick={handleNearMe}
            disabled={locating}
          >
            {locating ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
            {locating ? "Finding your location…" : "Sort by nearest to me"}
          </Button>
        )}
        {locationError && (
          <p className="text-sm text-destructive text-center">{locationError}</p>
        )}
        {userLocation && (
          <p className="text-sm text-muted-foreground">Sorted by distance from your location</p>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-52 bg-card animate-pulse rounded-xl" />
          ))}
        </div>
      ) : !filtered?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No technicians found yet — check back soon as we add more.</p>
          <Link href="/browse">
            <Button variant="outline" className="mt-4 rounded-full">Browse all technicians</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((tech) => (
            <Card key={tech.id} className="overflow-hidden hover:shadow-md transition-all group border-primary/5">
              <CardContent className="p-0">
                <div className="p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <TechAvatar avatarUrl={tech.avatarUrl} fullName={tech.fullName} specialty={tech.specialty} className="w-14 h-14" iconSize={22} />
                    <div className="flex-1 space-y-1">
                      <h3 className="font-serif font-bold text-lg leading-tight group-hover:text-primary transition-colors">{tech.fullName}</h3>
                      <p className="text-sm font-medium text-secondary flex items-center gap-1"><Wrench size={13} />{tech.specialty}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm text-muted-foreground pt-3 border-t">
                    <p className="flex items-center gap-2">
                      <MapPin size={14} />
                      <span>{tech.serviceArea}</span>
                      {tech.distanceMiles !== null && tech.distanceMiles !== undefined && (
                        <span className="ml-auto font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full text-xs">
                          {tech.distanceMiles} mi
                        </span>
                      )}
                    </p>
                    <p className="flex items-center gap-2">
                      <Heart size={14} className="text-primary" />
                      <span className="font-medium text-foreground">{tech.totalThanks}</span> Thanks received
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-muted/30 border-t">
                  <Button asChild className="w-full rounded-full bg-white dark:bg-black" variant="outline">
                    <Link href={`/technician/${tech.id}`}>View Profile</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
        <div className="container mx-auto max-w-6xl space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <p className="text-sm font-medium text-primary uppercase tracking-wider">Local Technicians</p>
            <h1 className="text-4xl md:text-5xl font-serif font-bold">Trusted Technicians in {cityName}</h1>
            <p className="text-lg text-muted-foreground">
              Browse {cityName}'s top-rated service professionals — backed by real thank you messages, not star ratings.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {ALL_SPECIALTIES.map(([slug, label]) => (
              <Link key={slug} href={`/browse/city/${citySlug}/${slug}`}>
                <Button variant="outline" size="sm" className="rounded-full">{label}</Button>
              </Link>
            ))}
          </div>

          <TechGrid city={cityName} />

          <div className="pt-8 border-t">
            <h2 className="text-xl font-serif font-semibold mb-4 text-center">Browse technicians in other cities</h2>
            <div className="flex flex-wrap gap-3 justify-center">
              {ALL_CITIES.filter(([slug]) => slug !== citySlug).map(([slug, name]) => (
                <Link key={slug} href={`/browse/city/${slug}`}>
                  <Button variant="ghost" size="sm" className="rounded-full gap-1">
                    {name} <ChevronRight size={12} />
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
        <div className="container mx-auto max-w-6xl space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <p className="text-sm font-medium text-primary uppercase tracking-wider">{specialtyName} Specialists</p>
            <h1 className="text-4xl md:text-5xl font-serif font-bold">{specialtyName} Technicians</h1>
            <p className="text-lg text-muted-foreground">
              Find trusted {specialtyName.toLowerCase()} professionals near you — backed by real customer gratitude, not star ratings.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {ALL_CITIES.map(([slug, name]) => (
              <Link key={slug} href={`/browse/city/${slug}/${specialtySlug}`}>
                <Button variant="outline" size="sm" className="rounded-full">{name}</Button>
              </Link>
            ))}
          </div>

          <TechGrid search={specialtyName} />

          <div className="pt-8 border-t">
            <h2 className="text-xl font-serif font-semibold mb-4 text-center">Browse other specialties</h2>
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
        <div className="container mx-auto max-w-6xl space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <p className="text-sm font-medium text-primary uppercase tracking-wider">{specialtyName} · {cityName}</p>
            <h1 className="text-4xl md:text-5xl font-serif font-bold">{specialtyName} Technicians in {cityName}</h1>
            <p className="text-lg text-muted-foreground">
              Discover {cityName}'s trusted {specialtyName.toLowerCase()} professionals with real thank you messages from happy customers.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {ALL_SPECIALTIES.filter(([slug]) => slug !== specialtySlug).map(([slug, label]) => (
              <Link key={slug} href={`/browse/city/${citySlug}/${slug}`}>
                <Button variant="outline" size="sm" className="rounded-full">{label}</Button>
              </Link>
            ))}
          </div>

          <TechGrid search={specialtyName} city={cityName} />

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
