import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import {
  useListJobs,
  useListThankMessages,
  getListThankMessagesQueryKey,
  useGetMyProfile,
  useGetPoints,
  useGetPointTransactions,
  useListRewards,
  useRedeemPoints,
  useUpdateJob,
  useRegisterPushToken,
  getGetPointsQueryKey,
  getGetPointTransactionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function requestAndGetPushToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenData.data;
  } catch {
    return null;
  }
}

const STATUS_FILTERS = ["all", "pending", "in_progress", "completed"];

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const TRANSACTION_ICON: Record<string, { name: IoniconsName; color: "primary" | "secondary" }> = {
  thank_sent: { name: "heart-outline", color: "primary" },
  thank_received: { name: "heart", color: "primary" },
  job_completed: { name: "briefcase-outline", color: "secondary" },
  tip_received: { name: "cash-outline", color: "secondary" },
  redemption: { name: "gift-outline", color: "primary" },
};

const REWARD_ICON: Record<string, IoniconsName> = {
  appreciation_star: "star",
  tip_discount_5: "pricetag-outline",
  featured_profile: "trending-up-outline",
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

function PaymentFailedBadge() {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={() =>
        Alert.alert(
          "Payment Failed",
          "The tip payment for this job didn't go through. Please retry the tip from the job details screen.",
          [{ text: "OK" }]
        )
      }
      style={[styles.paymentFailedBadge, { backgroundColor: colors.destructive + "18", borderColor: colors.destructive + "50" }]}
      activeOpacity={0.7}
      testID="payment-failed-badge"
    >
      <Ionicons name="alert-circle" size={13} color={colors.destructive} />
      <Text style={[styles.paymentFailedText, { color: colors.destructive, fontFamily: "Inter_600SemiBold" }]}>
        Payment failed
      </Text>
    </TouchableOpacity>
  );
}

function JobCard({ item, canThank, paymentFailed, onCancel, cancelling }: { item: {
  id: number;
  title: string;
  status: string;
  technicianName?: string;
  createdAt: string;
  completedAt?: string | null;
}; canThank: boolean; paymentFailed?: boolean; onCancel?: (id: number) => void; cancelling?: boolean }) {
  const colors = useColors();
  const router = useRouter();
  const date = new Date(item.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <TouchableOpacity
      style={[
        styles.jobCard,
        {
          backgroundColor: colors.card,
          borderColor: paymentFailed ? colors.destructive + "50" : colors.border,
        },
      ]}
      onPress={() => router.push({ pathname: "/job/[id]", params: { id: item.id } })}
      activeOpacity={0.75}
      testID={`job-card-${item.id}`}
    >
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
      {paymentFailed && (
        <View onStartShouldSetResponder={() => true}>
          <PaymentFailedBadge />
        </View>
      )}
      {canThank && (
        <View onStartShouldSetResponder={() => true}>
          <TouchableOpacity
            style={[styles.thankBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push(`/thank/${item.id}`)}
            testID={`thank-job-${item.id}`}
          >
            <Ionicons name="heart-outline" size={16} color="#fff" />
            <Text style={[styles.thankBtnText, { fontFamily: "Inter_600SemiBold" }]}>Send Thanks</Text>
          </TouchableOpacity>
        </View>
      )}
      {item.status === "pending" && onCancel && (
        <View onStartShouldSetResponder={() => true}>
          <TouchableOpacity
            style={[
              styles.cancelBtn,
              { borderColor: cancelling ? colors.mutedForeground : colors.destructive, opacity: cancelling ? 0.6 : 1 },
            ]}
            onPress={() => !cancelling && onCancel(item.id)}
            disabled={cancelling}
            testID={`cancel-job-${item.id}`}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : (
              <Ionicons name="close-circle-outline" size={16} color={colors.destructive} />
            )}
            <Text
              style={[
                styles.cancelBtnText,
                { color: cancelling ? colors.mutedForeground : colors.destructive, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              {cancelling ? "Cancelling…" : "Cancel Job"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

function RedeemModal({
  visible,
  onClose,
  balance,
  profileId,
}: {
  visible: boolean;
  onClose: () => void;
  balance: number;
  profileId: number;
}) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { data: rewards } = useListRewards();
  const redeemMutation = useRedeemPoints();
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const availableRewards = rewards?.filter(r => r.category === "all" || r.category === "customer") ?? [];

  async function handleRedeem(rewardId: string, rewardName: string, cost: number) {
    if (balance < cost) return;
    setRedeeming(rewardId);
    try {
      const result = await redeemMutation.mutateAsync({ userId: profileId, data: { rewardId } });
      await queryClient.invalidateQueries({ queryKey: getGetPointsQueryKey(profileId) });
      await queryClient.invalidateQueries({ queryKey: getGetPointTransactionsQueryKey(profileId) });
      Alert.alert(
        "Redeemed!",
        `${rewardName} has been applied to your account. You now have ${result.newBalance} pts.`,
        [{ text: "Great!", onPress: onClose }]
      );
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Redemption failed. Please try again.";
      Alert.alert("Oops", message);
    } finally {
      setRedeeming(null);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
            Redeem Points
          </Text>
          <TouchableOpacity onPress={onClose} style={[styles.modalCloseBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="close" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View style={[styles.balancePill, { backgroundColor: colors.primary + "15" }]}>
          <Ionicons name="star" size={16} color={colors.primary} />
          <Text style={[styles.balancePillText, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
            {balance} pts available
          </Text>
        </View>

        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
          {availableRewards.map(reward => {
            const canAfford = balance >= reward.cost;
            const isRedeeming = redeeming === reward.id;
            const iconName = REWARD_ICON[reward.id] ?? "gift-outline";

            return (
              <View
                key={reward.id}
                style={[
                  styles.rewardCard,
                  { backgroundColor: colors.card, borderColor: canAfford ? colors.primary + "40" : colors.border, opacity: canAfford ? 1 : 0.55 },
                ]}
              >
                <View style={[styles.rewardIconWrap, { backgroundColor: colors.primary + "15" }]}>
                  <Ionicons name={iconName as IoniconsName} size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rewardName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                    {reward.name}
                  </Text>
                  <Text style={[styles.rewardDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {reward.description}
                  </Text>
                  <View style={styles.rewardFooter}>
                    <Text style={[styles.rewardCost, { color: canAfford ? colors.primary : colors.mutedForeground, fontFamily: "Inter_700Bold" }]}>
                      {reward.cost} pts
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.redeemBtn,
                        { backgroundColor: canAfford ? colors.primary : colors.border },
                      ]}
                      onPress={() => handleRedeem(reward.id, reward.name, reward.cost)}
                      disabled={!canAfford || !!redeeming}
                    >
                      {isRedeeming ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={[styles.redeemBtnText, { fontFamily: "Inter_600SemiBold", color: canAfford ? "#fff" : colors.mutedForeground }]}>
                          {canAfford ? "Redeem" : "Not enough"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

function PointsHistorySection({
  transactions,
  isLoading,
  balance,
  profileId,
}: {
  transactions?: { id: number; type: string; amount: number; description?: string; createdAt: string }[];
  isLoading: boolean;
  balance: number;
  profileId: number;
}) {
  const colors = useColors();
  const [showRedeemModal, setShowRedeemModal] = useState(false);

  const sorted = transactions
    ? [...transactions].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ).slice(0, 10)
    : [];

  return (
    <View style={styles.historySection}>
      <View style={styles.historySectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Points History
        </Text>
        <TouchableOpacity
          style={[styles.redeemHeaderBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowRedeemModal(true)}
        >
          <Ionicons name="gift-outline" size={14} color="#fff" />
          <Text style={[styles.redeemHeaderBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            Redeem
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
      ) : sorted.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="star-outline" size={24} color={colors.mutedForeground} />
          <Text style={[styles.emptyCardText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            No points activity yet
          </Text>
        </View>
      ) : (
        sorted.map((tx) => {
          const meta = TRANSACTION_ICON[tx.type] ?? { name: "star-outline" as const, color: "primary" as const };
          const iconColor = meta.color === "secondary" ? colors.secondary : colors.primary;
          const isNegative = tx.amount < 0;
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
              <Text style={[styles.txAmount, { color: isNegative ? colors.destructive : colors.primary, fontFamily: "Inter_700Bold" }]}>
                {tx.amount > 0 ? "+" : ""}{tx.amount} pts
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

      <RedeemModal
        visible={showRedeemModal}
        onClose={() => setShowRedeemModal(false)}
        balance={balance}
        profileId={profileId}
      />
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
  const [cancellingJobId, setCancellingJobId] = useState<number | null>(null);

  const { data: profileData } = useGetMyProfile();
  const profile = profileData?.profile;
  const { mutate: registerToken } = useRegisterPushToken();

  // Register push token so customers receive booking status notifications.
  useEffect(() => {
    if (!profile?.profileId || Platform.OS === "web") return;

    (async () => {
      try {
        const stored = await SecureStore.getItemAsync("customer_push_notification_token");
        if (stored) {
          registerToken({ data: { token: stored } });
          return;
        }
        const token = await requestAndGetPushToken();
        if (token) {
          await SecureStore.setItemAsync("customer_push_notification_token", token);
          registerToken({ data: { token } });
        }
      } catch {
        // Non-fatal — notification opt-in failure should not block the dashboard.
      }
    })();
  }, [profile?.profileId]);

  const jobsParams = {
    ...(profile?.profileId ? { customerId: profile.profileId } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  };

  const { data: jobs, isLoading, refetch } = useListJobs(jobsParams);
  const { data: thankMessages, refetch: refetchThanks } = useListThankMessages(
    { customerId: profile?.profileId },
    {
      query: {
        enabled: !!profile?.profileId,
        queryKey: getListThankMessagesQueryKey({ customerId: profile?.profileId }),
      },
    }
  );
  const { data: points, refetch: refetchPoints } = useGetPoints(profile?.profileId ?? 0);
  const { data: transactions, isLoading: txLoading, refetch: refetchTransactions } = useGetPointTransactions(
    profile?.profileId ?? 0
  );
  const { mutate: cancelJob } = useUpdateJob();

  const failedPaymentJobIds = new Set(
    (thankMessages ?? []).filter(t => t.paymentStatus === "failed").map(t => t.jobId)
  );

  const handleCancel = (jobId: number) => {
    Alert.alert(
      "Cancel Job",
      "Are you sure you want to cancel this job request?",
      [
        { text: "Keep Job", style: "cancel" },
        {
          text: "Cancel Job",
          style: "destructive",
          onPress: () => {
            setCancellingJobId(jobId);
            cancelJob(
              { id: jobId, data: { status: "cancelled" } },
              {
                onSuccess: () => {
                  setCancellingJobId(null);
                  refetch();
                },
                onError: () => {
                  setCancellingJobId(null);
                  Alert.alert("Error", "Could not cancel the job. Please try again.");
                },
              }
            );
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchTransactions(), refetchPoints(), refetchThanks()]);
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
              paymentFailed={failedPaymentJobIds.has(item.id)}
              onCancel={handleCancel}
              cancelling={cancellingJobId === item.id}
            />
          )}
          ListHeaderComponent={
            profile?.profileId ? (
              <PointsHistorySection
                transactions={transactions}
                isLoading={txLoading}
                balance={points?.balance ?? 0}
                profileId={profile.profileId}
              />
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
  paymentFailedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  paymentFailedText: { fontSize: 12 },
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
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  cancelBtnText: { fontSize: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
  historySection: { marginBottom: 4 },
  historySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18 },
  redeemHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  redeemHeaderBtnText: { color: "#fff", fontSize: 13 },
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
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 24 },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  balancePillText: { fontSize: 15 },
  modalScroll: { flex: 1 },
  modalScrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  rewardCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  rewardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rewardName: { fontSize: 15, marginBottom: 4 },
  rewardDesc: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  rewardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rewardCost: { fontSize: 15 },
  redeemBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 90,
    alignItems: "center",
  },
  redeemBtnText: { fontSize: 14 },
});
