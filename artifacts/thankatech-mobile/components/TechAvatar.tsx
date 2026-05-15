import React from "react";
import { View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

interface SpecialtyTheme {
  icon: IconName;
  bg: string;
  color: string;
}

const SPECIALTY_MAP: Array<[string, SpecialtyTheme]> = [
  ["hvac",       { icon: "air-filter",      bg: "#e0f2fe", color: "#0284c7" }],
  ["electrical", { icon: "lightning-bolt",  bg: "#fef9c3", color: "#ca8a04" }],
  ["electrician",{ icon: "lightning-bolt",  bg: "#fef9c3", color: "#ca8a04" }],
  ["plumbing",   { icon: "water-pump",      bg: "#dbeafe", color: "#2563eb" }],
  ["plumber",    { icon: "water-pump",      bg: "#dbeafe", color: "#2563eb" }],
  ["painting",   { icon: "brush",           bg: "#f3e8ff", color: "#9333ea" }],
  ["painter",    { icon: "brush",           bg: "#f3e8ff", color: "#9333ea" }],
  ["carpentry",  { icon: "hammer",          bg: "#fef3c7", color: "#b45309" }],
  ["handyman",   { icon: "hammer",          bg: "#fef3c7", color: "#b45309" }],
  ["heating",    { icon: "fire",            bg: "#ffedd5", color: "#ea580c" }],
  ["appliance",  { icon: "cog-outline",     bg: "#f1f5f9", color: "#475569" }],
  ["drilling",   { icon: "hammer-wrench",    bg: "#f5f5f4", color: "#57534e" }],
  ["security",   { icon: "shield-check",    bg: "#dcfce7", color: "#16a34a" }],
];

function getTheme(specialty: string): SpecialtyTheme {
  const lower = specialty.toLowerCase();
  for (const [key, theme] of SPECIALTY_MAP) {
    if (lower.includes(key)) return theme;
  }
  return { icon: "wrench", bg: "#fff7ed", color: "#FF6B35" };
}

interface TechAvatarProps {
  specialty: string;
  size?: number;
}

export function TechAvatar({ specialty, size = 52 }: TechAvatarProps) {
  const theme = getTheme(specialty);
  const iconSize = Math.round(size * 0.46);
  const borderRadius = size / 2;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: theme.bg,
        },
      ]}
    >
      <MaterialCommunityIcons name={theme.icon} size={iconSize} color={theme.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
