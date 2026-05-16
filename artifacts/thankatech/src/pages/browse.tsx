import { useState, useCallback, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { useListTechnicians } from "@workspace/api-client-react";
import type { Technician } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Heart, Navigation, Loader2, Wrench, ChevronDown, X, ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { ALL_CITIES, ALL_SPECIALTIES } from "@/lib/seo";
import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";

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

type Tech = Technician;

const SWIPE_THRESHOLD = 100;
const SWIPE_VELOCITY = 500;

function SwipeCard({
  tech,
  isTop,
  stackIndex,
  onSwipe,
}: {
  tech: Tech;
  isTop: boolean;
  stackIndex: number;
  onSwipe: (dir: "left" | "right") => void;
}) {
  const [, navigate] = useLocation();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-18, 18]);
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const skipOpacity = useTransform(x, [-100, -20], [1, 0]);

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > SWIPE_VELOCITY) {
      animate(x, 600, { duration: 0.3 }).then(() => onSwipe("right"));
    } else if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -SWIPE_VELOCITY) {
      animate(x, -600, { duration: 0.3 }).then(() => onSwipe("left"));
    } else {
      animate(x, 0, { type: "spring", stiffness: 300, damping: 20 });
    }
  }, [x, onSwipe]);

  const scale = isTop ? 1 : 1 - stackIndex * 0.04;
  const yOffset = isTop ? 0 : stackIndex * 10;

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        scale,
        y: yOffset,
        zIndex: 10 - stackIndex,
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={isTop ? handleDragEnd : undefined}
    >
      <div className="w-full h-full rounded-3xl overflow-hidden relative shadow-xl select-none">
        {/* Full-bleed photo */}
        {tech.avatarUrl ? (
          <img
            src={tech.avatarUrl}
            alt={tech.fullName}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center">
            <Wrench size={72} className="text-white/30" strokeWidth={1.5} />
          </div>
        )}

        {/* Bottom gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

        {/* THANKS stamp */}
        {isTop && (
          <motion.div
            className="absolute top-8 left-6 px-4 py-2 rounded-xl border-4 border-[#22c55e] rotate-[-12deg]"
            style={{ opacity: likeOpacity }}
          >
            <span className="text-[#22c55e] font-black text-2xl tracking-widest drop-shadow">THANKS</span>
          </motion.div>
        )}

        {/* SKIP stamp */}
        {isTop && (
          <motion.div
            className="absolute top-8 right-6 px-4 py-2 rounded-xl border-4 border-red-400 rotate-[12deg]"
            style={{ opacity: skipOpacity }}
          >
            <span className="text-red-400 font-black text-2xl tracking-widest drop-shadow">SKIP</span>
          </motion.div>
        )}

        {/* Badges top-left */}
        <div className="absolute top-4 left-4 flex flex-col gap-1">
          {tech.featuredUntil && new Date(tech.featuredUntil) > new Date() && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-primary text-white shadow">
              ★ Featured
            </span>
          )}
          {tech.badges?.includes("top_tech_badge") && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-secondary/90 text-white shadow">
              ✓ Top Tech
            </span>
          )}
        </div>

        {/* Info overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          <h3 className="font-serif font-bold text-2xl leading-tight">{tech.fullName}</h3>
          <p className="text-sm font-medium text-white/80 flex items-center gap-1 mt-0.5">
            <Wrench size={13} />
            {tech.specialty}
          </p>
          <div className="flex items-center gap-3 mt-2 text-sm text-white/70">
            <span className="flex items-center gap-1">
              <MapPin size={13} />
              {tech.serviceArea?.split(",")[1]?.trim() ?? tech.serviceArea}
            </span>
            <span className="flex items-center gap-1">
              <Heart size={13} className="text-red-400" />
              <span className="font-semibold text-white">{tech.totalThanks}</span>
            </span>
            {tech.distanceMiles != null && (
              <span className="ml-auto font-medium bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs text-white">
                {tech.distanceMiles} mi
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SwipeDeck({ techs }: { techs: Tech[] }) {
  const [, navigate] = useLocation();
  const [index, setIndex] = useState(0);
  const [gone, setGone] = useState<"left" | "right" | null>(null);

  const remaining = techs.length - index;
  const visibleCards = techs.slice(index, index + 3);

  const handleSwipe = useCallback((dir: "left" | "right") => {
    setGone(dir);
    setTimeout(() => {
      if (dir === "right") navigate(`/technician/${techs[index]?.id}`);
      setIndex(i => i + 1);
      setGone(null);
    }, 50);
  }, [index, techs, navigate]);

  const handleSkip = () => handleSwipe("left");
  const handleView = () => handleSwipe("right");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handleSkip();
      if (e.key === "ArrowRight") handleView();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSkip, handleView]);

  if (index >= techs.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <Heart size={36} className="text-primary" />
        </div>
        <div>
          <p className="text-xl font-serif font-bold">You've seen everyone!</p>
          <p className="text-muted-foreground text-sm mt-1">Try a different city or specialty, or start over.</p>
        </div>
        <Button variant="outline" className="gap-2 rounded-full" onClick={() => setIndex(0)}>
          <RotateCcw size={15} />
          Start over
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Progress */}
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{remaining}</span> technicians left
      </p>

      {/* Card stack */}
      <div className="relative w-full max-w-sm" style={{ height: 460 }}>
        {visibleCards.map((tech, i) => (
          <SwipeCard
            key={tech.id}
            tech={tech}
            isTop={i === 0}
            stackIndex={i}
            onSwipe={handleSwipe}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-6">
        <button
          onClick={handleSkip}
          className="w-14 h-14 rounded-full border-2 border-muted-foreground/30 bg-card shadow flex items-center justify-center hover:border-destructive hover:text-destructive transition-colors"
          title="Skip (←)"
        >
          <X size={22} />
        </button>
        <div className="flex flex-col items-center gap-1">
          <p className="text-[11px] text-muted-foreground/60">drag or use buttons</p>
          <div className="flex gap-1">
            <ArrowLeft size={12} className="text-muted-foreground/40" />
            <ArrowRight size={12} className="text-muted-foreground/40" />
          </div>
        </div>
        <button
          onClick={handleView}
          className="w-14 h-14 rounded-full border-2 border-muted-foreground/30 bg-card shadow flex items-center justify-center hover:border-secondary hover:text-secondary transition-colors"
          title="View profile (→)"
        >
          <Heart size={22} />
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

          {locationError && (
            <p className="text-sm text-destructive text-center">{locationError}</p>
          )}
          {userLocation && (
            <p className="text-sm text-center text-muted-foreground">Showing technicians sorted by distance from your location</p>
          )}
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
          <SwipeDeck key={`${search}-${userLocation?.lat}`} techs={technicians} />
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
