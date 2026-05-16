import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";
import { MapPin, Heart, Wrench, X, ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Technician } from "@workspace/api-client-react";

const SWIPE_THRESHOLD = 100;
const SWIPE_VELOCITY = 500;

function SwipeCard({
  tech,
  isTop,
  stackIndex,
  onSwipe,
}: {
  tech: Technician;
  isTop: boolean;
  stackIndex: number;
  onSwipe: (dir: "left" | "right") => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-18, 18]);
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const skipOpacity = useTransform(x, [-100, -20], [1, 0]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > SWIPE_VELOCITY) {
        animate(x, 600, { duration: 0.3 }).then(() => onSwipe("right"));
      } else if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -SWIPE_VELOCITY) {
        animate(x, -600, { duration: 0.3 }).then(() => onSwipe("left"));
      } else {
        animate(x, 0, { type: "spring", stiffness: 300, damping: 20 });
      }
    },
    [x, onSwipe]
  );

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

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

        {isTop && (
          <motion.div
            className="absolute top-8 left-6 px-4 py-2 rounded-xl border-4 border-[#22c55e] rotate-[-12deg]"
            style={{ opacity: likeOpacity }}
          >
            <span className="text-[#22c55e] font-black text-2xl tracking-widest drop-shadow">THANKS</span>
          </motion.div>
        )}
        {isTop && (
          <motion.div
            className="absolute top-8 right-6 px-4 py-2 rounded-xl border-4 border-red-400 rotate-[12deg]"
            style={{ opacity: skipOpacity }}
          >
            <span className="text-red-400 font-black text-2xl tracking-widest drop-shadow">SKIP</span>
          </motion.div>
        )}

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

export function SwipeDeck({
  techs,
  storageKey,
}: {
  techs: Technician[];
  storageKey: string;
}) {
  const [, navigate] = useLocation();

  const [index, setIndex] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`deck:${storageKey}`);
      const parsed = saved ? parseInt(saved, 10) : 0;
      const n = isNaN(parsed) ? 0 : parsed;
      return n < techs.length ? n : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(`deck:${storageKey}`, String(index));
    } catch {}
  }, [index, storageKey]);

  const remaining = techs.length - index;
  const visibleCards = techs.slice(index, index + 3);

  const handleSwipe = useCallback(
    (dir: "left" | "right") => {
      const techId = techs[index]?.id;
      setIndex((i) => i + 1);
      if (dir === "right" && techId != null) {
        navigate(`/technician/${techId}`);
      }
    },
    [index, techs, navigate]
  );

  const handleSkip = useCallback(() => handleSwipe("left"), [handleSwipe]);
  const handleView = useCallback(() => handleSwipe("right"), [handleSwipe]);

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
        <Button
          variant="outline"
          className="gap-2 rounded-full"
          onClick={() => {
            setIndex(0);
            try { sessionStorage.removeItem(`deck:${storageKey}`); } catch {}
          }}
        >
          <RotateCcw size={15} />
          Start over
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{remaining}</span> technicians left
      </p>

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
