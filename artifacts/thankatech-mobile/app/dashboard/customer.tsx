import React, { useState, useEffect, useRef } from "react";
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
  Animated,
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
  useUpdateJob,
  useRegisterPushToken,
  type UpdateJobMutationError,
} from "@workspace/api-client-react";
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

function CancelledToast({ onHide, colors }: { onHide: () => void; colors: ReturnType<typeof useColors> }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onHide());
  }, []);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          opacity,
          backgroundColor: colors.secondary,
        },
      ]}
      pointerEvents="box-none"
    >
      <Ionicons name="checkmark-circle" size={18} color="#fff" />
      <Text style={[styles.toastText, { fontFamily: "Inter_600SemiBold" }]}>Job cancelled</Text>
      <TouchableOpacity onPress={onHide} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={16} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
}

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

function PaymentFailedBadge({ thankMessageId }: { thankMessageId: number }) {
  const colors = useColors();
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => (router.push as (href: string) => void)(`/retry-tip/${thankMessageId}`)}
      style={[styles.paymentFailedBadge, { backgroundColor: colors.destructive + "18", borderColor: colors.destructive + "50" }]}
      activeOpacity={0.7}
      testID="payment-failed-badge"
    >
      <Ionicons name="alert-circle" size={13} color={colors.destructive} />
      <Text style={[styles.paymentFailedText, { color: colors.destructive, fontFamily: "Inter_600SemiBold" }]}>
        Payment failed — tap to retry
      </Text>
    </TouchableOpacity>
  );
}

function JobCard({ item, canThank, paymentFailed, failedThankMessageId, onCancel, cancelling }: { item: {
  id: number;
  title: string;
  status: string;
  technicianName?: string;
  createdAt: string;
  completedAt?: string | null;
}; canThank: boolean; paymentFailed?: boolean; failedThankMessageId?: number; onCancel?: (id: number) => void; cancelling?: boolean }) {
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
      {paymentFailed && failedThankMessageId !== undefined && (
        <View onStartShouldSetResponder={() => true}>
          <PaymentFailedBadge thankMessageId={failedThankMessageId} />
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


export default function CustomerDashboard() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingJobId, setCancellingJobId] = useState<number | null>(null);
  const [cancelledToastKey, setCancelledToastKey] = useState(0);

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
  const { mutate: cancelJob } = useUpdateJob();

  const failedPaymentByJobId = new Map<number, number>(
    (thankMessages ?? [])
      .filter(t => t.paymentStatus === "failed" && t.jobId != null)
      .map(t => [t.jobId as number, t.id])
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
                  setCancelledToastKey(k => k + 1);
                  refetch();
                },
                onError: (err: UpdateJobMutationError) => {
                  setCancellingJobId(null);
                  const message = err.data?.error ?? "Could not cancel the job. Please try again.";
                  Alert.alert("Cannot Cancel", message);
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
    await Promise.all([refetch(), refetchThanks()]);
    setRefreshing(false);
  };

  const topPadding = isWeb ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {cancelledToastKey > 0 && (
        <CancelledToast
          key={cancelledToastKey}
          onHide={() => setCancelledToastKey(0)}
          colors={colors}
        />
      )}
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
              paymentFailed={failedPaymentByJobId.has(item.id)}
              failedThankMessageId={failedPaymentByJobId.get(item.id)}
              onCancel={handleCancel}
              cancelling={cancellingJobId === item.id}
            />
          )}
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
  toast: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 28,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: { color: "#fff", fontSize: 14 },
});
