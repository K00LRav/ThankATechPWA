import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Wrench, Zap, Droplets, Wind, Hammer, Paintbrush, Flame, Settings, Drill, Shield, Bug, Home } from "lucide-react";

const SPECIALTY_MAP: Record<string, { icon: React.ElementType; bg: string; color: string; hex: string }> = {
  hvac:        { icon: Wind,       bg: "bg-sky-100",    color: "text-sky-600",    hex: "0ea5e9" },
  electrical:  { icon: Zap,        bg: "bg-yellow-100", color: "text-yellow-600", hex: "ca8a04" },
  electrician: { icon: Zap,        bg: "bg-yellow-100", color: "text-yellow-600", hex: "ca8a04" },
  plumbing:    { icon: Droplets,   bg: "bg-blue-100",   color: "text-blue-600",   hex: "2563eb" },
  plumber:     { icon: Droplets,   bg: "bg-blue-100",   color: "text-blue-600",   hex: "2563eb" },
  painting:    { icon: Paintbrush, bg: "bg-purple-100", color: "text-purple-600", hex: "9333ea" },
  painter:     { icon: Paintbrush, bg: "bg-purple-100", color: "text-purple-600", hex: "9333ea" },
  carpentry:   { icon: Hammer,     bg: "bg-amber-100",  color: "text-amber-700",  hex: "b45309" },
  handyman:    { icon: Hammer,     bg: "bg-amber-100",  color: "text-amber-700",  hex: "b45309" },
  heating:     { icon: Flame,      bg: "bg-orange-100", color: "text-orange-600", hex: "ea580c" },
  appliance:   { icon: Settings,   bg: "bg-slate-100",  color: "text-slate-600",  hex: "475569" },
  locksmith:   { icon: Shield,     bg: "bg-green-100",  color: "text-green-700",  hex: "15803d" },
  pest:        { icon: Bug,        bg: "bg-lime-100",   color: "text-lime-700",   hex: "4d7c0f" },
  roofing:     { icon: Home,       bg: "bg-stone-100",  color: "text-stone-600",  hex: "78716c" },
  landscaping: { icon: Home,       bg: "bg-emerald-100",color: "text-emerald-700",hex: "047857" },
  drilling:    { icon: Drill,      bg: "bg-stone-100",  color: "text-stone-600",  hex: "78716c" },
  security:    { icon: Shield,     bg: "bg-green-100",  color: "text-green-600",  hex: "166534" },
};

function getSpecialtyTheme(specialty: string) {
  const lower = specialty.toLowerCase();
  for (const [key, theme] of Object.entries(SPECIALTY_MAP)) {
    if (lower.includes(key)) return theme;
  }
  return { icon: Wrench, bg: "bg-primary/10", color: "text-primary", hex: "FF6B35" };
}

function getDiceBearUrl(name: string, hex: string) {
  const seed = encodeURIComponent(name);
  return `https://api.dicebear.com/8.x/initials/svg?seed=${seed}&backgroundColor=${hex}&textColor=ffffff&fontSize=36&fontWeight=600`;
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
  const generatedUrl = getDiceBearUrl(fullName, theme.hex);

  return (
    <Avatar className={`${className} border-2 border-background shadow-sm`}>
      <AvatarImage src={avatarUrl ?? generatedUrl} />
      <AvatarFallback className={`${theme.bg} ${theme.color}`}>
        <Icon size={iconSize} strokeWidth={1.75} />
      </AvatarFallback>
    </Avatar>
  );
}
