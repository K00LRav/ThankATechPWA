import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth";
import { useGetMyProfile } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

function LoginView() {
  const colors = useColors();
  const { login, isLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const handleLogin = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await login();
  };

  return (
    <View style={[styles.loginContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.loginContent, { paddingTop: topPadding + 60 }]}>
        <View style={[styles.loginIconCircle, { backgroundColor: colors.primary + "20" }]}>
          <Ionicons name="heart" size={44} color={colors.primary} />
        </View>
        <Text style={[styles.loginTitle, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
          ThankATech
        </Text>
        <Text style={[styles.loginSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Sign in to send thanks, track jobs, and view your Wall of Thanks.
        </Text>
        <TouchableOpacity
          style={[styles.loginBtn, { backgroundColor: colors.primary }]}
          onPress={handleLogin}
          disabled={isLoading}
          activeOpacity={0.85}
          testID="login-button"
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="log-in-outline" size={20} color="#fff" />
              <Text style={[styles.loginBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                Sign In
              </Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={[styles.loginNote, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          No ratings. Just gratitude.
        </Text>
      </View>
    </View>
  );
}

function ProfileView() {
  const colors = useColors();
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const { data: profileData, isLoading: profileLoading } = useGetMyProfile();
  const profile = profileData?.profile;

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
        },
      },
    ]);
  };

  const displayName = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email || "User"
    : "";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isCustomer = profile?.userType === "customer";
  const isTechnician = profile?.userType === "technician";
  const needsOnboarding = !profileLoading && !profile;

  return (
    <ScrollView
      style={[styles.profileScroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.profileContent,
        { paddingTop: topPadding + 20, paddingBottom: isWeb ? 34 + 84 : 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={[styles.profileAvatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.profileInitials, { fontFamily: "Inter_700Bold" }]}>
            {initials}
          </Text>
        </View>
        <Text style={[styles.profileName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          {displayName}
        </Text>
        {user?.email && (
          <Text style={[styles.profileEmail, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {user.email}
          </Text>
        )}
        {profile && (
          <View style={[styles.roleBadge, { backgroundColor: isCustomer ? colors.accent : colors.secondary + "20" }]}>
            <Text style={[styles.roleText, { color: isCustomer ? colors.foreground : colors.secondary, fontFamily: "Inter_600SemiBold" }]}>
              {isCustomer ? "Customer" : isTechnician ? "Technician" : ""}
            </Text>
          </View>
        )}
      </View>

      {/* Onboarding prompt */}
      {needsOnboarding && (
        <TouchableOpacity
          style={[styles.onboardCard, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}
          onPress={() => router.push("/onboard")}
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.onboardTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              Complete your profile
            </Text>
            <Text style={[styles.onboardSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Tell us if you're a customer or technician
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      )}

      {/* Loading */}
      {profileLoading && (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
      )}

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
          QUICK ACTIONS
        </Text>

        {isCustomer && (
          <ActionRow
            icon="briefcase-outline"
            label="My Jobs"
            sublabel="View job history and send thanks"
            onPress={() => router.push("/dashboard/customer")}
          />
        )}

        {isTechnician && (
          <ActionRow
            icon="briefcase-outline"
            label="My Dashboard"
            sublabel="Jobs, earnings, and Wall of Thanks"
            onPress={() => router.push("/dashboard/technician")}
          />
        )}

        <ActionRow
          icon="search-outline"
          label="Browse Technicians"
          sublabel="Find a tech near you"
          onPress={() => router.push("/(tabs)/browse")}
        />
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        style={[styles.signOutBtn, { borderColor: colors.border }]}
        onPress={handleLogout}
        activeOpacity={0.75}
        testID="logout-button"
      >
        <Feather name="log-out" size={18} color={colors.destructive} />
        <Text style={[styles.signOutText, { color: colors.destructive, fontFamily: "Inter_500Medium" }]}>
          Sign Out
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ActionRow({
  icon,
  label,
  sublabel,
  onPress,
}: {
  icon: string;
  label: string;
  sublabel: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.actionRow, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.actionIcon, { backgroundColor: colors.accent }]}>
        <Ionicons name={icon as "briefcase-outline"} size={20} color={colors.foreground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          {label}
        </Text>
        <Text style={[styles.actionSublabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {sublabel}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return <ProfileView />;
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  // Login
  loginContainer: { flex: 1 },
  loginContent: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  loginIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  loginTitle: { fontSize: 32, letterSpacing: -1 },
  loginSubtitle: { fontSize: 16, textAlign: "center", lineHeight: 24 },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
    width: "100%",
    justifyContent: "center",
  },
  loginBtnText: { color: "#fff", fontSize: 17 },
  loginNote: { fontSize: 14, marginTop: 8 },
  // Profile
  profileScroll: { flex: 1 },
  profileContent: { paddingHorizontal: 20 },
  avatarSection: { alignItems: "center", marginBottom: 28 },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  profileInitials: { color: "#fff", fontSize: 32 },
  profileName: { fontSize: 24, marginBottom: 4 },
  profileEmail: { fontSize: 14, marginBottom: 10 },
  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleText: { fontSize: 13 },
  onboardCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  onboardTitle: { fontSize: 15 },
  onboardSubtitle: { fontSize: 13, marginTop: 2 },
  actionsSection: { marginBottom: 28 },
  sectionLabel: { fontSize: 12, letterSpacing: 0.5, marginBottom: 10 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { fontSize: 15 },
  actionSublabel: { fontSize: 13, marginTop: 2 },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  signOutText: { fontSize: 15 },
});
