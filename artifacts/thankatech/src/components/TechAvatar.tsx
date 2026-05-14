import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Wrench, Zap, Droplets, Wind, Hammer, Paintbrush, Flame, Settings, Drill, Shield } from "lucide-react";

const SPECIALTY_MAP: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
  hvac:        { icon: Wind,       bg: "bg-sky-100",    color: "text-sky-600" },
  electrical:  { icon: Zap,        bg: "bg-yellow-100", color: "text-yellow-600" },
  electrician: { icon: Zap,        bg: "bg-yellow-100", color: "text-yellow-600" },
  plumbing:    { icon: Droplets,   bg: "bg-blue-100",   color: "text-blue-600" },
  plumber:     { icon: Droplets,   bg: "bg-blue-100",   color: "text-blue-600" },
  painting:    { icon: Paintbrush, bg: "bg-purple-100", color: "text-purple-600" },
  painter:     { icon: Paintbrush, bg: "bg-purple-100", color: "text-purple-600" },
  carpentry:   { icon: Hammer,     bg: "bg-amber-100",  color: "text-amber-700" },
  handyman:    { icon: Hammer,     bg: "bg-amber-100",  color: "text-amber-700" },
  heating:     { icon: Flame,      bg: "bg-orange-100", color: "text-orange-600" },
  appliance:   { icon: Settings,   bg: "bg-slate-100",  color: "text-slate-600" },
  drilling:    { icon: Drill,      bg: "bg-stone-100",  color: "text-stone-600" },
  security:    { icon: Shield,     bg: "bg-green-100",  color: "text-green-600" },
};

function getSpecialtyTheme(specialty: string) {
  const lower = specialty.toLowerCase();
  for (const [key, theme] of Object.entries(SPECIALTY_MAP)) {
    if (lower.includes(key)) return theme;
  }
  return { icon: Wrench, bg: "bg-primary/10", color: "text-primary" };
}

interface TechAvatarProps {
  avatarUrl?: string | null;
  fullName: string;
  specialty: string;
  className?: string;
  iconSize?: number;
}

export function TechAvatar({ avatarUrl, fullName, specialty, className = "w-16 h-16", iconSize = 24 }: TechAvatarProps) {
  const theme = getSpecialtyTheme(specialty);
  const Icon = theme.icon;

  return (
    <Avatar className={`${className} border-2 border-background shadow-sm`}>
      {avatarUrl && <AvatarImage src={avatarUrl} />}
      <AvatarFallback className={`${theme.bg} ${theme.color}`}>
        <Icon size={iconSize} strokeWidth={1.75} />
      </AvatarFallback>
    </Avatar>
  );
}
