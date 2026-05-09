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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useListJobs,
  useGetMyProfile,
  useGetPoints,
  useGetPointTransactions,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

const STATUS_FILTERS = ["all", "pending", "in_progress", "completed"];

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const TRANSACTION_ICON: Record<string, { name: IoniconsName; color: "primary" | "secondary" }> = {
  thank_sent: { name: "heart-outline", color: "primary" },
  thank_received: { name: "heart", color: "primary" },
  job_completed: { name: "briefcase-outline", color: "secondary" },
  tip_received: { name: "cash-outline", color: "secondary" },
};

function StatusBadge({ status }: { status: string }) {
  const colors = useColors();
  const colorMap: Record<string, string> = {
    pending: colors.mutedForeground,
    in_progress: "#F59E0B",
    completed: colors.secondary,
    cancelled: colors.destructive,
  };
  const color = colorMap[status] ?? colors.mutedForeground;
  const label = status.replace("_", " ");

  return (
    <View style={[styles.statusBadge, { backgroundColor: color + "20" }]}>
      <Text style={[styles.statusText, { color, fontFamily: "Inter_600SemiBold" }]}>
        {label}
      </Text>
    </View>
  );
}

function JobCard({ item, canThank }: { item: {
  id: number;
  title: string;
  status: string;
  technicianName?: string;
  createdAt: string;
  completedAt?: string | null;
}; canThank: boolean }) {
  const colors = useColors();
  const router = useRouter();
  const date = new Date(item.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <View style={[styles.jobCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.jobHeader}>
        <Text style={[styles.jobTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          {item.title}
        </Text>
        <StatusBadge status={item.status} />
      </View>
      <View style={styles.jobMeta}>
        <Ionicons name="person-outline" size={13} color={colors.mutedForeground} />
        <Text style={[styles.jobMetaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {item.technicianName ?? "Technician"} · {date}
        </Text>
      </View>
      {canThank && (
        <TouchableOpacity
          style={[styles.thankBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push(`/thank/${item.id}`)}
          testID={`thank-job-${item.id}`}
        >
          <Ionicons name="heart-outline" size={16} color="#fff" />
          <Text style={[styles.thankBtnText, { fontFamily: "Inter_600SemiBold" }]}>Send Thanks</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function PointsHistorySection({
  transactions,
  isLoading,
}: {
  transactions?: { id: number; type: string; amount: number; description?: string; createdAt: string }[];
  isLoading: boolean;
}) {
  const colors = useColors();

  const sorted = transactions
    ? [...transactions].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ).slice(0, 10)
    : [];

  return (
    <View style={styles.historySection}>
      <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
        Points History
      </Text>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
      ) : sorted.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="star-outline" size={24} color={colors.mutedForeground} />
          <Text style={[styles.emptyCardText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            No points earned yet
          </Text>
        </View>
      ) : (
        sorted.map((tx) => {
          const meta = TRANSACTION_ICON[tx.type] ?? { name: "star-outline" as const, color: "primary" as const };
          const iconColor = meta.color === "secondary" ? colors.secondary : colors.primary;
          const date = new Date(tx.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          return (
            <View
              key={tx.id}
              style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.txIconWrap, { backgroundColor: iconColor + "15" }]}>
                <Ionicons name={meta.name} size={18} color={iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.txDescription, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                  {tx.description || tx.type.replace(/_/g, " ")}
                </Text>
                <Text style={[styles.txDate, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {date}
                </Text>
              </View>
              <Text style={[styles.txAmount, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                +{tx.amount} pts
              </Text>
            </View>
          );
        })
      )}

      <View style={styles.jobsSeparator}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          My Jobs
        </Text>
      </View>
    </View>
  );
}

export default function CustomerDashboard() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const { data: profileData } = useGetMyProfile();
  const profile = profileData?.profile;

  const jobsParams = {
    ...(profile?.profileId ? { customerId: profile.profileId } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  };

  const { data: jobs, isLoading, refetch } = useListJobs(jobsParams);
  const { data: points } = useGetPoints(profile?.profileId ?? 0);
  const { data: transactions, isLoading: txLoading, refetch: refetchTransactions } = useGetPointTransactions(
    profile?.profileId ?? 0
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchTransactions()]);
    setRefreshing(false);
  };

  const topPadding = isWeb ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
          My Jobs
        </Text>
        {points && (
          <View style={[styles.pointsBadge, { backgroundColor: colors.primary + "15" }]}>
            <Ionicons name="star" size={14} color={colors.primary} />
            <Text style={[styles.pointsText, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
              {points.balance}
            </Text>
          </View>
        )}
      </View>

      {/* Status filter */}
      <FlatList
        horizontal
        data={STATUS_FILTERS}
        keyExtractor={(s) => s}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: statusFilter === item ? colors.primary : colors.card,
                borderColor: statusFilter === item ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setStatusFilter(item)}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color: statusFilter === item ? "#fff" : colors.foreground,
                  fontFamily: "Inter_500Medium",
                },
              ]}
            >
              {item === "all" ? "All" : item.replace("_", " ")}
            </Text>
          </TouchableOpacity>
        )}
        style={{ flexGrow: 0 }}
      />

      {/* Jobs list + Points History header */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={jobs ?? []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <JobCard
              item={item}
              canThank={item.status === "completed"}
            />
          )}
          ListHeaderComponent={
            profile?.profileId ? (
              <PointsHistorySection transactions={transactions} isLoading={txLoading} />
            ) : null
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: isWeb ? 34 + 84 : 40 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="briefcase-outline" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                No jobs found
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1, fontSize: 22 },
  pointsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pointsText: { fontSize: 14 },
  filterList: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: { fontSize: 14 },
  listContent: { paddingHorizontal: 20, paddingTop: 8 },
  jobCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  jobTitle: { fontSize: 16, flex: 1, marginRight: 8 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: { fontSize: 12 },
  jobMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  jobMetaText: { fontSize: 13 },
  thankBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  thankBtnText: { color: "#fff", fontSize: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
  historySection: { marginBottom: 4 },
  sectionTitle: { fontSize: 18, marginBottom: 12 },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  emptyCardText: { fontSize: 14 },
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  txIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  txDescription: { fontSize: 14 },
  txDate: { fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 15 },
  jobsSeparator: { marginTop: 8, marginBottom: 4 },
});
