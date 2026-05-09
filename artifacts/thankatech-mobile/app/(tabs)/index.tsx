import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetPlatformStats, useGetRecentThanks } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

function StatCard({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        {label}
      </Text>
    </View>
  );
}

function ThankFeedItem({ item }: { item: {
  id: number;
  customerName?: string;
  technicianName?: string;
  message: string;
  tipAmount: number;
  createdAt: string;
  technicianId: number;
}}) {
  const colors = useColors();
  const router = useRouter();
  const initials = (item.technicianName ?? "T").charAt(0).toUpperCase();
  const date = new Date(item.createdAt);
  const timeAgo = getTimeAgo(date);

  return (
    <TouchableOpacity
      style={[styles.thankItem, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/technician/${item.technicianId}`)}
      activeOpacity={0.75}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Text style={[styles.avatarText, { fontFamily: "Inter_700Bold" }]}>{initials}</Text>
      </View>
      <View style={styles.thankContent}>
        <View style={styles.thankHeader}>
          <Text style={[styles.thankName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            {item.technicianName ?? "Technician"}
          </Text>
          {item.tipAmount > 0 && (
            <View style={[styles.tipBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.tipText, { fontFamily: "Inter_600SemiBold" }]}>
                +${item.tipAmount}
              </Text>
            </View>
          )}
        </View>
        <Text
          style={[styles.thankMessage, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
          numberOfLines={2}
        >
          "{item.message}"
        </Text>
        <Text style={[styles.thankTime, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {item.customerName ?? "A customer"} · {timeAgo}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetPlatformStats();
  const { data: recentThanks, isLoading: thanksLoading, refetch: refetchThanks } = useGetRecentThanks();

  const isLoading = statsLoading || thanksLoading;
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchThanks()]);
    setRefreshing(false);
  };

  const topPadding = isWeb ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: isWeb ? 34 + 84 : 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
          <View>
            <Text style={[styles.brandName, { color: colors.primary, fontFamily: "PlayfairDisplay_700Bold" }]}>
              ThankATech
            </Text>
            <Text style={[styles.tagline, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Real thanks. Real tips. No ratings.
            </Text>
          </View>
          <View style={[styles.heartIcon, { backgroundColor: colors.primary + "20" }]}>
            <Ionicons name="heart" size={24} color={colors.primary} />
          </View>
        </View>

        {/* Stats */}
        {statsLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : stats ? (
          <View style={styles.statsRow}>
            <StatCard label="Technicians" value={stats.totalTechnicians.toLocaleString()} />
            <StatCard label="Thanks Sent" value={stats.totalThanks.toLocaleString()} />
            <StatCard label="Tips Given" value={`$${Math.round(stats.totalTipsAmount).toLocaleString()}`} />
          </View>
        ) : null}

        {/* Recent Thanks Feed */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
            Recent Thanks
          </Text>
          <Ionicons name="sparkles" size={18} color={colors.primary} />
        </View>

        {thanksLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : recentThanks && recentThanks.length > 0 ? (
          recentThanks.map((item) => (
            <ThankFeedItem key={item.id} item={item} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              No thanks yet — be the first!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  brandName: { fontSize: 28, letterSpacing: -0.5 },
  tagline: { fontSize: 13, marginTop: 2 },
  heartIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
  },
  statValue: { fontSize: 20 },
  statLabel: { fontSize: 11, marginTop: 2, textAlign: "center" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18 },
  loadingRow: { paddingVertical: 24, alignItems: "center" },
  thankItem: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { color: "#fff", fontSize: 18 },
  thankContent: { flex: 1 },
  thankHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  thankName: { fontSize: 15 },
  tipBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tipText: { color: "#fff", fontSize: 12 },
  thankMessage: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  thankTime: { fontSize: 12 },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 15, textAlign: "center" },
});
