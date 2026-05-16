import { useState, useCallback } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { useListTechnicians } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Navigation, Loader2, ChevronDown } from "lucide-react";
import { SwipeDeck } from "@/components/SwipeDeck";
import { ALL_CITIES, ALL_SPECIALTIES } from "@/lib/seo";

const FEATURED_CITIES = [
  ["new-york-city", "New York City"],
  ["los-angeles", "Los Angeles"],
  ["chicago", "Chicago"],
  ["houston", "Houston"],
  ["miami", "Miami"],
  ["dallas", "Dallas"],
  ["atlanta", "Atlanta"],
  ["phoenix", "Phoenix"],
  ["seattle", "Seattle"],
  ["boston", "Boston"],
  ["denver", "Denver"],
  ["las-vegas", "Las Vegas"],
] as const;

const FEATURED_CITY_SLUGS = new Set<string>(FEATURED_CITIES.map(([s]) => s));
const OTHER_CITIES = ALL_CITIES.filter(([slug]) => !FEATURED_CITY_SLUGS.has(slug));

function CitySection() {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-serif font-semibold text-center">Browse by City</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {FEATURED_CITIES.map(([slug, name]) => (
          <Link key={slug} href={`/browse/city/${slug}`}>
            <div className="flex items-center justify-center text-center px-3 py-2.5 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer">
              <span className="text-sm font-medium leading-tight">{name}</span>
            </div>
          </Link>
        ))}
      </div>
      {expanded && (
        <div className="flex flex-wrap gap-1.5 justify-center pt-1">
          {OTHER_CITIES.map(([slug, name]) => (
            <Link key={slug} href={`/browse/city/${slug}`}>
              <Button variant="ghost" size="sm" className="rounded-full h-7 text-xs text-muted-foreground hover:text-foreground">{name}</Button>
            </Link>
          ))}
        </div>
      )}
      <div className="text-center">
        <button
          onClick={() => setExpanded(v => !v)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Show less" : `${OTHER_CITIES.length} more cities`}
        </button>
      </div>
    </div>
  );
}

export function Browse() {
  const [search, setSearch] = useState("");
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

  const storageKey = `browse:${search}:${userLocation ? "near" : ""}`;

  return (
    <>
    <Helmet>
      <title>Find a Technician Near You | ThankATech</title>
      <meta name="description" content="Search and browse trusted HVAC, plumbing, electrical, appliance repair, and locksmith technicians near you. Real customer thank you messages — no fake star ratings." />
      <link rel="canonical" href="https://www.thankatech.com/browse" />
      <meta property="og:title" content="Find a Technician Near You | ThankATech" />
      <meta property="og:description" content="Search and browse trusted HVAC, plumbing, electrical, appliance repair, and locksmith technicians near you. Real customer thank you messages — no fake star ratings." />
    </Helmet>
    <div className="min-h-[calc(100dvh-4rem)] bg-muted/20 py-10 px-4">
      <div className="container mx-auto max-w-3xl space-y-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground">Find a Technician</h1>
          <p className="text-base text-muted-foreground">Swipe right to view a profile, left to skip — or search by name or city.</p>
        </div>

        <div className="max-w-xl mx-auto space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                placeholder="Search by name or specialty..."
                className="pl-10 h-12 text-base rounded-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {userLocation ? (
              <Button
                variant="outline"
                className="h-12 rounded-full px-4 gap-2 border-primary text-primary hover:bg-primary/5"
                onClick={handleClearLocation}
              >
                <Navigation size={16} className="fill-primary" />
                Near me
              </Button>
            ) : (
              <Button
                variant="outline"
                className="h-12 rounded-full px-4 gap-2"
                onClick={handleNearMe}
                disabled={locating}
              >
                {locating ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
                {locating ? "Locating…" : "Near me"}
              </Button>
            )}
          </div>
          {locationError && <p className="text-sm text-destructive text-center">{locationError}</p>}
          {userLocation && <p className="text-sm text-center text-muted-foreground">Showing technicians sorted by distance from your location</p>}
        </div>

        {!search && !userLocation && (
          <div className="space-y-8">
            <CitySection />
            <div className="text-center space-y-3">
              <h2 className="text-xl font-serif font-semibold">Browse by Specialty</h2>
              <div className="flex flex-wrap gap-2 justify-center">
                {ALL_SPECIALTIES.slice(0, 6).map(([slug, label]) => (
                  <Link key={slug} href={`/browse/specialty/${slug}`}>
                    <Button variant="outline" size="sm" className="rounded-full">{label}</Button>
                  </Link>
                ))}
              </div>
            </div>
            <div className="border-t pt-2">
              <h2 className="text-xl font-serif font-semibold mb-6 text-center">All Technicians</h2>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-muted-foreground" />
          </div>
        ) : technicians && technicians.length > 0 ? (
          <SwipeDeck key={storageKey} techs={technicians} storageKey={storageKey} />
        ) : technicians?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">No technicians found matching your search.</p>
          </div>
        ) : null}
      </div>
    </div>
    </>
  );
}
