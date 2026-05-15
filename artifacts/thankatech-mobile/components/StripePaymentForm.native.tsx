import React, { useEffect } from "react";
import { StripeProvider, useStripe } from "@stripe/stripe-react-native";
import type { StripePaymentFormProps } from "./StripePaymentForm";

function NativePaymentSheet({
  clientSecret,
  paymentIntentId,
  onSuccess,
  onError,
  onCancel,
}: {
  clientSecret: string;
  paymentIntentId: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: "ThankATech",
        returnURL: "thankatech-mobile://retry-payment-return",
      });

      if (initError) {
        if (!cancelled) onError(initError.message ?? "Could not set up payment.");
        return;
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === "Canceled") {
          if (!cancelled) onCancel();
        } else {
          if (!cancelled) onError(presentError.message ?? "Payment failed. Please try again.");
        }
        return;
      }

      if (!cancelled) onSuccess();
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [clientSecret]);

  return null;
}

export function StripePaymentForm({
  publishableKey,
  clientSecret,
  paymentIntentId,
  onSuccess,
  onError,
  onCancel,
}: StripePaymentFormProps) {
  return (
    <StripeProvider publishableKey={publishableKey} merchantIdentifier="merchant.com.thankatech">
      <NativePaymentSheet
        clientSecret={clientSecret}
        paymentIntentId={paymentIntentId}
        onSuccess={onSuccess}
        onError={onError}
        onCancel={onCancel}
      />
    </StripeProvider>
  );
}
