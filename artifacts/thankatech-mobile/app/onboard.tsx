import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useUpsertMyProfile } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

type Role = "customer" | "technician" | null;

export default function OnboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [role, setRole] = useState<Role>(null);
  const [fullName, setFullName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [bio, setBio] = useState("");

  const { mutateAsync: upsertProfile, isPending } = useUpsertMyProfile();

  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 34 : insets.bottom;

  const canSubmit =
    fullName.trim() &&
    role &&
    (role === "customer" || (specialty.trim() && serviceArea.trim() && bio.trim()));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await upsertProfile({
        data: {
          userType: role!,
          fullName: fullName.trim(),
          ...(role === "technician"
            ? {
                specialty: specialty.trim(),
                serviceArea: serviceArea.trim(),
                bio: bio.trim(),
              }
            : {}),
        },
      });
      router.back();
    } catch {
      Alert.alert("Error", "Failed to save profile. Please try again.");
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding + 24, paddingBottom: bottomPadding + 32 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.closeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.title, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
        Set up your profile
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        Tell us a bit about yourself to get started
      </Text>

      {/* Full Name */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          Full Name
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: fullName ? colors.primary : colors.border,
              color: colors.foreground,
              fontFamily: "Inter_400Regular",
            },
          ]}
          placeholder="Your full name"
          placeholderTextColor={colors.mutedForeground}
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          testID="onboard-fullname-input"
        />
      </View>

      {/* Role Selection */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          I am a...
        </Text>
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[
              styles.roleCard,
              {
                backgroundColor: role === "customer" ? colors.primary + "15" : colors.card,
                borderColor: role === "customer" ? colors.primary : colors.border,
              },
            ]}
            onPress={() => {
              setRole("customer");
              Haptics.selectionAsync();
            }}
            testID="role-customer-button"
          >
            <Ionicons
              name="person-outline"
              size={28}
              color={role === "customer" ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={[
                styles.roleTitle,
                {
                  color: role === "customer" ? colors.primary : colors.foreground,
                  fontFamily: "Inter_700Bold",
                },
              ]}
            >
              Customer
            </Text>
            <Text
              style={[
                styles.roleDesc,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              I hire technicians and send thanks
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleCard,
              {
                backgroundColor: role === "technician" ? colors.primary + "15" : colors.card,
                borderColor: role === "technician" ? colors.primary : colors.border,
              },
            ]}
            onPress={() => {
              setRole("technician");
              Haptics.selectionAsync();
            }}
            testID="role-technician-button"
          >
            <Ionicons
              name="construct-outline"
              size={28}
              color={role === "technician" ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={[
                styles.roleTitle,
                {
                  color: role === "technician" ? colors.primary : colors.foreground,
                  fontFamily: "Inter_700Bold",
                },
              ]}
            >
              Technician
            </Text>
            <Text
              style={[
                styles.roleDesc,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              I do the work and receive thanks
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Technician-only fields */}
      {role === "technician" && (
        <>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              Specialty
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: specialty ? colors.primary : colors.border,
                  color: colors.foreground,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              placeholder="e.g. HVAC, Plumbing, Electrical"
              placeholderTextColor={colors.mutedForeground}
              value={specialty}
              onChangeText={setSpecialty}
              testID="onboard-specialty-input"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              Service Area
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: serviceArea ? colors.primary : colors.border,
                  color: colors.foreground,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              placeholder="e.g. San Francisco Bay Area"
              placeholderTextColor={colors.mutedForeground}
              value={serviceArea}
              onChangeText={setServiceArea}
              testID="onboard-servicearea-input"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              Bio
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.card,
                  borderColor: bio ? colors.primary : colors.border,
                  color: colors.foreground,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              placeholder="Tell customers about your experience and what makes you great..."
              placeholderTextColor={colors.mutedForeground}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              testID="onboard-bio-input"
            />
          </View>
        </>
      )}

      {/* Submit */}
      <TouchableOpacity
        style={[
          styles.submitBtn,
          { backgroundColor: canSubmit ? colors.primary : colors.muted },
        ]}
        onPress={handleSubmit}
        disabled={!canSubmit || isPending}
        testID="onboard-submit-button"
      >
        {isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.submitText, { fontFamily: "Inter_600SemiBold" }]}>
            Complete Setup
          </Text>
        )}
      </TouchableOpacity>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24 },
  header: { marginBottom: 24 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 30, letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 16, lineHeight: 22, marginBottom: 28 },
  field: { marginBottom: 20 },
  label: { fontSize: 15, marginBottom: 8 },
  input: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
  },
  textArea: { minHeight: 100, paddingTop: 13 },
  roleRow: { flexDirection: "row", gap: 12 },
  roleCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  roleTitle: { fontSize: 17 },
  roleDesc: { fontSize: 12, textAlign: "center", lineHeight: 17 },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
  },
  submitText: { color: "#fff", fontSize: 17 },
});
