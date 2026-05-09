import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useListJobs,
  useGetMyProfile,
  useGetPoints,
  useGetTechnicianWallOfThanks,
  useGetTechnicianStats,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

function StatusBadge({ status }: { status: string }) {
  const colors = useColors();
  const colorMap: Record<string, string> = {
    pending: colors.mutedForeground,
    in_progress: "#F59E0B",
    completed: colors.secondary,
    cancelled: colors.destructive,
  };
  const color = colorMap[status] ?? colors.mutedForeground;
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + "20" }]}>
      <Text style={[styles.statusText, { color, fontFamily: "Inter_600SemiBold" }]}>
        {status.replace("_", " ")}
      </Text>
    </View>
  );
}

function ThankPreviewCard({ item }: { item: {
  id: number;
  customerName?: string;
  message: string;
  tipAmount: number;
  createdAt: string;
}}) {
  const colors = useColors();
  return (
    <View style={[styles.thankPreviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.thankPreviewHeader}>
        <View style={styles.quoteRow}>
          <Ionicons name="heart" size={13} color={colors.primary} />
          <Text style={[styles.customerName, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            {item.customerName ?? "A customer"}
          </Text>
        </View>
        {item.tipAmount > 0 && (
          <Text style={[styles.tipAmount, { color: colors.secondary, fontFamily: "Inter_700Bold" }]}>
            +${item.tipAmount}
          </Text>
        )}
      </View>
      <Text
        style={[styles.thankPreviewMessage, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
        numberOfLines={2}
      >
        "{item.message}"
      </Text>
    </View>
  );
}

export default function TechnicianDashboard() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [refreshing, setRefreshing] = useState(false);

  const { data: profileData } = useGetMyProfile();
  const profile = profileData?.profile;
  const techId = profile?.technicianId ?? 0;

  const { data: jobs, isLoading: jobsLoading, refetch: refetchJobs } = useListJobs(
    profile ? { technicianId: profile.profileId } : {}
  );
  const { data: points, refetch: refetchPoints } = useGetPoints(profile?.profileId ?? 0);
  const { data: wall } = useGetTechnicianWallOfThanks(techId > 0 ? techId : 0);
  const { data: stats } = useGetTechnicianStats(techId > 0 ? techId : 0);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchJobs(), refetchPoints()]);
    setRefreshing(false);
  };

  const topPadding = isWeb ? 67 : insets.top;

  const pendingJobs = jobs?.filter((j) => j.status === "pending" || j.status === "in_progress") ?? [];
  const recentWall = wall?.slice(0, 3) ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topPadding + 12, paddingBottom: isWeb ? 34 + 84 : 60 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
              Dashboard
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="heart" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {stats?.totalThanks ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Thanks</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="cash-outline" size={20} color={colors.secondary} />
            <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              ${Math.round(stats?.totalEarned ?? 0).toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Earned</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="star" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {points?.balance ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Points</Text>
          </View>
        </View>

        {/* Active Jobs */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Active Jobs
          </Text>
        </View>

        {jobsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : pendingJobs.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="checkmark-circle-outline" size={28} color={colors.secondary} />
            <Text style={[styles.emptyCardText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              All caught up!
            </Text>
          </View>
        ) : (
          pendingJobs.map((item) => (
            <View
              key={item.id}
              style={[styles.jobCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.jobHeader}>
                <Text style={[styles.jobTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  {item.title}
                </Text>
                <StatusBadge status={item.status} />
              </View>
              {item.customerName && (
                <View style={styles.jobMeta}>
                  <Ionicons name="person-outline" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.jobMetaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {item.customerName}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}

        {/* Wall of Thanks Preview */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Wall of Thanks
          </Text>
          {techId > 0 && (
            <TouchableOpacity onPress={() => router.push(`/technician/${techId}`)}>
              <Text style={[styles.seeAll, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                See all
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {recentWall.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="heart-outline" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyCardText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              No thanks yet
            </Text>
          </View>
        ) : (
          recentWall.map((item) => (
            <ThankPreviewCard key={item.id} item={item} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 26 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 28 },
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18 },
  seeAll: { fontSize: 14 },
  jobCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  jobTitle: { fontSize: 15, flex: 1, marginRight: 8 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: { fontSize: 12 },
  jobMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  jobMetaText: { fontSize: 13 },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  emptyCardText: { fontSize: 14 },
  thankPreviewCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  thankPreviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quoteRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  customerName: { fontSize: 13 },
  tipAmount: { fontSize: 15 },
  thankPreviewMessage: { fontSize: 14, lineHeight: 20 },
});
