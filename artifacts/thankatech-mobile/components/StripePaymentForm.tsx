import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export interface StripePaymentFormProps {
  publishableKey: string;
  clientSecret: string;
  paymentIntentId: string;
  tipAmount: number;
  techName: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}

function InnerForm({ paymentIntentId, tipAmount, techName, onSuccess, onError }: {
  paymentIntentId: string;
  tipAmount: number;
  techName: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const colors = useColors();
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit() {
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMsg(null);

    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      setErrorMsg(error.message ?? "Payment failed. Please try again.");
      setIsProcessing(false);
      return;
    }

    onSuccess();
    setIsProcessing(false);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.secureLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
          🔒 Secure payment · 91% goes to {techName.split(" ")[0]}
        </Text>
        <PaymentElement />
      </View>

      {errorMsg && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" }]}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
            {errorMsg}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: isProcessing ? colors.primary + "80" : colors.primary }]}
        onPress={handleSubmit}
        disabled={!stripe || !elements || isProcessing}
        testID="stripe-pay-button"
      >
        {isProcessing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="lock-closed-outline" size={18} color="#fff" />
            <Text style={[styles.btnText, { fontFamily: "Inter_600SemiBold" }]}>
              Pay ${tipAmount.toFixed(2)} tip
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

export function StripePaymentForm({
  publishableKey,
  clientSecret,
  paymentIntentId,
  tipAmount,
  techName,
  onSuccess,
  onError,
  onCancel,
}: StripePaymentFormProps) {
  const [stripePromise] = useState(() => loadStripe(publishableKey));

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <InnerForm
        paymentIntentId={paymentIntentId}
        tipAmount={tipAmount}
        techName={techName}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  secureLabel: { fontSize: 13, marginBottom: 4 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: { flex: 1, fontSize: 13, lineHeight: 19 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
  },
  btnText: { color: "#fff", fontSize: 17 },
});
