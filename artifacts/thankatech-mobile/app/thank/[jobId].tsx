import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Animated,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useGetJob, useCreateThankMessage, useGetMyProfile } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

const TIP_PRESETS = [0, 5, 10, 20, 50];

type Step = "message" | "tip" | "celebrate";

export default function ThankFlowScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const jobIdNum = Number(jobId);
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [step, setStep] = useState<Step>("message");
  const [message, setMessage] = useState("");
  const [tipAmount, setTipAmount] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [isCustomTip, setIsCustomTip] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const celebrateAnim = useRef(new Animated.Value(0)).current;

  const { data: job, isLoading: jobLoading } = useGetJob(jobIdNum);
  const { data: profileData } = useGetMyProfile();
  const profile = profileData?.profile;

  const { mutateAsync: createThank } = useCreateThankMessage();

  const effectiveTip = isCustomTip ? Number(customTip) || 0 : tipAmount;

  const handleMessageNext = async () => {
    if (!message.trim()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("tip");
  };

  const handleSubmit = async () => {
    if (!job || !profile) return;
    setSubmitting(true);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await createThank({
        data: {
          jobId: job.id,
          customerId: profile.profileId,
          technicianId: job.technicianId,
          message: message.trim(),
          ...(effectiveTip > 0 ? { tipAmount: effectiveTip } : {}),
        },
      });
      setStep("celebrate");
      Animated.spring(celebrateAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
      }).start();
    } catch {
      Alert.alert(
        "Couldn't send thanks",
        "Something went wrong. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 34 : insets.bottom;

  if (jobLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (step === "celebrate") {
    const scale = celebrateAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
    const opacity = celebrateAnim;
    return (
      <View style={[styles.celebrateContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.celebrateContent, { paddingTop: topPadding + 40, paddingBottom: bottomPadding + 40 }]}>
          <Animated.View style={{ transform: [{ scale }], opacity }}>
            <View style={[styles.celebrateIcon, { backgroundColor: colors.primary + "20" }]}>
              <Ionicons name="heart" size={60} color={colors.primary} />
            </View>
          </Animated.View>
          <Text style={[styles.celebrateTitle, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold_Italic" }]}>
            Thanks sent!
          </Text>
          <Text style={[styles.celebrateSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Your gratitude has been delivered to {job?.technicianName ?? "the technician"}.
          </Text>
          {effectiveTip > 0 && (
            <View style={[styles.tipSentBadge, { backgroundColor: colors.secondary + "20" }]}>
              <Ionicons name="cash-outline" size={16} color={colors.secondary} />
              <Text style={[styles.tipSentText, { color: colors.secondary, fontFamily: "Inter_600SemiBold" }]}>
                ${effectiveTip} tip included
              </Text>
            </View>
          )}
          <View style={styles.celebratePoints}>
            <Ionicons name="star" size={16} color={colors.primary} />
            <Text style={[styles.celebratePointsText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              You earned 15 ThankYou Points!
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.doneBtnText, { fontFamily: "Inter_600SemiBold" }]}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding + 20, paddingBottom: bottomPadding + 24 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.flowHeader}>
        <TouchableOpacity
          style={[styles.closeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.stepDots}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <View style={[styles.dot, { backgroundColor: step === "tip" ? colors.primary : colors.border }]} />
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Job info */}
      {job && (
        <View style={[styles.jobBanner, { backgroundColor: colors.accent, borderColor: colors.border }]}>
          <Ionicons name="briefcase-outline" size={16} color={colors.mutedForeground} />
          <Text style={[styles.jobBannerText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            {job.title} · {job.technicianName ?? "Technician"}
          </Text>
        </View>
      )}

      {step === "message" && (
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
            Write your thanks
          </Text>
          <Text style={[styles.stepSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Tell {job?.technicianName ?? "the tech"} what made the experience great
          </Text>
          <TextInput
            style={[
              styles.messageInput,
              {
                backgroundColor: colors.card,
                borderColor: message ? colors.primary : colors.border,
                color: colors.foreground,
                fontFamily: "Inter_400Regular",
              },
            ]}
            placeholder="They fixed my HVAC in record time and were incredibly professional..."
            placeholderTextColor={colors.mutedForeground}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            testID="thank-message-input"
          />
          <Text style={[styles.charCount, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {message.length} characters
          </Text>
          <TouchableOpacity
            style={[
              styles.nextBtn,
              {
                backgroundColor: message.trim() ? colors.primary : colors.muted,
              },
            ]}
            onPress={handleMessageNext}
            disabled={!message.trim()}
            testID="thank-next-button"
          >
            <Text style={[styles.nextBtnText, { fontFamily: "Inter_600SemiBold" }]}>
              Next: Add a tip
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {step === "tip" && (
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
            Add a tip
          </Text>
          <Text style={[styles.stepSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Optional — 100% goes to {job?.technicianName ?? "the technician"}
          </Text>

          {/* Preset amounts */}
          <View style={styles.tipGrid}>
            {TIP_PRESETS.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.tipPreset,
                  {
                    backgroundColor:
                      !isCustomTip && tipAmount === amount ? colors.primary : colors.card,
                    borderColor:
                      !isCustomTip && tipAmount === amount ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setTipAmount(amount);
                  setIsCustomTip(false);
                  Haptics.selectionAsync();
                }}
              >
                <Text
                  style={[
                    styles.tipPresetText,
                    {
                      color: !isCustomTip && tipAmount === amount ? "#fff" : colors.foreground,
                      fontFamily: "Inter_600SemiBold",
                    },
                  ]}
                >
                  {amount === 0 ? "No tip" : `$${amount}`}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.tipPreset,
                {
                  backgroundColor: isCustomTip ? colors.primary : colors.card,
                  borderColor: isCustomTip ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                setIsCustomTip(true);
                Haptics.selectionAsync();
              }}
            >
              <Text
                style={[
                  styles.tipPresetText,
                  {
                    color: isCustomTip ? "#fff" : colors.foreground,
                    fontFamily: "Inter_600SemiBold",
                  },
                ]}
              >
                Custom
              </Text>
            </TouchableOpacity>
          </View>

          {isCustomTip && (
            <View style={[styles.customTipRow, { backgroundColor: colors.card, borderColor: colors.primary }]}>
              <Text style={[styles.dollarSign, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>$</Text>
              <TextInput
                style={[styles.customTipInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                value={customTip}
                onChangeText={setCustomTip}
                keyboardType="numeric"
                autoFocus
              />
            </View>
          )}

          {effectiveTip > 0 && (
            <View style={[styles.tipSummary, { backgroundColor: colors.secondary + "15" }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.secondary} />
              <Text style={[styles.tipSummaryText, { color: colors.secondary, fontFamily: "Inter_500Medium" }]}>
                ${effectiveTip} tip selected
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={submitting}
            testID="thank-submit-button"
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="heart" size={18} color="#fff" />
                <Text style={[styles.nextBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                  Send Thanks{effectiveTip > 0 ? ` + $${effectiveTip}` : ""}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => setStep("message")}>
            <Text style={[styles.backLinkText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Back to message
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  flowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDots: { flexDirection: "row", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  jobBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 24,
  },
  jobBannerText: { fontSize: 14 },
  stepContent: { gap: 16 },
  stepTitle: { fontSize: 28, letterSpacing: -0.5 },
  stepSubtitle: { fontSize: 16, lineHeight: 22, marginTop: -8 },
  messageInput: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 160,
  },
  charCount: { fontSize: 12, textAlign: "right", marginTop: -8 },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
  },
  nextBtnText: { color: "#fff", fontSize: 17 },
  tipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tipPreset: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 80,
    alignItems: "center",
  },
  tipPresetText: { fontSize: 16 },
  customTipRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dollarSign: { fontSize: 20, marginRight: 4 },
  customTipInput: { flex: 1, fontSize: 20, padding: 0 },
  tipSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  tipSummaryText: { fontSize: 14 },
  backLink: { alignItems: "center", paddingVertical: 4 },
  backLinkText: { fontSize: 14 },
  // Celebrate
  celebrateContainer: { flex: 1 },
  celebrateContent: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  celebrateIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  celebrateTitle: { fontSize: 34, letterSpacing: -1, textAlign: "center" },
  celebrateSubtitle: { fontSize: 16, textAlign: "center", lineHeight: 24 },
  tipSentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tipSentText: { fontSize: 15 },
  celebratePoints: { flexDirection: "row", alignItems: "center", gap: 6 },
  celebratePointsText: { fontSize: 14 },
  doneBtn: {
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 16,
    width: "100%",
    alignItems: "center",
  },
  doneBtnText: { color: "#fff", fontSize: 17 },
});
