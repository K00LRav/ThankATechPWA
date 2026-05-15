import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetThankMessage,
  useRetryStripePayment,
  useRecordStripePaymentComplete,
  useGetStripeConfig,
  getListThankMessagesQueryKey,
  getGetThankMessageQueryKey,
  useGetMyProfile,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { StripePaymentForm } from "@/components/StripePaymentForm";
import * as Haptics from "expo-haptics";

type Step = "init" | "payment" | "processing" | "success" | "error";

export default function RetryTipScreen() {
  const { thankMessageId } = useLocalSearchParams<{ thankMessageId: string }>();
  const id = Number(thankMessageId);

  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("init");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

  const successAnim = useRef(new Animated.Value(0)).current;

  const { data: profileData } = useGetMyProfile();
  const profileId = profileData?.profile?.profileId;

  const {
    data: thankMessage,
    isLoading: msgLoading,
    error: msgError,
  } = useGetThankMessage(id, {
    query: {
      enabled: !!id,
      queryKey: getGetThankMessageQueryKey(id),
    },
  });

  const { data: stripeConfigData, isLoading: configLoading } = useGetStripeConfig();
  const publishableKey = stripeConfigData?.publishableKey;

  const retryPayment = useRetryStripePayment();
  const recordComplete = useRecordStripePaymentComplete();

  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 34 : insets.bottom;

  async function handleStartRetry() {
    setStep("processing");
    setErrorMsg(null);

    try {
      const result = await retryPayment.mutateAsync({ data: { thankMessageId: id } });
      setClientSecret(result.clientSecret);
      setPaymentIntentId(result.paymentIntentId);
      setStep("payment");
    } catch (err: unknown) {
      const errData = err as { response?: { data?: { error?: string } } };
      const msg = errData?.response?.data?.error ?? "Failed to set up payment. Please try again.";
      setErrorMsg(msg);
      setStep("error");
    }
  }

  async function handlePaymentSuccess() {
    if (!paymentIntentId) return;
    setStep("processing");

    try {
      await recordComplete.mutateAsync({
        data: { thankMessageId: id, paymentIntentId },
      });
    } catch {
      // The Stripe payment succeeded but our backend record call failed.
      // Show an informative error so the customer knows payment went through
      // even though the dashboard may not update immediately.
      setErrorMsg(
        "Your payment was processed successfully, but we couldn't confirm the update right away. The tip will appear on the technician's dashboard shortly. If the badge persists on your dashboard, please refresh in a moment."
      );
      setStep("error");
      return;
    }

    if (profileId) {
      queryClient.invalidateQueries({
        queryKey: getListThankMessagesQueryKey({ customerId: profileId }),
      });
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep("success");
    Animated.spring(successAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
    }).start();
  }

  function handlePaymentError(msg: string) {
    setErrorMsg(msg);
    setStep("error");
  }

  function handlePaymentCancel() {
    setStep("init");
  }

  if (msgLoading || configLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (msgError || !thankMessage) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingHorizontal: 32 }]}>
        <View style={[styles.iconCircle, { backgroundColor: colors.destructive + "18" }]}>
          <Ionicons name="alert-circle" size={44} color={colors.destructive} />
        </View>
        <Text style={[styles.titleText, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
          Not found
        </Text>
        <Text style={[styles.bodyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          This thank you message couldn't be found or doesn't belong to your account.
        </Text>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.replace("/dashboard/customer")}
        >
          <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            Back to dashboard
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (thankMessage.paymentStatus !== "failed") {
    const isSucceeded = thankMessage.paymentStatus === "succeeded";
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingHorizontal: 32 }]}>
        <View style={[styles.iconCircle, { backgroundColor: "#DCFCE7" }]}>
          <Ionicons name="checkmark-circle" size={44} color="#16A34A" />
        </View>
        <Text style={[styles.titleText, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
          {isSucceeded ? "Already paid!" : "Nothing to retry"}
        </Text>
        <Text style={[styles.bodyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {isSucceeded
            ? "Your tip payment already went through successfully."
            : "There is no failed payment to retry for this thank you."}
        </Text>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.replace("/dashboard/customer")}
        >
          <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            Back to dashboard
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === "success") {
    const scale = successAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingHorizontal: 32 }]}>
        <Animated.View style={{ transform: [{ scale }], opacity: successAnim }}>
          <View style={[styles.iconCircle, { backgroundColor: "#DCFCE7" }]}>
            <Ionicons name="checkmark-circle" size={44} color="#16A34A" />
          </View>
        </Animated.View>
        <Text style={[styles.titleText, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
          Tip sent!
        </Text>
        <Text style={[styles.bodyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Your ${Number(thankMessage.tipAmount).toFixed(2)} tip to{" "}
          <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
            {thankMessage.technicianName ?? "the technician"}
          </Text>{" "}
          is on its way.
        </Text>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.replace("/dashboard/customer")}
          testID="retry-success-back"
        >
          <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            Back to dashboard
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tipAmount = Number(thankMessage.tipAmount);
  const techFirstName = (thankMessage.technicianName ?? "Technician").split(" ")[0];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: topPadding + 12, paddingBottom: bottomPadding + 32 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity
        style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={20} color={colors.foreground} />
      </TouchableOpacity>

      <View style={styles.heroSection}>
        <View style={[styles.iconCircle, { backgroundColor: colors.secondary + "18" }]}>
          <Ionicons name="cash-outline" size={44} color={colors.secondary} />
        </View>
        <Text style={[styles.titleText, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold", marginTop: 16 }]}>
          Retry tip payment
        </Text>
        <Text style={[styles.bodyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 4 }]}>
          Your thank you to{" "}
          <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
            {thankMessage.technicianName ?? "the technician"}
          </Text>{" "}
          was already sent. Complete the{" "}
          <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
            ${tipAmount.toFixed(2)}
          </Text>{" "}
          tip below.
        </Text>
      </View>

      <View style={[styles.warningBanner, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
        <Ionicons name="warning-outline" size={16} color="#D97706" style={{ marginTop: 1 }} />
        <Text style={[styles.warningText, { fontFamily: "Inter_400Regular" }]}>
          Your previous tip payment failed. Your thank you message has already been delivered — this only retries the payment.
        </Text>
      </View>

      {(step === "init" || step === "error") && (
        <>
          <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                {techFirstName} receives (91%)
              </Text>
              <Text style={[styles.breakdownValue, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                ${(tipAmount * 0.91).toFixed(2)}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                Platform fee (9%)
              </Text>
              <Text style={[styles.breakdownValue, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                ${(tipAmount * 0.09).toFixed(2)}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownTotalLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                Total charged
              </Text>
              <Text style={[styles.breakdownTotalValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                ${tipAmount.toFixed(2)}
              </Text>
            </View>
          </View>

          {step === "error" && errorMsg && (
            <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" }]}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} style={{ marginTop: 1 }} />
              <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
                {errorMsg}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleStartRetry}
            testID="retry-payment-button"
          >
            <Ionicons name="refresh-circle-outline" size={20} color="#fff" />
            <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>
              {step === "error" ? "Try again" : "Continue to payment"}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {step === "processing" && (
        <View style={styles.processingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.processingText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            Setting up payment…
          </Text>
        </View>
      )}

      {step === "payment" && clientSecret && publishableKey && (
        <StripePaymentForm
          publishableKey={publishableKey}
          clientSecret={clientSecret}
          paymentIntentId={paymentIntentId!}
          tipAmount={tipAmount}
          techName={thankMessage.technicianName ?? "Technician"}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          onCancel={handlePaymentCancel}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, gap: 16 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: 8,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  titleText: {
    fontSize: 26,
    letterSpacing: -0.5,
    textAlign: "center",
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: "#92400E",
  },
  breakdownCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownLabel: { fontSize: 14 },
  breakdownValue: { fontSize: 14 },
  breakdownTotalLabel: { fontSize: 15 },
  breakdownTotalValue: { fontSize: 15 },
  divider: { height: 1 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: { flex: 1, fontSize: 13, lineHeight: 19 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 4,
  },
  primaryBtnText: { color: "#fff", fontSize: 17 },
  processingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 24,
  },
  processingText: { fontSize: 15 },
});
