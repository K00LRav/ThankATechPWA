import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import {
  useListJobs,
  useGetMyProfile,
  useGetPoints,
  useGetTechnicianWallOfThanks,
  useGetTechnicianStats,
  useRegisterPushToken,
  useUnregisterPushToken,
  useGetPointTransactions,
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

  // Always request permission first — do not gate on project config.
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  try {
    // Pass projectId when available (needed for standalone builds).
    // In Expo Go, omitting projectId is fine — it infers one from the app.
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
  const tokenRegisteredRef = useRef(false);

  const { data: profileData } = useGetMyProfile();
  const profile = profileData?.profile;
  const techId = profile?.technicianId ?? 0;

  const { data: jobs, isLoading: jobsLoading, refetch: refetchJobs } = useListJobs(
    profile ? { technicianId: profile.profileId } : {}
  );
  const { data: points, refetch: refetchPoints } = useGetPoints(profile?.profileId ?? 0);
  const { data: wall } = useGetTechnicianWallOfThanks(techId > 0 ? techId : 0);
  const { data: stats } = useGetTechnicianStats(techId > 0 ? techId : 0);
  const { data: transactions, isLoading: txLoading, refetch: refetchTransactions } = useGetPointTransactions(profile?.profileId ?? 0);

  const { mutateAsync: registerTokenAsync } = useRegisterPushToken();
  const { mutateAsync: unregisterTokenAsync } = useUnregisterPushToken();

  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [notificationLoading, setNotificationLoading] = useState(false);

  // "notifications_preference" stores "enabled" | "disabled".
  // Absent = first-time (auto-register path).
  // "disabled" = user explicitly opted out (never auto-register again until toggled back on).
  const NOTIF_PREF_KEY = "notifications_preference";

  // Initialise toggle state from the explicit preference key on mount.
  useEffect(() => {
    if (isWeb) return;
    SecureStore.getItemAsync(NOTIF_PREF_KEY)
      .then((pref) => {
        // If preference is set, use it directly; otherwise derive from stored token.
        if (pref !== null) {
          setNotificationsEnabled(pref === "enabled");
        } else {
          SecureStore.getItemAsync("push_notification_token")
            .then((token) => setNotificationsEnabled(!!token))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [isWeb]);

  useEffect(() => {
    if (!profile || tokenRegisteredRef.current || isWeb) return;
    tokenRegisteredRef.current = true;

    // Only auto-register when the user has never set a preference ("first time")
    // or when they have explicitly opted in. Never auto-register for "disabled".
    SecureStore.getItemAsync(NOTIF_PREF_KEY)
      .then(async (pref) => {
        if (pref === "disabled") return; // User opted out — respect their choice.

        const token = await requestAndGetPushToken();
        if (token) {
          await registerTokenAsync({ data: { token } });
          await SecureStore.setItemAsync("push_notification_token", token);
          await SecureStore.setItemAsync(NOTIF_PREF_KEY, "enabled");
          setNotificationsEnabled(true);
        }
      })
      .catch(() => {});
  }, [profile, isWeb, registerTokenAsync]);

  const handleNotificationToggle = useCallback(async (value: boolean) => {
    if (isWeb || notificationLoading) return;
    setNotificationLoading(true);
    try {
      if (!value) {
        const stored = await SecureStore.getItemAsync("push_notification_token");
        if (stored) {
          // Await so we confirm server-side removal before updating UI.
          await unregisterTokenAsync({ data: { token: stored } });
          await SecureStore.deleteItemAsync("push_notification_token");
        }
        // Persist the disabled preference so auto-registration is suppressed.
        await SecureStore.setItemAsync(NOTIF_PREF_KEY, "disabled");
        setNotificationsEnabled(false);
      } else {
        const token = await requestAndGetPushToken();
        if (token) {
          await registerTokenAsync({ data: { token } });
          await SecureStore.setItemAsync("push_notification_token", token);
          await SecureStore.setItemAsync(NOTIF_PREF_KEY, "enabled");
          setNotificationsEnabled(true);
        }
        // If OS permission was denied, leave toggle off — do not persist "enabled".
      }
    } catch {
      // Leave state as-is on error so the toggle reflects actual state.
      Alert.alert(
        "Something went wrong",
        value
          ? "Couldn't enable notifications. Please try again."
          : "Couldn't disable notifications. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setNotificationLoading(false);
    }
  }, [isWeb, notificationLoading, registerTokenAsync, unregisterTokenAsync]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchJobs(), refetchPoints(), refetchTransactions()]);
    setRefreshing(false);
  };

  const topPadding = isWeb ? 67 : insets.top;

  const pendingJobs = jobs?.filter((j) => j.status === "pending" || j.status === "in_progress") ?? [];
  const recentWall = wall?.slice(0, 3) ?? [];
  const recentTransactions = transactions
    ? [...transactions]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
    : [];

  const TX_ICON: Record<string, { name: string; colorKey: "primary" | "secondary" }> = {
    thank_sent: { name: "heart-outline", colorKey: "primary" },
    thank_received: { name: "heart", colorKey: "primary" },
    job_completed: { name: "briefcase-outline", colorKey: "secondary" },
    tip_received: { name: "cash-outline", colorKey: "secondary" },
  };

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

        {/* Points History */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Points History
          </Text>
        </View>

        {txLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
        ) : recentTransactions.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="star-outline" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyCardText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              No points earned yet
            </Text>
          </View>
        ) : (
          recentTransactions.map((tx) => {
            const meta = TX_ICON[tx.type] ?? { name: "star-outline", colorKey: "primary" as const };
            const iconColor = meta.colorKey === "secondary" ? colors.secondary : colors.primary;
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
                  <Ionicons name={meta.name as React.ComponentProps<typeof Ionicons>["name"]} size={18} color={iconColor} />
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

        {/* Notification Preferences */}
        {!isWeb && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 8 }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                Notifications
              </Text>
            </View>
            <View style={[styles.prefCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.prefRow}>
                <View style={styles.prefIcon}>
                  <Ionicons
                    name={notificationsEnabled ? "notifications" : "notifications-off-outline"}
                    size={20}
                    color={notificationsEnabled ? colors.primary : colors.mutedForeground}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.prefLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                    Push Notifications
                  </Text>
                  <Text style={[styles.prefDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {notificationsEnabled
                      ? "You'll be notified about new jobs and thanks"
                      : "Enable to get alerts for new jobs and thanks"}
                  </Text>
                </View>
                {notificationLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={handleNotificationToggle}
                    trackColor={{ false: colors.border, true: colors.primary + "80" }}
                    thumbColor={notificationsEnabled ? colors.primary : colors.mutedForeground}
                  />
                )}
              </View>
            </View>
          </>
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
  prefCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  prefIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  prefLabel: { fontSize: 15, marginBottom: 2 },
  prefDesc: { fontSize: 13, lineHeight: 18 },
});
