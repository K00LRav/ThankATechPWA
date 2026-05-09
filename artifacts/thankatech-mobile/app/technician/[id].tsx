import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetTechnician, useGetTechnicianWallOfThanks, useGetTechnicianStats } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

function ThankCard({ item }: { item: {
  id: number;
  customerName?: string;
  message: string;
  tipAmount: number;
  createdAt: string;
}}) {
  const colors = useColors();
  const date = new Date(item.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return (
    <View style={[styles.thankCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.thankHeader}>
        <View style={styles.quoteRow}>
          <Ionicons name="heart" size={14} color={colors.primary} />
          <Text style={[styles.customerName, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            {item.customerName ?? "A happy customer"}
          </Text>
        </View>
        {item.tipAmount > 0 && (
          <View style={[styles.tipBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.tipText, { fontFamily: "Inter_600SemiBold" }]}>
              +${item.tipAmount}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.thankMessage, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
        "{item.message}"
      </Text>
      <Text style={[styles.thankDate, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        {date}
      </Text>
    </View>
  );
}

export default function TechnicianProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const techId = Number(id);
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: tech, isLoading: techLoading } = useGetTechnician(techId);
  const { data: wall, isLoading: wallLoading } = useGetTechnicianWallOfThanks(techId);
  const { data: stats } = useGetTechnicianStats(techId);

  if (techLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!tech) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Technician not found
        </Text>
      </View>
    );
  }

  const initials = tech.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const topPadding = isWeb ? 67 : insets.top;

  const ListHeader = () => (
    <View>
      {/* Back button */}
      <View style={[styles.backRow, { paddingTop: topPadding + 8 }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Hero */}
      <View style={styles.heroSection}>
        <View style={[styles.heroAvatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.heroInitials, { fontFamily: "Inter_700Bold" }]}>{initials}</Text>
        </View>
        <Text style={[styles.heroName, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
          {tech.fullName}
        </Text>
        <View style={styles.heroMeta}>
          <View style={[styles.specialtyBadge, { backgroundColor: colors.primary + "20" }]}>
            <Text style={[styles.specialtyText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
              {tech.specialty}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {tech.serviceArea}
            </Text>
          </View>
        </View>
        <Text style={[styles.heroBio, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {tech.bio}
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="heart" size={18} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {stats?.totalThanks ?? tech.totalThanks}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Thanks
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="cash-outline" size={18} color={colors.secondary} />
          <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            ${Math.round(stats?.totalEarned ?? tech.totalEarned).toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Tips Earned
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="briefcase-outline" size={18} color={colors.accent + "80"} />
          <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {stats?.totalJobs ?? "—"}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Jobs
          </Text>
        </View>
      </View>

      {/* Wall of Thanks title */}
      <View style={styles.wallHeader}>
        <Ionicons name="heart" size={18} color={colors.primary} />
        <Text style={[styles.wallTitle, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
          Wall of Thanks
        </Text>
      </View>

      {wallLoading && (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={wall ?? []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <ThankCard item={item} />}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: isWeb ? 34 + 84 : 40 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !wallLoading ? (
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                No thanks yet — be the first!
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 16 },
  backRow: { paddingHorizontal: 20, marginBottom: 8 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroSection: { alignItems: "center", paddingHorizontal: 20, marginBottom: 24 },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroInitials: { color: "#fff", fontSize: 32 },
  heroName: { fontSize: 26, marginBottom: 10, textAlign: "center" },
  heroMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 12 },
  specialtyBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  specialtyText: { fontSize: 13 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 13 },
  heroBio: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginBottom: 28 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 18 },
  statLabel: { fontSize: 11 },
  wallHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  wallTitle: { fontSize: 20 },
  listContent: { paddingHorizontal: 20 },
  thankCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  thankHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  quoteRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  customerName: { fontSize: 13 },
  tipBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  tipText: { color: "#fff", fontSize: 12 },
  thankMessage: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
  thankDate: { fontSize: 12 },
  emptyState: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 15 },
});
